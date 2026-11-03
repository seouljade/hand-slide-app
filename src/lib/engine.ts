import { TIMING } from "../config";
import type { Gesture } from "./gesture";

export type Phase = "idle" | "holding" | "confirmed" | "cooldown";

export interface EngineState {
  phase: Phase;
  gesture: Gesture | null;
  /** 동작 유지 진행률 0~1 */
  holdProgress: number;
  /** 재입력 대기 남은 비율 1~0 */
  cooldownLeft: number;
  /** 같은 동작을 계속 유지하고 있어 무시 중 */
  blocked: boolean;
}

export interface StepResult {
  state: EngineState;
  /** 이번 프레임에 확정된 동작 */
  fired: Gesture | null;
}

export interface EngineTiming {
  holdSec: number;
  cooldownSec: number;
}

export const IDLE_STATE: EngineState = Object.freeze({
  phase: "idle", gesture: null, holdProgress: 0, cooldownLeft: 0, blocked: false,
});

/**
 * 프레임마다 판정된 동작을 받아 "유지 시간을 채웠는지"와 "재입력 대기 중인지"를 결정합니다.
 * 시간은 호출하는 쪽이 넘겨 주므로 테스트에서 시계를 마음대로 돌릴 수 있습니다.
 */
export class GestureEngine {
  private holdGesture: Gesture | null = null;
  private holdStart = 0;
  private lastSeenAt = -Infinity;
  private firedGesture: Gesture | null = null;
  private firedAt = -Infinity;
  private cooldownUntil = -Infinity;
  private needRelease: Gesture | null = null;
  private releaseSince: number | null = null;

  constructor(private readonly timing: () => EngineTiming) {}

  reset(): void {
    this.holdGesture = null;
    this.lastSeenAt = -Infinity;
    this.firedGesture = null;
    this.firedAt = -Infinity;
    this.cooldownUntil = -Infinity;
    this.needRelease = null;
    this.releaseSince = null;
  }

  step(raw: Gesture | null, now: number): StepResult {
    const { holdSec, cooldownSec } = this.timing();

    // 한두 프레임 인식이 끊겨도 유지 중인 동작은 이어서 봅니다.
    let g = raw;
    if (g) this.lastSeenAt = now;
    else if (this.holdGesture && now - this.lastSeenAt < TIMING.dropoutGraceMs) g = this.holdGesture;

    // 같은 동작을 계속 유지하면 한 번만 넘깁니다. 손을 풀어야 다시 인식합니다.
    if (this.needRelease) {
      if (g !== this.needRelease) {
        this.releaseSince ??= now;
        if (now - this.releaseSince >= TIMING.releaseMs) {
          this.needRelease = null;
          this.releaseSince = null;
        }
      } else {
        this.releaseSince = null;
      }
    }

    if (now < this.cooldownUntil) {
      this.holdGesture = null;
      return {
        fired: null,
        state: {
          phase: now - this.firedAt < TIMING.confirmFlashMs ? "confirmed" : "cooldown",
          gesture: this.firedGesture,
          holdProgress: 0,
          cooldownLeft: (this.cooldownUntil - now) / (cooldownSec * 1000),
          blocked: false,
        },
      };
    }

    if (!g || g === this.needRelease) {
      this.holdGesture = null;
      return { fired: null, state: { ...IDLE_STATE, blocked: g !== null } };
    }

    if (this.holdGesture !== g) {
      this.holdGesture = g;
      this.holdStart = now;
    }
    const progress = (now - this.holdStart) / (holdSec * 1000);
    if (progress >= 1) {
      this.firedGesture = g;
      this.firedAt = now;
      this.cooldownUntil = now + cooldownSec * 1000;
      this.needRelease = g;
      this.releaseSince = null;
      this.holdGesture = null;
      return {
        fired: g,
        state: { phase: "confirmed", gesture: g, holdProgress: 1, cooldownLeft: 1, blocked: false },
      };
    }
    return {
      fired: null,
      state: { phase: "holding", gesture: g, holdProgress: progress, cooldownLeft: 0, blocked: false },
    };
  }
}
