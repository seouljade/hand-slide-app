import { MESSAGES, TIMING } from "../config";

export type CameraErrorKind = "denied" | "dismissed" | "osBlocked" | "busy" | "notFound" | "insecure" | "unknown";

export const CAMERA_ERROR_MESSAGE: Record<CameraErrorKind, string> = {
  denied: MESSAGES.cameraDenied,
  dismissed: MESSAGES.cameraDismissed,
  osBlocked: MESSAGES.cameraOsBlocked,
  busy: MESSAGES.cameraBusy,
  notFound: MESSAGES.cameraNotFound,
  insecure: MESSAGES.cameraInsecure,
  unknown: MESSAGES.cameraUnknown,
};

/** 이 사이트에 대한 브라우저의 카메라 권한 상태 */
export type CameraPermission = "granted" | "denied" | "prompt" | "unknown";

async function permissionStatus(): Promise<PermissionStatus | null> {
  try {
    return await navigator.permissions.query({ name: "camera" as PermissionName });
  } catch {
    return null; // Permissions API 에서 camera 를 지원하지 않는 브라우저
  }
}

export async function queryCameraPermission(): Promise<CameraPermission> {
  return (await permissionStatus())?.state ?? "unknown";
}

/** 사용자가 주소창에서 카메라 권한을 바꾸면 알려 줍니다. 반환값을 호출하면 감시를 멈춥니다. */
export function watchCameraPermission(onChange: (p: CameraPermission) => void): () => void {
  let status: PermissionStatus | null = null;
  let stopped = false;
  const handler = () => status && onChange(status.state);
  permissionStatus().then((s) => {
    if (stopped || !s) return;
    status = s;
    s.addEventListener("change", handler);
  });
  return () => {
    stopped = true;
    status?.removeEventListener("change", handler);
  };
}

/**
 * getUserMedia 오류를 안내 문구 종류로 나눕니다 (PRD 8장).
 * 권한 거부는 권한 상태를 함께 보아 세 가지로 나눕니다.
 * - 사이트 권한이 "차단" → denied (주소창에서 허용)
 * - 사이트 권한이 "묻기"인데 거부 → dismissed (요청 창을 닫음, 다시 요청 가능)
 * - 사이트 권한은 "허용"인데 거부, 또는 시스템 거부 → osBlocked (Windows 카메라 설정)
 */
export function classifyCameraError(err: unknown, permission: CameraPermission = "unknown"): CameraErrorKind {
  const { name, message = "" } = (err as { name?: string; message?: string } | null) ?? {};
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      if (/system/i.test(message) || permission === "granted") return "osBlocked";
      if (permission === "prompt") return "dismissed";
      return "denied";
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
      return { ok: false, kind: classifyCameraError(err, await queryCameraPermission()) };
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
