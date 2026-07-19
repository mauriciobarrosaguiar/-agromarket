'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { MapPin, MessageCircle, Search, ShieldCheck, ShoppingBag, Star, Store, Megaphone, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCanonicalSiteUrl } from '@/lib/site-url';
import type { Anuncio, AvaliacaoVendedor, Vitrine } from '@/types';
import EmptyState from '@/components/EmptyState';
import ShareButton from '@/components/ShareButton';
import RatingStars from '@/components/RatingStars';
import AnuncioCard from '@/components/AnuncioCard';

type AnuncioLoja = Anuncio;

function resumoAvaliacoes(avaliacoes: AvaliacaoVendedor[]) {
  const validas = avaliacoes.filter((item) => item.status === 'aprovada');
  const total = validas.length;
  const media = total ? validas.reduce((acc, item) => acc + Number(item.nota || 0), 0) / total : 0;
  return { total, media, validas };
}

function vitrineLiberada(vitrine: Vitrine) {
  if (!vitrine.vitrine_ativa) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  if (vitrine.assinatura_status === 'ativa') return !vitrine.assinatura_vencimento || vitrine.assinatura_vencimento >= hoje;
  if (vitrine.assinatura_status === 'gratis_lancamento') {
    const vencimento = vitrine.gratis_ate || vitrine.assinatura_vencimento;
    return !vencimento || vencimento >= hoje;
  }
  return false;
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
    const { data } = await supabase.from('vendedor_avaliacoes').select('*').eq('vitrine_id', vitrineId).eq('status', 'aprovada').order('updated_at', { ascending: false });
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

      const { data: vitrineData } = await supabase.from('vitrines').select('*').eq('slug', params.slug).eq('vitrine_ativa', true).maybeSingle();
      if (vitrineData && vitrineLiberada(vitrineData as Vitrine)) {
        const vitrineAtual = vitrineData as Vitrine;
        setVitrine(vitrineAtual);

        const { data: ads } = await supabase.from('anuncios').select('*, categorias(*), fotos_anuncios(*)').eq('usuario_id', vitrineAtual.usuario_id).eq('status', 'aprovado').order('destaque', { ascending: false }).order('created_at', { ascending: false });
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
    if (error) setAvaliacaoMsg(error.message);
    else {
      setAvaliacaoMsg('Avaliação salva. Obrigado por ajudar outros compradores.');
      await carregarAvaliacoes(vitrine.id, userId);
    }
    setAvaliando(false);
  }

  const categoriasLoja = useMemo(() => {
    const mapa = new Map<string, string>();
    anuncios.forEach((ad) => mapa.set(ad.categorias?.nome || ad.tipo_anuncio, ad.categorias?.nome || ad.tipo_anuncio));
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
  if (!vitrine) return <main className="page"><div className="container"><EmptyState title="Vitrine indisponível" description="Essa lojinha pode estar desativada, vencida ou aguardando pagamento da mensalidade." /></div></main>;

  const numero = (vitrine.whatsapp || '').replace(/\D/g, '');
  const linkVitrine = `${getCanonicalSiteUrl()}/vendedor/${vitrine.slug}`;
  const whatsapp = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(`Olá, vi sua lojinha no AgroMarket: ${vitrine.nome_vitrine}\n\nLink da vitrine: ${linkVitrine}`)}` : null;
  const logoPosition = vitrine.logo_object_position || 'center';
  const bannerPosition = vitrine.banner_object_position || 'center';
  const localTexto = `${vitrine.cidade || 'Cidade não informada'} - ${vitrine.estado || 'UF'}`;
  const descricaoCurta = (vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.').length > 150 ? `${(vitrine.descricao || '').slice(0, 150)}...` : (vitrine.descricao || 'Produtos, animais e serviços disponíveis no AgroMarket.');
  const { total, media, validas } = resumoAvaliacoes(avaliacoes);
  const vendedorEhDono = Boolean(userId && userId === vitrine.usuario_id && !modoVisitante);
  const shareVersion = String(vitrine.updated_at || vitrine.id);
  const shareImagePath = `/api/og/vitrine/${vitrine.slug}?v=${encodeURIComponent(shareVersion)}`;
  const coverImageUrl = vitrine.banner_url || vitrine.foto_url || null;
  const mensagemVitrine = `🌱 Lojinha AgroMarket\n\n🏪 ${vitrine.nome_vitrine}\n⭐ ${total ? `${media.toFixed(1)} de 5 (${total} avaliações)` : 'Ainda sem avaliações'}\n📍 ${localTexto}\n📦 ${anuncios.length} anúncio(s) disponível(is)\n\n${descricaoCurta}`;

  return (
    <main className="page">
      <div className="container">
        {modoVisitante && <div className="notice" style={{ marginBottom: 12 }}>Visualização de visitante: esta é a aparência pública da lojinha.</div>}

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ minHeight: 220, background: vitrine.banner_url ? `url(${vitrine.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', display: 'flex', alignItems: 'end', padding: 18, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62))' }} />
            <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'center', color: '#fff', width: '100%' }}>
              <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#fff', color: '#14532d', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 7, border: '2px solid rgba(255,255,255,.92)', fontWeight: 900, fontSize: 24, boxShadow: '0 18px 45px rgba(0,0,0,.22)', flexShrink: 0 }}>
                {vitrine.foto_url ? <img src={vitrine.foto_url} alt={vitrine.nome_vitrine} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: logoPosition, borderRadius: '50%', display: 'block' }} /> : <Store size={38} />}
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
              {whatsapp && <a className="btn btn-whatsapp" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chamar vendedor</a>}
              <ShareButton label="Compartilhar lojinha" title={vitrine.nome_vitrine} message={mensagemVitrine} path={`/vendedor/${vitrine.slug}`} cacheKey={shareVersion} imagePath={shareImagePath} coverImageUrl={coverImageUrl} />
              {vendedorEhDono && <Link className="btn btn-secondary" href={`/vendedor/${vitrine.slug}?visao=visitante`}>Ver como visitante</Link>}
              {vendedorEhDono && <Link className="btn btn-secondary" href="/painel/vitrine"><Pencil size={18} /> Editar lojinha</Link>}
              {vendedorEhDono && <Link className="btn btn-primary" href="/painel/patrocinado"><Megaphone size={18} /> Contratar patrocinado</Link>}
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
                <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#66715d' }} />
                <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto, animal ou serviço..." style={{ paddingLeft: 44 }} />
              </div>
            </div>
            {categoriasLoja.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <button className={categoriaAtiva === 'todos' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setCategoriaAtiva('todos')}>Todos</button>
                {categoriasLoja.map((cat) => <button key={cat} className={categoriaAtiva === cat ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setCategoriaAtiva(cat)}>{cat}</button>)}
              </div>
            )}
            {anunciosFiltrados.length ? (
              <div className="grid grid-4">
                {anunciosFiltrados.map((ad) => (
                  <div key={ad.id} style={{ display: 'grid', gap: 8 }}>
                    <AnuncioCard anuncio={ad} />
                    {vendedorEhDono && <Link className="btn btn-secondary btn-full" href={`/painel/editar/${ad.id}`}><Pencil size={16} /> Editar anúncio</Link>}
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Nenhum anúncio encontrado" description="Tente outro termo de busca dentro da lojinha." />}
          </div>
        </section>

        <section className="section">
          <div className="card">
            <h2>Avaliações do vendedor</h2>
            <RatingStars nota={media} total={total} size={20} />
            <form className="form" onSubmit={enviarAvaliacao} style={{ marginTop: 14 }}>
              {avaliacaoMsg && <div className="notice">{avaliacaoMsg}</div>}
              <label className="field"><span className="label">Sua nota</span><select className="select" value={nota} onChange={(e) => setNota(Number(e.target.value))}><option value={5}>5 estrelas</option><option value={4}>4 estrelas</option><option value={3}>3 estrelas</option><option value={2}>2 estrelas</option><option value={1}>1 estrela</option></select></label>
              <label className="field"><span className="label">Comentário, opcional</span><textarea className="textarea" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Conte como foi sua experiência com este vendedor." /></label>
              <button className="btn btn-primary" disabled={avaliando} type="submit">{avaliando ? 'Salvando...' : 'Avaliar vendedor'}</button>
            </form>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>{validas.slice(0, 5).map((item) => <div className="card" style={{ background: '#f8faf4' }} key={item.id}><RatingStars nota={item.nota} total={0} size={15} /><p style={{ marginBottom: 0 }}>{item.comentario || 'Sem comentário.'}</p></div>)}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
