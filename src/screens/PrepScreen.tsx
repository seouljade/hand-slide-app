import { useState, type Dispatch } from "react";
import { CameraView } from "../components/CameraView";
import { Panel } from "../components/Panel";
import { SETTING_FIELDS } from "../config";
import { useFrame, useRuntime } from "../hooks/runtime";
import { CHECK_LABELS, CHECK_ORDER, type CheckStatus } from "../lib/checks";
import type { FingerName, Gesture } from "../lib/gesture";
import type { Action, AppState } from "../state/appState";

interface Props {
  state: AppState;
  dispatch: Dispatch<Action>;
}

/** 화면 1 · 발표 전 준비 */
export function PrepScreen({ state, dispatch }: Props) {
  return (
    <main className="prep">
      <div className="prep-col">
        <ChecksPanel state={state} />
        <Panel code="STEP 2" title="발표 전 확인">
          <ul className="todo">
            <li>노트북 전원을 연결하고 인터넷 연결을 확인합니다.</li>
            <li>화상회의 등 카메라를 쓰는 프로그램을 종료합니다.</li>
            <li>카메라에서 50~70cm 떨어져 손 전체가 화면에 보이게 섭니다.</li>
            <li>얼굴과 손이 밝게 비치게 하고, 뒤쪽 창문의 역광을 피합니다.</li>
          </ul>
        </Panel>
        <SettingsPanel state={state} dispatch={dispatch} />
      </div>
      <div className="prep-col">
        <Panel code="STEP 3" title="동작 연습">
          <div className="practice">
            <CameraView camera={state.camera} message={state.cameraMessage} />
            <div className="cards">
              <PracticeCard gesture="next" count={state.practice.next} name="다음 ▶"
                desc="엄지와 검지를 붙이고 나머지 세 손가락은 폅니다 (OK 사인)." />
              <PracticeCard gesture="prev" count={state.practice.prev} name="◀ 이전"
                desc="엄지와 새끼손가락을 붙이고 나머지 세 손가락은 폅니다." />
              <p className="muted small">
                동작을 잠깐 유지하면 인식됩니다. 엄지척·주먹·브이·손 흔들기는 넘김으로 쓰지 않습니다.
              </p>
            </div>
          </div>
        </Panel>
        <Panel code="STEP 5" title="발표 시작">
          <div className="start-row">
            <button type="button" className="btn primary large" onClick={() => dispatch({ type: "start", at: Date.now() })}>
              발표 시작 ▶
            </button>
            <span className="start-msg" role="alert">{state.startError}</span>
          </div>
          <p className="muted small">
            카메라 영상은 이 브라우저 안에서만 처리하며 서버로 보내거나 저장하지 않습니다. 설정값도 저장하지 않습니다.
          </p>
        </Panel>
      </div>
    </main>
  );
}

const BADGE: Record<CheckStatus, string> = { idle: "미점검", running: "점검 중…", ok: "정상", fail: "확인 필요" };

function ChecksPanel({ state }: { state: AppState }) {
  const rt = useRuntime();
  const [busy, setBusy] = useState(false);
  const started = CHECK_ORDER.some((k) => state.checks[k].status !== "idle");

  const run = async () => {
    setBusy(true);
    try {
      await rt.runChecks();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel code="STEP 1" title="사전 점검">
      <ul className="check-list">
        {CHECK_ORDER.map((key) => {
          const c = state.checks[key];
          return (
            <li key={key} className={`check-item ${c.status}`}>
              <span className="name">{CHECK_LABELS[key]}</span>
              <span className="detail mono">{c.detail}</span>
              <span className="badge">{BADGE[c.status]}</span>
              {c.status === "fail" && c.hint && <span className="hint">→ {c.hint}</span>}
            </li>
          );
        })}
      </ul>
      <div className="row">
        <button type="button" className="btn primary" onClick={run} disabled={busy}>
          {busy ? "점검 중…" : started ? "다시 점검" : "점검 시작"}
        </button>
        <span className="muted small">처음에는 손 인식 파일(약 8MB)을 내려받느라 몇 초 걸립니다.</span>
      </div>
    </Panel>
  );
}

function PracticeCard({ gesture, count, name, desc }: { gesture: Gesture; count: number; name: string; desc: string }) {
  const { engine } = useFrame();
  const holding = engine.phase === "holding" && engine.gesture === gesture;
  return (
    <div className={`gcard${count ? " ok" : ""}`}>
      {count > 0 && <span className="gflash" key={count} aria-hidden />}
      <div className="gname">{name}</div>
      <div className="gdesc">{desc}</div>
      <div className="gstate mono" aria-live="polite">
        {holding ? "인식 중…" : count ? `인식됨 ✓ (${count}회)` : "대기"}
      </div>
      <div className="minibar"><i style={{ width: `${holding ? Math.min(1, engine.holdProgress) * 100 : 0}%` }} /></div>
    </div>
  );
}

function SettingsPanel({ state, dispatch }: Props) {
  const s = state.settings;
  return (
    <Panel code="STEP 4" title="인식 설정">
      <div className="settings">
        {SETTING_FIELDS.map((f) => (
          <div className="set-row" key={f.key}>
            <label htmlFor={`set-${f.key}`}>{f.label}</label>
            <input
              id={`set-${f.key}`}
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={s[f.key]}
              onChange={(e) => dispatch({ type: "settings", patch: { [f.key]: Number(e.target.value) } })}
            />
            <output htmlFor={`set-${f.key}`} className="mono">{f.format(s[f.key])}</output>
            {f.note && <div className="note">{f.note}</div>}
          </div>
        ))}
        <label className="chk">
          <input
            type="checkbox"
            checked={s.relaxOk}
            onChange={(e) => dispatch({ type: "settings", patch: { relaxOk: e.target.checked } })}
          />
          OK 사인 조건 완화 (엄지·검지 붙이기만으로 "다음" 인식)
        </label>
        <LiveValues pinch={s.pinchRatio} extend={s.extendRatio} cameraOn={state.camera === "on"} />
        <div>
          <button type="button" className="btn small" onClick={() => dispatch({ type: "resetSettings" })}>기본값으로</button>
        </div>
      </div>
    </Panel>
  );
}

/** 현재 손의 인식 값. 기준을 통과한 값은 초록색으로 보여 줍니다. */
function LiveValues({ pinch, extend, cameraOn }: { pinch: number; extend: number; cameraOn: boolean }) {
  const { analysis: a } = useFrame();
  if (!a) {
    return (
      <div className="live mono">
        <span className="k">현재 손의 인식 값</span>
        <span className="muted">{cameraOn ? "손 없음" : "카메라 꺼짐"}</span>
      </div>
    );
  }
  const T = (n: FingerName) => <span className={a.touch[n] < pinch ? "pass" : ""}>{a.touch[n].toFixed(2)}</span>;
  const E = (n: FingerName) => <span className={a.extension[n] > extend ? "pass" : ""}>{a.extension[n].toFixed(2)}</span>;
  const verdict = a.gesture === "next" ? "다음 (OK 사인)" : a.gesture === "prev" ? "이전 (엄지·새끼)" : "넘김 동작 아님";
  return (
    <div className="live mono">
      <span><span className="k">엄지–검지 거리</span> {T("index")}</span>
      <span><span className="k">엄지–새끼 거리</span> {T("pinky")}</span>
      <span><span className="k">펴짐 검지</span> {E("index")} <span className="k">중지</span> {E("middle")}</span>
      <span><span className="k">펴짐 약지</span> {E("ring")} <span className="k">새끼</span> {E("pinky")}</span>
      <span className="verdict"><span className="k">판정</span> {verdict} <span className="k">· 초록 = 기준 통과</span></span>
    </div>
  );
}
