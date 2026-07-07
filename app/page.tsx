'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Sparkles } from 'lucide-react';
import { supabase, hasSupabaseEnv } from '@/lib/supabase';
import type { Anuncio, Categoria } from '@/types';
import SearchBar from '@/components/SearchBar';
import CategoryPills from '@/components/CategoryPills';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';

export default function HomePage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: ads }] = await Promise.all([
        supabase.from('categorias').select('*').eq('ativo', true).order('ordem').limit(8),
        supabase
          .from('anuncios')
          .select('*, categorias(*), fotos_anuncios(*)')
          .eq('status', 'aprovado')
          .order('destaque', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(8)
      ]);
      setCategorias((cats || []) as Categoria[]);
      setAnuncios((ads || []) as Anuncio[]);
      setLoading(false);
    }
    load();
  }, []);

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
                <div className="mini-card"><strong>🐖 Leitões caipiras</strong><br /><span className="muted">Palmas - TO</span></div>
                <div className="mini-card"><strong>🚜 Serviço de trator</strong><br /><span className="muted">A combinar</span></div>
                <div className="mini-card"><strong>👨‍🌾 Vaga para caseiro</strong><br /><span className="muted">Gurupi - TO</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Categorias</h2>
              <p>Encontre rápido o que precisa.</p>
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
              {anuncios.map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
            </div>
          ) : <EmptyState title="Nenhum anúncio aprovado ainda" description="Crie o primeiro anúncio pelo botão Anunciar." />}
        </div>
      </section>
    </main>
  );
}
