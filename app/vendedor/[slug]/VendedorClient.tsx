'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MapPin, MessageCircle, ShieldCheck, Star, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Anuncio, AvaliacaoVendedor, Vitrine } from '@/types';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';
import ShareButton from '@/components/ShareButton';
import RatingStars from '@/components/RatingStars';

function resumoAvaliacoes(avaliacoes: AvaliacaoVendedor[]) {
  const validas = avaliacoes.filter((item) => item.status === 'aprovada');
  const total = validas.length;
  const media = total ? validas.reduce((acc, item) => acc + Number(item.nota || 0), 0) / total : 0;
  return { total, media, validas };
}

export default function VendedorClient() {
  const params = useParams<{ slug: string }>();
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoVendedor[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [avaliando, setAvaliando] = useState(false);
  const [avaliacaoMsg, setAvaliacaoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregarAvaliacoes(vitrineId: string, usuarioId?: string | null) {
    const { data } = await supabase
      .from('vendedor_avaliacoes')
      .select('*')
      .eq('vitrine_id', vitrineId)
      .eq('status', 'aprovada')
      .order('updated_at', { ascending: false });

    const lista = (data || []) as AvaliacaoVendedor[];
    setAvaliacoes(lista);

    if (usuarioId) {
      const minha = lista.find((item) => item.avaliador_id === usuarioId);
      if (minha) {
        setNota(minha.nota);
        setComentario(minha.comentario || '');
      }
    }
  }

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const usuarioAtual = userData.user?.id || null;
      setUserId(usuarioAtual);

      const { data: vitrineData } = await supabase
        .from('vitrines')
        .select('*')
        .eq('slug', params.slug)
        .eq('vitrine_ativa', true)
        .single();

      if (vitrineData) {
        const vitrineAtual = vitrineData as Vitrine;
        setVitrine(vitrineAtual);

        const { data: ads } = await supabase
          .from('anuncios')
          .select('*, categorias(*), fotos_anuncios(*)')
          .eq('usuario_id', vitrineAtual.usuario_id)
          .eq('status', 'aprovado')
          .order('destaque', { ascending: false })
          .order('created_at', { ascending: false });

        setAnuncios((ads || []) as Anuncio[]);
        await carregarAvaliacoes(vitrineAtual.id, usuarioAtual);
      }

      setLoading(false);
    }

    load();
  }, [params.slug]);

  async function enviarAvaliacao(e: FormEvent) {
    e.preventDefault();
    if (!vitrine) return;

    if (!userId) {
      setAvaliacaoMsg('Entre na sua conta para avaliar este vendedor.');
      return;
    }

    if (userId === vitrine.usuario_id) {
      setAvaliacaoMsg('Você não pode avaliar sua própria vitrine.');
      return;
    }

    setAvaliando(true);
    setAvaliacaoMsg(null);

    const { error } = await supabase.from('vendedor_avaliacoes').upsert({
      vitrine_id: vitrine.id,
      vendedor_id: vitrine.usuario_id,
      avaliador_id: userId,
      nota,
      comentario: comentario.trim() || null,
      status: 'aprovada',
      updated_at: new Date().toISOString()
    }, { onConflict: 'vitrine_id,avaliador_id' });

    if (error) {
      setAvaliacaoMsg(error.message);
    } else {
      setAvaliacaoMsg('Avaliação salva. Obrigado por ajudar outros compradores.');
      await carregarAvaliacoes(vitrine.id, userId);
    }

    setAvaliando(false);
  }

  if (loading) return <main className="page"><div className="container"><div className="card">Carregando vitrine...</div></div></main>;
  if (!vitrine) return <main className="page"><div className="container"><EmptyState title="Vitrine não encontrada" description="Essa vitrine pode estar desativada ou ainda não existir." /></div></main>;

  const numero = (vitrine.whatsapp || '').replace(/\D/g, '');
  const linkVitrine = `https://agromarket-two.vercel.app/vendedor/${vitrine.slug}`;
  const whatsapp = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(`Olá, vi sua vitrine no AgroMarket: ${vitrine.nome_vitrine}\n\nLink da vitrine: ${linkVitrine}`)}` : null;
  const logoFit = vitrine.logo_object_fit || 'cover';
  const logoPosition = vitrine.logo_object_position || 'center';
  const bannerPosition = vitrine.banner_object_position || 'center';
  const localTexto = `${vitrine.cidade || 'Cidade não informada'} - ${vitrine.estado || 'UF'}`;
  const descricaoCurta = (vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.').length > 150
    ? `${(vitrine.descricao || '').slice(0, 150)}...`
    : (vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.');
  const { total, media, validas } = resumoAvaliacoes(avaliacoes);
  const mensagemVitrine = `🌱 Vitrine AgroMarket\n\n🏪 ${vitrine.nome_vitrine}\n⭐ ${total ? `${media.toFixed(1)} de 5 (${total} avaliações)` : 'Ainda sem avaliações'}\n📍 ${localTexto}\n📦 ${anuncios.length} anúncio(s) disponível(is)\n\n${descricaoCurta}\n\nVeja a vitrine:`;
  const podeAvaliar = Boolean(userId && userId !== vitrine.usuario_id);

  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ minHeight: 160, background: vitrine.banner_url ? `url(${vitrine.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', display: 'flex', alignItems: 'end', padding: 18 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', color: '#fff' }}>
              <div style={{ width: 78, height: 78, borderRadius: 24, background: '#fff', color: '#14532d', display: 'grid', placeItems: 'center', overflow: 'hidden', fontWeight: 900, fontSize: 24 }}>
                {vitrine.foto_url ? <img src={vitrine.foto_url} alt={vitrine.nome_vitrine} style={{ width: '100%', height: '100%', objectFit: logoFit as any, objectPosition: logoPosition }} /> : <Store size={34} />}
              </div>
              <div>
                <h1 style={{ margin: 0, color: '#fff' }}>{vitrine.nome_vitrine}</h1>
                <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,.86)', display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={17} /> {localTexto}</p>
                <div style={{ marginTop: 6, background: 'rgba(255,255,255,.9)', borderRadius: 999, padding: '5px 9px', display: 'inline-flex' }}>
                  <RatingStars nota={media} total={total} size={16} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {vitrine.verificado && <span className="badge"><ShieldCheck size={14} /> Verificado</span>}
              {vitrine.destaque && <span className="badge">Vitrine destaque</span>}
              <span className="badge">{anuncios.length} anúncio(s)</span>
              <span className="badge"><Star size={14} /> {total ? `${media.toFixed(1)} estrelas` : 'Sem avaliações'}</span>
              <span className="badge">{vitrine.plano === 'gratis_lancamento' ? 'Grátis no lançamento' : vitrine.plano}</span>
            </div>

            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{vitrine.descricao || 'Vendedor AgroMarket.'}</p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {whatsapp && <a className="btn btn-whatsapp" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chamar vendedor</a>}
              <ShareButton label="Compartilhar vitrine" title={vitrine.nome_vitrine} message={mensagemVitrine} path={`/vendedor/${vitrine.slug}`} />
              <Link className="btn btn-secondary" href="/anuncios">Ver outros anúncios</Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="grid grid-2">
            <form className="card form" onSubmit={enviarAvaliacao}>
              <h2>Avaliar vendedor</h2>
              <p className="muted">Sua avaliação ajuda outros compradores a negociar com mais confiança.</p>
              {avaliacaoMsg && <div className="notice">{avaliacaoMsg}</div>}

              {!userId ? (
                <Link className="btn btn-primary btn-full" href="/login">Entrar para avaliar</Link>
              ) : userId === vitrine.usuario_id ? (
                <div className="notice">Essa é sua vitrine. O vendedor não pode avaliar a própria vitrine.</div>
              ) : (
                <>
                  <div>
                    <span className="label">Nota</span>
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNota(star)}
                          style={{ border: 0, background: 'transparent', color: '#ca8a04', padding: 2, cursor: 'pointer' }}
                          aria-label={`${star} estrela(s)`}
                        >
                          <Star size={34} fill={star <= nota ? 'currentColor' : 'none'} strokeWidth={2.4} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="field">
                    <span className="label">Comentário, opcional</span>
                    <textarea className="textarea" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ex: bom atendimento, respondeu rápido, produto conforme anunciado..." />
                  </label>

                  <button className="btn btn-primary btn-full" disabled={avaliando} type="submit">
                    {avaliando ? 'Salvando...' : 'Salvar avaliação'}
                  </button>
                </>
              )}
            </form>

            <div className="card">
              <h2>Resumo das avaliações</h2>
              <RatingStars nota={media} total={total} size={24} />
              <p className="muted">Média baseada nas avaliações feitas por usuários logados.</p>
              {validas.length ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                  {validas.slice(0, 3).map((item) => (
                    <div className="notice" key={item.id}>
                      <RatingStars nota={item.nota} size={15} showText={false} />
                      {item.comentario && <p style={{ margin: '6px 0 0' }}>{item.comentario}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="muted">Ainda não há avaliações para esta vitrine.</p>}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>Produtos e serviços desta vitrine</h2>
              <p>Todos os anúncios aprovados desse vendedor.</p>
            </div>
          </div>

          {anuncios.length ? (
            <div className="grid grid-4">
              {anuncios.map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
            </div>
          ) : <EmptyState title="Nenhum anúncio aprovado nessa vitrine" />}
        </section>
      </div>
    </main>
  );
}
