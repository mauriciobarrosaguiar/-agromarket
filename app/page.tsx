'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, MapPin, MessageCircle, PlusCircle, Search, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { supabase, hasSupabaseEnv } from '@/lib/supabase';
import type { Anuncio, Categoria, PatrocinadoHome, Vitrine } from '@/types';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';
import PatrocinadoCarousel from '@/components/PatrocinadoCarousel';

type Coordenadas = {
  lat: number;
  lng: number;
};

type HomeConfig = {
  badge: string;
  titulo: string;
  subtitulo: string;
  placeholder_busca: string;
  botao_anunciar: string;
  botao_perto: string;
  botao_vitrines: string;
};

type AnuncioComDistancia = Anuncio & {
  distancia_calculada?: number | null;
};

const HOME_PADRAO: HomeConfig = {
  badge: 'Anuncie grátis',
  titulo: 'Compre e venda no agro perto de você.',
  subtitulo: 'Animais, ovos férteis, produtos da chácara, rações, máquinas e serviços — negociação direta pelo WhatsApp, sem intermediários.',
  placeholder_busca: 'Buscar leitão, ovos férteis, ração...',
  botao_anunciar: 'Quero anunciar',
  botao_perto: 'Ver perto de mim',
  botao_vitrines: 'Ver lojinhas'
};

function distanciaKm(origem: Coordenadas, anuncio: Anuncio) {
  if (!anuncio.latitude || !anuncio.longitude) return null;
  const raioTerra = 6371;
  const dLat = ((Number(anuncio.latitude) - origem.lat) * Math.PI) / 180;
  const dLng = ((Number(anuncio.longitude) - origem.lng) * Math.PI) / 180;
  const lat1 = (origem.lat * Math.PI) / 180;
  const lat2 = (Number(anuncio.latitude) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ordenarPorProximidade(lista: AnuncioComDistancia[], coords: Coordenadas | null) {
  const ordenada = coords
    ? lista
        .map((ad) => ({ ...ad, distancia_calculada: distanciaKm(coords, ad) }))
        .sort((a, b) => (a.distancia_calculada ?? 999999) - (b.distancia_calculada ?? 999999))
    : lista;

  return ordenada.sort((a, b) => Number(b.destaque) - Number(a.destaque));
}

function categoriaIcone(cat: Categoria) {
  const nome = cat.nome.toLowerCase();
  if (cat.icone) return cat.icone;
  if (nome.includes('ovo') || nome.includes('reprodução') || nome.includes('reproducao')) return '🥚';
  if (nome.includes('animal')) return '🐂';
  if (nome.includes('chácara') || nome.includes('chacara') || nome.includes('produto')) return '🌽';
  if (nome.includes('ração') || nome.includes('racao') || nome.includes('insumo')) return '🌾';
  if (nome.includes('máquina') || nome.includes('maquina')) return '🚜';
  if (nome.includes('serviço') || nome.includes('servico')) return '🛠️';
  if (nome.includes('emprego')) return '💼';
  return 'Ag';
}

function vitrineLiberada(vitrine: Vitrine) {
  if (!vitrine.vitrine_ativa) return false;
  if (vitrine.assinatura_status === 'ativa') return true;
  if (vitrine.assinatura_status === 'gratis_lancamento') {
    if (!vitrine.gratis_ate && !vitrine.assinatura_vencimento) return true;
    const limite = vitrine.gratis_ate || vitrine.assinatura_vencimento;
    return limite ? new Date(limite) >= new Date() : true;
  }
  return !vitrine.assinatura_vencimento || new Date(vitrine.assinatura_vencimento) >= new Date();
}

export default function HomePage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [anuncios, setAnuncios] = useState<AnuncioComDistancia[]>([]);
  const [vitrines, setVitrines] = useState<Vitrine[]>([]);
  const [patrocinados, setPatrocinados] = useState<PatrocinadoHome[]>([]);
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(HOME_PADRAO);
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  }, []);

  useEffect(() => {
    async function load() {
      const hoje = new Date().toISOString().slice(0, 10);
      const [{ data: cats }, { data: ads }, { data: banners }, { data: lojas }, { data: config }] = await Promise.all([
        supabase.from('categorias').select('*').eq('ativo', true).order('ordem').limit(8),
        supabase
          .from('anuncios')
          .select('*, categorias(*), subcategorias(*), fotos_anuncios(*)')
          .eq('status', 'aprovado')
          .order('destaque', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('patrocinados_home')
          .select('*')
          .eq('ativo', true)
          .eq('status', 'aprovado')
          .or(`inicio_em.is.null,inicio_em.lte.${hoje}`)
          .or(`fim_em.is.null,fim_em.gte.${hoje}`)
          .order('ordem')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('vitrines')
          .select('*')
          .eq('vitrine_ativa', true)
          .order('destaque', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('site_configuracoes').select('valor').eq('chave', 'home').maybeSingle()
      ]);
      setCategorias((cats || []) as Categoria[]);
      setAnuncios(ordenarPorProximidade((ads || []) as AnuncioComDistancia[], coords));
      setPatrocinados((banners || []) as PatrocinadoHome[]);
      setVitrines(((lojas || []) as Vitrine[]).filter(vitrineLiberada).slice(0, 3));
      if (config?.valor) setHomeConfig({ ...HOME_PADRAO, ...(config.valor as Partial<HomeConfig>) });
      setLoading(false);
    }
    load();
  }, [coords]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (busca.trim()) params.set('q', busca.trim());
    router.push(`/anuncios?${params.toString()}`);
  }

  return (
    <main className="page home-page">
      <section className="hero home-hero-v2">
        <div className="container">
          {!hasSupabaseEnv && <div className="notice" style={{ marginBottom: 14 }}>Configure o Supabase no arquivo .env.local para carregar dados reais.</div>}
          <div className="hero-card home-hero-card-v2">
            <div className="hero-copy">
              <span className="badge badge-amber"><Sparkles size={15} /> {homeConfig.badge}</span>
              <h1>{homeConfig.titulo}</h1>
              <p>{homeConfig.subtitulo}</p>

              <form onSubmit={buscar} className="home-search">
                <Search size={20} />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={homeConfig.placeholder_busca} />
                <button className="btn btn-primary" type="submit">Buscar</button>
              </form>

              <div className="hero-quick-actions">
                <Link className="btn btn-amber" href="/anunciar"><PlusCircle size={18} /> {homeConfig.botao_anunciar}</Link>
                <Link className="btn btn-glass" href="/anuncios"><MapPin size={18} /> {homeConfig.botao_perto}</Link>
                <Link className="btn btn-glass" href="/vitrines"><Store size={18} /> {homeConfig.botao_vitrines}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PatrocinadoCarousel itens={patrocinados} />

      {categorias.length > 0 && (
        <section className="section category-showcase">
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Categorias do agro</h2>
                <p>Filtre rápido por tipo de produto, criação ou serviço.</p>
              </div>
              <Link href="/anuncios" className="link-strong">Ver tudo →</Link>
            </div>
            <div className="category-grid-premium">
              {categorias.slice(0, 6).map((cat) => (
                <Link key={cat.id} href={`/anuncios?categoria=${cat.id}`} className="category-card-premium">
                  <span className="category-icon-premium">{categoriaIcone(cat)}</span>
                  <strong>{cat.nome}</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Em destaque perto de você</h2>
              <p>Anúncios aprovados, com negociação direta pelo WhatsApp.</p>
            </div>
            <Link href="/anuncios" className="link-strong">Ver todos →</Link>
          </div>
          {loading ? <div className="card">Carregando...</div> : anuncios.length ? (
            <div className="grid grid-4 home-ad-grid">
              {anuncios.slice(0, 8).map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
            </div>
          ) : <EmptyState title="Nenhum anúncio aprovado ainda" description="Crie o primeiro anúncio pelo botão Anunciar." />}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="store-cta-card">
            <div>
              <span className="badge badge-dark"><Store size={14} /> Lojinhas do agro</span>
              <h2>Sua chácara com vitrine própria.</h2>
              <p>Mostre produtos, avaliações e WhatsApp em uma página pública com banner, logo e selo de vendedor verificado.</p>
              <div className="store-cta-actions">
                <Link className="btn btn-amber" href="/vitrines">Ver lojinhas</Link>
                <Link className="btn btn-glass" href="/painel/vitrine">Criar minha lojinha</Link>
              </div>
            </div>

            <div className="store-list-preview">
              {vitrines.length ? vitrines.map((loja) => (
                <Link href={`/vendedor/${loja.slug}`} key={loja.id} className="store-preview-row">
                  <span className="store-avatar">{loja.nome_vitrine?.slice(0, 1) || 'A'}</span>
                  <span>
                    <strong>{loja.nome_vitrine}</strong>
                    <small>{loja.cidade || 'AgroMarket'}{loja.estado ? `, ${loja.estado}` : ''} {loja.verificado ? '• verificada' : ''}</small>
                  </span>
                  <b>Visitar</b>
                </Link>
              )) : (
                <>
                  <Link href="/vitrines" className="store-preview-row"><span className="store-avatar">A</span><span><strong>Lojinhas AgroMarket</strong><small>Produtos da chácara • WhatsApp direto</small></span><b>Ver</b></Link>
                  <Link href="/painel/vitrine" className="store-preview-row"><span className="store-avatar">+</span><span><strong>Crie sua vitrine</strong><small>Banner, logo, produtos e avaliações</small></span><b>Criar</b></Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section trust-section">
        <div className="container">
          <div className="grid grid-3">
            <div className="card feature-card">
              <ShieldCheck size={30} />
              <h2>Perfil verificado</h2>
              <p className="muted">Selfie, documento, localização real por GPS e anúncios aprovados pelo administrador.</p>
            </div>
            <div className="card feature-card">
              <MessageCircle size={30} />
              <h2>WhatsApp direto</h2>
              <p className="muted">O comprador fala direto com o vendedor, sem taxa e sem intermediário na negociação.</p>
            </div>
            <div className="card feature-card">
              <BadgeCheck size={30} />
              <h2>Mais destaque</h2>
              <p className="muted">Banners patrocinados, vitrines e destaques ajudam bons anúncios a venderem mais rápido.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section final-cta-section">
        <div className="container">
          <div className="final-cta-card">
            <div>
              <h2>Anuncie grátis e venda pelo WhatsApp hoje.</h2>
              <p>Sem taxa, sem intermediário. Publique fotos, preço e cidade em poucos minutos.</p>
            </div>
            <div className="final-cta-actions">
              <Link className="btn btn-primary" href="/anunciar"><PlusCircle size={18} /> Anunciar grátis</Link>
              <Link className="btn btn-secondary" href="/anuncios">Ver anúncios</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
