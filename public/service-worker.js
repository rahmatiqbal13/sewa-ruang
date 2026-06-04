const CACHE_NAME = 'sewa-ruang-v1';

// Install event - cache basic shell if needed
self.addEventListener('install', (_event) => {
  console.log('[ServiceWorker] Install');
  self.skipWaiting();
});

// Activate event - claim clients
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(self.clients.claim());
});

// Fetch event - network first, fallback to cache for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-HTTP(S) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // For API calls, always go to network
  if (request.url.includes('/api/')) {
    return;
  }

  // For static assets, try network first then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
