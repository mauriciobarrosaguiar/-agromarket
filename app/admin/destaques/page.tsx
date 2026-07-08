'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, Sparkles, XCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/whatsapp';
import type { Anuncio, DestaqueSolicitacao, StatusDestaqueSolicitacao } from '@/types';

type DestaqueLinha = DestaqueSolicitacao & {
  anuncios?: Pick<Anuncio, 'id' | 'titulo' | 'slug' | 'status' | 'cidade' | 'estado' | 'preco' | 'preco_a_combinar' | 'destaque' | 'destaque_fim'> | null;
};

const STATUS_LABEL: Record<StatusDestaqueSolicitacao, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
  expirado: 'Expirado'
};

function formatarData(data?: string | null) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

function AdminDestaquesContent() {
  const [pedidos, setPedidos] = useState<DestaqueLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<StatusDestaqueSolicitacao | 'todos'>('pendente');

  async function load() {
    setLoading(true);

    let query = supabase
      .from('destaque_solicitacoes')
      .select('*, anuncios(id, titulo, slug, status, cidade, estado, preco, preco_a_combinar, destaque, destaque_fim)')
      .order('created_at', { ascending: false });

    if (filtro !== 'todos') query = query.eq('status', filtro);

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      setPedidos([]);
    } else {
      setPedidos((data || []) as DestaqueLinha[]);
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, [filtro]);

  async function aprovar(pedido: DestaqueLinha) {
    if (!pedido.anuncios?.id) return;

    const ok = confirm(`Liberar destaque por ${pedido.dias} dias para "${pedido.anuncios.titulo}"?`);
    if (!ok) return;

    setLoadingId(pedido.id);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    const inicio = new Date();
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + pedido.dias);

    const { error: adError } = await supabase
      .from('anuncios')
      .update({
        destaque: true,
        destaque_inicio: inicio.toISOString(),
        destaque_fim: fim.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', pedido.anuncios.id);

    if (adError) {
      setMessage(adError.message);
      setLoadingId(null);
      return;
    }

    const { error } = await supabase
      .from('destaque_solicitacoes')
      .update({
        status: 'aprovado',
        admin_id: userData.user?.id || null,
        aprovado_em: inicio.toISOString(),
        inicio_em: inicio.toISOString(),
        fim_em: fim.toISOString(),
        observacao: 'Destaque liberado manualmente pelo admin.',
        updated_at: new Date().toISOString()
      })
      .eq('id', pedido.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Destaque liberado com sucesso.');
      await load();
    }

    setLoadingId(null);
  }

  async function recusar(pedido: DestaqueLinha) {
    const motivo = prompt('Motivo da recusa, opcional:', 'Destaque recusado pelo admin.');
    if (motivo === null) return;

    setLoadingId(pedido.id);
    setMessage(null);

    const { error } = await supabase
      .from('destaque_solicitacoes')
      .update({ status: 'recusado', observacao: motivo || 'Destaque recusado pelo admin.', updated_at: new Date().toISOString() })
      .eq('id', pedido.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Solicitação recusada.');
      await load();
    }

    setLoadingId(null);
  }

  async function encerrar(pedido: DestaqueLinha) {
    if (!pedido.anuncios?.id) return;

    const ok = confirm(`Encerrar o destaque de "${pedido.anuncios.titulo}"?`);
    if (!ok) return;

    setLoadingId(pedido.id);
    setMessage(null);

    const { error: adError } = await supabase
      .from('anuncios')
      .update({ destaque: false, destaque_inicio: null, destaque_fim: null, updated_at: new Date().toISOString() })
      .eq('id', pedido.anuncios.id);

    if (adError) {
      setMessage(adError.message);
      setLoadingId(null);
      return;
    }

    const { error } = await supabase
      .from('destaque_solicitacoes')
      .update({ status: 'expirado', observacao: 'Destaque encerrado manualmente pelo admin.', updated_at: new Date().toISOString() })
      .eq('id', pedido.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Destaque encerrado.');
      await load();
    }

    setLoadingId(null);
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h1>Destaques</h1>
          <p>Libere manualmente anúncios destacados por 7, 15 ou 30 dias.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Voltar admin</Link>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <label className="field">
          <span className="label">Filtrar solicitações</span>
          <select className="select" value={filtro} onChange={(e) => setFiltro(e.target.value as StatusDestaqueSolicitacao | 'todos')}>
            <option value="pendente">Pendentes</option>
            <option value="aprovado">Aprovadas</option>
            <option value="recusado">Recusadas</option>
            <option value="expirado">Expiradas</option>
            <option value="todos">Todas</option>
          </select>
        </label>
      </div>

      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}

      {loading ? <div className="card">Carregando solicitações...</div> : !pedidos.length ? (
        <EmptyState title="Nenhuma solicitação encontrada" description="Quando o vendedor solicitar destaque, aparece aqui." />
      ) : (
        <div className="grid grid-2">
          {pedidos.map((pedido) => {
            const ad = pedido.anuncios;
            const isLoading = loadingId === pedido.id;

            return (
              <article className="card" key={pedido.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <span className="badge"><Sparkles size={14} /> {STATUS_LABEL[pedido.status]}</span>
                    <h2 style={{ margin: '10px 0 4px' }}>{ad?.titulo || 'Anúncio não encontrado'}</h2>
                    <p className="muted" style={{ margin: 0 }}>Solicitado em {formatarData(pedido.created_at)}</p>
                  </div>
                  <span className="badge">{pedido.dias} dias</span>
                </div>

                {ad && (
                  <div className="card" style={{ background: '#f8faf4', marginTop: 14 }}>
                    <strong>{formatMoney(ad.preco, ad.preco_a_combinar)}</strong>
                    <p className="muted" style={{ margin: '6px 0 0' }}>{ad.cidade} - {ad.estado}</p>
                    <p className="muted" style={{ margin: '6px 0 0' }}>Status do anúncio: {ad.status}</p>
                    {ad.destaque && <p className="muted" style={{ margin: '6px 0 0' }}>Destacado até: {formatarData(ad.destaque_fim)}</p>}
                  </div>
                )}

                {pedido.observacao && <div className="notice"><strong>Observação:</strong> {pedido.observacao}</div>}

                <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {ad?.slug && <Link className="btn btn-secondary" href={`/anuncio/${ad.slug}`}><Eye size={16} /> Ver anúncio</Link>}
                    {pedido.status === 'aprovado' && <button className="btn btn-secondary" disabled={isLoading || !ad} onClick={() => encerrar(pedido)}><XCircle size={16} /> Encerrar</button>}
                  </div>

                  {pedido.status === 'pendente' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button className="btn btn-primary" disabled={isLoading || !ad} onClick={() => aprovar(pedido)}><CheckCircle2 size={16} /> Aprovar</button>
                      <button className="btn btn-danger" disabled={isLoading} onClick={() => recusar(pedido)}><XCircle size={16} /> Recusar</button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDestaquesPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><AdminDestaquesContent /></div></main></AuthGuard>;
}
