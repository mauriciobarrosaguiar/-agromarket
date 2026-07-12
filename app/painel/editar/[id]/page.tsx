'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import AnuncioForm from '@/components/AnuncioForm';
import { supabase } from '@/lib/supabase';
import type { Anuncio } from '@/types';

function EditarContent() {
  const params = useParams<{ id: string }>();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('anuncios')
        .select('*, categorias(*), subcategorias(*), fotos_anuncios(*)')
        .eq('id', params.id)
        .eq('usuario_id', userData.user.id)
        .maybeSingle();
      setAnuncio(data as Anuncio);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <div className="card">Carregando...</div>;
  if (!anuncio) return <div className="card">Anúncio não encontrado.</div>;
  return <AnuncioForm anuncio={anuncio} />;
}

export default function EditarAnuncioPage() {
  return (
    <AuthGuard>
      <main className="page">
        <div className="container" style={{ maxWidth: 860 }}>
          <h1>Editar anúncio</h1>
          <div className="card"><EditarContent /></div>
        </div>
      </main>
    </AuthGuard>
  );
}
