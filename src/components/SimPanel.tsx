import { useState } from "react";
import { useRuntime } from "../hooks/runtime";
import { SIM_HAND_LABELS, type SimHandKind } from "../lib/simHand";

const KINDS = Object.keys(SIM_HAND_LABELS) as SimHandKind[];

/** 가상 손 시험 패널. 주소에 ?sim=1 을 붙였을 때만 보입니다. */
export function SimPanel() {
  const rt = useRuntime();
  const [hand, setHand] = useState<SimHandKind | null>(null);

  const pick = (k: SimHandKind | null) => {
    setHand(k);
    rt.setSimHand(k);
  };

  return (
    <aside className="sim-panel" aria-label="가상 손 시험">
      <b className="mono">가상 손 시험 (?sim=1)</b>
      <div className="row">
        <button type="button" className={hand === null ? "on" : ""} onClick={() => pick(null)}>손 없음</button>
        {KINDS.map((k) => (
          <button type="button" key={k} className={hand === k ? "on" : ""} onClick={() => pick(k)}>
            {SIM_HAND_LABELS[k]}
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" onClick={() => rt.simulateCameraLoss()}>카메라 끊기</button>
      </div>
    </aside>
  );
}
