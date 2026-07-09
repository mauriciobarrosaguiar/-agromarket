'use client';

import { useEffect } from 'react';

function textoCorreto(bodyText: string) {
  if (bodyText.includes('Status atual: Documento recusado')) return 'Documento recusado pelo administrador';
  if (bodyText.includes('Status atual: Documento em análise')) return 'Documento aguardando aprovação do administrador';
  if (bodyText.includes('Status atual: Documento não enviado')) return 'Documento ainda não enviado/aprovado';
  return 'Documento aprovado pelo administrador';
}

function corrigirTextoDocumento() {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.includes('/painel/vitrine')) return;

  const bodyText = document.body.innerText || '';
  const novoTexto = textoCorreto(bodyText);
  if (novoTexto === 'Documento aprovado pelo administrador') return;

  const elementos = Array.from(document.querySelectorAll('div, span, p, strong')) as HTMLElement[];
  elementos.forEach((el) => {
    if (el.childElementCount > 0) return;
    const texto = (el.textContent || '').trim();
    if (texto === 'Documento aprovado pelo administrador') {
      el.textContent = novoTexto;
    }
  });
}

export default function DocumentoStatusTextFixer() {
  useEffect(() => {
    corrigirTextoDocumento();

    const observer = new MutationObserver(() => corrigirTextoDocumento());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(corrigirTextoDocumento, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
