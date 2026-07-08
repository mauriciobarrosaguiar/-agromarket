'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, Pause, Sparkles, XCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/whatsapp';
import type { Anuncio, StatusAnuncio } from '@/types';

const STATUS_LABEL: Record<StatusAnuncio, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Reprovado',
  pausado: 'Pausado',
  vendido: 'Vendido',
  expirado: 'Excluído',
  bloqueado: 'Bloqueado'
};

function AdminAnunciosContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('anuncios').select('*, categorias(*)').order('created_at', { ascending: false });
    setAnuncios((data || []) as Anuncio[]);
  }

  useEffect(() => { load(); }, []);

  async function status(ad: Anuncio, value: StatusAnuncio) {
    let patch: Partial<Anuncio> = { status: value, updated_at: new Date().toISOString() };

    if (value === 'aprovado') {
      patch = { ...patch, data_publicacao: new Date().toISOString() };
    }

    if (value === 'recusado') {
      const motivo = prompt(`Motivo da reprovação de "${ad.titulo}":`, ad.motivo_recusa || 'Anúncio reprovado pelo administrador.');
      if (motivo === null) return;
      patch = { ...patch, motivo_recusa: motivo || 'Anúncio reprovado pelo administrador.', destaque: false, destaque_inicio: null, destaque_fim: null };
    }

    if (value === 'pausado' || value === 'bloqueado' || value === 'expirado') {
      patch = { ...patch, destaque: false, destaque_inicio: null, destaque_fim: null };
    }

    setLoadingId(ad.id);
    setMessage(null);
    const { error } = await supabase.from('anuncios').update(patch).eq('id', ad.id);
    setMessage(error ? error.message : 'Anúncio atualizado.');
    await load();
    setLoadingId(null);
  }

  async function destaque(ad: Anuncio, value: boolean) {
    setLoadingId(ad.id);
    setMessage(null);

    const now = new Date();
    const fim = new Date(now);
    fim.setDate(fim.getDate() + 7);

    const patch = value
      ? { destaque: true, destaque_inicio: now.toISOString(), destaque_fim: fim.toISOString(), updated_at: new Date().toISOString() }
      : { destaque: false, destaque_inicio: null, destaque_fim: null, updated_at: new Date().toISOString() };

    const { error } = await supabase.from('anuncios').update(patch).eq('id', ad.id);
    setMessage(error ? error.message : value ? 'Anúncio destacado por 7 dias.' : 'Destaque removido.');
    await load();
    setLoadingId(null);
  }

  return (
    <div className="section">
      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}

      <div className="grid grid-2">
        {anuncios.map((ad) => {
          const isLoading = loadingId === ad.id;
          const podeAprovar = ad.status !== 'aprovado';
          const podeReprovar = ad.status === 'aprovado' || ad.status === 'pendente' || ad.status === 'pausado';
          const podePausar = ad.status === 'aprovado';
          const destaqueFim = ad.destaque_fim ? new Date(ad.destaque_fim).toLocaleDateString('pt-BR') : null;

          return (
            <article className="card" key={ad.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <span className={`badge status-${ad.status}`}>{STATUS_LABEL[ad.status] || ad.status}</span>
                  <h2 style={{ margin: '10px 0 4px', lineHeight: 1.1 }}>{ad.titulo}</h2>
                  <strong className="price">{formatMoney(ad.preco, ad.preco_a_combinar)}</strong>
                  <p className="muted" style={{ margin: '6px 0 0' }}>{ad.cidade} - {ad.estado}</p>
                </div>
                {ad.destaque && <span className="badge"><Sparkles size={14} /> Destaque</span>}
              </div>

              <div className="card" style={{ background: '#f8faf4', marginTop: 14 }}>
                <strong>Destaque</strong>
                <p className="muted" style={{ margin: '6px 0 0' }}>{ad.destaque ? `Sim${destaqueFim ? `, até ${destaqueFim}` : ''}` : 'Não'}</p>
              </div>

              {ad.motivo_recusa && ad.status === 'recusado' && (
                <div className="notice"><strong>Motivo:</strong> {ad.motivo_recusa}</div>
              )}

              <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                <Link className="btn btn-secondary btn-full" href={`/anuncio/${ad.slug}`}><Eye size={16} /> Ver anúncio</Link>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {podeAprovar && <button className="btn btn-primary" disabled={isLoading} onClick={() => status(ad, 'aprovado')}><CheckCircle2 size={16} /> Aprovar</button>}
                  {podeReprovar && <button className="btn btn-danger" disabled={isLoading} onClick={() => status(ad, 'recusado')}><XCircle size={16} /> Reprovar</button>}
                  {podePausar && <button className="btn btn-secondary" disabled={isLoading} onClick={() => status(ad, 'pausado')}><Pause size={16} /> Pausar</button>}
                  <button className="btn btn-secondary" disabled={isLoading || ad.status !== 'aprovado'} onClick={() => destaque(ad, !ad.destaque)}><Sparkles size={16} /> {ad.destaque ? 'Remover destaque' : 'Destacar'}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminAnunciosPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><h1>Todos os anúncios</h1><AdminAnunciosContent /></div></main></AuthGuard>;
}
