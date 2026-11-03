/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { SECURITY_HEADERS } from "./deploy/headers.ts";

const mediapipeVersion: string = JSON.parse(
  readFileSync("node_modules/@mediapipe/tasks-vision/package.json", "utf8"),
).version;

export default defineConfig({
  plugins: [react()],
  define: {
    __MEDIAPIPE_VERSION__: JSON.stringify(mediapipeVersion),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev"),
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
  test: {
    include: ["src/**/*.test.ts", "deploy/**/*.test.ts"],
    environment: "node",
  },
});
