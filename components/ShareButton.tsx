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
  cacheKey?: string;
  imagePath?: string | null;
  imageUrl?: string | null;
};

function montarUrl(path: string, cacheKey?: string) {
  const url = new URL(path.startsWith('http') ? path : `${getCanonicalSiteUrl()}${path}`);
  url.searchParams.set('share', 'whatsapp');
  if (cacheKey) url.searchParams.set('v', cacheKey);
  return url.toString();
}

function montarUrlImagem(path?: string | null, cacheKey?: string) {
  if (!path) return '';
  const url = new URL(path.startsWith('http') ? path : `${getCanonicalSiteUrl()}${path}`);
  if (cacheKey && !url.searchParams.get('v')) url.searchParams.set('v', cacheKey);
  return url.toString();
}

function montarUrlImagemParaDownload(imagePath?: string | null, imageUrl?: string | null, cacheKey?: string) {
  const valor = imagePath || imageUrl;
  if (!valor) return '';

  const baseAtual = typeof window !== 'undefined' ? window.location.origin : getCanonicalSiteUrl();
  const usarOrigemAtual = Boolean(imagePath && !imagePath.startsWith('http'));
  const url = new URL(usarOrigemAtual ? imagePath! : valor, baseAtual);

  if (cacheKey && !url.searchParams.get('v')) url.searchParams.set('v', cacheKey);
  return url.toString();
}

function nomeArquivoImagem(title: string, type?: string) {
  const extensao = type?.includes('jpeg') ? 'jpg' : type?.split('/')[1] || 'png';
  const nome = title.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'agromarket';
  return `${nome}.${extensao}`;
}

function compartilhamentoCancelado(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function mensagemErroImagem(error: unknown) {
  if (error instanceof TypeError) {
    return 'Não foi possível anexar a imagem neste navegador. O link foi compartilhado normalmente.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível anexar a imagem. O link foi compartilhado normalmente.';
}

export default function ShareButton({
  label,
  title,
  message,
  path,
  full = false,
  cacheKey,
  imagePath,
  imageUrl
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [imageShareError, setImageShareError] = useState<string | null>(null);
  const [url, setUrl] = useState(montarUrl(path, cacheKey));

  useEffect(() => {
    setUrl(montarUrl(path, cacheKey));
  }, [path, cacheKey]);

  const textoFinal = useMemo(() => `${message.trim()}\n\n${url}`.trim(), [message, url]);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textoFinal)}`;
  const resolvedImageUrl = useMemo(() => montarUrlImagem(imagePath || imageUrl, cacheKey), [imagePath, imageUrl, cacheKey]);

  async function copiar() {
    await navigator.clipboard.writeText(textoFinal);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function compartilharNativo() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message, url });
      } catch (error) {
        if (compartilhamentoCancelado(error)) return;
        await copiar();
      }
    } else {
      await copiar();
    }
  }

  async function montarArquivoImagem() {
    const downloadUrl = montarUrlImagemParaDownload(imagePath, imageUrl, cacheKey);
    if (!downloadUrl) return null;

    const response = await fetch(downloadUrl, {
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (!response.ok) throw new Error('Não consegui carregar a imagem da capa.');

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('A capa do anúncio não está em formato de imagem.');

    return new File([blob], nomeArquivoImagem(title, blob.type), { type: blob.type || 'image/png' });
  }

  async function compartilharComImagem() {
    setSharingImage(true);
    setImageShareError(null);

    try {
      const arquivo = await montarArquivoImagem();
      const podeEnviarArquivo = arquivo ? (!navigator.canShare || navigator.canShare({ files: [arquivo] })) : false;

      if (arquivo && navigator.share && podeEnviarArquivo) {
        await navigator.share({ title, text: textoFinal, files: [arquivo] });
      } else {
        await compartilharNativo();
        if (resolvedImageUrl) {
          setImageShareError('Seu navegador não permitiu anexar a imagem. O link foi compartilhado com a prévia da capa.');
        }
      }
    } catch (error) {
      if (compartilhamentoCancelado(error)) return;
      await compartilharNativo();
      setImageShareError(mensagemErroImagem(error));
    } finally {
      setSharingImage(false);
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

            {resolvedImageUrl && (
              <div className="card" style={{ background: '#f8faf4', padding: 10 }}>
                <img src={resolvedImageUrl} alt="Prévia do anúncio" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 14, background: '#eef3ea' }} />
              </div>
            )}

            {imageShareError && <div className="notice">{imageShareError}</div>}

            <label className="field">
              <span className="label">Texto pronto</span>
              <textarea className="textarea" readOnly value={textoFinal} style={{ minHeight: 190 }} />
            </label>

            <div style={{ display: 'grid', gap: 10 }}>
              {resolvedImageUrl && (
                <button className="btn btn-primary btn-full" type="button" onClick={compartilharComImagem} disabled={sharingImage} aria-busy={sharingImage}>
                  <ImageIcon size={18} /> {sharingImage ? 'Preparando imagem...' : 'Compartilhar com imagem da capa'}
                </button>
              )}
              <a className="btn btn-whatsapp btn-full" href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> Compartilhar no WhatsApp
              </a>
              <button className="btn btn-secondary btn-full" type="button" onClick={compartilharNativo}>
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
