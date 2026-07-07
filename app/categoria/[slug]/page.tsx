'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Anuncio, Categoria } from '@/types';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';

export default function CategoriaPage() {
  const params = useParams<{ slug: string }>();
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: cat } = await supabase.from('categorias').select('*').eq('slug', params.slug).single();
      if (cat) {
        setCategoria(cat as Categoria);
        const { data } = await supabase
          .from('anuncios')
          .select('*, categorias(*), fotos_anuncios(*)')
          .eq('status', 'aprovado')
          .eq('categoria_id', cat.id)
          .order('created_at', { ascending: false });
        setAnuncios((data || []) as Anuncio[]);
      }
      setLoading(false);
    }
    load();
  }, [params.slug]);

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>{categoria?.nome || 'Categoria'}</h1>
            <p>Anúncios aprovados nesta categoria.</p>
          </div>
        </div>
        {loading ? <div className="card">Carregando...</div> : anuncios.length ? (
          <div className="grid grid-4">
            {anuncios.map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
          </div>
        ) : <EmptyState title="Nenhum anúncio nesta categoria" />}
      </div>
    </main>
  );
}
