import { describe, expect, it } from "vitest";
import { classifyCameraError } from "./camera";

describe("classifyCameraError", () => {
  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotReadableError", "busy"],
    ["TrackStartError", "busy"],
    ["NotFoundError", "notFound"],
    ["OverconstrainedError", "notFound"],
    ["WhateverError", "unknown"],
  ])("%s → %s", (name, kind) => {
    expect(classifyCameraError({ name })).toBe(kind);
  });

  it("오류 객체가 없어도 unknown 으로 처리한다", () => {
    expect(classifyCameraError(null)).toBe("unknown");
  });
});
