'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Evita erro no localhost. O Service Worker só será registrado em produção.
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.hostname !== 'localhost'
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function instalar() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setVisible(false);
    }

    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div className="install-banner">
      <div>
        <strong>Instalar AgroMarket</strong>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Use como app no celular.
        </div>
      </div>

      <button className="btn btn-primary" onClick={instalar}>
        Instalar
      </button>

      <button className="btn btn-secondary" onClick={() => setVisible(false)}>
        Agora não
      </button>
    </div>
  );
}
