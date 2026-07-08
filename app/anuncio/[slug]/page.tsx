'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, MapPin, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Anuncio } from '@/types';
import { formatMoney } from '@/lib/whatsapp';
import WhatsAppButton from '@/components/WhatsAppButton';
import EmptyState from '@/components/EmptyState';

function mapsUrl(anuncio: Anuncio) {
  if (anuncio.latitude && anuncio.longitude) return `https://www.google.com/maps?q=${anuncio.latitude},${anuncio.longitude}`;
  const partes = [anuncio.endereco, anuncio.bairro, anuncio.cidade, anuncio.estado].filter(Boolean).join(', ');
  return partes ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes)}` : null;
}

export default function AnuncioDetalhePage() {
  const params = useParams<{ slug: string }>();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFoto, setSelectedFoto] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('anuncios')
        .select('*, categorias(*), fotos_anuncios(*)')
        .eq('slug', params.slug)
        .single();

      if (data) {
        setAnuncio(data as Anuncio);
        const foto = data.fotos_anuncios?.find((f: any) => f.principal)?.url_foto || data.fotos_anuncios?.[0]?.url_foto || null;
        setSelectedFoto(foto);
        await supabase.rpc('incrementar_visualizacao', { anuncio_uuid: data.id });
      }
      setLoading(false);
    }
    load();
  }, [params.slug]);

  async function compartilhar() {
    if (!anuncio) return;
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: anuncio.titulo, text: anuncio.descricao, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copiado.');
    }
  }

  async function registrarClique() {
    if (!anuncio) return;
    await supabase.rpc('incrementar_clique_whatsapp', { anuncio_uuid: anuncio.id });
  }

  if (loading) return <main className="page"><div className="container"><div className="card">Carregando...</div></div></main>;
  if (!anuncio) return <main className="page"><div className="container"><EmptyState title="Anúncio não encontrado" /></div></main>;

  const fotos = anuncio.fotos_anuncios || [];
  const linkMapa = mapsUrl(anuncio);

  return (
    <main className="page">
      <div className="container">
        <Link href="/anuncios" className="muted">← Voltar aos anúncios</Link>
        <div className="detail-grid" style={{ marginTop: 16 }}>
          <div>
            <div className="gallery-main">
              {selectedFoto ? <img src={selectedFoto} alt={anuncio.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="muted">Sem foto</span>}
            </div>
            {fotos.length > 1 && (
              <div className="thumb-row">
                {fotos.map((f) => <img key={f.id} className="thumb" src={f.url_foto} alt="Foto do anúncio" onClick={() => setSelectedFoto(f.url_foto)} />)}
              </div>
            )}
          </div>

          <section className="card">
            <span className="badge">{anuncio.categorias?.nome || anuncio.tipo_anuncio}</span>
            <h1 style={{ marginBottom: 8 }}>{anuncio.titulo}</h1>
            <div className="price" style={{ fontSize: 34 }}>{formatMoney(anuncio.preco, anuncio.preco_a_combinar)}</div>
            <p className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={18} /> {anuncio.bairro ? `${anuncio.bairro} - ` : ''}{anuncio.cidade} - {anuncio.estado}</p>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{anuncio.descricao}</p>

            {(anuncio.endereco || anuncio.referencia || linkMapa) && (
              <div className="card" style={{ background: '#f8faf4', marginBottom: 12 }}>
                <strong>Localização</strong>
                {anuncio.endereco && <p className="muted" style={{ marginBottom: 4 }}>{anuncio.endereco}</p>}
                {anuncio.referencia && <p className="muted" style={{ marginTop: 0 }}>Referência: {anuncio.referencia}</p>}
                {linkMapa && <a className="btn btn-secondary btn-full" href={linkMapa} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Abrir no Google Maps</a>}
              </div>
            )}

            <div className="card" style={{ background: '#f8faf4' }}>
              <strong>Contato</strong>
              <p className="muted">{anuncio.nome_contato}</p>
              {anuncio.quantidade && <p className="muted">Quantidade: {anuncio.quantidade} {anuncio.unidade}</p>}
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 14 }} onClick={registrarClique}>
              <WhatsAppButton phone={anuncio.whatsapp} title={anuncio.titulo} full />
              <button className="btn btn-secondary btn-full" onClick={compartilhar}><Share2 size={18} /> Compartilhar anúncio</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
