// 배포 서버가 붙여야 하는 보안·캐시 헤더의 단일 출처입니다.
// vite preview 와 vercel.json 이 이 값을 씁니다. 값을 바꾸면 `npm run gen:vercel` 로 vercel.json 을 다시 만듭니다.

/** Supabase 프로젝트 주소. 지금은 쓰지 않지만 연결하면 이 주소로만 통신을 허용합니다. */
const SUPABASE_ORIGINS = "https://*.supabase.co wss://*.supabase.co";

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": [
    "default-src 'self'",
    // MediaPipe 가 WebAssembly 를 컴파일하려면 wasm-unsafe-eval 이 필요합니다.
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${SUPABASE_ORIGINS}`,
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

/** 경로별 캐시 정책. 해시가 붙은 파일과 버전 경로는 오래 캐시하고, 진입 파일은 매번 확인합니다. */
export const CACHE_RULES: Array<[source: string, value: string]> = [
  ["/assets/(.*)", "public, max-age=31536000, immutable"],
  ["/mediapipe/(.*)", "public, max-age=31536000, immutable"],
  ["/sw.js", "no-cache"],
  ["/", "no-cache"],
  ["/index.html", "no-cache"],
];

const asList = (h: Record<string, string>) => Object.entries(h).map(([key, value]) => ({ key, value }));

/** vercel.json 내용 */
export function renderVercelConfig(): string {
  const config = {
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: "vite",
    installCommand: "npm ci",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    headers: [
      { source: "/(.*)", headers: asList(SECURITY_HEADERS) },
      ...CACHE_RULES.map(([source, value]) => ({ source, headers: [{ key: "Cache-Control", value }] })),
    ],
  };
  return JSON.stringify(config, null, 2) + "\n";
}
