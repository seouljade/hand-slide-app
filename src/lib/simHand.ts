import type { Landmark } from "./gesture";

/** 가상 손 시험 모드(?sim=1)와 단위 테스트에서 쓰는 손 모양 */
export type SimHandKind = "ok" | "prev" | "pinch" | "open";

export const SIM_HAND_LABELS: Record<SimHandKind, string> = {
  ok: "OK 사인",
  prev: "엄지·새끼",
  pinch: "엄지·검지만",
  open: "편 손",
};

const MCP: Record<"index" | "middle" | "ring" | "pinky", readonly [number, number, number]> = {
  index: [5, 0.43, 0.6],
  middle: [9, 0.48, 0.59],
  ring: [13, 0.53, 0.6],
  pinky: [17, 0.57, 0.62],
};

/** 카메라 앞 손바닥을 정면으로 본 모양의 관절 21개를 만듭니다. */
export function makeSimHand(kind: SimHandKind): Landmark[] {
  const lm: Landmark[] = new Array(21);
  const P = (x: number, y: number): Landmark => ({ x, y, z: 0 });
  lm[0] = P(0.5, 0.85);
  lm[1] = P(0.44, 0.79);
  lm[2] = P(0.4, 0.73);
  lm[3] = P(0.37, 0.67);
  lm[4] = P(0.34, 0.62);

  const setFinger = (name: keyof typeof MCP, tipX: number, tipY: number) => {
    const [m, x, y] = MCP[name];
    lm[m] = P(x, y);
    for (let k = 1; k <= 3; k++) lm[m + k] = P(x + ((tipX - x) * k) / 3, y + ((tipY - y) * k) / 3);
  };

  const curled = kind === "pinch" ? new Set(["middle", "ring", "pinky"]) : new Set<string>();
  for (const name of Object.keys(MCP) as Array<keyof typeof MCP>) {
    const [, x] = MCP[name];
    if (curled.has(name)) setFinger(name, x, 0.69);
    else setFinger(name, x + (x - 0.5) * 0.4, 0.3);
  }

  if (kind === "ok" || kind === "pinch") {
    setFinger("index", 0.4, 0.55);
    lm[3] = P(0.39, 0.62);
    lm[4] = P(0.405, 0.555);
  }
  if (kind === "prev") {
    setFinger("pinky", 0.52, 0.6);
    lm[3] = P(0.46, 0.65);
    lm[4] = P(0.515, 0.6);
  }
  return lm;
}
