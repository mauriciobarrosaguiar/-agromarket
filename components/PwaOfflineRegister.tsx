'use client';

import { useEffect } from 'react';

const CACHE_MESSAGE = { type: 'CACHE_OFFLINE_PAGES' };

export default function PwaOfflineRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registrationRef: ServiceWorkerRegistration | null = null;

    const requestCache = () => {
      const worker = registrationRef?.active || registrationRef?.waiting || registrationRef?.installing || navigator.serviceWorker.controller;
      worker?.postMessage(CACHE_MESSAGE);
    };

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (registration) => {
        registrationRef = registration;
        await registration.update().catch(() => undefined);
        const ready = await navigator.serviceWorker.ready;
        registrationRef = ready;
        requestCache();
        window.setTimeout(requestCache, 1200);
        window.setTimeout(requestCache, 4000);
      })
      .catch(() => undefined);

    const onControllerChange = () => {
      requestCache();
      window.setTimeout(requestCache, 800);
    };
    const onOnline = () => requestCache();

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    window.addEventListener('online', onOnline);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return null;
}
