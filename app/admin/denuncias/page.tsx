'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ban, CheckCircle2, Eye, Pause, ShieldAlert, UserX, XCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { Anuncio, Denuncia, StatusAnuncio, StatusDenuncia } from '@/types';

type DenunciaLinha = Denuncia & {
  anuncios?: Pick<Anuncio, 'id' | 'titulo' | 'slug' | 'status' | 'cidade' | 'estado' | 'usuario_id'> | null;
};

const STATUS_LABEL: Record<StatusDenuncia, string> = {
  aberta: 'Aberta',
  em_analise: 'Em análise',
  resolvida: 'Resolvida',
  ignorada: 'Ignorada'
};

function AdminDenunciasContent() {
  const [denuncias, setDenuncias] = useState<DenunciaLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<StatusDenuncia | 'todas'>('aberta');

  async function load() {
    setLoading(true);

    let query = supabase
      .from('denuncias')
      .select('*, anuncios(id, titulo, slug, status, cidade, estado, usuario_id)')
      .order('created_at', { ascending: false });

    if (filtro !== 'todas') query = query.eq('status', filtro);

    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      setDenuncias([]);
    } else {
      setDenuncias((data || []) as DenunciaLinha[]);
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, [filtro]);

  async function atualizarDenuncia(id: string, status: StatusDenuncia, acao: string) {
    setLoadingId(id);
    setMessage(null);

    const { error } = await supabase
      .from('denuncias')
      .update({ status, acao_admin: acao, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) setMessage(error.message);
    else {
      setMessage('Denúncia atualizada.');
      await load();
    }

    setLoadingId(null);
  }

  async function atualizarAnuncio(denuncia: DenunciaLinha, status: StatusAnuncio, acao: string) {
    if (!denuncia.anuncios?.id) return;
    setLoadingId(denuncia.id);
    setMessage(null);

    const { error: adError } = await supabase
      .from('anuncios')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', denuncia.anuncios.id);

    if (adError) {
      setMessage(adError.message);
      setLoadingId(null);
      return;
    }

    await atualizarDenuncia(denuncia.id, 'resolvida', acao);
    setLoadingId(null);
  }

  async function bloquearUsuario(denuncia: DenunciaLinha) {
    const userId = denuncia.anuncios?.usuario_id;
    if (!userId) return;

    const ok = confirm('Bloquear o usuário responsável por esse anúncio?');
    if (!ok) return;

    setLoadingId(denuncia.id);
    setMessage(null);

    const { error: userError } = await supabase
      .from('usuarios')
      .update({ status: 'bloqueado', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (userError) {
      setMessage(userError.message);
      setLoadingId(null);
      return;
    }

    if (denuncia.anuncios?.id) {
      await supabase.from('anuncios').update({ status: 'bloqueado', updated_at: new Date().toISOString() }).eq('id', denuncia.anuncios.id);
    }

    await atualizarDenuncia(denuncia.id, 'resolvida', 'Usuário e anúncio bloqueados.');
    setLoadingId(null);
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h1>Denúncias</h1>
          <p>Analise anúncios denunciados e tome ação rápida.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Voltar admin</Link>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <label className="field">
          <span className="label">Filtrar denúncias</span>
          <select className="select" value={filtro} onChange={(e) => setFiltro(e.target.value as StatusDenuncia | 'todas')}>
            <option value="aberta">Abertas</option>
            <option value="em_analise">Em análise</option>
            <option value="resolvida">Resolvidas</option>
            <option value="ignorada">Ignoradas</option>
            <option value="todas">Todas</option>
          </select>
        </label>
      </div>

      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}

      {loading ? <div className="card">Carregando denúncias...</div> : !denuncias.length ? (
        <EmptyState title="Nenhuma denúncia encontrada" description="Quando alguém denunciar um anúncio, ele aparece aqui." />
      ) : (
        <div className="grid grid-2">
          {denuncias.map((denuncia) => {
            const ad = denuncia.anuncios;
            const isLoading = loadingId === denuncia.id;

            return (
              <article className="card" key={denuncia.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge"><ShieldAlert size={14} /> {STATUS_LABEL[denuncia.status]}</span>
                    <h2 style={{ margin: '10px 0 4px' }}>{denuncia.motivo}</h2>
                    <p className="muted" style={{ margin: 0 }}>{new Date(denuncia.created_at || '').toLocaleString('pt-BR')}</p>
                  </div>
                  {ad?.status && <span className={`badge status-${ad.status}`}>{ad.status}</span>}
                </div>

                <div className="card" style={{ background: '#f8faf4', marginTop: 14 }}>
                  <strong>Anúncio denunciado</strong>
                  {ad ? (
                    <>
                      <p style={{ margin: '8px 0 4px', fontWeight: 900 }}>{ad.titulo}</p>
                      <p className="muted" style={{ margin: 0 }}>{ad.cidade} - {ad.estado}</p>
                    </>
                  ) : <p className="muted">Anúncio não encontrado.</p>}
                </div>

                {denuncia.descricao && (
                  <div style={{ marginTop: 14 }}>
                    <strong>Descrição da denúncia</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{denuncia.descricao}</p>
                  </div>
                )}

                {denuncia.contato && <p className="muted"><strong>Contato do denunciante:</strong> {denuncia.contato}</p>}
                {denuncia.acao_admin && <div className="notice"><strong>Ação registrada:</strong> {denuncia.acao_admin}</div>}

                <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {ad?.slug && <Link className="btn btn-secondary" href={`/anuncio/${ad.slug}`}><Eye size={16} /> Ver anúncio</Link>}
                    <button className="btn btn-secondary" disabled={isLoading} onClick={() => atualizarDenuncia(denuncia.id, 'em_analise', 'Denúncia colocada em análise.')}><ShieldAlert size={16} /> Em análise</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button className="btn btn-secondary" disabled={isLoading || !ad} onClick={() => atualizarAnuncio(denuncia, 'pausado', 'Anúncio pausado por denúncia.')}><Pause size={16} /> Pausar anúncio</button>
                    <button className="btn btn-danger" disabled={isLoading || !ad} onClick={() => atualizarAnuncio(denuncia, 'bloqueado', 'Anúncio bloqueado por denúncia.')}><Ban size={16} /> Bloquear anúncio</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button className="btn btn-danger" disabled={isLoading || !ad} onClick={() => bloquearUsuario(denuncia)}><UserX size={16} /> Bloquear usuário</button>
                    <button className="btn btn-secondary" disabled={isLoading} onClick={() => atualizarDenuncia(denuncia.id, 'ignorada', 'Denúncia ignorada pelo admin.')}><XCircle size={16} /> Ignorar</button>
                  </div>

                  <button className="btn btn-primary btn-full" disabled={isLoading} onClick={() => atualizarDenuncia(denuncia.id, 'resolvida', 'Denúncia resolvida sem alteração adicional.')}><CheckCircle2 size={16} /> Marcar resolvida</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDenunciasPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><AdminDenunciasContent /></div></main></AuthGuard>;
}
