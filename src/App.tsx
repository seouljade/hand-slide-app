import { useEffect, useReducer, useState } from "react";
import { Header } from "./components/Header";
import { SimPanel } from "./components/SimPanel";
import { RuntimeContext } from "./hooks/runtime";
import { Runtime } from "./lib/runtime";
import { PrepScreen } from "./screens/PrepScreen";
import { PresentScreen } from "./screens/PresentScreen";
import { initialState, reducer } from "./state/appState";

const SIM = new URLSearchParams(window.location.search).has("sim");

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [runtime] = useState(() => new Runtime(dispatch, SIM));

  useEffect(() => {
    runtime.start();
    void runtime.autoStart();
    return () => runtime.stop();
  }, [runtime]);

  useEffect(() => runtime.setSettings(state.settings), [runtime, state.settings]);
  useEffect(() => runtime.setScreen(state.screen), [runtime, state.screen]);

  // 시험용 보조 키 (결정 포인트 10). 발표 화면에서만 동작합니다.
  useEffect(() => {
    if (state.screen !== "present") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        dispatch({ type: "navigate", dir: 1, source: "key", at: Date.now() });
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        dispatch({ type: "navigate", dir: -1, source: "key", at: Date.now() });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.screen]);

  return (
    <RuntimeContext.Provider value={runtime}>
      <Header camera={state.camera} screen={state.screen} onBack={() => dispatch({ type: "back" })} />
      {state.screen === "prep"
        ? <PrepScreen state={state} dispatch={dispatch} />
        : <PresentScreen state={state} dispatch={dispatch} />}
      {SIM && <SimPanel />}
    </RuntimeContext.Provider>
  );
}
