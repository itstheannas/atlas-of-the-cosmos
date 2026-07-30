const SHELL_CACHE_NAME = "atlas-cosmos-shell-v2";
const RUNTIME_CACHE_NAME = "atlas-cosmos-runtime-v2";
const MAX_RUNTIME_ENTRIES = 64;
const CORE_ROUTES = [
  "/",
  "/catalogue",
  "/tours",
  "/learning",
  "/about-data",
  "/manifest.webmanifest",
];

async function putRuntime(cacheKey, response) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  await cache.put(cacheKey, response);

  const keys = await cache.keys();
  const overflow = keys.length - MAX_RUNTIME_ENTRIES;
  if (overflow > 0) {
    await Promise.all(
      keys
        .slice(0, overflow)
        .map((cachedRequest) => cache.delete(cachedRequest)),
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ROUTES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("atlas-cosmos-") &&
                key !== SHELL_CACHE_NAME &&
                key !== RUNTIME_CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const normalizedKey = `${url.origin}${url.pathname}`;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(putRuntime(normalizedKey, copy));
          }
          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(normalizedKey)) ??
            (await caches.match("/", { cacheName: SHELL_CACHE_NAME })) ??
            new Response(
              "Atlas is unavailable offline until it has loaded once.",
              {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              },
            )
          );
        }),
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/_next/") ||
    /\.(?:css|js|png|svg|webp|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(normalizedKey).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(putRuntime(normalizedKey, copy));
            }
            return response;
          }),
      ),
    );
  }
});
