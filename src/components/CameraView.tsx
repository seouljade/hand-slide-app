import { useState } from "react";
import { useRuntime } from "../hooks/runtime";
import type { CameraStatus } from "../state/appState";

interface Props {
  camera: CameraStatus;
  message: string;
  previewHidden?: boolean;
}

/**
 * 카메라 미리보기와 손 뼈대 오버레이.
 * 미리보기를 숨겨도 video 요소는 그대로 두어 인식이 계속됩니다 (F3-3).
 */
export function CameraView({ camera, message, previewHidden = false }: Props) {
  const rt = useRuntime();
  const { attachVideo, attachCanvas, sim } = rt;
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await rt.retryCamera();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className={`cam-box${previewHidden ? " preview-hidden" : ""}`}>
      <video ref={attachVideo} muted playsInline autoPlay aria-label="카메라 미리보기" />
      <canvas ref={attachCanvas} aria-hidden />
      {camera === "idle" && <div className="cam-msg">"점검 시작"을 누르면 카메라가 켜집니다.</div>}
      <div className="crosshair" aria-hidden />
      <span className="cam-corner tl" aria-hidden />
      <span className="cam-corner tr" aria-hidden />
      <span className="cam-corner bl" aria-hidden />
      <span className="cam-corner br" aria-hidden />
      <div className="cam-label mono" aria-hidden>CAM-01 · {sim ? "SIM" : "LIVE"}</div>
      <div className="cam-hidden-note">미리보기 숨김 · 인식은 계속 동작 중</div>
      {camera === "off" && (
        <div className="cam-off" role="alert">
          <div className="big">● 카메라 꺼짐</div>
          <div className="txt">{message}</div>
          <button type="button" className="btn primary" onClick={retry} disabled={retrying}>
            {retrying ? "켜는 중…" : "카메라 다시 켜기"}
          </button>
        </div>
      )}
    </div>
  );
}
