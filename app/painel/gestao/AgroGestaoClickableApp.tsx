'use client';

import { useCallback, useEffect } from 'react';
import AgroGestaoInstall from './AgroGestaoInstall';
import AgroGestaoModalApp from './AgroGestaoModalApp';

type NavigationTarget = 'Início' | 'Produtos' | 'Estoque' | 'Vendas' | 'Clientes';

type DashboardAction = {
  label: string;
  target: NavigationTarget;
  ariaLabel: string;
};

const DASHBOARD_ACTIONS: DashboardAction[] = [
  {
    label: 'VENDAS DO MÊS',
    target: 'Vendas',
    ariaLabel: 'Abrir as vendas do mês'
  },
  {
    label: 'DINHEIRO RECEBIDO',
    target: 'Vendas',
    ariaLabel: 'Abrir as vendas recebidas'
  },
  {
    label: 'FALTA RECEBER',
    target: 'Clientes',
    ariaLabel: 'Abrir a lista de quem está devendo'
  },
  {
    label: 'ESTOQUE PARA VENDA',
    target: 'Estoque',
    ariaLabel: 'Abrir o estoque para venda'
  }
];

const QUERY_TARGETS: Record<string, NavigationTarget> = {
  resumo: 'Início',
  produtos: 'Produtos',
  estoque: 'Estoque',
  vendas: 'Vendas',
  clientes: 'Clientes'
};

function getCardLabel(card: HTMLElement) {
  return Array.from(card.children)
    .find((child) => child.tagName === 'SPAN')
    ?.textContent?.trim();
}

export default function AgroGestaoClickableApp() {
  const abrirArea = useCallback((label: NavigationTarget) => {
    const candidates = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(
      (button) => button.textContent?.trim() === label && !button.closest('form')
    );

    const visible = candidates.find(
      (button) => button.offsetWidth > 0 && button.offsetHeight > 0
    );
    const button = visible || candidates[0];
    button?.click();
    return Boolean(button);
  }, []);

  useEffect(() => {
    const aba = new URLSearchParams(window.location.search).get('aba');
    const target = aba ? QUERY_TARGETS[aba] : undefined;
    if (!target) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (abrirArea(target) || attempts >= 50) window.clearInterval(timer);
    }, 100);

    return () => window.clearInterval(timer);
  }, [abrirArea]);

  useEffect(() => {
    let frame = 0;

    const prepararCards = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const cards = Array.from(document.querySelectorAll<HTMLElement>('article'));

        DASHBOARD_ACTIONS.forEach((action) => {
          const card = cards.find((item) => getCardLabel(item) === action.label);
          if (!card) return;

          card.dataset.agroDashboardCard = 'true';
          card.dataset.agroDashboardTarget = action.target;
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');
          card.setAttribute('aria-label', action.ariaLabel);
          card.setAttribute('title', `${action.ariaLabel}. Toque para abrir.`);
        });
      });
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const card = target?.closest<HTMLElement>('[data-agro-dashboard-target]');
      const destination = card?.dataset.agroDashboardTarget as NavigationTarget | undefined;
      if (!destination) return;
      event.preventDefault();
      abrirArea(destination);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target as Element | null;
      const card = target?.closest<HTMLElement>('[data-agro-dashboard-target]');
      const destination = card?.dataset.agroDashboardTarget as NavigationTarget | undefined;
      if (!destination) return;
      event.preventDefault();
      abrirArea(destination);
    };

    const observer = new MutationObserver(prepararCards);
    observer.observe(document.body, { childList: true, subtree: true });
    prepararCards();

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [abrirArea]);

  return (
    <>
      <AgroGestaoModalApp />
      <AgroGestaoInstall />
      <style jsx global>{`
        [data-agro-dashboard-card='true'] {
          position: relative;
          padding-right: 54px !important;
          cursor: pointer;
          touch-action: manipulation;
          outline: none;
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
        }

        [data-agro-dashboard-card='true']::after {
          content: '›';
          position: absolute;
          top: 14px;
          right: 17px;
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #185b38;
          background: #edf6f0;
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
        }

        [data-agro-dashboard-card='true']:hover,
        [data-agro-dashboard-card='true']:focus-visible {
          transform: translateY(-2px);
          border-color: #8db39b !important;
          box-shadow: 0 14px 34px rgba(25, 79, 47, .13) !important;
        }

        [data-agro-dashboard-card='true']:active { transform: scale(.985); }
      `}</style>
    </>
  );
}
