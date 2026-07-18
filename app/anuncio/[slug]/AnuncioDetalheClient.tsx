'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Flag, MapPin, Store, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Anuncio, AvaliacaoVendedor, Vitrine } from '@/types';
import { formatMoney } from '@/lib/whatsapp';
import WhatsAppButton from '@/components/WhatsAppButton';
import ShareButton from '@/components/ShareButton';
import EmptyState from '@/components/EmptyState';
import RatingStars from '@/components/RatingStars';

const MOTIVOS_DENUNCIA = [
  'Golpe ou fraude',
  'Produto proibido',
  'Imagem falsa',
  'Preço enganoso',
  'Contato errado',
  'Animal em situação irregular',
  'Anúncio repetido',
  'Outro motivo'
];

function calcularResumoAvaliacoes(avaliacoes: AvaliacaoVendedor[]) {
  const total = avaliacoes.length;
  const media = total ? avaliacoes.reduce((acc, item) => acc + Number(item.nota || 0), 0) / total : 0;
  return { total, media };
}

export default function AnuncioDetalheClient() {
  const params = useParams<{ slug: string }>();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [ratingResumo, setRatingResumo] = useState({ media: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedFoto, setSelectedFoto] = useState<string | null>(null);
  const [fotoAbertaIndex, setFotoAbertaIndex] = useState<number | null>(null);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS_DENUNCIA[0]);
  const [descricaoDenuncia, setDescricaoDenuncia] = useState('');
  const [contatoDenuncia, setContatoDenuncia] = useState('');
  const [denunciando, setDenunciando] = useState(false);
  const [denunciaMsg, setDenunciaMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('anuncios')
        .select('*, categorias(*), fotos_anuncios(*)')
        .eq('slug', params.slug)
        .single();

      if (data) {
        const anuncioData = data as Anuncio;
        setAnuncio(anuncioData);
        const fotosOrdenadas = [...(data.fotos_anuncios || [])].sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0));
        const foto = fotosOrdenadas.find((f: any) => f.principal)?.url_foto || fotosOrdenadas[0]?.url_foto || null;
        setSelectedFoto(foto);
        await supabase.rpc('incrementar_visualizacao', { anuncio_uuid: data.id });

        const { data: vitrineData } = await supabase
          .from('vitrines')
          .select('*')
          .eq('usuario_id', anuncioData.usuario_id)
          .eq('vitrine_ativa', true)
          .maybeSingle();

        if (vitrineData) {
          const vitrineAtual = vitrineData as Vitrine;
          setVitrine(vitrineAtual);

          const { data: avaliacoesData } = await supabase
            .from('vendedor_avaliacoes')
            .select('*')
            .eq('vitrine_id', vitrineAtual.id)
            .eq('status', 'aprovada');

          setRatingResumo(calcularResumoAvaliacoes((avaliacoesData || []) as AvaliacaoVendedor[]));
        } else {
          setVitrine(null);
          setRatingResumo({ media: 0, total: 0 });
        }
      }
      setLoading(false);
    }
    load();
  }, [params.slug]);

  async function enviarDenuncia(e: FormEvent) {
    e.preventDefault();
    if (!anuncio) return;

    setDenunciando(true);
    setDenunciaMsg(null);

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('denuncias').insert({
      anuncio_id: anuncio.id,
      denunciante_id: userData.user?.id || null,
      motivo,
      descricao: descricaoDenuncia.trim() || null,
      contato: contatoDenuncia.trim() || null,
      status: 'aberta'
    });

    if (error) {
      setDenunciaMsg(error.message);
    } else {
      setDenunciaMsg('Denúncia enviada. Vamos analisar esse anúncio.');
      setDescricaoDenuncia('');
      setContatoDenuncia('');
      setMotivo(MOTIVOS_DENUNCIA[0]);
    }

    setDenunciando(false);
  }

  if (loading) return <main className="page"><div className="container"><div className="card">Carregando...</div></div></main>;
  if (!anuncio) return <main className="page"><div className="container"><EmptyState title="Anúncio não encontrado" /></div></main>;

  const fotos = [...(anuncio.fotos_anuncios || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const fotoCapa = fotos.find((foto) => foto.principal) || fotos[0] || null;
  const fotoAberta = fotoAbertaIndex !== null ? fotos[fotoAbertaIndex]?.url_foto : null;
  const precoTexto = formatMoney(anuncio.preco, anuncio.preco_a_combinar);
  const localTexto = `${anuncio.bairro ? `${anuncio.bairro} - ` : ''}${anuncio.cidade} - ${anuncio.estado}`;
  const descricaoCurta = anuncio.descricao.length > 170 ? `${anuncio.descricao.slice(0, 170)}...` : anuncio.descricao;
  const mensagemCompartilhar = `🌱 AgroMarket\n\n📢 ${anuncio.titulo}\n💰 ${precoTexto}\n📍 ${localTexto}\n\n${descricaoCurta}`;
  const shareVersion = String(fotoCapa?.id || anuncio.updated_at || anuncio.id);
  const shareImagePath = `/api/og/anuncio/${anuncio.slug}?formato=compartilhar&v=${encodeURIComponent(shareVersion)}`;

  function abrirFotoSelecionada() {
    if (!selectedFoto || !fotos.length) return;
    const index = fotos.findIndex((foto) => foto.url_foto === selectedFoto);
    setFotoAbertaIndex(index >= 0 ? index : 0);
  }

  function fotoAnterior() {
    setFotoAbertaIndex((atual) => {
      if (!fotos.length) return null;
      if (atual === null) return 0;
      return (atual - 1 + fotos.length) % fotos.length;
    });
  }

  function proximaFoto() {
    setFotoAbertaIndex((atual) => {
      if (!fotos.length) return null;
      if (atual === null) return 0;
      return (atual + 1) % fotos.length;
    });
  }

  return (
    <main className="page">
      <div className="container">
        <Link href="/anuncios" className="muted">← Voltar aos anúncios</Link>
        <div className="detail-grid" style={{ marginTop: 16 }}>
          <div>
            <button
              type="button"
              className="gallery-main"
              onClick={abrirFotoSelecionada}
              style={{ border: 0, width: '100%', padding: 0, cursor: selectedFoto ? 'zoom-in' : 'default' }}
            >
              {selectedFoto ? (
                <img src={selectedFoto} alt={anuncio.titulo} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#eef3ea' }} />
              ) : <span className="muted">Sem foto</span>}
            </button>
            {selectedFoto && <p className="muted" style={{ textAlign: 'center', margin: '8px 0 0' }}>Toque na foto para ampliar</p>}
            {fotos.length > 1 && (
              <div className="thumb-row">
                {fotos.map((f) => (
                  <img
                    key={f.id}
                    className="thumb"
                    src={f.url_foto}
                    alt="Foto do anúncio"
                    onClick={() => setSelectedFoto(f.url_foto)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
            )}
          </div>

          <section className="card">
            <span className="badge">{anuncio.categorias?.nome || anuncio.tipo_anuncio}</span>
            <h1 style={{ marginBottom: 8 }}>{anuncio.titulo}</h1>
            <div className="price" style={{ fontSize: 34 }}>{precoTexto}</div>
            <p className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={18} /> {localTexto}</p>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{anuncio.descricao}</p>

            {vitrine && (
              <div className="card" style={{ background: '#f8faf4', marginBottom: 12 }}>
                <strong>Vendido por</strong>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: '#dcfce7', display: 'grid', placeItems: 'center', overflow: 'hidden', color: '#14532d' }}>
                    {vitrine.foto_url ? <img src={vitrine.foto_url} alt={vitrine.nome_vitrine} style={{ width: '100%', height: '100%', objectFit: (vitrine.logo_object_fit || 'cover') as any, objectPosition: vitrine.logo_object_position || 'center' }} /> : <Store size={24} />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 900 }}>{vitrine.nome_vitrine}</p>
                    <p className="muted" style={{ margin: '3px 0 0' }}>{vitrine.cidade || anuncio.cidade} - {vitrine.estado || anuncio.estado}</p>
                    <div style={{ marginTop: 5 }}>
                      <RatingStars nota={ratingResumo.media} total={ratingResumo.total} size={15} />
                    </div>
                  </div>
                </div>
                <Link className="btn btn-secondary btn-full" style={{ marginTop: 12 }} href={`/vendedor/${vitrine.slug}`}>Ver vitrine do vendedor</Link>
              </div>
            )}

            <div className="card" style={{ background: '#f8faf4' }}>
              <strong>Contato</strong>
              <p className="muted">{anuncio.nome_contato}</p>
              {anuncio.quantidade && <p className="muted">Quantidade: {anuncio.quantidade} {anuncio.unidade}</p>}
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              <WhatsAppButton phone={anuncio.whatsapp} title={anuncio.titulo} urlPath={`/anuncio/${anuncio.slug}`} anuncioId={anuncio.id} full />
              <ShareButton
                label="Compartilhar anúncio"
                title={anuncio.titulo}
                message={mensagemCompartilhar}
                path={`/anuncio/${anuncio.slug}`}
                cacheKey={shareVersion}
                imagePath={shareImagePath}
                coverImageUrl={fotoCapa?.url_foto || null}
                full
              />
              <button className="btn btn-danger btn-full" onClick={() => setDenunciaAberta(true)}><Flag size={18} /> Denunciar anúncio</button>
            </div>
          </section>
        </div>
      </div>

      {denunciaAberta && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDenunciaAberta(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,.72)', display: 'grid', placeItems: 'center', padding: 14 }}
        >
          <form className="card form" onSubmit={enviarDenuncia} onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0 }}>Denunciar anúncio</h2>
                <p className="muted" style={{ margin: '6px 0 0' }}>Ajude a manter o AgroMarket seguro.</p>
              </div>
              <button className="btn btn-secondary" type="button" onClick={() => setDenunciaAberta(false)}><X size={18} /></button>
            </div>

            {denunciaMsg && <div className="notice">{denunciaMsg}</div>}

            <label className="field">
              <span className="label">Motivo</span>
              <select className="select" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS_DENUNCIA.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="field">
              <span className="label">Explique rapidamente</span>
              <textarea className="textarea" value={descricaoDenuncia} onChange={(e) => setDescricaoDenuncia(e.target.value)} placeholder="Ex: foto falsa, telefone não responde, suspeita de golpe..." />
            </label>

            <label className="field">
              <span className="label">Seu contato, opcional</span>
              <input className="input" value={contatoDenuncia} onChange={(e) => setContatoDenuncia(e.target.value)} placeholder="WhatsApp ou e-mail para retorno" />
            </label>

            <button className="btn btn-danger btn-full" disabled={denunciando} type="submit">
              {denunciando ? 'Enviando...' : 'Enviar denúncia'}
            </button>
          </form>
        </div>
      )}

      {fotoAberta && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setFotoAbertaIndex(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.88)', display: 'grid', placeItems: 'center', padding: 12 }}
        >
          <button className="btn btn-secondary" type="button" onClick={() => setFotoAbertaIndex(null)} style={{ position: 'fixed', right: 12, top: 12, zIndex: 1001 }}><X size={18} /> Fechar</button>

          {fotos.length > 1 && <button className="btn btn-secondary" type="button" onClick={(e) => { e.stopPropagation(); fotoAnterior(); }} style={{ position: 'fixed', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 1001, padding: 10 }}><ChevronLeft size={24} /></button>}

          <img src={fotoAberta} alt={anuncio.titulo} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '96vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 18, background: '#111' }} />

          {fotos.length > 1 && <button className="btn btn-secondary" type="button" onClick={(e) => { e.stopPropagation(); proximaFoto(); }} style={{ position: 'fixed', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 1001, padding: 10 }}><ChevronRight size={24} /></button>}
        </div>
      )}
    </main>
  );
}
