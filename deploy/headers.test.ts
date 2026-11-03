import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderVercelConfig } from "./headers.ts";

describe("vercel.json", () => {
  it("deploy/headers.ts 와 같은 내용이다 (다르면 npm run gen:vercel)", () => {
    expect(readFileSync("vercel.json", "utf8").replace(/\r\n/g, "\n")).toBe(renderVercelConfig());
  });
});
