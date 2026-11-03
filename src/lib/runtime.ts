import { DEFAULT_SETTINGS, MESSAGES, TIMING, type RecognitionSettings } from "../config";
import type { Action, Screen } from "../state/appState";
import { CAMERA_ERROR_MESSAGE, CameraController } from "./camera";
import { checkNetwork, currentBrowserInfo, detectBrowser } from "./checks";
import { drawHand, drawSimBackground } from "./drawHand";
import { GestureEngine, IDLE_STATE, type EngineState } from "./engine";
import { analyzeHand, type HandAnalysis, type Landmark } from "./gesture";
import { createMediaPipeTracker, type HandTracker } from "./handTracker";
import { makeSimHand, type SimHandKind } from "./simHand";

export interface FrameSnapshot {
  hand: boolean;
  analysis: HandAnalysis | null;
  engine: EngineState;
}

const EMPTY_FRAME: FrameSnapshot = { hand: false, analysis: null, engine: IDLE_STATE };
const SIM_SIZE = { w: 640, h: 480 };

/** 화면에 보여 줄 만큼만 반올림해, 값이 바뀌었을 때만 화면을 다시 그리게 합니다. */
function frameKey(f: FrameSnapshot): string {
  const r = (v: number) => Math.round(v * 100);
  const a = f.analysis;
  const e = f.engine;
  return [
    f.hand, e.phase, e.gesture, r(e.holdProgress), r(e.cooldownLeft), e.blocked,
    a?.gesture, a && Object.values(a.touch).map(r).join(","), a && Object.values(a.extension).map(r).join(","),
  ].join("|");
}

/**
 * 카메라, 손 인식, 동작 판정, 오버레이 그리기를 묶은 실행부입니다.
 * 프레임마다 도는 일은 React 밖에서 처리하고, 화면에는 바뀐 값만 알립니다.
 */
export class Runtime {
  private readonly camera = new CameraController();
  private readonly engine: GestureEngine;
  private tracker: HandTracker | null = null;
  private trackerLoading: Promise<HandTracker> | null = null;
  private cameraOn = false;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private settings: RecognitionSettings = { ...DEFAULT_SETTINGS };
  private screen: Screen = "prep";
  private simHand: Landmark[] | null = null;
  private raf = 0;
  private watchdog = 0;
  private frame: FrameSnapshot = EMPTY_FRAME;
  private frameSig = frameKey(EMPTY_FRAME);
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly dispatch: (a: Action) => void,
    readonly sim: boolean,
  ) {
    this.engine = new GestureEngine(() => this.settings);
  }

  // ── React 와 연결 ──

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getFrame = () => this.frame;

  setSettings(s: RecognitionSettings): void {
    this.settings = s;
  }

  setScreen(screen: Screen): void {
    if (screen !== this.screen) this.engine.reset();
    this.screen = screen;
  }

  attachVideo = (el: HTMLVideoElement | null) => {
    this.video = el;
    if (el && !this.sim) this.camera.attach(el);
  };

  attachCanvas = (el: HTMLCanvasElement | null) => {
    this.canvas = el;
  };

  setSimHand(kind: SimHandKind | null): void {
    this.simHand = kind ? makeSimHand(kind) : null;
  }

  start(): void {
    if (this.raf) return;
    const tick = () => {
      this.tick(performance.now());
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.watchdog = window.setInterval(() => this.checkCamera(), TIMING.watchdogMs);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    clearInterval(this.watchdog);
    this.raf = 0;
    this.camera.stop();
    this.cameraOn = false;
  }

  // ── 사전 점검 (F1-1, F1-2) ──

  async runChecks(): Promise<void> {
    const browser = detectBrowser(currentBrowserInfo());
    this.dispatch({
      type: "check", key: "browser",
      result: browser.ok ? { status: "ok", detail: browser.name } : { status: "fail", detail: browser.name, hint: MESSAGES.browser },
    });
    if (!browser.ok) return;

    for (const key of ["camera", "network", "model"] as const) {
      this.dispatch({ type: "check", key, result: { status: "running" } });
    }
    await Promise.all([this.openCamera(), this.checkNetworkAndModel()]);
  }

  async retryCamera(): Promise<boolean> {
    const ok = await this.openCamera();
    if (ok) this.dispatch({ type: "cameraBack", at: Date.now() });
    return ok;
  }

  /** 시험용: 카메라가 끊긴 상황을 흉내 냅니다. */
  simulateCameraLoss(): void {
    this.handleCameraLost();
  }

  private async openCamera(): Promise<boolean> {
    if (this.sim) {
      this.cameraOn = true;
      this.dispatch({ type: "check", key: "camera", result: { status: "ok", detail: "가상 카메라" } });
      this.dispatch({ type: "cameraOn" });
      return true;
    }
    const r = await this.camera.start(() => this.handleCameraLost());
    if (!r.ok) {
      const hint = CAMERA_ERROR_MESSAGE[r.kind];
      this.cameraOn = false;
      this.dispatch({ type: "check", key: "camera", result: { status: "fail", hint } });
      this.dispatch({ type: "cameraOff", message: hint, at: Date.now() });
      return false;
    }
    if (this.video) this.camera.attach(this.video);
    this.cameraOn = true;
    this.dispatch({ type: "check", key: "camera", result: { status: "ok", detail: `${r.width}×${r.height}` } });
    this.dispatch({ type: "cameraOn" });
    return true;
  }

  private async checkNetworkAndModel(): Promise<void> {
    if (this.sim) {
      this.dispatch({ type: "check", key: "network", result: { status: "ok", detail: "가상" } });
      this.dispatch({ type: "check", key: "model", result: { status: "ok", detail: "가상 손 좌표" } });
      return;
    }
    const net = await checkNetwork();
    this.dispatch({
      type: "check", key: "network",
      result: net.ok ? { status: "ok", detail: net.detail } : { status: "fail", detail: net.detail, hint: MESSAGES.network },
    });
    if (!net.ok && !this.tracker) {
      this.dispatch({ type: "check", key: "model", result: { status: "fail", hint: MESSAGES.network } });
      return;
    }
    try {
      this.trackerLoading ??= createMediaPipeTracker();
      this.tracker = await this.trackerLoading;
      this.dispatch({ type: "check", key: "model", result: { status: "ok", detail: `준비됨 · ${this.tracker.backend}` } });
    } catch (err) {
      console.error("손 인식 모델을 불러오지 못했습니다", err);
      this.trackerLoading = null;
      this.dispatch({ type: "check", key: "model", result: { status: "fail", detail: "불러오기 실패", hint: MESSAGES.model } });
    }
  }

  // ── 카메라 감시 (F3-2) ──

  private checkCamera(): void {
    if (!this.cameraOn || this.sim) return;
    if (!this.camera.isHealthy(this.video, performance.now())) this.handleCameraLost();
  }

  private handleCameraLost(): void {
    if (!this.cameraOn) return;
    this.cameraOn = false;
    this.camera.stop();
    this.engine.reset();
    this.dispatch({ type: "cameraOff", message: MESSAGES.cameraLost, at: Date.now() });
  }

  // ── 프레임 처리 ──

  private tick(now: number): void {
    let lm: Landmark[] | null = null;
    let { w, h } = SIM_SIZE;

    if (this.cameraOn) {
      if (this.sim) {
        lm = this.simHand;
      } else if (this.video?.videoWidth) {
        w = this.video.videoWidth;
        h = this.video.videoHeight;
        if (this.tracker) {
          try {
            lm = this.tracker.detect(this.video, now);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }

    const analysis = lm ? analyzeHand(lm, w, h, this.settings) : null;
    const { state, fired } = this.cameraOn ? this.engine.step(analysis?.gesture ?? null, now) : { state: IDLE_STATE, fired: null };

    if (fired) {
      if (this.screen === "present") {
        this.dispatch({ type: "navigate", dir: fired === "next" ? 1 : -1, source: "hand", at: Date.now() });
      } else {
        this.dispatch({ type: "practiceHit", gesture: fired });
      }
    }

    this.draw(lm, analysis, state, w, h);
    this.publish({ hand: lm !== null, analysis, engine: state });
  }

  private draw(lm: Landmark[] | null, analysis: HandAnalysis | null, engine: EngineState, w: number, h: number): void {
    const canvas = this.canvas;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    if (this.sim && this.cameraOn) drawSimBackground(ctx, w, h);
    if (lm && analysis) drawHand(ctx, lm, analysis, engine, this.settings.pinchRatio, w, h);
  }

  private publish(f: FrameSnapshot): void {
    const sig = frameKey(f);
    if (sig === this.frameSig) return;
    this.frameSig = sig;
    this.frame = f;
    for (const fn of this.listeners) fn();
  }
}
