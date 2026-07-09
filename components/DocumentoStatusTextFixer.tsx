'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Verificacao = {
  documento_status?: string | null;
  selfie_status?: string | null;
};

function textoDocumento(status?: string | null) {
  if (status === 'aprovado') return 'Documento aprovado pelo administrador';
  if (status === 'pendente') return 'Documento aguardando aprovação do administrador';
  if (status === 'recusado') return 'Documento recusado pelo administrador';
  return 'Documento ainda não enviado/aprovado';
}

function textoSelfie(status?: string | null) {
  if (status === 'aprovada') return 'Selfie aprovada pelo administrador';
  if (status === 'pendente') return 'Selfie aguardando aprovação do administrador';
  if (status === 'recusada') return 'Selfie recusada pelo administrador';
  return 'Selfie ainda não enviada/aprovada';
}

function replaceTextNodes(root: Node, replacements: Record<string, string>) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  textNodes.forEach((node) => {
    const current = (node.nodeValue || '').trim();
    const replacement = replacements[current];
    if (replacement) {
      node.nodeValue = (node.nodeValue || '').replace(current, replacement);
      const element = node.parentElement?.closest('div, p, span, strong') as HTMLElement | null;
      if (element && (replacement.includes('recusad') || replacement.includes('aguardando') || replacement.includes('ainda não'))) {
        element.style.color = '#9a3412';
      }
    }
  });
}

function ajustarBotoes(verificacao: Verificacao) {
  const ok = verificacao.documento_status === 'aprovado' && verificacao.selfie_status === 'aprovada';
  if (ok) return;

  const botoes = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  botoes.forEach((botao) => {
    const texto = botao.innerText || '';
    if (texto.includes('Criar lojinha') || texto.includes('Solicitar pagamento mensal')) {
      botao.disabled = true;
      botao.style.opacity = '0.62';
      botao.style.cursor = 'not-allowed';
      botao.title = 'Documento e selfie precisam ser aprovados pelo administrador.';
    }
  });
}

function corrigirTela(verificacao: Verificacao | null) {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.includes('/painel/vitrine')) return;
  if (!verificacao) return;

  const docTexto = textoDocumento(verificacao.documento_status);
  const selfieTexto = textoSelfie(verificacao.selfie_status);

  replaceTextNodes(document.body, {
    'Documento aprovado pelo administrador': docTexto,
    'Documento aguardando aprovação do administrador': docTexto,
    'Documento recusado pelo administrador': docTexto,
    'Documento ainda não enviado/aprovado': docTexto,
    'Selfie/foto do responsável': selfieTexto,
    'Selfie aprovada pelo administrador': selfieTexto,
    'Selfie aguardando aprovação do administrador': selfieTexto,
    'Selfie recusada pelo administrador': selfieTexto,
    'Selfie ainda não enviada/aprovada': selfieTexto
  });

  ajustarBotoes(verificacao);
}

export default function DocumentoStatusTextFixer() {
  const [verificacao, setVerificacao] = useState<Verificacao | null>(null);

  const carregar = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!window.location.pathname.includes('/painel/vitrine')) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from('usuarios')
      .select('documento_status,selfie_status')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (data) setVerificacao(data as Verificacao);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!verificacao) return;

    corrigirTela(verificacao);

    const observer = new MutationObserver(() => corrigirTela(verificacao));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const interval = window.setInterval(() => corrigirTela(verificacao), 500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [verificacao]);

  return null;
}
