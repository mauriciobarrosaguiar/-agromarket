'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const INSTALL_DISMISSED_KEY = 'agromarket_install_banner_closed_v2';

type InstallAppButtonProps = {
  variant?: 'banner' | 'button';
  label?: string;
  className?: string;
  full?: boolean;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 860px)').matches;
}

function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(navigatorWithStandalone.standalone);
}

export default function InstallAppButton({ variant = 'banner', label = 'Baixar app', className = 'btn-secondary', full = false }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStandalone(isStandaloneApp());

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.hostname !== 'localhost'
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }

    let timer: number | undefined;
    const jaFechou = localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
    if (variant === 'banner' && isMobileViewport() && !isStandaloneApp() && !jaFechou) {
      timer = window.setTimeout(() => setBannerVisible(true), 1400);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      if (isStandaloneApp()) return;

      setDeferredPrompt(event as BeforeInstallPromptEvent);
      const bannerFechado = localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
      if (variant === 'banner' && isMobileViewport() && !bannerFechado) {
        setBannerVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [variant]);

  function fecharBanner() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    setBannerVisible(false);
    setDeferredPrompt(null);
  }

  async function instalar() {
    if (!deferredPrompt) {
      setHelpOpen(true);
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    setBannerVisible(false);
    setDeferredPrompt(null);
    setStandalone(isStandaloneApp());
  }

  if (!mounted || standalone) return null;

  const helpModal = helpOpen ? createPortal(
    <div className="install-help-backdrop" role="dialog" aria-modal="true" onClick={() => setHelpOpen(false)}>
      <div className="card install-help-card" onClick={(event) => event.stopPropagation()}>
        <div className="install-help-head">
          <h2>Baixar o app</h2>
          <button className="btn btn-secondary" type="button" onClick={() => setHelpOpen(false)} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <p className="muted">
          Se o botão de instalação do navegador não aparecer, instale pelo menu do celular.
        </p>
        <div className="notice notice-info">
          Android: toque no menu do navegador e escolha "Instalar app" ou "Adicionar à tela inicial".
        </div>
        <div className="notice">
          iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  if (variant === 'button') {
    return (
      <>
        <button className={`btn ${className} ${full ? 'btn-full' : ''} install-action-button`} type="button" onClick={instalar}>
          <Download size={18} /> {label}
        </button>
        {helpModal}
      </>
    );
  }

  if (!bannerVisible) return helpModal;

  return (
    <>
      <div className="install-banner">
        <div>
          <strong>Baixar app AgroMarket</strong>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Use como aplicativo no celular.
          </div>
        </div>

        <button className="btn btn-primary" type="button" onClick={instalar}>
          <Download size={17} /> {deferredPrompt ? 'Instalar' : 'Como instalar'}
        </button>

        <button className="btn btn-secondary" type="button" onClick={fecharBanner}>
          Agora não
        </button>
      </div>
      {helpModal}
    </>
  );
}
