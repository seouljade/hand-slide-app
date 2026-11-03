import type { EngineState } from "./engine";
import { FINGERS, HAND_BONES, LANDMARK, type HandAnalysis, type Landmark } from "./gesture";

const COLOR = {
  bone: "rgba(63,208,201,0.9)",
  joint: "#e8e5d0",
  tip: "#f2a900",
  amber: "#f2a900",
  amberDim: "rgba(242,169,0,0.55)",
  cyan: "#3fd0c9",
  green: "#5fd36d",
  khaki: "#9a9465",
};

const TIPS = new Set([4, 8, 12, 16, 20]);

/** 가상 카메라 모드의 배경 격자 */
export function drawSimBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#0b0e08";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(63,208,201,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.fillStyle = "rgba(63,208,201,0.5)";
  ctx.font = "14px Consolas, monospace";
  ctx.fillText("가상 카메라 (SIM)", 14, h - 14);
}

/**
 * 손 뼈대, 엄지와 가까워진 손가락의 연결선, 손 위 태그를 그립니다 (F4-2).
 * 카메라 화면이 거울처럼 좌우 반전되어 보이므로 x 좌표도 반전해 그립니다.
 */
export function drawHand(
  ctx: CanvasRenderingContext2D,
  lm: readonly Landmark[],
  analysis: HandAnalysis,
  engine: EngineState,
  pinchRatio: number,
  w: number,
  h: number,
): void {
  const X = (i: number) => (1 - lm[i].x) * w;
  const Y = (i: number) => lm[i].y * h;
  const s = w / 640;

  for (const [name, tip] of FINGERS) {
    const r = analysis.touch[name];
    if (r > pinchRatio * 2) continue;
    const touching = r < pinchRatio;
    ctx.save();
    ctx.strokeStyle = touching ? COLOR.amber : COLOR.amberDim;
    ctx.lineWidth = (touching ? 5 : 2) * s;
    if (!touching) ctx.setLineDash([6 * s, 6 * s]);
    ctx.beginPath();
    ctx.moveTo(X(LANDMARK.thumbTip), Y(LANDMARK.thumbTip));
    ctx.lineTo(X(tip), Y(tip));
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = COLOR.bone;
  ctx.lineWidth = 2.5 * s;
  for (const [p, q] of HAND_BONES) {
    ctx.beginPath(); ctx.moveTo(X(p), Y(p)); ctx.lineTo(X(q), Y(q)); ctx.stroke();
  }
  for (let i = 0; i < lm.length; i++) {
    ctx.fillStyle = TIPS.has(i) ? COLOR.tip : COLOR.joint;
    ctx.beginPath();
    ctx.arc(X(i), Y(i), (TIPS.has(i) ? 5 : 3.5) * s, 0, Math.PI * 2);
    ctx.fill();
  }

  let minX = w, maxX = 0, minY = h;
  for (let i = 0; i < lm.length; i++) {
    minX = Math.min(minX, X(i)); maxX = Math.max(maxX, X(i)); minY = Math.min(minY, Y(i));
  }
  const g = engine.phase === "idle" ? analysis.gesture : engine.gesture ?? analysis.gesture;
  const label = g === "next" ? "OK 사인 · 다음" : g === "prev" ? "엄지·새끼 · 이전" : "손 인식됨";
  const color =
    engine.phase === "confirmed" ? COLOR.green :
    engine.phase === "cooldown" ? COLOR.amber :
    engine.phase === "holding" || g ? COLOR.cyan : COLOR.khaki;

  ctx.font = `bold ${15 * s}px "Malgun Gothic", sans-serif`;
  const tw = ctx.measureText(label).width + 16 * s;
  const th = 24 * s;
  const tx = Math.max(4, Math.min(w - tw - 4, (minX + maxX) / 2 - tw / 2));
  const ty = Math.max(4, minY - th - 10 * s);
  ctx.fillStyle = "rgba(10,12,7,0.85)";
  ctx.fillRect(tx, ty, tw, th);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * s;
  ctx.strokeRect(tx, ty, tw, th);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(label, tx + 8 * s, ty + th / 2 + 1);
  if (engine.phase === "holding") {
    ctx.fillStyle = COLOR.cyan;
    ctx.fillRect(tx, ty + th, tw * Math.min(1, engine.holdProgress), 3 * s);
  }
}
