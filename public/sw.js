const CACHE_NAME = "mylovecat-shell-v2";
const SCOPE_URL = self.registration.scope;
const INDEX_URL = new URL("index.html", SCOPE_URL).toString();
const ICON_URL = new URL("icon.svg", SCOPE_URL).toString();
const BADGE_URL = new URL("favicon.svg", SCOPE_URL).toString();
const APP_SHELL = [
  "",
  "index.html",
  "app.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "favicon.svg",
].map((path) => new URL(path, SCOPE_URL).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(INDEX_URL)));
    return;
  }

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_REMINDER") return;

  event.waitUntil(
    self.registration.showNotification("MyLoveCat", {
      body: "오늘 기록을 남길 시간이에요.",
      icon: ICON_URL,
      badge: BADGE_URL,
      tag: "mylovecat-daily-reminder",
    }),
  );
});
