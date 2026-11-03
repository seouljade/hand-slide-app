import type { RecognitionSettings } from "../config";

/** MediaPipe 손 관절 좌표 (0~1 정규화) */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export type Gesture = "next" | "prev";
export type FingerName = "index" | "middle" | "ring" | "pinky";

export interface HandAnalysis {
  gesture: Gesture | null;
  /** 엄지 끝–손가락 끝 거리 / 손바닥 길이 */
  touch: Record<FingerName, number>;
  /** 손목–손가락 끝 / 손목–손가락 뿌리 */
  extension: Record<FingerName, number>;
}

export const LANDMARK = { wrist: 0, thumbTip: 4, middleMcp: 9 } as const;

/** [손가락, 끝 관절, 뿌리 관절] */
export const FINGERS: ReadonlyArray<readonly [FingerName, number, number]> = [
  ["index", 8, 5],
  ["middle", 12, 9],
  ["ring", 16, 13],
  ["pinky", 20, 17],
];

export const HAND_BONES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

type GestureSettings = Pick<RecognitionSettings, "pinchRatio" | "extendRatio" | "relaxOk">;

/**
 * 손 관절 21개로 넘김 동작을 판정합니다.
 * 거리는 화면 픽셀 기준으로 계산해 카메라 가로세로 비율의 영향을 없애고,
 * 손바닥 길이로 나눠 카메라와의 거리에 상관없이 같은 기준을 씁니다.
 */
export function analyzeHand(lm: readonly Landmark[], width: number, height: number, s: GestureSettings): HandAnalysis {
  const dist = (a: number, b: number) => Math.hypot((lm[a].x - lm[b].x) * width, (lm[a].y - lm[b].y) * height);
  const palm = dist(LANDMARK.wrist, LANDMARK.middleMcp) || 1;

  const touch = {} as Record<FingerName, number>;
  const extension = {} as Record<FingerName, number>;
  for (const [name, tip, mcp] of FINGERS) {
    touch[name] = dist(LANDMARK.thumbTip, tip) / palm;
    extension[name] = dist(LANDMARK.wrist, tip) / (dist(LANDMARK.wrist, mcp) || 1);
  }

  const touching = (n: FingerName) => touch[n] < s.pinchRatio;
  const extended = (n: FingerName) => extension[n] > s.extendRatio;

  let gesture: Gesture | null = null;
  // 다음: OK 사인 — 엄지·검지를 붙이고 나머지 세 손가락은 폄
  if (touching("index") && !touching("pinky") &&
      (s.relaxOk || (extended("middle") && extended("ring") && extended("pinky")))) {
    gesture = "next";
  // 이전: 엄지·새끼를 붙이고 나머지 세 손가락은 폄
  } else if (touching("pinky") && !touching("index") &&
             extended("index") && extended("middle") && extended("ring")) {
    gesture = "prev";
  }
  return { gesture, touch, extension };
}
