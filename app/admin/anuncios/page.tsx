'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import type { Anuncio } from '@/types';

function AdminAnunciosContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

  async function load() {
    const { data } = await supabase.from('anuncios').select('*, categorias(*)').order('created_at', { ascending: false });
    setAnuncios((data || []) as Anuncio[]);
  }

  useEffect(() => { load(); }, []);

  async function status(id: string, value: string) {
    await supabase.from('anuncios').update({ status: value }).eq('id', id);
    await load();
  }

  async function destaque(id: string, value: boolean) {
    await supabase.from('anuncios').update({ destaque: value }).eq('id', id);
    await load();
  }

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Anúncio</th><th>Status</th><th>Destaque</th><th>Ações</th></tr></thead>
        <tbody>
          {anuncios.map((ad) => (
            <tr key={ad.id}>
              <td><strong>{ad.titulo}</strong><br /><span className="muted">{ad.cidade} - {ad.estado}</span></td>
              <td><span className={`badge status-${ad.status}`}>{ad.status}</span></td>
              <td>{ad.destaque ? 'Sim' : 'Não'}</td>
              <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn btn-secondary" href={`/anuncio/${ad.slug}`}>Ver</Link>
                <button className="btn btn-primary" onClick={() => status(ad.id, 'aprovado')}>Aprovar</button>
                <button className="btn btn-secondary" onClick={() => status(ad.id, 'pausado')}>Pausar</button>
                <button className="btn btn-secondary" onClick={() => destaque(ad.id, !ad.destaque)}>{ad.destaque ? 'Remover destaque' : 'Destacar'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnunciosPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><h1>Todos os anúncios</h1><AdminAnunciosContent /></div></main></AuthGuard>;
}
