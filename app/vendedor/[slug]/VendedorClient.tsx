'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Lock, MapPin, MessageCircle, Search, ShieldCheck, ShoppingBag, Star, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Anuncio, AvaliacaoVendedor, FotoAnuncio, Vitrine } from '@/types';
import EmptyState from '@/components/EmptyState';
import ShareButton from '@/components/ShareButton';
import RatingStars from '@/components/RatingStars';
import { formatMoney } from '@/lib/whatsapp';

type AnuncioLoja = Anuncio & {
  fotos_anuncios?: FotoAnuncio[];
};

function resumoAvaliacoes(avaliacoes: AvaliacaoVendedor[]) {
  const validas = avaliacoes.filter((item) => item.status === 'aprovada');
  const total = validas.length;
  const media = total ? validas.reduce((acc, item) => acc + Number(item.nota || 0), 0) / total : 0;
  return { total, media, validas };
}

function capa(ad: AnuncioLoja) {
  const fotos = [...(ad.fotos_anuncios || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  return fotos.find((foto) => foto.principal)?.url_foto || fotos[0]?.url_foto || null;
}

export default function VendedorClient() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const modoVisitante = searchParams.get('visao') === 'visitante';
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [anuncios, setAnuncios] = useState<AnuncioLoja[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoVendedor[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
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

        setAnuncios((ads || []) as AnuncioLoja[]);
        await carregarAvaliacoes(vitrineAtual.id, usuarioAtual);
      }

      setLoading(false);
    }

    load();
  }, [params.slug]);

  async function enviarAvaliacao(e: FormEvent) {
    e.preventDefault();
    if (!vitrine) return;

    if (!userId || modoVisitante) {
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

  const categoriasLoja = useMemo(() => {
    const mapa = new Map<string, string>();
    anuncios.forEach((ad) => {
      const nome = ad.categorias?.nome || ad.tipo_anuncio;
      mapa.set(nome, nome);
    });
    return Array.from(mapa.values());
  }, [anuncios]);

  const anunciosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return anuncios.filter((ad) => {
      const categoriaNome = ad.categorias?.nome || ad.tipo_anuncio;
      const bateCategoria = categoriaAtiva === 'todos' || categoriaNome === categoriaAtiva;
      const bateBusca = !termo || `${ad.titulo} ${ad.descricao} ${categoriaNome}`.toLowerCase().includes(termo);
      return bateCategoria && bateBusca;
    });
  }, [anuncios, busca, categoriaAtiva]);

  if (loading) return <main className="page"><div className="container"><div className="card">Carregando vitrine...</div></div></main>;
  if (!vitrine) return <main className="page"><div className="container"><EmptyState title="Vitrine não encontrada" description="Essa vitrine pode estar desativada ou ainda não existir." /></div></main>;

  const numero = (vitrine.whatsapp || '').replace(/\D/g, '');
  const linkVitrine = `https://agromarket-two.vercel.app/vendedor/${vitrine.slug}`;
  const whatsapp = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(`Olá, vi sua lojinha no AgroMarket: ${vitrine.nome_vitrine}\n\nLink da vitrine: ${linkVitrine}`)}` : null;
  const logoFit = vitrine.logo_object_fit || 'cover';
  const logoPosition = vitrine.logo_object_position || 'center';
  const bannerPosition = vitrine.banner_object_position || 'center';
  const localTexto = `${vitrine.cidade || 'Cidade não informada'} - ${vitrine.estado || 'UF'}`;
  const descricaoCurta = (vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.').length > 150
    ? `${(vitrine.descricao || '').slice(0, 150)}...`
    : (vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.');
  const { total, media, validas } = resumoAvaliacoes(avaliacoes);
  const vendedorEhDono = Boolean(userId && userId === vitrine.usuario_id && !modoVisitante);
  const podeVerWhatsapp = Boolean(userId && !modoVisitante);
  const mensagemVitrine = `🌱 Lojinha AgroMarket\n\n🏪 ${vitrine.nome_vitrine}\n⭐ ${total ? `${media.toFixed(1)} de 5 (${total} avaliações)` : 'Ainda sem avaliações'}\n📍 ${localTexto}\n📦 ${anuncios.length} anúncio(s) disponível(is)\n\n${descricaoCurta}\n\nVeja a vitrine:`;

  return (
    <main className="page">
      <div className="container">
        {modoVisitante && (
          <div className="notice" style={{ marginBottom: 12 }}>
            Visualização de visitante: esta é a aparência pública da lojinha para quem não está logado.
          </div>
        )}

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ minHeight: 220, background: vitrine.banner_url ? `url(${vitrine.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', display: 'flex', alignItems: 'end', padding: 18, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62))' }} />
            <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'center', color: '#fff', width: '100%' }}>
              <div style={{ width: 92, height: 92, borderRadius: 28, background: '#fff', color: '#14532d', display: 'grid', placeItems: 'center', overflow: 'hidden', fontWeight: 900, fontSize: 24, boxShadow: '0 18px 45px rgba(0,0,0,.22)' }}>
                {vitrine.foto_url ? <img src={vitrine.foto_url} alt={vitrine.nome_vitrine} style={{ width: '100%', height: '100%', objectFit: logoFit as any, objectPosition: logoPosition }} /> : <Store size={38} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <span className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}><ShoppingBag size={14} /> Lojinha AgroMarket</span>
                <h1 style={{ margin: '8px 0 4px', color: '#fff' }}>{vitrine.nome_vitrine}</h1>
                <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,.88)', display: 'flex', gap: 6, alignItems: 'center' }}><MapPin size={17} /> {localTexto}</p>
                <div style={{ background: 'rgba(255,255,255,.92)', borderRadius: 999, padding: '6px 10px', display: 'inline-flex' }}>
                  <RatingStars nota={media} total={total} size={16} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
              <div className="mini-card"><strong>{anuncios.length}</strong><br /><span className="muted">produtos</span></div>
              <div className="mini-card"><strong>{categoriasLoja.length}</strong><br /><span className="muted">categorias</span></div>
              <div className="mini-card"><strong>{total ? media.toFixed(1) : '—'}</strong><br /><span className="muted">estrelas</span></div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {vitrine.verificado && <span className="badge"><ShieldCheck size={14} /> Vendedor verificado</span>}
              {vitrine.destaque && <span className="badge">Lojinha destaque</span>}
              <span className="badge">{anuncios.length} anúncio(s)</span>
              <span className="badge"><Star size={14} /> {total ? `${media.toFixed(1)} estrelas` : 'Sem avaliações'}</span>
            </div>

            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{vitrine.descricao || 'Vendedor AgroMarket.'}</p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {whatsapp && podeVerWhatsapp ? (
                <a className="btn btn-whatsapp" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chamar vendedor</a>
              ) : (
                <Link className="btn btn-primary" href="/login"><Lock size={18} /> Entrar para chamar vendedor</Link>
              )}
              <ShareButton label="Compartilhar lojinha" title={vitrine.nome_vitrine} message={mensagemVitrine} path={`/vendedor/${vitrine.slug}`} />
              {vendedorEhDono && <Link className="btn btn-secondary" href={`/vendedor/${vitrine.slug}?visao=visitante`}>Ver como visitante</Link>}
              {vendedorEhDono && <Link className="btn btn-secondary" href="/painel/vitrine">Editar vitrine</Link>}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="card" style={{ background: '#f8faf4' }}>
            <div className="section-head section-head-compact" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ marginTop: 0 }}>Produtos da lojinha</h2>
                <p>Busque dentro dos anúncios deste vendedor.</p>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <span className="label">Pesquisar na lojinha</span>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5f6f5b' }} />
                <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex: codorna, leitoa, ração..." style={{ paddingLeft: 44 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              <button type="button" className={categoriaAtiva === 'todos' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setCategoriaAtiva('todos')}>Todos</button>
              {categoriasLoja.map((cat) => (
                <button key={cat} type="button" className={categoriaAtiva === cat ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setCategoriaAtiva(cat)} style={{ whiteSpace: 'nowrap' }}>{cat}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          {anunciosFiltrados.length ? (
            <div className="grid grid-4">
              {anunciosFiltrados.map((ad) => {
                const foto = capa(ad);
                return (
                  <Link key={ad.id} href={`/anuncio/${ad.slug}`} className="card" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none' }}>
                    <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#eef3ea', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                      {foto ? <img src={foto} alt={ad.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Store size={30} />}
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {ad.destaque && <span className="badge">Destaque</span>}
                        <span className="badge">{ad.categorias?.nome || ad.tipo_anuncio}</span>
                      </div>
                      <strong style={{ display: 'block', color: '#10230f', fontSize: 18, lineHeight: 1.15 }}>{ad.titulo}</strong>
                      <div className="price" style={{ fontSize: 22, marginTop: 6 }}>{formatMoney(ad.preco, ad.preco_a_combinar)}</div>
                      <p className="muted" style={{ margin: '6px 0 0' }}>{ad.cidade} - {ad.estado}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : <EmptyState title="Nenhum produto encontrado" description="Tente buscar por outro termo ou categoria." />}
        </section>

        <section className="section">
          <div className="grid grid-2">
            <div className="card">
              <h2>Resumo das avaliações</h2>
              <RatingStars nota={media} total={total} size={24} />
              <p className="muted">Média baseada nas avaliações feitas por usuários logados.</p>
              {validas.length ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                  {validas.slice(0, 4).map((item) => (
                    <div className="notice" key={item.id}>
                      <RatingStars nota={item.nota} size={15} showText={false} />
                      {item.comentario && <p style={{ margin: '6px 0 0' }}>{item.comentario}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="muted">Ainda não há avaliações para esta vitrine.</p>}
            </div>

            <form className="card form" onSubmit={enviarAvaliacao}>
              <h2>Avaliar vendedor</h2>
              <p className="muted">Sua avaliação ajuda outros compradores a negociar com mais confiança.</p>
              {avaliacaoMsg && <div className="notice">{avaliacaoMsg}</div>}

              {!userId || modoVisitante ? (
                <Link className="btn btn-primary btn-full" href="/login">Entrar para avaliar</Link>
              ) : userId === vitrine.usuario_id ? (
                <div className="notice">Essa é sua vitrine. Use “Ver como visitante” para conferir a aparência pública da lojinha.</div>
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
          </div>
        </section>
      </div>
    </main>
  );
}
