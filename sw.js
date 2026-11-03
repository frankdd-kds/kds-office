// 偷偷摸摸辦公室 PWA：頁面走「先網路、失敗才用快取」，每小時更新一上線就看得到
const CACHE = "kds-office-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon-32.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate" || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  if (isPage) {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)); } return r; })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }
  // 圖示、manifest：先用快取，背景再更新
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; }).catch(() => hit);
      return hit || net;
    })
  );
});
// 頁面按 🔄 時：抓最新 index.html 放進快取，回報完成
self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "refresh") return;
  const done = () => { try { e.ports[0] && e.ports[0].postMessage("ok"); } catch (x) {} };
  e.waitUntil(fetch("./index.html?t=" + Date.now(), { cache: "no-store" }).then((r) => r.ok ? caches.open(CACHE).then((c) => c.put("./index.html", r)) : 0).catch(() => {}).then(done));
});
