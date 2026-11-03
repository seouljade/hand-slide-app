import { useEffect, useState } from "react";
import { LOGO_SRC } from "../config";
import { formatClock } from "../lib/time";
import type { CameraStatus, Screen } from "../state/appState";

const CAMERA_TEXT: Record<CameraStatus, string> = {
  idle: "카메라 대기",
  on: "카메라 켜짐",
  off: "카메라 꺼짐",
};

interface Props {
  camera: CameraStatus;
  screen: Screen;
  onBack: () => void;
}

export function Header({ camera, screen, onBack }: Props) {
  return (
    <>
      <header className="app-header">
        <div className={`logo-slot${LOGO_SRC ? " has-img" : ""}`}>
          {LOGO_SRC ? <img src={LOGO_SRC} alt="부대 로고" /> : <span>부대<br />로고</span>}
        </div>
        <div className="title-block">
          <h1>손 제스처 슬라이드 넘김 도구</h1>
          <div className="sub">HAND-GESTURE SLIDE CONTROL · v{__APP_VERSION__}</div>
        </div>
        <div className="tags" aria-hidden>
          <span className="tag amber">AI</span>
          <span className="tag">무인체계</span>
          <span className="tag">미래전 컨셉 시제품</span>
        </div>
        <div className="spacer" />
        <div className={`cam-pill ${camera}`} role="status" aria-live="polite">
          <span className="dot" />
          {CAMERA_TEXT[camera]}
        </div>
        <Clock />
        {screen === "present" && (
          <button type="button" className="btn small" onClick={onBack}>◀ 준비 화면</button>
        )}
      </header>
      <div className="hazard" aria-hidden />
    </>
  );
}

function Clock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return <time className="clock mono">{formatClock(now)}</time>;
}
