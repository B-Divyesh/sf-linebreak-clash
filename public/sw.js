const CACHE_NAME = 'linebreak-clash-v4';
const SHELL = ['/', '/demo/', '/privacy/', '/terms/', '/404.html', '/favicon.svg', '/og-image.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    let homeMarkup = '';
    for (const path of SHELL) {
      const response = await fetch(new Request(path, { cache: 'reload' }));
      if (!response.ok) throw new Error(`Could not cache ${path}`);
      if (path === '/') homeMarkup = await response.clone().text();
      await cache.put(path, response);
    }
    const assets = [...homeMarkup.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
    for (const path of new Set(assets)) {
      const response = await fetch(new Request(path, { cache: 'reload' }));
      if (!response.ok) throw new Error(`Could not cache ${path}`);
      await cache.put(path, response);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = (await caches.match(url.pathname, { ignoreVary: true }))
        || (await caches.match(url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`, { ignoreVary: true }));
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match('/404.html'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(url.pathname, { ignoreVary: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
