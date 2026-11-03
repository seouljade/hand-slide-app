import { describe, expect, it } from "vitest";
import { CHECK_ORDER } from "../lib/checks";
import { initialState, reducer, SLIDE_COUNT, type Action, type AppState } from "./appState";

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s);
const passAll = (s: AppState) =>
  run(s, ...CHECK_ORDER.map((key): Action => ({ type: "check", key, result: { status: "ok" } })), { type: "cameraOn" });
const nav = (dir: 1 | -1): Action => ({ type: "navigate", dir, source: "hand", at: 0 });
const presenting = () => run(passAll(initialState()), { type: "start", at: 0 });

describe("발표 시작 (F1-5)", () => {
  it("점검 전에는 시작하지 않고 이유를 알려 준다", () => {
    const s = run(initialState(), { type: "start", at: 0 });
    expect(s.screen).toBe("prep");
    expect(s.startError).toContain("점검");
  });

  it("실패한 항목의 해결 방법을 알려 준다", () => {
    const s = run(
      passAll(initialState()),
      { type: "check", key: "camera", result: { status: "fail", hint: "카메라 권한이 꺼져 있습니다." } },
      { type: "start", at: 0 },
    );
    expect(s.screen).toBe("prep");
    expect(s.startError).toContain("카메라 권한");
  });

  it("모든 점검을 통과하면 발표 화면으로 간다", () => {
    const s = presenting();
    expect(s.screen).toBe("present");
    expect(s.log[0].text).toBe("발표 시작");
  });
});

describe("슬라이드 이동 (F2)", () => {
  it("다음·이전으로 이동하고 신호를 켠다", () => {
    let s = run(presenting(), nav(1));
    expect(s.slide).toBe(1);
    expect(s.signal?.value).toBe("next");
    s = run(s, nav(-1));
    expect(s.slide).toBe(0);
    expect(s.signal?.value).toBe("prev");
  });

  it("첫 슬라이드에서는 이동하지 않고 안내한다", () => {
    const s = run(presenting(), nav(-1));
    expect(s.slide).toBe(0);
    expect(s.toast?.value).toBe("첫 슬라이드");
  });

  it("마지막 슬라이드에서는 이동하지 않고 안내한다", () => {
    const s = run(presenting(), ...Array.from({ length: SLIDE_COUNT + 2 }, () => nav(1)));
    expect(s.slide).toBe(SLIDE_COUNT - 1);
    expect(s.toast?.value).toBe("마지막 슬라이드");
  });

  it("준비 화면에서는 슬라이드를 넘기지 않는다", () => {
    expect(run(initialState(), nav(1)).slide).toBe(0);
  });
});

describe("이벤트 기록 (F4-6)", () => {
  it("최근 8건만 최신순으로 남긴다", () => {
    const s = run(presenting(), ...Array.from({ length: 12 }, () => nav(1)));
    expect(s.log).toHaveLength(8);
    expect(s.log[0].id).toBeGreaterThan(s.log[1].id);
  });

  it("카메라 꺼짐과 복귀를 기록하고 점검 상태도 바꾼다", () => {
    let s = run(passAll(initialState()), { type: "cameraOff", issue: "lost", message: "끊김", at: 0 });
    expect(s.camera).toBe("off");
    expect(s.checks.camera.status).toBe("fail");
    expect(s.log[0].text).toBe("카메라 꺼짐");
    s = run(s, { type: "cameraBack", at: 0 });
    expect(s.camera).toBe("on");
    expect(s.log[0].text).toBe("카메라 복귀");
  });
});
