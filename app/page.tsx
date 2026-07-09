'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, MapPin, Megaphone, PlusCircle, Search, ShieldCheck, Sparkles, Store, Tag } from 'lucide-react';
import { supabase, hasSupabaseEnv } from '@/lib/supabase';
import type { Anuncio, Categoria, PatrocinadoHome } from '@/types';
import SearchBar from '@/components/SearchBar';
import CategoryPills from '@/components/CategoryPills';
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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [anuncios, setAnuncios] = useState<AnuncioComDistancia[]>([]);
  const [patrocinados, setPatrocinados] = useState<PatrocinadoHome[]>([]);
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [loading, setLoading] = useState(true);

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
        supabase.from('categorias').select('*').eq('ativo', true).order('ordem').limit(12),
        supabase
          .from('anuncios')
          .select('*, categorias(*), fotos_anuncios(*)')
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

  const totalDestaques = anuncios.filter((ad) => ad.destaque).length;
  const cidades = Array.from(new Set(anuncios.map((ad) => `${ad.cidade}-${ad.estado}`))).length;
  const novosContatos = anuncios.reduce((acc, ad) => acc + Number(ad.cliques_whatsapp || 0), 0);

  return (
    <main className="page">
      <PatrocinadoCarousel itens={patrocinados} />

      <section className="hero" style={{ paddingTop: 12, paddingBottom: 8 }}>
        <div className="container">
          {!hasSupabaseEnv && <div className="notice" style={{ marginBottom: 14 }}>Configure o Supabase no arquivo .env.local para carregar dados reais.</div>}
          <div className="hero-card" style={{ padding: 20, borderRadius: 24 }}>
            <div style={{ maxWidth: 900 }}>
              <span className="badge"><Sparkles size={15} /> Anuncie Grátis</span>
              <h1 style={{ fontSize: 'clamp(30px, 7vw, 50px)', lineHeight: 1, marginBottom: 10 }}>Compre e venda no agro perto de você.</h1>
              <p style={{ marginBottom: 14 }}>Produtos rurais, animais, máquinas, serviços e oportunidades em um só lugar, com negociação direta pelo WhatsApp.</p>
              <SearchBar />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                <Link className="btn btn-primary" href="/anuncios"><Search size={18} /> Buscar</Link>
                <Link className="btn btn-primary" href="/anunciar"><PlusCircle size={18} /> Quero anunciar</Link>
                <Link className="btn btn-secondary" href="/anuncios"><MapPin size={18} /> Perto de mim</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ marginTop: 14 }}>
        <div className="container">
          <div className="section-head section-head-compact">
            <div>
              <h2>Panorama rápido</h2>
              <p>Movimento atual do AgroMarket.</p>
            </div>
          </div>
          <div className="stats-grid">
            <div className="mini-card"><Tag size={24} /><strong>{anuncios.length}</strong><br /><span className="muted">anúncios ativos</span></div>
            <div className="mini-card"><MapPin size={24} /><strong>{cidades}</strong><br /><span className="muted">cidades disponíveis</span></div>
            <div className="mini-card"><Megaphone size={24} /><strong>{totalDestaques}</strong><br /><span className="muted">destaques</span></div>
            <div className="mini-card"><BadgeCheck size={24} /><strong>{novosContatos}</strong><br /><span className="muted">contatos gerados</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            <div className="card" style={{ background: '#f8faf4' }}>
              <ShieldCheck size={30} />
              <h2>Mais confiança</h2>
              <p className="muted">Perfil com selfie, localização real por GPS, anúncios aprovados e botão de denúncia.</p>
            </div>
            <div className="card" style={{ background: '#f8faf4' }}>
              <Store size={30} />
              <h2>Vitrine do vendedor</h2>
              <p className="muted">Cada vendedor pode ter uma página pública com seus produtos e serviços.</p>
            </div>
            <div className="card" style={{ background: '#f8faf4' }}>
              <BadgeCheck size={30} />
              <h2>Destaque para vender</h2>
              <p className="muted">Planos de destaque fazem o anúncio aparecer acima na busca e na página inicial.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head section-head-compact">
            <div>
              <h2>Categorias do agro</h2>
              <p>Toque e filtre rápido.</p>
            </div>
            <Link href="/anuncios" className="btn btn-secondary">Ver tudo</Link>
          </div>
          {categorias.length ? <CategoryPills categorias={categorias} /> : <EmptyState title="Categorias ainda não carregadas" description="Rode o SQL inicial no Supabase." />}
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
