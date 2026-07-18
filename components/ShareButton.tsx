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
};

type ShareMode = 'sem_link' | 'com_link';

function montarUrl(path: string, cacheKey?: string) {
  const url = new URL(path.startsWith('http') ? path : `${getCanonicalSiteUrl()}${path}`);
  url.searchParams.set('share', 'whatsapp');
  if (cacheKey) url.searchParams.set('v', cacheKey);
  return url.toString();
}

function nomeArquivoImagem(title: string) {
  const nome = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'anuncio-agromarket';
  return `${nome}.png`;
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

function gerarCanvasDoAnuncio(params: { title: string; message: string; url: string; mode: ShareMode }) {
  const { title, message, url, mode } = params;
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

  const green = '#062b19';
  const green2 = '#0b4d2b';
  const yellow = '#f6b526';
  const cream = '#f8f3e6';
  const muted = '#486553';

  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, 1080, 760);
  grad.addColorStop(0, '#062b19');
  grad.addColorStop(0.58, '#0b4d2b');
  grad.addColorStop(1, '#2d7a47');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 620);

  ctx.fillStyle = 'rgba(246,181,38,.14)';
  ctx.beginPath();
  ctx.arc(910, 120, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath();
  ctx.arc(120, 590, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = yellow;
  ctx.beginPath();
  ctx.arc(98, 92, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = green;
  ctx.font = '900 38px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ag', 98, 92);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 58px Arial';
  ctx.fillText('AgroMarket', 172, 82);
  ctx.fillStyle = '#f6d16c';
  ctx.font = '700 25px Arial';
  ctx.fillText('Compre e venda no agro perto de você', 174, 124);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 72px Arial';
  const linhasTituloTopo = quebrarTexto(ctx, titulo, 910, 3);
  linhasTituloTopo.forEach((linha, index) => ctx.fillText(linha, 72, 238 + index * 82));

  arredondarRetangulo(ctx, 72, 490, 360, 92, 24);
  ctx.fillStyle = yellow;
  ctx.fill();
  ctx.fillStyle = green;
  ctx.font = '900 45px Arial';
  ctx.fillText(preco, 100, 550);

  ctx.fillStyle = '#e8f4df';
  ctx.font = '800 34px Arial';
  ctx.fillText(local, 72, 650);

  arredondarRetangulo(ctx, 54, 720, 972, 430, 38);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e5decf';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = green;
  ctx.font = '900 64px Arial';
  const linhasTitulo = quebrarTexto(ctx, titulo, 860, 2);
  linhasTitulo.forEach((linha, index) => ctx.fillText(linha, 94, 815 + index * 72));

  ctx.fillStyle = muted;
  ctx.font = '600 38px Arial';
  const linhasDescricao = quebrarTexto(ctx, descricao || 'Anúncio disponível no AgroMarket com negociação direta pelo WhatsApp.', 880, 4);
  linhasDescricao.forEach((linha, index) => ctx.fillText(linha, 94, 970 + index * 50));

  arredondarRetangulo(ctx, 72, 1184, 462, 90, 28);
  ctx.fillStyle = green2;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 33px Arial';
  ctx.fillText('Contato direto pelo WhatsApp', 106, 1242);

  if (mode === 'com_link') {
    arredondarRetangulo(ctx, 558, 1184, 450, 90, 28);
    ctx.fillStyle = yellow;
    ctx.fill();
    ctx.fillStyle = green;
    ctx.font = '900 32px Arial';
    ctx.fillText('Veja no AgroMarket', 600, 1224);
    ctx.font = '700 22px Arial';
    ctx.fillText(url.replace(/^https?:\/\//, '').slice(0, 33), 600, 1254);
  } else {
    arredondarRetangulo(ctx, 558, 1184, 450, 90, 28);
    ctx.fillStyle = '#edf6ec';
    ctx.fill();
    ctx.fillStyle = green;
    ctx.font = '900 31px Arial';
    ctx.fillText('Anúncio sem link', 636, 1228);
    ctx.font = '700 23px Arial';
    ctx.fillText('Divulgação direta', 660, 1258);
  }

  return canvas;
}

async function gerarArquivoImagem(params: { title: string; message: string; url: string; mode: ShareMode }) {
  const canvas = gerarCanvasDoAnuncio(params);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Não foi possível gerar a imagem.'));
    }, 'image/png', 0.95);
  });

  return new File([blob], nomeArquivoImagem(params.title), { type: 'image/png' });
}

export default function ShareButton({
  label,
  title,
  message,
  path,
  full = false,
  cacheKey
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
    try {
      const canvas = gerarCanvasDoAnuncio({ title, message, url, mode: 'sem_link' });
      setPreviewUrl(canvas.toDataURL('image/png', 0.9));
    } catch {
      setPreviewUrl('');
    }
  }, [open, title, message, url]);

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
      const arquivo = await gerarArquivoImagem({ title, message, url, mode });
      const podeEnviarArquivo = !navigator.canShare || navigator.canShare({ files: [arquivo] });

      if (navigator.share && podeEnviarArquivo) {
        await navigator.share({ title, text: texto, files: [arquivo] });
        setOpen(false);
        return;
      }

      baixarArquivo(arquivo);
      await copiarTexto(texto);
      setImageShareError('Seu celular não permitiu anexar automaticamente. A imagem foi baixada e o texto foi copiado. Agora é só abrir o WhatsApp e enviar.');
    } catch (error) {
      if (compartilhamentoCancelado(error)) return;
      await copiarTexto(texto);
      setImageShareError('Não consegui gerar a imagem agora. O texto foi copiado para você colar no WhatsApp.');
    } finally {
      setSharingMode(null);
    }
  }

  async function baixarImagem(mode: ShareMode) {
    const arquivo = await gerarArquivoImagem({ title, message, url, mode });
    baixarArquivo(arquivo);
    await copiar(mode);
    setImageShareError('Imagem baixada e texto copiado. Agora é só enviar no WhatsApp.');
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
                <img src={previewUrl} alt="Prévia grande do anúncio" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 14, background: '#eef3ea' }} />
              </div>
            ) : (
              <div className="notice">A imagem será gerada no seu celular ao compartilhar.</div>
            )}

            {imageShareError && <div className="notice">{imageShareError}</div>}

            <div className="card" style={{ background: '#f8faf4' }}>
              <strong>Opção 1: somente anúncio</strong>
              <p className="muted" style={{ marginTop: 4 }}>Envia imagem + descrição, sem link.</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <button className="btn btn-primary btn-full" type="button" onClick={() => compartilhar('sem_link')} disabled={Boolean(sharingMode)} aria-busy={sharingMode === 'sem_link'}>
                  <ImageIcon size={18} /> {sharingMode === 'sem_link' ? 'Preparando...' : 'Compartilhar sem link'}
                </button>
                <button className="btn btn-secondary btn-full" type="button" onClick={() => baixarImagem('sem_link')} disabled={Boolean(sharingMode)}>
                  <Download size={18} /> Baixar imagem sem link
                </button>
              </div>
            </div>

            <div className="card" style={{ background: '#fff8e1' }}>
              <strong>Opção 2: anúncio + link do app</strong>
              <p className="muted" style={{ marginTop: 4 }}>Envia imagem + descrição + link do anúncio.</p>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <button className="btn btn-amber btn-full" type="button" onClick={() => compartilhar('com_link')} disabled={Boolean(sharingMode)} aria-busy={sharingMode === 'com_link'}>
                  <ImageIcon size={18} /> {sharingMode === 'com_link' ? 'Preparando...' : 'Compartilhar com link'}
                </button>
                <button className="btn btn-secondary btn-full" type="button" onClick={() => baixarImagem('com_link')} disabled={Boolean(sharingMode)}>
                  <Download size={18} /> Baixar imagem com link
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
