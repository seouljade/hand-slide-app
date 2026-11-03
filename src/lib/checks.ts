import { ASSETS } from "../config";

export type CheckKey = "browser" | "camera" | "network" | "model";
export type CheckStatus = "idle" | "running" | "ok" | "fail";

export interface CheckResult {
  status: CheckStatus;
  /** 정상일 때 보여 줄 짧은 정보 (예: "Chrome 142") */
  detail?: string;
  /** 실패했을 때 보여 줄 해결 방법 한 문장 */
  hint?: string;
}

export const CHECK_ORDER: readonly CheckKey[] = ["browser", "camera", "network", "model"];

export const CHECK_LABELS: Record<CheckKey, string> = {
  browser: "브라우저",
  camera: "카메라",
  network: "인터넷",
  model: "손 인식 파일",
};

export interface BrowserInfo {
  userAgent: string;
  brands?: ReadonlyArray<{ brand: string; version: string }>;
  hasGetUserMedia: boolean;
  hasWebAssembly: boolean;
}

/** 크롬 계열(크롬, 엣지, 웨일 등)이고 카메라·WebAssembly 를 쓸 수 있는지 봅니다. */
export function detectBrowser(info: BrowserInfo): { ok: boolean; name: string } {
  const ua = info.userAgent;
  const brandText = (info.brands ?? []).map((b) => b.brand).join(" ");
  const edge = /Edg\//.test(ua) || /Microsoft Edge/.test(brandText);
  const chromium = /Chrom/.test(brandText) || edge || (/Chrome\//.test(ua) && !/OPR\//.test(ua));
  const version = (ua.match(edge ? /Edg\/(\d+)/ : /Chrome\/(\d+)/) ?? [])[1];
  const name = edge ? "Edge" : chromium ? "Chrome" : "기타 브라우저";
  return {
    ok: chromium && info.hasGetUserMedia && info.hasWebAssembly,
    name: version ? `${name} ${version}` : name,
  };
}

export function currentBrowserInfo(): BrowserInfo {
  const uaData = (navigator as Navigator & { userAgentData?: { brands: BrowserInfo["brands"] } }).userAgentData;
  return {
    userAgent: navigator.userAgent,
    brands: uaData?.brands,
    hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
    hasWebAssembly: typeof WebAssembly === "object",
  };
}

/**
 * 손 인식 파일을 받을 수 있는지 확인합니다.
 * 서버에 닿으면 정상, 닿지 않아도 이전에 받아 둔 파일(오프라인 캐시)이 있으면 정상으로 봅니다.
 */
export async function checkNetwork(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(ASSETS.model, { method: "HEAD", cache: "no-store" });
    if (res.ok) return { ok: true, detail: "서버 연결됨" };
  } catch {
    // 아래에서 캐시를 확인합니다.
  }
  if ("caches" in window && (await caches.match(ASSETS.model))) {
    return { ok: true, detail: "오프라인 · 저장된 파일 사용" };
  }
  return { ok: false, detail: "연결 안 됨" };
}
