'use client';

import { useEffect } from 'react';

export default function PwaOfflineRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => registration.update())
      .catch(() => undefined);
  }, []);

  return null;
}
