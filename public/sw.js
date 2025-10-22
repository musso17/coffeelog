const CACHE_VERSION = 'cafe-log-v1';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!key.startsWith(CACHE_VERSION)) {
            return caches.delete(key);
          }
          return undefined;
        }),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (CORE_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith('/api/') || request.headers.get('accept')?.includes('application/json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => cached || fetch(request));
}

function staleWhileRevalidate(request) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      });
      return cached || networkFetch;
    }),
  );
}

function networkFirst(request) {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => cache.match(request)),
  );
}
