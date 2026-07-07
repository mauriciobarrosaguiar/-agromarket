'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';
import type { Anuncio } from '@/types';

function PainelContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from('anuncios').select('*').eq('usuario_id', userData.user.id);
      setAnuncios((data || []) as Anuncio[]);
    }
    load();
  }, []);

  const totalViews = anuncios.reduce((acc, ad) => acc + (ad.visualizacoes || 0), 0);
  const totalClicks = anuncios.reduce((acc, ad) => acc + (ad.cliques_whatsapp || 0), 0);

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Painel do anunciante</h1>
            <p>Acompanhe seus anúncios e resultados.</p>
          </div>
          <Link href="/anunciar" className="btn btn-primary">Novo anúncio</Link>
        </div>
        <div className="stats-grid">
          <StatCard label="Total de anúncios" value={anuncios.length} />
          <StatCard label="Aprovados" value={anuncios.filter((a) => a.status === 'aprovado').length} />
          <StatCard label="Pendentes" value={anuncios.filter((a) => a.status === 'pendente').length} />
          <StatCard label="Visualizações" value={totalViews} />
          <StatCard label="Cliques WhatsApp" value={totalClicks} />
        </div>
        <div className="section">
          <Link className="btn btn-secondary" href="/painel/anuncios">Gerenciar meus anúncios</Link>
        </div>
      </div>
    </main>
  );
}

export default function PainelPage() {
  return <AuthGuard><PainelContent /></AuthGuard>;
}
