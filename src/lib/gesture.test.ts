import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../config";
import { analyzeHand, type Landmark } from "./gesture";
import { makeSimHand } from "./simHand";

const analyze = (lm: Landmark[], over = {}, w = 640, h = 480) =>
  analyzeHand(lm, w, h, { ...DEFAULT_SETTINGS, ...over });

describe("analyzeHand", () => {
  it("OK 사인을 다음으로 판정한다", () => {
    expect(analyze(makeSimHand("ok")).gesture).toBe("next");
  });

  it("엄지·새끼 붙이기를 이전으로 판정한다", () => {
    expect(analyze(makeSimHand("prev")).gesture).toBe("prev");
  });

  it("나머지 손가락을 접고 엄지·검지만 붙인 손짓은 무시한다", () => {
    expect(analyze(makeSimHand("pinch")).gesture).toBeNull();
  });

  it("OK 사인 조건 완화를 켜면 엄지·검지만 붙여도 다음으로 판정한다", () => {
    expect(analyze(makeSimHand("pinch"), { relaxOk: true }).gesture).toBe("next");
  });

  it("편 손은 넘김 동작이 아니다", () => {
    expect(analyze(makeSimHand("open")).gesture).toBeNull();
  });

  it("손 크기(카메라와의 거리)가 달라도 같은 결과를 낸다", () => {
    const small = makeSimHand("ok").map((p) => ({ x: 0.5 + (p.x - 0.5) * 0.5, y: 0.5 + (p.y - 0.5) * 0.5 }));
    const a = analyze(small);
    const b = analyze(makeSimHand("ok"));
    expect(a.gesture).toBe("next");
    expect(a.touch.index).toBeCloseTo(b.touch.index, 5);
  });

  it("붙임 판정 기준을 낮추면 덜 붙은 손은 인식하지 않는다", () => {
    expect(analyze(makeSimHand("ok"), { pinchRatio: 0.01 }).gesture).toBeNull();
  });

  it("펴짐 기준을 너무 높이면 OK 사인도 인식하지 않는다", () => {
    expect(analyze(makeSimHand("ok"), { extendRatio: 5 }).gesture).toBeNull();
  });
});
