/*
 * HakimeRAD IR Booking service worker.
 *
 * Policy: only public shell assets are cached. HTML from signed-in routes, API
 * responses and uploaded documents are never stored, so a shared device cannot
 * serve another person's clinical information from the cache. Offline, the app
 * shows the public offline page and refuses to submit anything.
 */
const VERSION = "hakimerad-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico",
];

// Never cached: anything patient-specific or session-specific.
const PRIVATE_PREFIXES = [
  "/api/",
  "/auth/",
  "/account",
  "/admin",
  "/dashboard",
  "/requests",
  "/staff",
  "/schedule",
  "/urgent",
  "/notifications",
  "/uploads",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") void self.skipWaiting();
});

function isPrivate(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivate(url.pathname)) return; // network only, never stored

  if (request.mode === "navigate") {
    // Network first so fresh server HTML is always used; fall back to the
    // public offline page. HTML itself is never written to the cache.
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(VERSION);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
    return;
  }

  const cacheable = ["script", "style", "image", "font"].includes(request.destination);
  if (!cacheable) return;

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) void cache.put(request, response.clone());
      return response;
    }),
  );
});
