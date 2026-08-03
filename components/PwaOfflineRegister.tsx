'use client';

import { useEffect } from 'react';

const CACHE_MESSAGE = { type: 'CACHE_OFFLINE_PAGES' };
const UPDATE_RELOAD_KEY = 'agromarket-pwa-update-reloaded-v52';
const OFFLINE_ROUTES = ['/painel/perfil', '/painel/gestao', '/painel/gestao/incubacao'];

export default function PwaOfflineRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registrationRef: ServiceWorkerRegistration | null = null;
    const timers: number[] = [];

    const requestCache = () => {
      const worker = registrationRef?.active
        || registrationRef?.waiting
        || registrationRef?.installing
        || navigator.serviceWorker.controller;
      worker?.postMessage(CACHE_MESSAGE);
    };

    const reloadForUpdate = () => {
      if (!navigator.onLine) return;
      if (sessionStorage.getItem(UPDATE_RELOAD_KEY) === '1') return;
      sessionStorage.setItem(UPDATE_RELOAD_KEY, '1');
      window.location.reload();
    };

    const cleanVersionParameter = () => {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('__appv')) return;
      url.searchParams.delete('__appv');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    };

    cleanVersionParameter();

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(async (registration) => {
        registrationRef = registration;
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        await registration.update().catch(() => undefined);
        const ready = await navigator.serviceWorker.ready;
        registrationRef = ready;
        requestCache();
        timers.push(window.setTimeout(requestCache, 1200));
        timers.push(window.setTimeout(requestCache, 4000));
      })
      .catch(() => undefined);

    const onControllerChange = () => {
      requestCache();
      timers.push(window.setTimeout(requestCache, 800));
      reloadForUpdate();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'AGROMARKET_UPDATE_READY') reloadForUpdate();
    };

    const onOnline = () => {
      sessionStorage.removeItem(UPDATE_RELOAD_KEY);
      requestCache();
      registrationRef?.update().catch(() => undefined);
    };

    const forceFullOfflineNavigation = (event: MouseEvent) => {
      if (navigator.onLine) return;
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (!OFFLINE_ROUTES.includes(url.pathname)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(url.href);
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.addEventListener('message', onMessage);
    window.addEventListener('online', onOnline);
    document.addEventListener('click', forceFullOfflineNavigation, true);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.removeEventListener('message', onMessage);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('click', forceFullOfflineNavigation, true);
    };
  }, []);

  return null;
}
