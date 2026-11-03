import { describe, expect, it } from "vitest";
import { classifyCameraError } from "./camera";

describe("classifyCameraError", () => {
  it.each([
    ["SecurityError", "denied"],
    ["NotReadableError", "busy"],
    ["TrackStartError", "busy"],
    ["NotFoundError", "notFound"],
    ["OverconstrainedError", "notFound"],
    ["WhateverError", "unknown"],
  ])("%s → %s", (name, kind) => {
    expect(classifyCameraError({ name })).toBe(kind);
  });

  it("권한 거부는 사이트 권한 상태에 따라 원인을 나눈다", () => {
    const denied = { name: "NotAllowedError", message: "Permission denied" };
    expect(classifyCameraError(denied, "denied")).toBe("denied");
    expect(classifyCameraError(denied, "prompt")).toBe("dismissed");
    expect(classifyCameraError(denied, "granted")).toBe("osBlocked");
  });

  it("Windows 가 막은 경우를 알아본다", () => {
    expect(classifyCameraError({ name: "NotAllowedError", message: "Permission denied by system" }, "unknown")).toBe("osBlocked");
  });

  it("오류 객체가 없어도 unknown 으로 처리한다", () => {
    expect(classifyCameraError(null)).toBe("unknown");
  });
});
