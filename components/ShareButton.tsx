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

type ShareMode = 'sem_link' | 'com_link';

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
    return 'Não foi possível anexar a imagem neste navegador. A imagem será baixada e o texto copiado.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível anexar a imagem. A imagem será baixada e o texto copiado.';
}

function limparChamadaDeLink(texto: string) {
  return texto
    .trim()
    .replace(/\n*Veja\s+(o\s+an[úu]ncio|no\s+AgroMarket):?\s*$/i, '')
    .trim();
}

function montarTextoCompartilhamento(message: string, url: string, mode: ShareMode) {
  const textoSemLink = limparChamadaDeLink(message);
  if (mode === 'sem_link') return textoSemLink;
  return `${textoSemLink}\n\nVeja no AgroMarket:\n${url}`.trim();
}

async function copiarTexto(texto: string) {
  await navigator.clipboard.writeText(texto);
}

function baixarArquivo(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
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
  const [copiedMode, setCopiedMode] = useState<ShareMode | null>(null);
  const [sharingMode, setSharingMode] = useState<ShareMode | null>(null);
  const [imageShareError, setImageShareError] = useState<string | null>(null);
  const [url, setUrl] = useState(montarUrl(path, cacheKey));

  useEffect(() => {
    setUrl(montarUrl(path, cacheKey));
  }, [path, cacheKey]);

  const textoSemLink = useMemo(() => montarTextoCompartilhamento(message, url, 'sem_link'), [message, url]);
  const textoComLink = useMemo(() => montarTextoCompartilhamento(message, url, 'com_link'), [message, url]);
  const whatsappSemLinkUrl = `https://wa.me/?text=${encodeURIComponent(textoSemLink)}`;
  const whatsappComLinkUrl = `https://wa.me/?text=${encodeURIComponent(textoComLink)}`;
  const resolvedImageUrl = useMemo(() => montarUrlImagem(imagePath || imageUrl, cacheKey), [imagePath, imageUrl, cacheKey]);

  async function copiar(mode: ShareMode) {
    const texto = mode === 'sem_link' ? textoSemLink : textoComLink;
    await copiarTexto(texto);
    setCopiedMode(mode);
    setTimeout(() => setCopiedMode(null), 1800);
  }

  async function compartilharNativo(mode: ShareMode) {
    const texto = mode === 'sem_link' ? textoSemLink : textoComLink;

    if (navigator.share) {
      await navigator.share(mode === 'com_link' ? { title, text: texto, url } : { title, text: texto });
      return;
    }

    await copiarTexto(texto);
  }

  async function montarArquivoImagem() {
    const downloadUrl = montarUrlImagemParaDownload(imagePath, imageUrl, cacheKey);
    if (!downloadUrl) return null;

    const response = await fetch(downloadUrl, {
      cache: 'no-store',
      credentials: 'same-origin'
    });

    if (!response.ok) throw new Error('Não consegui carregar a imagem grande do anúncio.');

    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('A imagem do anúncio não está em formato válido.');

    return new File([blob], nomeArquivoImagem(title, blob.type), { type: blob.type || 'image/png' });
  }

  async function compartilhar(mode: ShareMode) {
    setSharingMode(mode);
    setImageShareError(null);

    const texto = mode === 'sem_link' ? textoSemLink : textoComLink;

    try {
      const arquivo = await montarArquivoImagem();
      const podeEnviarArquivo = arquivo ? (!navigator.canShare || navigator.canShare({ files: [arquivo] })) : false;

      if (arquivo && navigator.share && podeEnviarArquivo) {
        await navigator.share({ title, text: texto, files: [arquivo] });
        setOpen(false);
        return;
      }

      if (navigator.share) {
        await navigator.share(mode === 'com_link' ? { title, text: texto, url } : { title, text: texto });
      } else {
        await copiarTexto(texto);
      }

      if (arquivo) {
        baixarArquivo(arquivo);
        setImageShareError('Seu navegador não permitiu anexar a imagem automaticamente. Baixei a imagem e copiei o texto para você colar no WhatsApp.');
      }
    } catch (error) {
      if (compartilhamentoCancelado(error)) return;

      try {
        const arquivo = await montarArquivoImagem();
        if (arquivo) baixarArquivo(arquivo);
        await copiarTexto(texto);
        setImageShareError(`${mensagemErroImagem(error)} Texto copiado.`);
      } catch {
        await copiarTexto(texto);
        setImageShareError('Não consegui anexar a imagem agora. O texto foi copiado para você colar no WhatsApp.');
      }
    } finally {
      setSharingMode(null);
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
                <h2 style={{ margin: 0 }}>Compartilhar anúncio</h2>
                <p className="muted" style={{ margin: '6px 0 0' }}>Escolha se deseja divulgar com ou sem o link do AgroMarket.</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>

            {resolvedImageUrl && (
              <div className="card" style={{ background: '#f8faf4', padding: 10 }}>
                <img src={resolvedImageUrl} alt="Prévia grande do anúncio" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 14, background: '#eef3ea' }} />
              </div>
            )}

            {imageShareError && <div className="notice">{imageShareError}</div>}

            <div className="card" style={{ background: '#f8faf4' }}>
              <strong>Opção 1: somente anúncio</strong>
              <p className="muted" style={{ marginTop: 4 }}>Envia a imagem grande + descrição, sem link.</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <button className="btn btn-primary btn-full" type="button" onClick={() => compartilhar('sem_link')} disabled={Boolean(sharingMode)} aria-busy={sharingMode === 'sem_link'}>
                  <ImageIcon size={18} /> {sharingMode === 'sem_link' ? 'Preparando...' : 'Compartilhar sem link'}
                </button>
                <a className="btn btn-whatsapp btn-full" href={whatsappSemLinkUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> WhatsApp sem link
                </a>
              </div>
            </div>

            <div className="card" style={{ background: '#fff8e1' }}>
              <strong>Opção 2: anúncio + link do app</strong>
              <p className="muted" style={{ marginTop: 4 }}>Envia a imagem grande + descrição + link do anúncio.</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <button className="btn btn-amber btn-full" type="button" onClick={() => compartilhar('com_link')} disabled={Boolean(sharingMode)} aria-busy={sharingMode === 'com_link'}>
                  <ImageIcon size={18} /> {sharingMode === 'com_link' ? 'Preparando...' : 'Compartilhar com link'}
                </button>
                <a className="btn btn-whatsapp btn-full" href={whatsappComLinkUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} /> WhatsApp com link
                </a>
              </div>
            </div>

            <label className="field">
              <span className="label">Texto sem link</span>
              <textarea className="textarea" readOnly value={textoSemLink} style={{ minHeight: 140 }} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn btn-secondary" type="button" onClick={() => copiar('sem_link')}>
                {copiedMode === 'sem_link' ? <Check size={18} /> : <Copy size={18} />} {copiedMode === 'sem_link' ? 'Copiado' : 'Copiar sem link'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => copiar('com_link')}>
                {copiedMode === 'com_link' ? <Check size={18} /> : <Copy size={18} />} {copiedMode === 'com_link' ? 'Copiado' : 'Copiar com link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
