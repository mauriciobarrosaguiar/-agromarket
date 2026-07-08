'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import type { Vitrine } from '@/types';
import EmptyState from '@/components/EmptyState';

type VitrineLinha = Vitrine & {
  usuarios?: { nome: string; email: string; whatsapp?: string | null } | null;
};

function AdminVitrinesContent() {
  const [vitrines, setVitrines] = useState<VitrineLinha[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('vitrines')
      .select('*, usuarios(nome, email, whatsapp)')
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

  async function liberarGratis(id: string) {
    const gratisAte = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await atualizar(id, { vitrine_ativa: true, plano: 'gratis_lancamento', gratis_ate: gratisAte } as Partial<Vitrine>);
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h1>Gerenciar vitrines</h1>
          <p>Controle vitrines gratuitas, pagas, destaques e bloqueios.</p>
        </div>
        <Link className="btn btn-secondary" href="/painel">Voltar</Link>
      </div>

      {message && <div className="notice">{message}</div>}

      {!vitrines.length ? <EmptyState title="Nenhuma vitrine criada" /> : (
        <div className="grid grid-2">
          {vitrines.map((v) => (
            <div className="card" key={v.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ marginTop: 0 }}>{v.nome_vitrine}</h2>
                  <p className="muted" style={{ marginTop: 0 }}>{v.usuarios?.email}</p>
                </div>
                <span className="badge">{v.vitrine_ativa ? 'Ativa' : 'Desativada'}</span>
              </div>

              <p className="muted">{v.cidade || 'Cidade'} - {v.estado || 'UF'}</p>
              <p>{v.descricao || 'Sem descrição.'}</p>

              <div style={{ display: 'grid', gap: 8, margin: '12px 0' }}>
                <span className="badge">Plano: {v.plano}</span>
                {v.gratis_ate && <span className="badge">Grátis até: {new Date(v.gratis_ate).toLocaleDateString('pt-BR')}</span>}
                {v.destaque && <span className="badge">Destaque</span>}
                {v.verificado && <span className="badge">Verificado</span>}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn btn-secondary" href={`/vendedor/${v.slug}`}>Ver vitrine</Link>
                <button className="btn btn-primary" disabled={loadingId === v.id} onClick={() => liberarGratis(v.id)}>Liberar grátis</button>
                <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { vitrine_ativa: !v.vitrine_ativa })}>{v.vitrine_ativa ? 'Desativar' : 'Ativar'}</button>
                <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { destaque: !v.destaque })}>{v.destaque ? 'Remover destaque' : 'Destacar'}</button>
                <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { verificado: !v.verificado })}>{v.verificado ? 'Remover verificado' : 'Verificar'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminVitrinesPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><AdminVitrinesContent /></div></main></AuthGuard>;
}
