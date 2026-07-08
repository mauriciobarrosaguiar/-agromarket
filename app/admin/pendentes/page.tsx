'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/whatsapp';
import type { Anuncio } from '@/types';
import EmptyState from '@/components/EmptyState';

function PendentesContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    setLoadingId(id);
    setMessage(null);

    const { error } = await supabase
      .from('anuncios')
      .update({
        status,
        data_publicacao: status === 'aprovado' ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(status === 'aprovado' ? 'Anúncio aprovado.' : 'Anúncio recusado.');
      await load();
    }

    setLoadingId(null);
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h1>Anúncios pendentes</h1>
          <p>Aprove ou recuse direto pelo celular.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Voltar admin</Link>
      </div>

      {message && <div className="notice">{message}</div>}

      {!anuncios.length ? <EmptyState title="Nenhum anúncio pendente" /> : (
        <div className="grid grid-2">
          {anuncios.map((ad) => (
            <div className="card" key={ad.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ marginTop: 0 }}>{ad.titulo}</h2>
                  <p className="muted">{ad.cidade} - {ad.estado}</p>
                </div>
                <strong>{formatMoney(ad.preco, ad.preco_a_combinar)}</strong>
              </div>

              <p style={{ whiteSpace: 'pre-wrap' }}>{ad.descricao}</p>
              <p className="muted"><strong>Contato:</strong> {ad.nome_contato}<br />{ad.whatsapp}</p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" disabled={loadingId === ad.id} onClick={() => decidir(ad.id, 'aprovado')}>
                  {loadingId === ad.id ? 'Processando...' : 'Aprovar'}
                </button>
                <button className="btn btn-danger" disabled={loadingId === ad.id} onClick={() => decidir(ad.id, 'recusado')}>
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PendentesPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><PendentesContent /></div></main></AuthGuard>;
}
