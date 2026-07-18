'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, Share2, X } from 'lucide-react';
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
  coverImageUrl?: string | null;
};

type ShareMode = 'sem_link' | 'com_link';

function montarUrl(path: string, cacheKey?: string) {
  const url = new URL(path.startsWith('http') ? path : `${getCanonicalSiteUrl()}${path}`);
  url.searchParams.set('share', 'whatsapp');
  if (cacheKey) url.searchParams.set('v', cacheKey);
  return url.toString();
}

function resolverUrlAbsoluta(value?: string | null) {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  const baseAtual = typeof window !== 'undefined' ? window.location.origin : getCanonicalSiteUrl();
  return new URL(value, baseAtual).toString();
}

function nomeArquivoImagem(title: string, type?: string) {
  const extensao = type?.includes('jpeg') ? 'jpg' : type?.split('/')[1]?.split(';')[0] || 'png';
  const nome = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'anuncio-agromarket';
  return `${nome}.${extensao}`;
}

function compartilhamentoCancelado(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
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

function extrairLinha(message: string, marcador: string) {
  const linha = message.split('\n').find((item) => item.trim().startsWith(marcador));
  return linha?.replace(marcador, '').trim() || '';
}

function quebrarTexto(ctx: CanvasRenderingContext2D, texto: string, maxWidth: number, maxLinhas: number) {
  const palavras = texto.replace(/\s+/g, ' ').trim().split(' ');
  const linhas: string[] = [];
  let linhaAtual = '';

  for (const palavra of palavras) {
    const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width <= maxWidth) {
      linhaAtual = teste;
    } else {
      if (linhaAtual) linhas.push(linhaAtual);
      linhaAtual = palavra;
    }

    if (linhas.length === maxLinhas) break;
  }

  if (linhaAtual && linhas.length < maxLinhas) linhas.push(linhaAtual);

  if (linhas.length === maxLinhas && palavras.join(' ').length > linhas.join(' ').length) {
    linhas[maxLinhas - 1] = `${linhas[maxLinhas - 1].replace(/\.{3}$/, '')}...`;
  }

  return linhas;
}

function arredondarRetangulo(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function desenharImagemCortada(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const ratio = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

async function carregarImagemComoElemento(url?: string | null) {
  const absoluta = resolverUrlAbsoluta(url);
  if (!absoluta) return null;

  try {
    const response = await fetch(absoluta, { cache: 'no-store', mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const objectUrl = URL.createObjectURL(blob);

    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });
  } catch {
    return null;
  }
}

async function arquivoDaFotoOriginal(params: { title: string; coverImageUrl?: string | null }) {
  const url = resolverUrlAbsoluta(params.coverImageUrl);
  if (!url) return null;

  try {
    const response = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return new File([blob], nomeArquivoImagem(params.title, blob.type), { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

async function gerarCanvasDoAnuncio(params: { title: string; message: string; url: string; mode: ShareMode; coverImageUrl?: string | null }) {
  const { title, message, url, mode, coverImageUrl } = params;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');

  const titulo = title || extrairLinha(message, '📢') || 'Anúncio AgroMarket';
  const preco = extrairLinha(message, '💰') || 'Consulte';
  const local = extrairLinha(message, '📍') || 'Agro perto de você';
  const descricao = limparChamadaDeLink(message)
    .split('\n')
    .filter((linha) => {
      const t = linha.trim();
      return t && !t.includes('AgroMarket') && !t.startsWith('📢') && !t.startsWith('💰') && !t.startsWith('📍');
    })
    .join(' ');

  const foto = await carregarImagemComoElemento(coverImageUrl);
  const green = '#062b19';
  const green2 = '#0b4d2b';
  const yellow = '#f6b526';
  const cream = '#f8f3e6';
  const muted = '#486553';

  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = green;
  ctx.fillRect(0, 0, 1080, 180);
  ctx.fillStyle = yellow;
  ctx.beginPath();
  ctx.arc(98, 90, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = green;
  ctx.font = '900 38px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ag', 98, 90);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 58px Arial';
  ctx.fillText('AgroMarket', 172, 82);
  ctx.fillStyle = '#f6d16c';
  ctx.font = '700 25px Arial';
  ctx.fillText('Compre e venda no agro perto de você', 174, 124);

  const fotoX = 54;
  const fotoY = 220;
  const fotoW = 972;
  const fotoH = 620;
  arredondarRetangulo(ctx, fotoX, fotoY, fotoW, fotoH, 42);
  ctx.save();
  ctx.clip();
  if (foto) {
    desenharImagemCortada(ctx, foto, fotoX, fotoY, fotoW, fotoH);
  } else {
    const grad = ctx.createLinearGradient(0, fotoY, 1080, fotoY + fotoH);
    grad.addColorStop(0, '#0b4d2b');
    grad.addColorStop(1, '#2d7a47');
    ctx.fillStyle = grad;
    ctx.fillRect(fotoX, fotoY, fotoW, fotoH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 70px Arial';
    quebrarTexto(ctx, titulo, 820, 3).forEach((linha, index) => ctx.fillText(linha, fotoX + 64, fotoY + 220 + index * 78));
  }
  ctx.restore();
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#ffffff';
  arredondarRetangulo(ctx, fotoX, fotoY, fotoW, fotoH, 42);
  ctx.stroke();

  arredondarRetangulo(ctx, 72, 760, 360, 92, 24);
  ctx.fillStyle = yellow;
  ctx.fill();
  ctx.fillStyle = green;
  ctx.font = '900 45px Arial';
  ctx.fillText(preco, 100, 820);

  arredondarRetangulo(ctx, 54, 895, 972, 290, 38);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e5decf';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = green;
  ctx.font = '900 58px Arial';
  const linhasTitulo = quebrarTexto(ctx, titulo, 850, 2);
  linhasTitulo.forEach((linha, index) => ctx.fillText(linha, 94, 985 + index * 64));

  ctx.fillStyle = muted;
  ctx.font = '600 30px Arial';
  ctx.fillText(local, 94, 1102);
  ctx.font = '600 31px Arial';
  const linhasDescricao = quebrarTexto(ctx, descricao || 'Anúncio disponível no AgroMarket com negociação direta pelo WhatsApp.', 880, 2);
  linhasDescricao.forEach((linha, index) => ctx.fillText(linha, 94, 1152 + index * 42));

  arredondarRetangulo(ctx, 72, 1220, 462, 82, 28);
  ctx.fillStyle = green2;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 31px Arial';
  ctx.fillText('Contato direto pelo WhatsApp', 106, 1272);

  arredondarRetangulo(ctx, 558, 1220, 450, 82, 28);
  ctx.fillStyle = mode === 'com_link' ? yellow : '#edf6ec';
  ctx.fill();
  ctx.fillStyle = green;
  ctx.font = '900 30px Arial';
  ctx.fillText(mode === 'com_link' ? 'Veja no AgroMarket' : 'Anúncio sem link', mode === 'com_link' ? 600 : 635, 1256);
  ctx.font = '700 21px Arial';
  ctx.fillText(mode === 'com_link' ? url.replace(/^https?:\/\//, '').slice(0, 34) : 'Divulgação direta', mode === 'com_link' ? 600 : 660, 1284);

  return canvas;
}

async function gerarArquivoImagem(params: { title: string; message: string; url: string; mode: ShareMode; coverImageUrl?: string | null }) {
  const fotoOriginal = await arquivoDaFotoOriginal({ title: params.title, coverImageUrl: params.coverImageUrl });
  if (fotoOriginal) return fotoOriginal;

  const canvas = await gerarCanvasDoAnuncio(params);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Não foi possível gerar a imagem.'));
    }, 'image/png', 0.95);
  });

  return new File([blob], nomeArquivoImagem(params.title, 'image/png'), { type: 'image/png' });
}

export default function ShareButton({
  label,
  title,
  message,
  path,
  full = false,
  cacheKey,
  imagePath,
  imageUrl,
  coverImageUrl
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copiedMode, setCopiedMode] = useState<ShareMode | null>(null);
  const [sharingMode, setSharingMode] = useState<ShareMode | null>(null);
  const [imageShareError, setImageShareError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [url, setUrl] = useState(montarUrl(path, cacheKey));

  useEffect(() => {
    setUrl(montarUrl(path, cacheKey));
  }, [path, cacheKey]);

  const textoSemLink = useMemo(() => montarTextoCompartilhamento(message, url, 'sem_link'), [message, url]);
  const textoComLink = useMemo(() => montarTextoCompartilhamento(message, url, 'com_link'), [message, url]);

  useEffect(() => {
    if (!open) return;
    const previewDireto = resolverUrlAbsoluta(coverImageUrl || imageUrl || imagePath);
    if (previewDireto) {
      setPreviewUrl(previewDireto);
      return;
    }

    let cancelado = false;
    gerarCanvasDoAnuncio({ title, message, url, mode: 'sem_link', coverImageUrl })
      .then((canvas) => {
        if (!cancelado) setPreviewUrl(canvas.toDataURL('image/png', 0.9));
      })
      .catch(() => {
        if (!cancelado) setPreviewUrl('');
      });

    return () => {
      cancelado = true;
    };
  }, [open, title, message, url, coverImageUrl, imageUrl, imagePath]);

  async function copiar(mode: ShareMode) {
    const texto = mode === 'sem_link' ? textoSemLink : textoComLink;
    await copiarTexto(texto);
    setCopiedMode(mode);
    setTimeout(() => setCopiedMode(null), 1800);
  }

  async function compartilhar(mode: ShareMode) {
    setSharingMode(mode);
    setImageShareError(null);

    const texto = mode === 'sem_link' ? textoSemLink : textoComLink;

    try {
      const arquivo = await gerarArquivoImagem({ title, message, url, mode, coverImageUrl });
      const podeEnviarArquivo = !navigator.canShare || navigator.canShare({ files: [arquivo] });

      if (navigator.share && podeEnviarArquivo) {
        await navigator.share({ title, text: texto, files: [arquivo] });
        setOpen(false);
        return;
      }

      baixarArquivo(arquivo);
      await copiarTexto(texto);
      setImageShareError('Seu celular não permitiu anexar automaticamente. A foto do anúncio foi baixada e o texto foi copiado. Agora é só abrir o WhatsApp e enviar.');
    } catch (error) {
      if (compartilhamentoCancelado(error)) return;
      await copiarTexto(texto);
      setImageShareError('Não consegui carregar a foto do anúncio agora. O texto foi copiado para você colar no WhatsApp.');
    } finally {
      setSharingMode(null);
    }
  }

  async function baixarImagem(mode: ShareMode) {
    const arquivo = await gerarArquivoImagem({ title, message, url, mode, coverImageUrl });
    baixarArquivo(arquivo);
    await copiar(mode);
    setImageShareError('Foto do anúncio baixada e texto copiado. Agora é só enviar no WhatsApp.');
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

            {previewUrl ? (
              <div className="card" style={{ background: '#f8faf4', padding: 10 }}>
                <img src={previewUrl} alt="Foto principal do anúncio" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 14, background: '#eef3ea' }} />
              </div>
            ) : (
              <div className="notice">A foto do anúncio será carregada ao compartilhar.</div>
            )}

            {imageShareError && <div className="notice">{imageShareError}</div>}

            <div className="card" style={{ background: '#f8faf4' }}>
              <strong>Opção 1: somente anúncio</strong>
              <p className="muted" style={{ marginTop: 4 }}>Envia a foto do anúncio + descrição, sem link.</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <button className="btn btn-primary btn-full" type="button" onClick={() => compartilhar('sem_link')} disabled={Boolean(sharingMode)} aria-busy={sharingMode === 'sem_link'}>
                  <ImageIcon size={18} /> {sharingMode === 'sem_link' ? 'Preparando...' : 'Compartilhar sem link'}
                </button>
                <button className="btn btn-secondary btn-full" type="button" onClick={() => baixarImagem('sem_link')} disabled={Boolean(sharingMode)}>
                  <Download size={18} /> Baixar foto sem link
                </button>
              </div>
            </div>

            <div className="card" style={{ background: '#fff8e1' }}>
              <strong>Opção 2: anúncio + link do app</strong>
              <p className="muted" style={{ marginTop: 4 }}>Envia a foto do anúncio + descrição + link do anúncio.</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <button className="btn btn-amber btn-full" type="button" onClick={() => compartilhar('com_link')} disabled={Boolean(sharingMode)} aria-busy={sharingMode === 'com_link'}>
                  <ImageIcon size={18} /> {sharingMode === 'com_link' ? 'Preparando...' : 'Compartilhar com link'}
                </button>
                <button className="btn btn-secondary btn-full" type="button" onClick={() => baixarImagem('com_link')} disabled={Boolean(sharingMode)}>
                  <Download size={18} /> Baixar foto com link
                </button>
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
