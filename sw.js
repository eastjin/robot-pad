// 앱을 고쳐서 다시 올릴 때는 이 버전 숫자를 올려 주세요 (v1 → v2)
const CACHE = "robot-pad-v10";

const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// 설치: 파일을 태블릿에 저장
// cache: "reload" = 브라우저에 남은 예전 파일 말고 서버에서 새로 받아옴
// (안 그러면 GitHub의 10분 캐시 때문에 새 버전 이름으로 예전 화면이 저장될 수 있음)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

// 새 버전이 오면 옛날 저장본 삭제
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청: 저장본 먼저, 없으면 인터넷에서
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request))
  );
});
