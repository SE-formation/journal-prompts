/* Service worker : met l'appli en cache pour qu'elle s'ouvre même sans réseau.
   Les envois vers Make ne sont jamais mis en cache (ils passent directement). */
const CACHE = "journal-prompts-v1.1.0";
const SHELL = ["./", "index.html", "app.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                       // POST vers Make : pas de cache
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Pages ouvertes avec ?text=… (Partager) : on sert la page en cache sans les paramètres
    const key = req.mode === "navigate" ? "index.html" : req;
    e.respondWith(
      fetch(req).then(res => { if (res.ok && req.mode !== "navigate") caches.open(CACHE).then(c => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(key, { ignoreSearch: true }))
    );
  } else if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
  }
});
