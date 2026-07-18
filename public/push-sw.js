self.addEventListener('push', (event) => {
  let data = {
    title: 'AgroMarket',
    body: 'Você tem uma nova atualização.',
    url: '/',
    tag: 'agromarket-alert'
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'agromarket-alert',
    data: {
      url: data.url || '/'
    },
    requireInteraction: true,
    vibrate: [250, 120, 250]
  };

  event.waitUntil(self.registration.showNotification(data.title || 'AgroMarket', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
