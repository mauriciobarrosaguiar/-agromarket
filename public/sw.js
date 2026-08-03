const CACHE_NAME = 'agromarket-offline-v52';
const STATIC_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png', '/offline.html'];
const OFFLINE_PAGES = ['/painel/perfil', '/painel/gestao', '/painel/gestao/incubacao'];
const NETWORK_TIMEOUT_MS = 4500;

async function fetchWithTimeout(input, init = {}, timeout = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function cachePageAndAssets(cache, path) {
  try {
    const response = await fetchWithTimeout(path, {
      credentials: 'include',
      cache: 'no-store'
    }, 8000);
    if (!response.ok) return;

    const html = await response.clone().text();
    await cache.put(path, response.clone());

    const assetPaths = new Set();
    const matcher = /(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g;
    let match;
    while ((match = matcher.exec(html)) !== null) assetPaths.add(match[1]);

    await Promise.all(Array.from(assetPaths).map(async (assetPath) => {
      try {
        const assetResponse = await fetchWithTimeout(assetPath, { cache: 'no-store' }, 8000);
        if (assetResponse.ok) await cache.put(assetPath, assetResponse.clone());
      } catch {
        // Mantém os demais arquivos disponíveis mesmo se um recurso falhar.
      }
    }));
  } catch {
    // Mantém a versão previamente salva quando a internet estiver instável.
  }
}

async function cacheOfflinePages() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(OFFLINE_PAGES.map((path) => cachePageAndAssets(cache, path)));
}

async function notifyAndRefreshClients() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  await Promise.all(windows.map(async (client) => {
    client.postMessage({ type: 'AGROMARKET_UPDATE_READY', version: CACHE_NAME });

    try {
      const url = new URL(client.url);
      if (url.origin !== self.location.origin) return;
      if (!url.pathname.startsWith('/painel')) return;
      if (url.searchParams.get('__appv') === CACHE_NAME) return;

      url.searchParams.set('__appv', CACHE_NAME);
      if ('navigate' in client) await client.navigate(url.href);
    } catch {
      // A próxima abertura do aplicativo carregará a versão atualizada.
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_ASSETS);
    await cacheOfflinePages();
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
    await cacheOfflinePages();
    await notifyAndRefreshClients();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_OFFLINE_PAGES') {
    event.waitUntil(cacheOfflinePages());
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
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
        const response = await fetchWithTimeout(request, { cache: 'no-store' });
        if (response.ok) {
          await cache.put(request, response.clone());
          await cache.put(url.pathname, response.clone());
          if (OFFLINE_PAGES.includes(url.pathname)) {
            await cachePageAndAssets(cache, url.pathname);
          }
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
        fetchWithTimeout(request, { cache: 'no-store' }, 8000)
          .then((response) => response.ok ? cache.put(request, response.clone()) : undefined)
          .catch(() => undefined);
        return cached;
      }

      try {
        const response = await fetchWithTimeout(request, { cache: 'no-store' }, 8000);
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
      const response = await fetchWithTimeout(request);
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
