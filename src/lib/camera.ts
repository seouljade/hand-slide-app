import { MESSAGES, TIMING } from "../config";

export type CameraErrorKind = "denied" | "busy" | "notFound" | "insecure" | "unknown";

export const CAMERA_ERROR_MESSAGE: Record<CameraErrorKind, string> = {
  denied: MESSAGES.cameraDenied,
  busy: MESSAGES.cameraBusy,
  notFound: MESSAGES.cameraNotFound,
  insecure: MESSAGES.cameraInsecure,
  unknown: MESSAGES.cameraUnknown,
};

/** getUserMedia 오류를 PRD 8장의 안내 문구 종류로 나눕니다. */
export function classifyCameraError(err: unknown): CameraErrorKind {
  const name = (err as { name?: string } | null)?.name;
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "busy";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "notFound";
    default:
      return "unknown";
  }
}

export type CameraStartResult =
  | { ok: true; width: number; height: number }
  | { ok: false; kind: CameraErrorKind };

/**
 * 카메라 스트림을 열고, 끊김을 감시합니다.
 * 끊김 판정: 트랙 종료, 일정 시간 이상 음소거(다른 프로그램 점유), 일정 시간 이상 프레임 멈춤.
 */
export class CameraController {
  private stream: MediaStream | null = null;
  private lastFrameTime = -1;
  private lastFrameAt = 0;
  private mutedSince: number | null = null;
  private onEnded: (() => void) | null = null;

  get active(): boolean {
    return this.stream !== null;
  }

  async start(onEnded: () => void): Promise<CameraStartResult> {
    this.stop();
    if (!window.isSecureContext) return { ok: false, kind: "insecure" };
    if (!navigator.mediaDevices?.getUserMedia) return { ok: false, kind: "unknown" };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
    } catch (err) {
      return { ok: false, kind: classifyCameraError(err) };
    }
    const track = this.stream.getVideoTracks()[0];
    this.onEnded = onEnded;
    track?.addEventListener("ended", this.handleEnded);
    this.mutedSince = null;
    this.lastFrameTime = -1;
    this.lastFrameAt = performance.now();
    const { width = 0, height = 0 } = track?.getSettings() ?? {};
    return { ok: true, width, height };
  }

  /** video 요소에 현재 스트림을 연결합니다. 화면을 바꿔 video 요소가 새로 생겨도 다시 부르면 됩니다. */
  attach(video: HTMLVideoElement): void {
    if (video.srcObject !== this.stream) video.srcObject = this.stream;
    if (this.stream) video.play().catch(() => { /* 자동 재생 거부는 다음 상호작용에서 재시도 */ });
  }

  stop(): void {
    if (!this.stream) return;
    for (const t of this.stream.getTracks()) {
      t.removeEventListener("ended", this.handleEnded);
      t.stop();
    }
    this.stream = null;
    this.onEnded = null;
  }

  /** 감시 주기마다 호출합니다. 끊긴 것으로 보이면 false 를 돌려줍니다. */
  isHealthy(video: HTMLVideoElement | null, now: number): boolean {
    const track = this.stream?.getVideoTracks()[0];
    if (!track || track.readyState === "ended") return false;

    if (track.muted) {
      this.mutedSince ??= now;
      if (now - this.mutedSince > TIMING.cameraMutedMs) return false;
    } else {
      this.mutedSince = null;
    }

    // 탭이 가려져 있으면 프레임이 멈추는 게 정상이므로 판정하지 않습니다.
    if (!video || document.hidden) {
      this.lastFrameAt = now;
      return true;
    }
    if (video.currentTime !== this.lastFrameTime) {
      this.lastFrameTime = video.currentTime;
      this.lastFrameAt = now;
    } else if (now - this.lastFrameAt > TIMING.cameraStallMs) {
      return false;
    }
    return true;
  }

  private handleEnded = () => {
    this.onEnded?.();
  };
}
