import { beforeEach, describe, expect, it } from "vitest";
import { GestureEngine } from "./engine";
import type { Gesture } from "./gesture";

const FRAME = 1000 / 30;

describe("GestureEngine", () => {
  let engine: GestureEngine;
  let now: number;
  const timing = { holdSec: 0.4, cooldownSec: 1.0 };

  /** ms 동안 같은 입력을 30fps 로 넣고, 그동안 확정된 동작을 돌려준다 */
  const feed = (g: Gesture | null, ms: number) => {
    const fired: Gesture[] = [];
    const end = now + ms;
    while (now < end) {
      now += FRAME;
      const r = engine.step(g, now);
      if (r.fired) fired.push(r.fired);
    }
    return fired;
  };

  beforeEach(() => {
    timing.holdSec = 0.4;
    engine = new GestureEngine(() => timing);
    now = 0;
  });

  it("유지 시간보다 짧은 동작은 무시한다", () => {
    expect(feed("next", 250)).toEqual([]);
    expect(feed(null, 500)).toEqual([]);
  });

  it("유지 시간을 채우면 한 번 확정한다", () => {
    expect(feed("next", 500)).toEqual(["next"]);
  });

  it("동작을 계속 유지해도 한 번만 넘긴다", () => {
    expect(feed("next", 5000)).toEqual(["next"]);
  });

  it("재입력 대기 중의 되돌림 동작은 무시한다", () => {
    feed("next", 450);
    expect(feed("prev", 600)).toEqual([]);
  });

  it("손을 풀었다가 다시 하면 다시 인식한다", () => {
    feed("next", 450);
    feed(null, 1100);
    expect(feed("next", 450)).toEqual(["next"]);
  });

  it("한두 프레임 인식이 끊겨도 유지 시간을 이어서 센다", () => {
    feed("next", 200);
    feed(null, 60);
    expect(feed("next", 200)).toEqual(["next"]);
  });

  it("상태가 인식 중 → 확정 → 재입력 대기 → 대기 순서로 바뀐다", () => {
    const phases: string[] = [];
    const end = now + 2000;
    while (now < end) {
      now += FRAME;
      const p = engine.step(now < 600 ? "next" : null, now).state.phase;
      if (phases[phases.length - 1] !== p) phases.push(p);
    }
    expect(phases).toEqual(["holding", "confirmed", "cooldown", "idle"]);
  });

  it("유지 시간 설정이 바로 반영된다", () => {
    timing.holdSec = 0.8;
    expect(feed("next", 600)).toEqual([]);
    expect(feed("next", 300)).toEqual(["next"]);
  });
});
