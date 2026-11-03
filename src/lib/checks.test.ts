import { describe, expect, it } from "vitest";
import { detectBrowser } from "./checks";

const base = { hasGetUserMedia: true, hasWebAssembly: true };
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const EDGE = `${CHROME} Edg/142.0.0.0`;
const FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0";

describe("detectBrowser", () => {
  it("크롬을 허용한다", () => {
    expect(detectBrowser({ ...base, userAgent: CHROME })).toEqual({ ok: true, name: "Chrome 142" });
  });

  it("엣지를 허용한다", () => {
    expect(detectBrowser({ ...base, userAgent: EDGE })).toEqual({ ok: true, name: "Edge 142" });
  });

  it("파이어폭스는 안내한다", () => {
    expect(detectBrowser({ ...base, userAgent: FIREFOX }).ok).toBe(false);
  });

  it("카메라 기능이 없으면 크롬이어도 통과하지 않는다", () => {
    expect(detectBrowser({ ...base, hasGetUserMedia: false, userAgent: CHROME }).ok).toBe(false);
  });
});
