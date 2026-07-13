'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Image as ImageIcon, MessageCircle, Share2, X } from 'lucide-react';
import { getCanonicalSiteUrl } from '@/lib/site-url';

type ShareButtonProps = {
  label: string;
  title: string;
  message: string;
  path: string;
  full?: boolean;
  imageUrl?: string | null;
};

function comParametroShare(url: string) {
  if (url.includes('share=whatsapp')) return url;
  const separador = url.includes('?') ? '&' : '?';
  return `${url}${separador}share=whatsapp`;
}

function montarUrl(path: string) {
  const base = path.startsWith('http')
    ? path
    : `${getCanonicalSiteUrl()}${path}`;

  return comParametroShare(base);
}

function nomeArquivoImagem(url: string) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  const extensao = ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  return `agromarket-capa.${extensao}`;
}

export default function ShareButton({ label, title, message, path, full = false, imageUrl }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(montarUrl(path));
  const [sharingImage, setSharingImage] = useState(false);
  const [imageShareError, setImageShareError] = useState<string | null>(null);

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

  async function montarArquivoImagem() {
    if (!imageUrl) return null;

    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Não consegui carregar a imagem da capa.');

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('A capa do anúncio não está em formato de imagem.');

    return new File([blob], nomeArquivoImagem(imageUrl), { type: blob.type || 'image/jpeg' });
  }

  async function compartilharComImagem() {
    setSharingImage(true);
    setImageShareError(null);

    try {
      const arquivo = await montarArquivoImagem();
      if (arquivo && navigator.share && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ title, text: textoFinal, files: [arquivo] });
      } else if (navigator.share) {
        await navigator.share({ title, text: message, url });
        setImageShareError('Seu navegador não permitiu enviar a imagem junto. Enviei o link com prévia da capa.');
      } else {
        await copiar();
        setImageShareError('Seu navegador não permite compartilhar imagem direto. Copiei o texto com link.');
      }
    } catch (error) {
      if (navigator.share) {
        await navigator.share({ title, text: message, url });
        setImageShareError('Não foi possível anexar a imagem. Enviei o link com a prévia da capa.');
      } else {
        await copiar();
        setImageShareError(error instanceof Error ? error.message : 'Não foi possível compartilhar a imagem.');
      }
    }

    setSharingImage(false);
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

            {imageUrl && (
              <div className="card" style={{ background: '#f8faf4', padding: 10 }}>
                <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ImageIcon size={17} /> Capa do anúncio</strong>
                <p className="muted" style={{ margin: '4px 0 8px' }}>No botão do celular, o AgroMarket tenta enviar a imagem junto. No WhatsApp Web, a imagem aparece como prévia do link.</p>
                <img src={imageUrl} alt="Capa do anúncio" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 14, background: '#eef3ea' }} />
              </div>
            )}

            {imageShareError && <div className="notice">{imageShareError}</div>}

            <label className="field">
              <span className="label">Texto pronto</span>
              <textarea className="textarea" readOnly value={textoFinal} style={{ minHeight: 190 }} />
            </label>

            <div style={{ display: 'grid', gap: 10 }}>
              {imageUrl && (
                <button className="btn btn-primary btn-full" type="button" onClick={compartilharComImagem} disabled={sharingImage} aria-busy={sharingImage}>
                  <ImageIcon size={18} /> {sharingImage ? 'Preparando imagem...' : 'Compartilhar com imagem da capa'}
                </button>
              )}
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
