/* Local assets only. Private statement bytes never enter the Cache API. */
const CACHE_NAME = 'momo-lens-v1';
const BASE_ASSETS = [
  '/',
  '/import/',
  '/review/',
  '/dashboard/',
  '/wrapped/',
  '/privacy/',
  '/about/',
  '/manifest.webmanifest',
  '/sample-statement.csv',
  '/pdf.worker.min.mjs',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch('/precache.json', { cache: 'no-store' });
      const assets = response.ok ? await response.json() : BASE_ASSETS;
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(assets);
      // Keep the current worker and its assets until all old tabs close.
      // Activating an update must never interrupt a local import or edit.
    })(),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('momo-lens-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(request, { ignoreSearch: true });
      if (match) return match;
      try {
        const response = await fetch(request);
        // Only public application assets may be cached, never user data or arbitrary URLs.
        if (
          response.ok &&
          (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/'))
        ) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        if (request.mode === 'navigate') {
          const route = await cache.match(`${url.pathname.replace(/\/$/, '')}/`);
          if (route) return route;
          const home = await cache.match('/');
          if (home) return home;
        }
        return new Response('This page is not cached yet. Open MoMo Lens once while online.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })(),
  );
});
