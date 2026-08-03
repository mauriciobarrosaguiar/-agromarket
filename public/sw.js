const CACHE_NAME = 'agromarket-offline-v50';
const STATIC_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png', '/offline.html'];
const OFFLINE_PAGES = ['/painel/perfil', '/painel/gestao', '/painel/gestao/incubacao'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

async function cacheOfflinePages() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(OFFLINE_PAGES.map(async (path) => {
    try {
      const response = await fetch(path, { credentials: 'include', cache: 'no-store' });
      if (response.ok) await cache.put(path, response.clone());
    } catch {
      // Mantém a versão já salva quando a internet estiver instável.
    }
  }));
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_OFFLINE_PAGES') {
    event.waitUntil(cacheOfflinePages());
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          await cache.put(url.pathname, response.clone());
        }
        return response;
      } catch {
        return (await cache.match(request))
          || (await cache.match(url.pathname))
          || (await cache.match('/offline.html'));
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || ['script', 'style', 'font', 'image'].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        event.waitUntil(fetch(request).then((response) => {
          if (response.ok) return cache.put(request, response.clone());
          return undefined;
        }).catch(() => undefined));
        return cached;
      }

      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return (await cache.match(request)) || new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'AgroMarket';
  const options = {
    body: payload.body || 'Nova pendência para conferir.',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'agromarket-admin-alert',
    data: {
      url: payload.url || '/painel',
      ...(payload.data || {})
    },
    requireInteraction: true,
    vibrate: [250, 120, 250]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/painel', self.location.origin);

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of windows) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === targetUrl.origin && clientUrl.pathname === targetUrl.pathname) {
        if ('focus' in client) await client.focus();
        return;
      }
    }

    if (self.clients.openWindow) await self.clients.openWindow(targetUrl.href);
  })());
});
