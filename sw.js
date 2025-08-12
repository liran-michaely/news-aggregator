// Updated service worker to ensure fresh content is served on each deployment.
// Version identifier for the cache. Bump this value when releasing a new build.
const CACHE = "news-aggregator-v5";

// List of resources to precache. We intentionally avoid caching index.html so
// the app shell is always fetched fresh from the network. Only immutable
// resources like the manifest and icons are cached up-front.
const PRECACHE = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// During the install phase, precache static assets and immediately activate the
// new service worker by calling skipWaiting().
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(PRECACHE);
    })
  );
});

// On activation, remove old caches and claim clients so the new service
// worker controls any open pages right away.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Intercept fetch requests. For navigation requests (HTML), use a
// network-first strategy: fetch from the network and fall back to cache on
// failure. For other assets, use cache-first and update the cache from
// the network.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const acceptHeader = req.headers.get('accept') || '';
  const isHTML = acceptHeader.includes('text/html');
  if (isHTML) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(req).then((res) => {
        // Only cache successful responses
        if (!res || res.status !== 200 || res.type !== 'basic') {
          return res;
        }
        const clone = res.clone();
        caches.open(CACHE).then((cache) => {
          cache.put(req, clone);
        });
        return res;
      });
    })
  );
});
