'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/whatsapp';
import type { Anuncio } from '@/types';
import EmptyState from '@/components/EmptyState';

function MeusAnuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase
      .from('anuncios')
      .select('*, categorias(*)')
      .eq('usuario_id', userData.user.id)
      .order('created_at', { ascending: false });
    setAnuncios((data || []) as Anuncio[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function mudarStatus(id: string, status: string) {
    await supabase.from('anuncios').update({ status }).eq('id', id);
    await load();
  }

  if (loading) return <div className="card">Carregando...</div>;

  return anuncios.length ? (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Anúncio</th><th>Preço</th><th>Status</th><th>Métricas</th><th>Ações</th></tr></thead>
        <tbody>
          {anuncios.map((ad) => (
            <tr key={ad.id}>
              <td><strong>{ad.titulo}</strong><br /><span className="muted">{ad.cidade} - {ad.estado}</span></td>
              <td>{formatMoney(ad.preco, ad.preco_a_combinar)}</td>
              <td><span className={`badge status-${ad.status}`}>{ad.status}</span></td>
              <td>{ad.visualizacoes} views<br />{ad.cliques_whatsapp} WhatsApp</td>
              <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn btn-secondary" href={`/painel/editar/${ad.id}`}>Editar</Link>
                <button className="btn btn-secondary" onClick={() => mudarStatus(ad.id, 'pausado')}>Pausar</button>
                <button className="btn btn-secondary" onClick={() => mudarStatus(ad.id, 'vendido')}>Vendido</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <EmptyState title="Você ainda não tem anúncios" description="Crie o primeiro anúncio para começar." />;
}

export default function MeusAnunciosPage() {
  return (
    <AuthGuard>
      <main className="page">
        <div className="container">
          <div className="section-head">
            <div><h1>Meus anúncios</h1><p>Edite, pause ou marque como vendido.</p></div>
            <Link className="btn btn-primary" href="/anunciar">Novo anúncio</Link>
          </div>
          <MeusAnuncios />
        </div>
      </main>
    </AuthGuard>
  );
}
