import { ASSETS } from "../config";
import type { Landmark } from "./gesture";

export interface HandTracker {
  readonly backend: string;
  /** 새 프레임이면 손 관절을 찾고, 같은 프레임이면 직전 결과를 돌려줍니다. */
  detect(video: HTMLVideoElement, now: number): Landmark[] | null;
  close(): void;
}

/**
 * MediaPipe 손 인식기를 만듭니다. 라이브러리는 필요할 때만 불러오고(코드 분할),
 * wasm 과 모델 파일은 이 앱의 서버(/mediapipe/…)에서 받습니다.
 */
export async function createMediaPipeTracker(): Promise<HandTracker> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(ASSETS.wasmBase);
  const create = (delegate: "GPU" | "CPU") =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: ASSETS.model, delegate },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

  let backend: "GPU" | "CPU" = "GPU";
  let landmarker: Awaited<ReturnType<typeof create>>;
  try {
    landmarker = await create("GPU");
  } catch {
    backend = "CPU";
    landmarker = await create("CPU");
  }

  let lastVideoTime = -1;
  let last: Landmark[] | null = null;
  return {
    backend,
    detect(video, now) {
      if (video.readyState < 2 || !video.videoWidth) return null;
      if (video.currentTime === lastVideoTime) return last;
      lastVideoTime = video.currentTime;
      const result = landmarker.detectForVideo(video, now);
      last = result.landmarks?.[0] ?? null;
      return last;
    },
    close() {
      landmarker.close();
    },
  };
}
