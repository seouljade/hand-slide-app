// 오프라인 지원 서비스 워커.
// 한 번 접속해 손 인식 파일까지 받은 노트북은 이후 인터넷 없이도 도구를 열 수 있습니다.
// - 페이지(HTML): 네트워크 우선, 실패하면 저장본
// - /assets/, /mediapipe/: 파일 이름이나 경로에 버전이 있으므로 저장본 우선
// 카메라 영상은 이 워커를 거치지 않습니다.

const CACHE = "hand-slide-v1";
const SHELL = ["./", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const scopePath = new URL(self.registration.scope).pathname;
const isVersioned = (path) =>
  path.startsWith(`${scopePath}assets/`) || path.startsWith(`${scopePath}mediapipe/`);

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(request, copy));
  }
  return res;
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
    }
    return res;
  } catch (err) {
    const hit = (await caches.match(request)) ?? (await caches.match(SHELL[0]));
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else if (isVersioned(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
