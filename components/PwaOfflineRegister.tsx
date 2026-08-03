'use client';

import { useEffect } from 'react';

export default function PwaOfflineRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (registration) => {
        await registration.update().catch(() => undefined);
        const ready = await navigator.serviceWorker.ready;
        ready.active?.postMessage({ type: 'CACHE_OFFLINE_PAGES' });
      })
      .catch(() => undefined);
  }, []);

  return null;
}
