'use client';

import { useEffect, useState } from 'react';

const INSTALL_DISMISSED_KEY = 'agromarket_install_banner_closed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 860px)').matches;
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.hostname !== 'localhost'
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }

    const handler = (event: Event) => {
      event.preventDefault();

      const jaFechou = localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
      if (!isMobileViewport() || jaFechou) return;

      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function fechar() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    setVisible(false);
    setDeferredPrompt(null);
  }

  async function instalar() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    setVisible(false);
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

      <button className="btn btn-secondary" onClick={fechar}>
        Agora não
      </button>
    </div>
  );
}
