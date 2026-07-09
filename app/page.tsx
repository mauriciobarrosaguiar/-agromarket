'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, MapPin, PlusCircle, Search, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { supabase, hasSupabaseEnv } from '@/lib/supabase';
import type { Anuncio, Categoria, PatrocinadoHome } from '@/types';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';
import PatrocinadoCarousel from '@/components/PatrocinadoCarousel';

type Coordenadas = {
  lat: number;
  lng: number;
};

type AnuncioComDistancia = Anuncio & {
  distancia_calculada?: number | null;
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

export default function HomePage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [anuncios, setAnuncios] = useState<AnuncioComDistancia[]>([]);
  const [patrocinados, setPatrocinados] = useState<PatrocinadoHome[]>([]);
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= 860);
    }

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
      const [{ data: cats }, { data: ads }, { data: banners }] = await Promise.all([
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
          .limit(10)
      ]);
      setCategorias((cats || []) as Categoria[]);
      setAnuncios(ordenarPorProximidade((ads || []) as AnuncioComDistancia[], coords));
      setPatrocinados((banners || []) as PatrocinadoHome[]);
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
    <main className="page">
      <PatrocinadoCarousel itens={patrocinados} />

      <section className="hero home-hero" style={{ paddingTop: 10, paddingBottom: 8 }}>
        <div className="container">
          {!hasSupabaseEnv && <div className="notice" style={{ marginBottom: 14 }}>Configure o Supabase no arquivo .env.local para carregar dados reais.</div>}
          <div
            className="hero-card"
            style={{
              padding: isMobile ? 16 : 26,
              borderRadius: isMobile ? 22 : 24,
              maxWidth: '100%',
              overflow: 'hidden'
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span className="badge"><Sparkles size={15} /> Anuncie Grátis</span>
              <h1 style={{ fontSize: isMobile ? '34px' : 'clamp(38px, 5vw, 58px)', lineHeight: isMobile ? 1.04 : 1, letterSpacing: '-0.05em', margin: '10px 0' }}>
                Compre e venda no agro perto de você.
              </h1>
              <p style={{ fontSize: isMobile ? 16 : 18, lineHeight: 1.28, margin: '0 0 14px', maxWidth: 720 }}>
                Produtos rurais, animais, máquinas, serviços e oportunidades em um só lugar, com negociação direta pelo WhatsApp.
              </p>

              <form onSubmit={buscar} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto', gap: 10, width: '100%', maxWidth: 820 }}>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar leitão, ovos férteis, ração..."
                  style={{ width: '100%', minWidth: 0, border: 0, borderRadius: 16, padding: '15px 16px', outline: 'none' }}
                />
                <button className="btn btn-primary" type="submit" style={{ width: isMobile ? '100%' : 'auto' }}>
                  <Search size={18} /> Buscar
                </button>
              </form>

              {categorias.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', maxWidth: '100%', marginTop: 12, paddingBottom: isMobile ? 4 : 0 }}>
                  {categorias.slice(0, 5).map((cat) => (
                    <Link
                      key={cat.id}
                      className="badge"
                      href={`/anuncios?categoria=${cat.id}`}
                      style={{ flex: '0 0 auto', background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.25)' }}
                    >
                      {cat.nome}
                    </Link>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, max-content)', gap: 10, marginTop: 14, maxWidth: '100%' }}>
                <Link className="btn btn-primary" href="/anunciar" style={{ width: isMobile ? '100%' : 'auto' }}><PlusCircle size={18} /> Quero anunciar</Link>
                <Link className="btn btn-secondary" href="/anuncios" style={{ width: isMobile ? '100%' : 'auto' }}><MapPin size={18} /> Ver perto de mim</Link>
                <Link className="btn btn-secondary" href="/vitrines" style={{ width: isMobile ? '100%' : 'auto' }}><Store size={18} /> Ver lojinhas</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ marginTop: 14 }}>
        <div className="container">
          <div className="grid grid-3">
            <div className="card" style={{ background: '#f8faf4' }}>
              <ShieldCheck size={30} />
              <h2>Mais confiança</h2>
              <p className="muted">Perfil com selfie, localização real por GPS, anúncios aprovados e botão de denúncia.</p>
            </div>
            <div className="card" style={{ background: '#f8faf4' }}>
              <Store size={30} />
              <h2>Lojinhas do agro</h2>
              <p className="muted">Vendedores podem ter uma vitrine pública com produtos, avaliações e WhatsApp.</p>
            </div>
            <div className="card" style={{ background: '#f8faf4' }}>
              <BadgeCheck size={30} />
              <h2>Destaque para vender</h2>
              <p className="muted">Anúncios, vitrines e banners patrocinados ajudam a vender mais rápido.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Anúncios em destaque e recentes</h2>
              <p>Produtos, animais, serviços, máquinas e vagas publicados no AgroMarket.</p>
            </div>
            <Link href="/anuncios" className="btn btn-secondary">Buscar</Link>
          </div>
          {loading ? <div className="card">Carregando...</div> : anuncios.length ? (
            <div className="grid grid-4">
              {anuncios.slice(0, 8).map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
            </div>
          ) : <EmptyState title="Nenhum anúncio aprovado ainda" description="Crie o primeiro anúncio pelo botão Anunciar." />}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card" style={{ background: 'linear-gradient(135deg, #052e16, #166534)', color: '#fff' }}>
            <h2 style={{ color: '#fff' }}>Tem algo para vender no agro?</h2>
            <p style={{ color: 'rgba(255,255,255,.84)' }}>Anuncie grátis, compartilhe nos grupos e receba interessados direto no WhatsApp.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/anunciar"><PlusCircle size={18} /> Criar anúncio agora</Link>
              <Link className="btn btn-secondary" href="/planos">Ver planos</Link>
              <Link className="btn btn-secondary" href="/regras">Ver regras</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
