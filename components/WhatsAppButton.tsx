'use client';

import Link from 'next/link';
import { Lock, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { makeWhatsAppLink } from '@/lib/whatsapp';
import { supabase } from '@/lib/supabase';
import { getCanonicalSiteUrl } from '@/lib/site-url';

type WhatsAppButtonProps = {
  phone: string;
  title: string;
  full?: boolean;
  label?: string;
  urlPath?: string;
  anuncioId?: string;
  origem?: string;
};

function montarUrl(path?: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${getCanonicalSiteUrl()}${path}`;
}

export default function WhatsAppButton({ phone, title, full = false, label = 'Chamar no WhatsApp', urlPath, anuncioId, origem = 'anuncio' }: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLogged, setIsLogged] = useState<boolean | null>(null);
  const anuncioUrl = useMemo(() => montarUrl(urlPath), [urlPath]);
  const whatsLink = makeWhatsAppLink(phone, title, anuncioUrl);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLogged(Boolean(data.user)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLogged(Boolean(session?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  async function continuarWhatsApp() {
    if (anuncioId) {
      try {
        await supabase.rpc('registrar_clique_whatsapp_anuncio', {
          anuncio_uuid: anuncioId,
          origem_text: origem,
          user_agent_text: typeof navigator !== 'undefined' ? navigator.userAgent : null
        });
      } catch {
        // O contato nao deve ser bloqueado se o registro do clique falhar.
      }
    }
    setOpen(false);
  }

  const modal = (
    <div role="dialog" aria-modal="true" className="whatsapp-modal-backdrop" onClick={() => setOpen(false)}>
      <div className="card whatsapp-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="whatsapp-modal-head">
          <div>
            <h2 className="whatsapp-modal-title">
              {isLogged ? <ShieldCheck size={24} /> : <Lock size={24} />}
              {isLogged ? 'Negocie com segurança' : 'Entre para chamar o vendedor'}
            </h2>
            <p className="muted">
              {isLogged ? 'Antes de chamar o vendedor, confira estes cuidados.' : 'Para proteger vendedores e compradores, o WhatsApp só aparece para usuários logados.'}
            </p>
          </div>

          <button className="btn btn-secondary whatsapp-modal-close" type="button" onClick={() => setOpen(false)} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {!isLogged ? (
          <>
            <div className="whatsapp-modal-content">
              <div className="notice">
                Faça login ou crie sua conta para acessar o contato do vendedor e continuar a negociação pelo WhatsApp.
              </div>
            </div>

            <div className="whatsapp-modal-actions">
              <Link className="btn btn-primary btn-full" href="/login" onClick={() => setOpen(false)}>Entrar para ver WhatsApp</Link>
              <Link className="btn btn-secondary btn-full" href="/cadastro" onClick={() => setOpen(false)}>Criar conta</Link>
            </div>
          </>
        ) : (
          <>
            <div className="whatsapp-modal-content">
              <div className="notice">
                O AgroMarket apenas divulga anúncios e não participa da negociação, pagamento, entrega ou garantia do produto/serviço.
              </div>

              <ul className="whatsapp-safety-list">
                <li>Confira fotos, quantidade, preço e estado do produto.</li>
                <li>Evite pagar adiantado para pessoas desconhecidas.</li>
                <li>Prefira combinar retirada em local seguro.</li>
                <li>Em animais, confira saúde, origem e transporte adequado.</li>
                <li>Desconfie de preço muito abaixo do normal.</li>
              </ul>
            </div>

            <div className="whatsapp-modal-actions">
              <a className="btn btn-whatsapp btn-full" href={whatsLink} target="_blank" rel="noreferrer" onClick={continuarWhatsApp}>
                <MessageCircle size={18} /> Continuar para o WhatsApp
              </a>
              <Link className="btn btn-secondary btn-full" href="/seguranca" onClick={() => setOpen(false)}>Ver dicas de segurança</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" className={`btn btn-whatsapp ${full ? 'btn-full' : ''}`} onClick={() => setOpen(true)}>
        <MessageCircle size={18} /> {label}
      </button>

      {open && mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
