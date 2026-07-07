'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/whatsapp';
import type { Anuncio } from '@/types';
import EmptyState from '@/components/EmptyState';

function PendentesContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);

  async function load() {
    const { data } = await supabase
      .from('anuncios')
      .select('*, categorias(*)')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });
    setAnuncios((data || []) as Anuncio[]);
  }

  useEffect(() => { load(); }, []);

  async function decidir(id: string, status: 'aprovado' | 'recusado') {
    await supabase.from('anuncios').update({ status, data_publicacao: status === 'aprovado' ? new Date().toISOString() : null }).eq('id', id);
    await load();
  }

  return anuncios.length ? (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Anúncio</th><th>Preço</th><th>Contato</th><th>Ações</th></tr></thead>
        <tbody>
          {anuncios.map((ad) => (
            <tr key={ad.id}>
              <td><strong>{ad.titulo}</strong><br /><span className="muted">{ad.cidade} - {ad.estado}</span><br />{ad.descricao}</td>
              <td>{formatMoney(ad.preco, ad.preco_a_combinar)}</td>
              <td>{ad.nome_contato}<br />{ad.whatsapp}</td>
              <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => decidir(ad.id, 'aprovado')}>Aprovar</button>
                <button className="btn btn-danger" onClick={() => decidir(ad.id, 'recusado')}>Recusar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <EmptyState title="Nenhum anúncio pendente" />;
}

export default function PendentesPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><h1>Anúncios pendentes</h1><PendentesContent /></div></main></AuthGuard>;
}
