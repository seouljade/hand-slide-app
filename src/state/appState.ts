import { DEFAULT_SETTINGS, SLIDE_LOG_LIMIT, type RecognitionSettings } from "../config";
import { CHECK_LABELS, CHECK_ORDER, type CheckKey, type CheckResult } from "../lib/checks";
import type { Gesture } from "../lib/gesture";
import { SLIDES } from "../data/slides";

export type Screen = "prep" | "present";
export type CameraStatus = "idle" | "on" | "off";
export type NavSource = "hand" | "key";
export type LogTone = "normal" | "good" | "warn";

export interface LogEntry {
  id: number;
  at: number;
  text: string;
  /** 기록 시점의 슬라이드 번호(1부터) */
  slide: number;
  tone: LogTone;
}

export interface Flash {
  id: number;
  value: string;
}

export interface AppState {
  screen: Screen;
  checks: Record<CheckKey, CheckResult>;
  camera: CameraStatus;
  cameraMessage: string;
  startError: string;
  slide: number;
  slideDir: 1 | -1;
  log: LogEntry[];
  practice: Record<Gesture, number>;
  previewHidden: boolean;
  settings: RecognitionSettings;
  toast: Flash | null;
  signal: Flash | null;
  seq: number;
}

export type Action =
  | { type: "check"; key: CheckKey; result: CheckResult }
  | { type: "cameraOn" }
  | { type: "cameraOff"; message: string; at: number }
  | { type: "cameraBack"; at: number }
  | { type: "start"; at: number }
  | { type: "back" }
  | { type: "navigate"; dir: 1 | -1; source: NavSource; at: number }
  | { type: "practiceHit"; gesture: Gesture }
  | { type: "togglePreview" }
  | { type: "settings"; patch: Partial<RecognitionSettings> }
  | { type: "resetSettings" };

export const SLIDE_COUNT = SLIDES.length;

export function initialState(): AppState {
  const checks = Object.fromEntries(CHECK_ORDER.map((k) => [k, { status: "idle" }])) as Record<CheckKey, CheckResult>;
  return {
    screen: "prep",
    checks,
    camera: "idle",
    cameraMessage: "",
    startError: "",
    slide: 0,
    slideDir: 1,
    log: [],
    practice: { next: 0, prev: 0 },
    previewHidden: false,
    settings: { ...DEFAULT_SETTINGS },
    toast: null,
    signal: null,
    seq: 0,
  };
}

export const allChecksOk = (s: AppState) => CHECK_ORDER.every((k) => s.checks[k].status === "ok");

/** 발표를 시작할 수 없는 이유. 시작할 수 있으면 빈 문자열 */
export function startBlocker(s: AppState): string {
  const checks = CHECK_ORDER.map((k) => [k, s.checks[k]] as const);
  if (checks.every(([, c]) => c.status === "idle")) return "아직 점검하지 않았습니다. 먼저 \"점검 시작\"을 눌러 주세요.";
  if (checks.some(([, c]) => c.status === "running")) return "점검이 아직 끝나지 않았습니다. 잠시 기다려 주세요.";
  const failed = checks.find(([, c]) => c.status !== "ok");
  if (failed) {
    const [key, c] = failed;
    return `${CHECK_LABELS[key]} 확인 필요 · ${c.hint ?? "점검 항목을 확인해 주세요."}`;
  }
  return "";
}

function addLog(s: AppState, text: string, at: number, tone: LogTone = "normal", slide = s.slide): AppState {
  const seq = s.seq + 1;
  const entry: LogEntry = { id: seq, at, text, slide: slide + 1, tone };
  return { ...s, seq, log: [entry, ...s.log].slice(0, SLIDE_LOG_LIMIT) };
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "check": {
      const next = { ...s, checks: { ...s.checks, [a.key]: a.result } };
      return { ...next, startError: s.startError && startBlocker(next) };
    }
    case "cameraOn":
      return { ...s, camera: "on", cameraMessage: "" };
    case "cameraOff": {
      if (s.camera !== "on") return { ...s, camera: "off", cameraMessage: a.message };
      const next: AppState = {
        ...s,
        camera: "off",
        cameraMessage: a.message,
        checks: { ...s.checks, camera: { status: "fail", detail: "끊김", hint: a.message } },
      };
      return addLog(next, "카메라 꺼짐", a.at, "warn");
    }
    case "cameraBack":
      return addLog({ ...s, camera: "on", cameraMessage: "" }, "카메라 복귀", a.at, "good");
    case "start": {
      const blocker = startBlocker(s);
      if (blocker) return { ...s, startError: blocker };
      return addLog({ ...s, screen: "present", startError: "", previewHidden: false, toast: null, signal: null }, "발표 시작", a.at, "good");
    }
    case "back":
      return { ...s, screen: "prep" };
    case "navigate": {
      if (s.screen !== "present") return s;
      const label = (a.dir > 0 ? "다음 ▶" : "◀ 이전") + (a.source === "key" ? " (키보드)" : "");
      const target = s.slide + a.dir;
      const seq = s.seq + 1;
      if (target < 0 || target >= SLIDE_COUNT) {
        const edge = a.dir > 0 ? "마지막 슬라이드" : "첫 슬라이드";
        return addLog({ ...s, seq, toast: { id: seq, value: edge } }, `${label} · ${edge}`, a.at);
      }
      const moved: AppState = {
        ...s, seq, slide: target, slideDir: a.dir,
        signal: { id: seq, value: a.dir > 0 ? "next" : "prev" },
      };
      return addLog(moved, label, a.at);
    }
    case "practiceHit":
      return { ...s, practice: { ...s.practice, [a.gesture]: s.practice[a.gesture] + 1 } };
    case "togglePreview":
      return { ...s, previewHidden: !s.previewHidden };
    case "settings":
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case "resetSettings":
      return { ...s, settings: { ...DEFAULT_SETTINGS } };
  }
}

