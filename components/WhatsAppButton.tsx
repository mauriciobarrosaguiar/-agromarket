'use client';

import Link from 'next/link';
import { MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { makeWhatsAppLink } from '@/lib/whatsapp';

export default function WhatsAppButton({ phone, title, full = false, label = 'Chamar no WhatsApp' }: { phone: string; title: string; full?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const whatsLink = makeWhatsAppLink(phone, title);

  return (
    <>
      <button type="button" className={`btn btn-whatsapp ${full ? 'btn-full' : ''}`} onClick={() => setOpen(true)}>
        <MessageCircle size={18} /> {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 997, background: 'rgba(0,0,0,.72)', display: 'grid', placeItems: 'center', padding: 14 }}
        >
          <div className="card form" onClick={(e) => e.stopPropagation()} style={{ width: 'min(520px, 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}><ShieldCheck size={24} /> Negocie com segurança</h2>
                <p className="muted" style={{ margin: '6px 0 0' }}>Antes de chamar o vendedor, confira estes cuidados.</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            <div className="notice">
              O AgroMarket apenas divulga anúncios e não participa da negociação, pagamento, entrega ou garantia do produto/serviço.
            </div>

            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.65 }}>
              <li>Confira fotos, quantidade, preço e estado do produto.</li>
              <li>Evite pagar adiantado para pessoas desconhecidas.</li>
              <li>Prefira combinar retirada em local seguro.</li>
              <li>Em animais, confira saúde, origem e transporte adequado.</li>
              <li>Desconfie de preço muito abaixo do normal.</li>
            </ul>

            <div style={{ display: 'grid', gap: 10 }}>
              <a className="btn btn-whatsapp btn-full" href={whatsLink} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
                <MessageCircle size={18} /> Continuar para o WhatsApp
              </a>
              <Link className="btn btn-secondary btn-full" href="/seguranca" onClick={() => setOpen(false)}>Ver dicas de segurança</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
