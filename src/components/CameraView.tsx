import { useState } from "react";
import { useRuntime } from "../hooks/runtime";
import type { CameraIssue, CameraStatus } from "../state/appState";
import { CameraHelp } from "./CameraHelp";

interface Props {
  camera: CameraStatus;
  issue: CameraIssue | null;
  previewHidden?: boolean;
}

/**
 * 카메라 미리보기와 손 뼈대 오버레이.
 * 미리보기를 숨겨도 video 요소는 그대로 두어 인식이 계속됩니다 (F3-3).
 * 카메라를 켤 수 없으면 원인별 해결 방법을 화면 아래에 보여 줍니다.
 */
export function CameraView({ camera, issue, previewHidden = false }: Props) {
  const rt = useRuntime();
  const { attachVideo, attachCanvas, sim } = rt;
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };
  const turnOn = () => run(() => rt.runChecks());
  const retry = () => run(() => rt.retryCamera());

  return (
    <div className="cam-view">
      <div className={`cam-box${previewHidden ? " preview-hidden" : ""}`}>
        <video ref={attachVideo} muted playsInline autoPlay aria-label="카메라 미리보기" />
        <canvas ref={attachCanvas} aria-hidden />
        {camera === "idle" && (
          <div className="cam-msg">
            <div>
              <p>카메라가 아직 꺼져 있습니다.</p>
              <button type="button" className="btn primary" onClick={turnOn} disabled={busy}>
                {busy ? "켜는 중…" : "카메라 켜기"}
              </button>
              <p className="muted small">크롬이 카메라 사용을 물으면 "허용"을 눌러 주세요.</p>
            </div>
          </div>
        )}
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
            <div className="txt">아래 안내를 따라 카메라를 켜 주세요.</div>
          </div>
        )}
      </div>
      {camera === "off" && issue && <CameraHelp issue={issue} retrying={busy} onRetry={retry} />}
    </div>
  );
}
