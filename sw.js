// 앱 파일을 기기에 저장해서 인터넷 없이도 열리게 하는 파일
// 화면(index.html)은 인터넷이 되면 항상 최신을 받아옴 → index.html만 올려도 바로 반영
// 아이콘·manifest를 바꿨을 때만 아래 버전 숫자를 올려 주세요
const CACHE = "robot-pad-v12";

const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

const NETWORK_WAIT_MS = 3000;   // 인터넷이 느리면 3초 뒤 저장된 화면으로

// 설치: 파일을 기기에 저장 (브라우저에 남은 예전 파일 말고 서버에서 새로)
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

function isPage(req) {
  if (req.mode === "navigate") return true;
  const path = new URL(req.url, self.location.href).pathname;
  return path.endsWith("/") || path.endsWith("/index.html");
}

// 화면: 인터넷 먼저 (최신) → 실패하거나 3초 넘으면 저장된 화면
async function pageFromNetworkFirst() {
  const cache = await caches.open(CACHE);
  try {
    // ?t= 를 붙여서 GitHub의 10분 캐시도 건너뜀
    const url = new URL("./index.html", self.location.href);
    url.searchParams.set("t", Date.now());
    const res = await Promise.race([
      fetch(new Request(url.href, { cache: "no-store" })),
      new Promise((_, reject) => setTimeout(() => reject(new Error("느림")), NETWORK_WAIT_MS)),
    ]);
    if (!res || !res.ok) throw new Error("서버 응답 이상");
    await cache.put("./index.html", res.clone());
    await cache.put("./", res.clone());
    return res;
  } catch (err) {
    const saved = (await cache.match("./index.html")) || (await caches.match("./index.html"));
    if (saved) {
      // 저장본이라는 표시를 붙여서 돌려줌 (앱이 "서버에 접속됐다"고 착각하지 않게)
      const headers = new Headers(saved.headers);
      headers.set("X-Robot-Pad-Cache", "1");
      return new Response(await saved.blob(), { status: 200, headers });
    }
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (isPage(e.request)) {
    e.respondWith(pageFromNetworkFirst());
    return;
  }
  // 아이콘 등: 저장본 먼저, 없으면 인터넷에서
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request))
  );
});
