const CACHE_NAME = 'tasky-cache-v1';
const ASSETS = [
  '/',
  '/ka',
  '/favicon.ico',
  '/og.png'
];

// ინსტალზე ცოტა asset-ის ქეშში ჩაგდება
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => {
      return self.skipWaiting();
    })
  );
});

// ძველი ქეშების წაშლა
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// network-first fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || Promise.reject())
      )
  );
});
