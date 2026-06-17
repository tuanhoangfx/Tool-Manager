/* P0020 — tab chunk cache (prod reload).
 * index-* main bundle: network-first (deploy must show immediately).
 * feature-* lazy chunks: stale-while-revalidate.
 */
const CACHE = "p0020-tab-chunks-v2";
const INDEX_RE = /\/assets\/index-[^/?#]*/i;
const FEATURE_RE = /\/assets\/feature-(sheet|todo|twofa|cookie|system)[^/?#]*/i;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;

  if (INDEX_RE.test(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const res = await fetch(event.request);
          if (res.ok) void cache.put(event.request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw new Error("index bundle offline and not cached");
        }
      }),
    );
    return;
  }

  if (!FEATURE_RE.test(url)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) void cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
