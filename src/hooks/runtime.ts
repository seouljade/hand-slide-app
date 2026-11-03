import { createContext, useContext, useSyncExternalStore } from "react";
import type { FrameSnapshot, Runtime } from "../lib/runtime";

export const RuntimeContext = createContext<Runtime | null>(null);

export function useRuntime(): Runtime {
  const rt = useContext(RuntimeContext);
  if (!rt) throw new Error("RuntimeContext 가 없습니다");
  return rt;
}

/** 프레임마다 바뀌는 인식 결과. 값이 실제로 바뀐 경우에만 다시 그립니다. */
export function useFrame(): FrameSnapshot {
  const rt = useRuntime();
  return useSyncExternalStore(rt.subscribe, rt.getFrame);
}
