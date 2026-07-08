'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeDollarSign, CalendarClock } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import type { Vitrine, VitrinePagamento } from '@/types';
import EmptyState from '@/components/EmptyState';

type VitrineLinha = Vitrine & {
  usuarios?: { nome: string; email: string; whatsapp?: string | null } | null;
  vitrine_pagamentos?: VitrinePagamento[];
};

function dataBR(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function money(value?: number | string | null) {
  const numero = typeof value === 'number' ? value : Number(value || 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status?: string | null) {
  if (status === 'ativa') return 'Mensalidade ativa';
  if (status === 'vencida') return 'Mensalidade vencida';
  if (status === 'cancelada') return 'Cancelada';
  return 'Aguardando pagamento';
}

function AdminVitrinesContent() {
  const [vitrines, setVitrines] = useState<VitrineLinha[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('vitrines')
      .select('*, usuarios(nome, email, whatsapp), vitrine_pagamentos(*)')
      .order('created_at', { ascending: false });

    setVitrines((data || []) as VitrineLinha[]);
  }

  useEffect(() => { load(); }, []);

  async function atualizar(id: string, patch: Partial<Vitrine>) {
    setLoadingId(id);
    setMessage(null);

    const { error } = await supabase.from('vitrines').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);

    if (error) setMessage(error.message);
    else {
      setMessage('Vitrine atualizada.');
      await load();
    }

    setLoadingId(null);
  }

  async function confirmarMensalidade(vitrine: VitrineLinha, pagamento?: VitrinePagamento) {
    if (!pagamento) {
      setMessage('Essa vitrine ainda não tem pagamento pendente.');
      return;
    }

    setLoadingId(vitrine.id);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    const hoje = new Date();
    const base = vitrine.assinatura_vencimento && new Date(`${vitrine.assinatura_vencimento}T12:00:00`) > hoje
      ? new Date(`${vitrine.assinatura_vencimento}T12:00:00`)
      : hoje;
    base.setDate(base.getDate() + 30 * (pagamento.meses || 1));
    const novoVencimento = base.toISOString().slice(0, 10);

    const { error: pagamentoError } = await supabase.from('vitrine_pagamentos').update({
      status: 'pago',
      admin_id: userData.user?.id || null,
      pago_em: new Date().toISOString(),
      vencimento_gerado: novoVencimento,
      updated_at: new Date().toISOString()
    }).eq('id', pagamento.id);

    if (pagamentoError) {
      setMessage(pagamentoError.message);
      setLoadingId(null);
      return;
    }

    const { error } = await supabase.from('vitrines').update({
      vitrine_ativa: true,
      assinatura_status: 'ativa',
      assinatura_inicio: vitrine.assinatura_inicio || new Date().toISOString().slice(0, 10),
      assinatura_vencimento: novoVencimento,
      ultimo_pagamento_em: new Date().toISOString(),
      plano: 'vitrine_mensal',
      plano_id: pagamento.plano_id || vitrine.plano_id || null,
      updated_at: new Date().toISOString()
    }).eq('id', vitrine.id);

    if (error) setMessage(error.message);
    else {
      setMessage(`Mensalidade confirmada. Vitrine liberada até ${dataBR(novoVencimento)}.`);
      await load();
    }

    setLoadingId(null);
  }

  async function marcarVencida(vitrine: VitrineLinha) {
    await atualizar(vitrine.id, { vitrine_ativa: false, assinatura_status: 'vencida' } as Partial<Vitrine>);
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <span className="badge"><BadgeDollarSign size={14} /> Vitrines mensais</span>
          <h1>Gerenciar vitrines</h1>
          <p>Confirme mensalidades, renove lojinha por 30 dias, destaque, verifique ou bloqueie vitrines.</p>
        </div>
        <Link className="btn btn-secondary" href="/admin">Voltar admin</Link>
      </div>

      {message && <div className="notice">{message}</div>}

      {!vitrines.length ? <EmptyState title="Nenhuma vitrine solicitada" /> : (
        <div className="grid grid-2">
          {vitrines.map((v) => {
            const pagamentos = [...(v.vitrine_pagamentos || [])].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
            const pendente = pagamentos.find((p) => p.status === 'pendente');
            const aguardando = !v.vitrine_ativa || v.assinatura_status !== 'ativa';
            return (
              <div className="card" key={v.id} style={{ border: pendente ? '2px solid rgba(202, 138, 4, .42)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ marginTop: 0 }}>{v.nome_vitrine}</h2>
                    <p className="muted" style={{ marginTop: 0 }}>{v.usuarios?.email}</p>
                    {v.usuarios?.whatsapp && <p className="muted" style={{ marginTop: 0 }}>WhatsApp: {v.usuarios.whatsapp}</p>}
                  </div>
                  <span className="badge">{statusLabel(v.assinatura_status)}</span>
                </div>

                <p className="muted">{v.cidade || 'Cidade'} - {v.estado || 'UF'}</p>
                <p>{v.descricao || 'Sem descrição.'}</p>

                <div style={{ display: 'grid', gap: 8, margin: '12px 0' }}>
                  <span className="badge"><CalendarClock size={14} /> Vencimento: {dataBR(v.assinatura_vencimento)}</span>
                  <span className="badge">Status público: {v.vitrine_ativa ? 'Pública' : 'Fora do ar'}</span>
                  {v.destaque && <span className="badge">Destaque</span>}
                  {v.verificado && <span className="badge">Verificado</span>}
                </div>

                {pendente ? (
                  <div className="notice">
                    Pagamento pendente: <strong>{money(pendente.valor)}</strong> por {pendente.meses || 1} mês(es). Confirme somente depois de receber.
                  </div>
                ) : aguardando ? (
                  <div className="notice">Sem pagamento pendente. O usuário precisa solicitar a mensalidade pela tela Minha vitrine.</div>
                ) : null}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {v.vitrine_ativa && <Link className="btn btn-secondary" href={`/vendedor/${v.slug}`}>Ver vitrine</Link>}
                  {pendente && <button className="btn btn-primary" disabled={loadingId === v.id} onClick={() => confirmarMensalidade(v, pendente)}>Confirmar pagamento e liberar 30 dias</button>}
                  <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => marcarVencida(v)}>Marcar vencida</button>
                  <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { vitrine_ativa: !v.vitrine_ativa })}>{v.vitrine_ativa ? 'Desativar' : 'Ativar manual'}</button>
                  <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { destaque: !v.destaque })}>{v.destaque ? 'Remover destaque' : 'Destacar'}</button>
                  <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { verificado: !v.verificado })}>{v.verificado ? 'Remover verificado' : 'Verificar'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminVitrinesPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><AdminVitrinesContent /></div></main></AuthGuard>;
}
