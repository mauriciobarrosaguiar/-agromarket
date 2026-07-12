'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import AnuncioForm from '@/components/AnuncioForm';
import { supabase } from '@/lib/supabase';
import type { Anuncio } from '@/types';

function AdminEditarAnuncioContent() {
  const params = useParams<{ id: string }>();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('anuncios')
        .select('*, categorias(*), subcategorias(*)')
        .eq('id', params.id)
        .maybeSingle();

      setAnuncio(data as Anuncio | null);
      setLoading(false);
    }

    load();
  }, [params.id]);

  if (loading) return <div className="card">Carregando...</div>;
  if (!anuncio) return <div className="card">Anuncio nao encontrado.</div>;

  return (
    <div className="card">
      <AnuncioForm anuncio={anuncio} adminMode redirectTo="/admin/anuncios" />
    </div>
  );
}

export default function AdminEditarAnuncioPage() {
  return (
    <AuthGuard adminOnly>
      <main className="page">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="section-head">
            <div>
              <h1>Editar anuncio</h1>
              <p>Alteracao feita pelo admin preserva o dono e o status atual do anuncio.</p>
            </div>
            <Link className="btn btn-secondary" href="/admin/anuncios">Voltar</Link>
          </div>
          <AdminEditarAnuncioContent />
        </div>
      </main>
    </AuthGuard>
  );
}
