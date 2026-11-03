export const pad2 = (n: number) => String(n).padStart(2, "0");

/** 시:분:초 (24시간) */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
