/**
 * Bebsayik.com — Service Worker (PWA Mobile Shell)
 * Version: 2.0.0
 * 
 * CRITICAL FINANCIAL SAFETY INVARIANT:
 * 1. Under NO circumstances are /api/* endpoints cached or served from cache.
 * 2. Authenticated user sessions, financial ledgers, and transactions are strictly NetworkOnly.
 * 3. Never auto-replay financial transactions or sales offline without explicit synchronization.
 */

const CACHE_NAME = 'bebsayik-pwa-v2.0.0';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Install Event: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Enforce strict safety boundary
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. STRICT FINANCIAL RULE: All /api/ calls must be NetworkOnly!
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Non-GET requests (POST, PUT, DELETE, PATCH): Always NetworkOnly
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 3. Static Assets: Network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid static responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.match(/\.(js|css|svg|png|jpg|woff2|woff|ttf)$/) || url.pathname === '/')
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Safe offline fallback from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Navigation fallback to cached index.html
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }

        return new Response('Offline: Network connection unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
