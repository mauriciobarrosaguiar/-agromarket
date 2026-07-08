'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';
import type { Anuncio, Usuario } from '@/types';

function PainelContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [pendentesAdmin, setPendentesAdmin] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const [{ data: meusAnuncios }, { data: meuPerfil }] = await Promise.all([
        supabase.from('anuncios').select('*').eq('usuario_id', userData.user.id),
        supabase.from('usuarios').select('*').eq('id', userData.user.id).single()
      ]);

      setAnuncios((meusAnuncios || []) as Anuncio[]);
      setPerfil(meuPerfil as Usuario);

      if (meuPerfil?.tipo_usuario === 'admin') {
        const { count } = await supabase
          .from('anuncios')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente');
        setPendentesAdmin(count || 0);
      }
    }
    load();
  }, []);

  const totalViews = anuncios.reduce((acc, ad) => acc + (ad.visualizacoes || 0), 0);
  const totalClicks = anuncios.reduce((acc, ad) => acc + (ad.cliques_whatsapp || 0), 0);
  const isAdmin = perfil?.tipo_usuario === 'admin';

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>{isAdmin ? 'Painel admin e anunciante' : 'Painel do anunciante'}</h1>
            <p>Acompanhe seus anúncios e resultados.</p>
          </div>
          <Link href="/anunciar" className="btn btn-primary">Novo anúncio</Link>
        </div>

        {isAdmin && (
          <div className="card section" style={{ border: '2px solid rgba(21, 128, 61, 0.22)' }}>
            <h2>Área do administrador</h2>
            <p className="muted">Você está logado como admin. Aprove ou recuse anúncios pendentes aqui.</p>
            <div className="actions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/admin/pendentes">Aprovar pendentes ({pendentesAdmin})</Link>
              <Link className="btn btn-secondary" href="/admin">Painel admin completo</Link>
            </div>
          </div>
        )}

        <div className="stats-grid">
          <StatCard label="Total de anúncios" value={anuncios.length} />
          <StatCard label="Aprovados" value={anuncios.filter((a) => a.status === 'aprovado').length} />
          <StatCard label="Pendentes" value={anuncios.filter((a) => a.status === 'pendente').length} />
          <StatCard label="Visualizações" value={totalViews} />
          <StatCard label="Cliques WhatsApp" value={totalClicks} />
        </div>
        <div className="section" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" href="/painel/anuncios">Gerenciar meus anúncios</Link>
          <Link className="btn btn-secondary" href="/painel/perfil">Meu perfil</Link>
        </div>
      </div>
    </main>
  );
}

export default function PainelPage() {
  return <AuthGuard><PainelContent /></AuthGuard>;
}
