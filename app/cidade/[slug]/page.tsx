'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Anuncio } from '@/types';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';

export default function CidadePage() {
  const params = useParams<{ slug: string }>();
  const cidade = useMemo(() => params.slug.replace(/-/g, ' '), [params.slug]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('anuncios')
        .select('*, categorias(*), fotos_anuncios(*)')
        .eq('status', 'aprovado')
        .ilike('cidade', `%${cidade.split(' ')[0]}%`)
        .order('created_at', { ascending: false });
      setAnuncios((data || []) as Anuncio[]);
      setLoading(false);
    }
    load();
  }, [cidade]);

  return (
    <main className="page">
      <div className="container">
        <h1>Anúncios em {cidade}</h1>
        {loading ? <div className="card">Carregando...</div> : anuncios.length ? (
          <div className="grid grid-4">
            {anuncios.map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
          </div>
        ) : <EmptyState title="Nenhum anúncio nesta cidade" />}
      </div>
    </main>
  );
}
