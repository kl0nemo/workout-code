const CACHE_NAME = 'kalc-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install event: cache all necessary assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(err => {
              console.log('Cache add failed for', url, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: network-first for external resources, cache-first for app
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // External CDN resources (React, Babel, Fonts, etc.) - network first
  if (url.hostname !== location.hostname) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Local assets - cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;
        return fetch(request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
      .catch(() => {
        // If offline and no cache, try to return index.html
        return caches.match('./index.html');
      })
  );
});
