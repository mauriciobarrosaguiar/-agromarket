'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LocateFixed, PlusCircle, Search, Sparkles } from 'lucide-react';
import { supabase, hasSupabaseEnv } from '@/lib/supabase';
import type { Anuncio, Categoria } from '@/types';
import { formatMoney } from '@/lib/whatsapp';
import SearchBar from '@/components/SearchBar';
import CategoryPills from '@/components/CategoryPills';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';

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
  if (!coords) return lista;
  return lista
    .map((ad) => ({ ...ad, distancia_calculada: distanciaKm(coords, ad) }))
    .sort((a, b) => (a.distancia_calculada ?? 999999) - (b.distancia_calculada ?? 999999));
}

export default function HomePage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [anuncios, setAnuncios] = useState<AnuncioComDistancia[]>([]);
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
      const [{ data: cats }, { data: ads }] = await Promise.all([
        supabase.from('categorias').select('*').eq('ativo', true).order('ordem').limit(12),
        supabase
          .from('anuncios')
          .select('*, categorias(*), fotos_anuncios(*)')
          .eq('status', 'aprovado')
          .order('destaque', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20)
      ]);
      setCategorias((cats || []) as Categoria[]);
      setAnuncios(ordenarPorProximidade((ads || []) as AnuncioComDistancia[], coords));
      setLoading(false);
    }
    load();
  }, [coords]);

  const destaques = anuncios.slice(0, 3);

  return (
    <main className="page">
      <section className="hero">
        <div className="container">
          {!hasSupabaseEnv && <div className="notice" style={{ marginBottom: 14 }}>Configure o Supabase no arquivo .env.local para carregar dados reais.</div>}
          <div className="hero-card">
            <div className="hero-grid">
              <div>
                <span className="badge"><Sparkles size={15} /> Marketplace Agro</span>
                <h1>Compre, venda e divulgue tudo do Agro.</h1>
                <p>Produtos rurais, animais, serviços, máquinas e oportunidades perto de você. Negociação direta pelo WhatsApp.</p>
                <SearchBar />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                  <Link className="btn btn-primary" href="/anunciar"><PlusCircle size={18} /> Criar anúncio</Link>
                  <Link className="btn btn-secondary" href="/anuncios">Ver anúncios</Link>
                </div>
              </div>
              <div className="hero-visual">
                <div className="hero-visual-title">
                  <LocateFixed size={16} /> {coords ? 'Anúncios próximos de você' : 'Anúncios reais recentes'}
                </div>
                {loading ? (
                  <div className="mini-card"><strong>Carregando anúncios...</strong></div>
                ) : destaques.length ? (
                  destaques.map((ad) => (
                    <Link key={ad.id} href={`/anuncio/${ad.slug}`} className="mini-card mini-card-link">
                      <strong>{ad.categorias?.icone || '🌱'} {ad.titulo}</strong>
                      <br />
                      <span className="muted">
                        {ad.preco_a_combinar ? 'A combinar' : formatMoney(ad.preco, ad.preco_a_combinar)} · {ad.cidade} - {ad.estado}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="mini-card"><strong>Nenhum anúncio aprovado ainda</strong><br /><span className="muted">Seja o primeiro a anunciar.</span></div>
                )}
                <Link className="btn btn-secondary btn-full" href="/anuncios"><Search size={18} /> Buscar mais anúncios</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head section-head-compact">
            <div>
              <h2>Categorias</h2>
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
              <h2>Anúncios recentes</h2>
              <p>Produtos, animais, serviços e vagas publicados.</p>
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
    </main>
  );
}
