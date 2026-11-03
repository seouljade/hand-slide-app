// MediaPipe 런타임(wasm)과 손 인식 모델을 public/ 아래에 준비합니다.
// 앱이 외부 CDN 없이 자기 서버에서 모든 파일을 내려주도록 하기 위한 단계입니다.
// - wasm: node_modules/@mediapipe/tasks-vision 에서 복사 (버전별 경로)
// - 모델: Google 저장소에서 한 번 내려받고 SHA-256 으로 무결성을 확인
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mpDir = join(root, "node_modules", "@mediapipe", "tasks-vision");
const { version } = JSON.parse(await readFile(join(mpDir, "package.json"), "utf8"));

const MODEL = {
  url: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  file: "hand_landmarker-float16-v1.task",
  sha256: process.env.HAND_MODEL_SHA256 ?? "fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1",
};

const exists = (p) => stat(p).then(() => true, () => false);
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const wasmOut = join(root, "public", "mediapipe", version, "wasm");
if (!(await exists(wasmOut))) {
  await mkdir(dirname(wasmOut), { recursive: true });
  await cp(join(mpDir, "wasm"), wasmOut, { recursive: true });
  console.log(`[assets] wasm ${version} 복사 완료`);
}

const modelOut = join(root, "public", "mediapipe", "models", MODEL.file);
if (await exists(modelOut)) {
  const hash = sha256(await readFile(modelOut));
  if (hash !== MODEL.sha256) {
    throw new Error(`[assets] 모델 파일 해시 불일치: ${modelOut}\n  기대 ${MODEL.sha256}\n  실제 ${hash}\n파일을 지우고 다시 실행하세요.`);
  }
} else {
  console.log("[assets] 손 인식 모델 내려받는 중…");
  const res = await fetch(MODEL.url);
  if (!res.ok) throw new Error(`[assets] 모델 다운로드 실패: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = sha256(buf);
  if (hash !== MODEL.sha256) {
    throw new Error(`[assets] 내려받은 모델의 해시가 다릅니다.\n  기대 ${MODEL.sha256}\n  실제 ${hash}`);
  }
  await mkdir(dirname(modelOut), { recursive: true });
  await writeFile(modelOut + ".part", buf);
  await rename(modelOut + ".part", modelOut);
  console.log(`[assets] 모델 저장 완료 (${(buf.length / 1e6).toFixed(1)} MB)`);
}
