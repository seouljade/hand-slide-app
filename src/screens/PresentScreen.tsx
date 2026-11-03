import { useEffect, useState, type Dispatch } from "react";
import { CameraView } from "../components/CameraView";
import { Panel } from "../components/Panel";
import { TIMING } from "../config";
import { SLIDES } from "../data/slides";
import { useFrame } from "../hooks/runtime";
import type { Phase } from "../lib/engine";
import { formatClock, pad2 } from "../lib/time";
import type { Action, AppState, Flash } from "../state/appState";

interface Props {
  state: AppState;
  dispatch: Dispatch<Action>;
}

/** 화면 2 · 발표 시뮬레이션 (왼쪽 동작 인식, 가운데 신호, 오른쪽 슬라이드) */
export function PresentScreen({ state, dispatch }: Props) {
  return (
    <main className="present">
      <div className="present-left">
        <Panel
          code="SENSOR"
          title="동작 인식"
          aside={
            <button type="button" className="btn small" onClick={() => dispatch({ type: "togglePreview" })}>
              {state.previewHidden ? "미리보기 보이기" : "미리보기 숨기기"}
            </button>
          }
        >
          <CameraView camera={state.camera} issue={state.cameraIssue} previewHidden={state.previewHidden} />
        </Panel>
        <RecognitionPanel cameraOn={state.camera === "on"} holdSec={state.settings.holdSec} />
      </div>

      <SignalColumn signal={state.signal} />

      <div className="present-right">
        <SlideStage slide={state.slide} dir={state.slideDir} toast={state.toast} />
        <div className="slide-meta">
          <span className="slide-no mono" aria-live="polite">{state.slide + 1} / {SLIDES.length}</span>
          <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={SLIDES.length} aria-valuenow={state.slide + 1}>
            <i style={{ width: `${((state.slide + 1) / SLIDES.length) * 100}%` }} />
          </div>
        </div>
        <ol className="thumbs">
          {SLIDES.map((s, i) => (
            <li key={s.title} className={`thumb${i === state.slide ? " on" : ""}`} aria-current={i === state.slide}>
              <div className="n mono">{pad2(i + 1)}</div>
              {s.title}
            </li>
          ))}
        </ol>
        <Panel code="LOG" title="이벤트 기록" aside={<span className="muted tiny">최근 8건 · ← → 키로도 넘길 수 있음(시험용)</span>}>
          {state.log.length === 0 ? (
            <p className="muted small">아직 기록이 없습니다.</p>
          ) : (
            <ul className="log mono">
              {state.log.map((e) => (
                <li key={e.id}>
                  <span className="t">{formatClock(e.at)}</span>
                  <span className={e.tone}>{e.text}</span>
                  <span className="s">{e.slide}/{SLIDES.length}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </main>
  );
}

const PHASES: ReadonlyArray<[Phase, string]> = [
  ["idle", "대기"],
  ["holding", "인식 중"],
  ["confirmed", "확정"],
  ["cooldown", "재입력 대기"],
];
const NAME = { next: "다음", prev: "이전" } as const;

function RecognitionPanel({ cameraOn, holdSec }: { cameraOn: boolean; holdSec: number }) {
  const { hand, engine: e } = useFrame();

  let title: string = "대기";
  let sub = hand ? "손 인식됨 · 넘김 동작 아님" : "손 동작을 기다리는 중";
  if (!cameraOn) {
    title = "카메라 꺼짐";
    sub = "카메라를 다시 켜야 인식합니다";
  } else if (e.phase === "holding" && e.gesture) {
    title = `인식 중 · ${NAME[e.gesture]}`;
    sub = `${holdSec.toFixed(2)}초 유지하면 넘어갑니다`;
  } else if (e.phase === "confirmed" && e.gesture) {
    title = `확정 · ${NAME[e.gesture]}`;
    sub = "슬라이드를 넘겼습니다";
  } else if (e.phase === "cooldown") {
    title = "재입력 대기";
    sub = "잠시 입력을 무시합니다 (되돌리는 손짓 방지)";
  } else if (e.blocked) {
    sub = "손을 풀었다가 다시 해 주세요";
  }

  const hold = e.phase === "holding" ? Math.min(1, e.holdProgress) : e.phase === "confirmed" ? 1 : 0;
  return (
    <Panel code="STATUS" title="인식 상태" aside={<span className="muted mono tiny">{hand ? "손 인식됨" : "손 없음"}</span>}>
      <div className={`rec-text ${cameraOn ? e.phase : "off"}`} aria-live="polite">{title}</div>
      <div className="rec-sub">{sub}</div>
      <div className="bar-row"><span>동작 유지</span><div className="bar hold"><i style={{ width: `${hold * 100}%` }} /></div></div>
      <div className="bar-row"><span>재입력 대기</span><div className="bar cooldown"><i style={{ width: `${Math.max(0, Math.min(1, e.cooldownLeft)) * 100}%` }} /></div></div>
      <div className="flow">
        {PHASES.map(([p, label], i) => (
          <span key={p} className="flow-item">
            {i > 0 && <span className="arrow" aria-hidden>→</span>}
            <span className={`st ${p}${cameraOn && e.phase === p ? " on" : ""}`}>{label}</span>
          </span>
        ))}
      </div>
      <div className="gesture-help"><b>다음</b> 엄지+검지 붙이기(OK 사인) · <b>이전</b> 엄지+새끼 붙이기</div>
    </Panel>
  );
}

/** 값이 바뀔 때마다 잠깐 켜졌다 꺼지는 표시 */
function useFlash(flash: Flash | null, ms: number): string | null {
  const [expiredId, setExpiredId] = useState<number | null>(null);
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setExpiredId(flash.id), ms);
    return () => clearTimeout(id);
  }, [flash, ms]);
  return flash && flash.id !== expiredId ? flash.value : null;
}

function SignalColumn({ signal }: { signal: Flash | null }) {
  const on = useFlash(signal, TIMING.signalMs);
  return (
    <div className="signal" aria-hidden>
      <span className="lab mono">SIGNAL</span>
      <div className={`sig${on === "next" ? " on" : ""}`}>▶</div>
      <div className={`sig${on === "prev" ? " on" : ""}`}>◀</div>
    </div>
  );
}

function SlideStage({ slide, dir, toast }: { slide: number; dir: 1 | -1; toast: Flash | null }) {
  const toastText = useFlash(toast, TIMING.toastMs);
  return (
    <div className="slide-frame" data-dir={dir}>
      {SLIDES.map((s, i) => (
        <article
          key={s.title}
          className={`slide${s.cover ? " cover" : ""}${i === slide ? " active" : i < slide ? " before" : ""}`}
          aria-hidden={i !== slide}
        >
          {s.body}
          <footer className="slide-foot mono"><span>가상 세미나 · SAMPLE</span><span>{i + 1} / {SLIDES.length}</span></footer>
        </article>
      ))}
      <div className={`toast${toastText ? " show" : ""}`} role="status">{toastText}</div>
    </div>
  );
}
