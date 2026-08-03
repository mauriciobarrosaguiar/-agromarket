'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Egg, KeyRound, LayoutDashboard, Settings, Sprout, WifiOff, X } from 'lucide-react';
import styles from './perfilOrganizado.module.css';

export default function PerfilOrganizado({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [configurando, setConfigurando] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [formAvailable, setFormAvailable] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let marker: HTMLElement | null = null;

    const organizarTela = () => {
      const container = root.querySelector<HTMLElement>('main.page .container');
      if (!container) return;

      const form = root.querySelector<HTMLFormElement>('form.form.card');
      setFormAvailable((atual) => atual === Boolean(form) ? atual : Boolean(form));

      marker = container.querySelector<HTMLElement>('[data-perfil-acoes]');
      if (!marker) {
        marker = document.createElement('div');
        marker.dataset.perfilAcoes = 'true';
        const titulo = Array.from(container.children).find((item) => item.tagName === 'H1');
        if (titulo?.nextSibling) container.insertBefore(marker, titulo.nextSibling);
        else container.appendChild(marker);
      }
      setPortalTarget((atual) => atual === marker ? atual : marker);

      const loadingCard = Array.from(container.children).find(
        (item) => item instanceof HTMLElement && item.textContent?.trim() === 'Carregando...'
      ) as HTMLElement | undefined;
      loadingCard?.classList.toggle('perfilLoadingOfflineHidden', !navigator.onLine && !form);

      if (!form) return;

      Array.from(form.querySelectorAll<HTMLElement>('.notice')).forEach((aviso) => {
        if (aviso.textContent?.includes('Para anunciar com mais segurança')) {
          aviso.classList.add('perfilSecurityNoticeHidden');
        }
      });

      Array.from(form.children).forEach((elemento) => {
        if (
          elemento.querySelector('a[href="/painel"]') &&
          elemento.querySelector('a[href="/painel/senha"]')
        ) {
          elemento.classList.add('perfilLegacyActionsHidden');
        }
      });

      form.classList.toggle('perfilConfigFormOpen', configurando);
    };

    const updateConnection = () => {
      setOnline(navigator.onLine);
      organizarTela();
    };

    setOnline(navigator.onLine);
    organizarTela();
    const observer = new MutationObserver(organizarTela);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);

    return () => {
      observer.disconnect();
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      marker?.remove();
    };
  }, [configurando]);

  return (
    <div ref={rootRef} className={styles.root}>
      {children}

      {portalTarget && createPortal(
        <section className={styles.actionPanel} aria-label="Ações do perfil">
          {!online && (
            <div className={styles.offlineNotice}>
              <WifiOff size={18} />
              <span><strong>Modo offline ativo</strong><small>Recursos já liberados continuam disponíveis neste aparelho.</small></span>
            </div>
          )}

          <a href="/painel" className={`${styles.actionButton} ${styles.primary}`}>
            <LayoutDashboard size={21} />
            <span>
              <strong>Abrir painel</strong>
              <small>Gerencie anúncios e sua lojinha</small>
            </span>
          </a>

          <a href="/painel/gestao" className={`${styles.actionButton} ${styles.agro}`}>
            <Sprout size={22} />
            <span>
              <strong>Abrir AgroGestão</strong>
              <small>Incluído no plano Lojinha de R$ 29,90/mês</small>
            </span>
          </a>

          <a
            href="/painel/gestao/incubacao"
            className={`${styles.actionButton} ${styles.incubacao}`}
          >
            <Egg size={22} />
            <span>
              <strong>Incubação de ovos</strong>
              <small>Incluída no plano Lojinha de R$ 29,90/mês</small>
            </span>
          </a>

          <button
            type="button"
            className={`${styles.actionButton} ${styles.configure} ${configurando ? styles.configureActive : ''}`}
            onClick={() => formAvailable && setConfigurando((aberto) => !aberto)}
            aria-expanded={configurando}
            disabled={!formAvailable}
          >
            {configurando ? <X size={22} /> : <Settings size={22} />}
            <span>
              <strong>{configurando ? 'Fechar configurações' : 'Configurar perfil'}</strong>
              <small>{formAvailable ? 'Selfie, dados pessoais, documento e localização' : 'Disponível quando a internet voltar'}</small>
            </span>
          </button>

          <Link href="/painel/senha" className={`${styles.actionButton} ${styles.secondary}`}>
            <KeyRound size={21} />
            <span>
              <strong>Trocar senha</strong>
              <small>Atualize sua senha de acesso</small>
            </span>
          </Link>
        </section>,
        portalTarget
      )}
    </div>
  );
}
