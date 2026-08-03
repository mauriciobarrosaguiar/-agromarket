'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Egg, KeyRound, LayoutDashboard, Settings, Sprout, X } from 'lucide-react';
import styles from './perfilOrganizado.module.css';

export default function PerfilOrganizado({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [configurando, setConfigurando] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let marker: HTMLElement | null = null;

    const organizarTela = () => {
      const container = root.querySelector<HTMLElement>('main.page .container');
      const form = root.querySelector<HTMLFormElement>('form.form.card');
      if (!container || !form) return;

      marker = container.querySelector<HTMLElement>('[data-perfil-acoes]');
      if (!marker) {
        marker = document.createElement('div');
        marker.dataset.perfilAcoes = 'true';
        container.insertBefore(marker, form);
      }
      setPortalTarget((atual) => atual === marker ? atual : marker);

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

    organizarTela();
    const observer = new MutationObserver(organizarTela);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      marker?.remove();
    };
  }, [configurando]);

  return (
    <div ref={rootRef} className={styles.root}>
      {children}

      {portalTarget && createPortal(
        <section className={styles.actionPanel} aria-label="Ações do perfil">
          <Link href="/painel" className={`${styles.actionButton} ${styles.primary}`}>
            <LayoutDashboard size={21} />
            <span>
              <strong>Abrir painel</strong>
              <small>Gerencie anúncios e sua lojinha</small>
            </span>
          </Link>

          <Link href="/painel/gestao" className={`${styles.actionButton} ${styles.agro}`}>
            <Sprout size={22} />
            <span>
              <strong>Abrir AgroGestão</strong>
              <small>Estoque, vendas, produtos e clientes</small>
            </span>
          </Link>

          <Link
            href="/painel/gestao/incubacao"
            className={`${styles.actionButton} ${styles.incubacao}`}
          >
            <Egg size={22} />
            <span>
              <strong>Incubação de ovos</strong>
              <small>Acompanhe chocadeiras, ovos e nascimentos</small>
            </span>
          </Link>

          <button
            type="button"
            className={`${styles.actionButton} ${styles.configure} ${configurando ? styles.configureActive : ''}`}
            onClick={() => setConfigurando((aberto) => !aberto)}
            aria-expanded={configurando}
          >
            {configurando ? <X size={22} /> : <Settings size={22} />}
            <span>
              <strong>{configurando ? 'Fechar configurações' : 'Configurar perfil'}</strong>
              <small>Selfie, dados pessoais, documento e localização</small>
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
