'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, MessageCircle, Share2, X } from 'lucide-react';

type ShareButtonProps = {
  label: string;
  title: string;
  message: string;
  path: string;
  full?: boolean;
};

function montarUrl(path: string) {
  if (path.startsWith('http')) return path;
  if (typeof window !== 'undefined') return `${window.location.origin}${path}`;
  return `https://agromarket-two.vercel.app${path}`;
}

export default function ShareButton({ label, title, message, path, full = false }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(montarUrl(path));

  useEffect(() => {
    setUrl(montarUrl(path));
  }, [path]);

  const textoFinal = useMemo(() => `${message.trim()}\n\n${url}`.trim(), [message, url]);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textoFinal)}`;

  async function copiar() {
    await navigator.clipboard.writeText(textoFinal);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function compartilharNativo() {
    if (navigator.share) {
      await navigator.share({ title, text: message, url });
    } else {
      await copiar();
    }
  }

  return (
    <>
      <button type="button" className={`btn btn-secondary ${full ? 'btn-full' : ''}`} onClick={() => setOpen(true)}>
        <Share2 size={18} /> {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 997, background: 'rgba(0,0,0,.72)', display: 'grid', placeItems: 'center', padding: 14 }}
        >
          <div className="card form" onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0 }}>Compartilhar</h2>
                <p className="muted" style={{ margin: '6px 0 0' }}>Mensagem pronta para WhatsApp, grupos e redes sociais.</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            <label className="field">
              <span className="label">Texto pronto</span>
              <textarea className="textarea" readOnly value={textoFinal} style={{ minHeight: 190 }} />
            </label>

            <div style={{ display: 'grid', gap: 10 }}>
              <a className="btn btn-whatsapp btn-full" href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> Compartilhar no WhatsApp
              </a>
              <button className="btn btn-primary btn-full" type="button" onClick={compartilharNativo}>
                <Share2 size={18} /> Compartilhar pelo celular
              </button>
              <button className="btn btn-secondary btn-full" type="button" onClick={copiar}>
                {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Texto copiado' : 'Copiar texto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
