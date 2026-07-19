'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Camera, CheckCircle2, FileText, ShieldCheck, XCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/types';

function statusDocumentoLabel(status?: string | null) {
  if (status === 'aprovado') return 'Documento aprovado';
  if (status === 'pendente') return 'Documento pendente';
  if (status === 'recusado') return 'Documento recusado';
  return 'Documento não enviado';
}

function statusSelfieLabel(status?: string | null) {
  if (status === 'aprovada') return 'Selfie aprovada';
  if (status === 'pendente') return 'Selfie pendente';
  if (status === 'recusada') return 'Selfie recusada';
  return 'Selfie não enviada';
}

function statusColor(status?: string | null) {
  if (status === 'aprovado' || status === 'aprovada') return '#166534';
  if (status === 'pendente') return '#9a3412';
  if (status === 'recusado' || status === 'recusada') return '#991b1b';
  return '#64748b';
}

function StatusOk({ children }: { children: React.ReactNode }) {
  return <div className="notice notice-success" style={{ fontWeight: 900 }}><CheckCircle2 size={16} /> {children}</div>;
}

function DocumentosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const docsPendentes = useMemo(() => usuarios.filter((u) => u.documento_status === 'pendente'), [usuarios]);
  const selfiesPendentes = useMemo(() => usuarios.filter((u) => u.selfie_status === 'pendente'), [usuarios]);
  const verificacoesOk = useMemo(() => usuarios.filter((u) => u.documento_status === 'aprovado' && u.selfie_status === 'aprovada'), [usuarios]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .or('documento_url.not.is.null,selfie_url.not.is.null,foto_url.not.is.null')
      .order('updated_at', { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const lista = (data || []) as Usuario[];
    setUsuarios(lista);

    const urls: Record<string, string> = {};
    await Promise.all(lista.map(async (u) => {
      if (!u.documento_url) return;

      if (u.documento_url.startsWith('http')) {
        urls[u.id] = u.documento_url;
        return;
      }

      const { data: signed } = await supabase.storage
        .from('agromarket-private')
        .createSignedUrl(u.documento_url, 60 * 30);

      if (signed?.signedUrl) urls[u.id] = signed.signedUrl;
    }));

    setDocUrls(urls);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function aprovarDocumento(usuario: Usuario) {
    if (!usuario.documento_url) {
      setMessage('Este usuário ainda não enviou documento.');
      return;
    }

    if (!confirm(`Aprovar documento de ${usuario.nome}?`)) return;

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('usuarios').update({
      documento_status: 'aprovado',
      documento_motivo_recusa: null,
      documento_verificado_em: new Date().toISOString(),
      documento_verificado_por: userData.user?.id || null,
      updated_at: new Date().toISOString()
    }).eq('id', usuario.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Documento aprovado.');
      await load();
    }
  }

  async function recusarDocumento(usuario: Usuario) {
    const motivo = prompt('Informe o motivo da recusa:', 'Documento inválido, ilegível ou não corresponde aos dados informados.') || 'Documento recusado pelo administrador.';
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('usuarios').update({
      documento_status: 'recusado',
      documento_motivo_recusa: motivo,
      documento_verificado_em: new Date().toISOString(),
      documento_verificado_por: userData.user?.id || null,
      updated_at: new Date().toISOString()
    }).eq('id', usuario.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Documento recusado.');
      await load();
    }
  }

  async function aprovarSelfie(usuario: Usuario) {
    if (!usuario.selfie_url && !usuario.foto_url) {
      setMessage('Este usuário ainda não tirou selfie/foto.');
      return;
    }

    if (!confirm(`Aprovar selfie de ${usuario.nome}?`)) return;

    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('usuarios').update({
      selfie_status: 'aprovada',
      selfie_motivo_recusa: null,
      selfie_verificada_em: new Date().toISOString(),
      selfie_verificada_por: userData.user?.id || null,
      updated_at: new Date().toISOString()
    }).eq('id', usuario.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Selfie aprovada.');
      await load();
    }
  }

  async function recusarSelfie(usuario: Usuario) {
    const motivo = prompt('Informe o motivo da recusa da selfie:', 'Selfie/foto inválida, sem rosto visível ou não confere com o responsável.') || 'Selfie recusada pelo administrador.';
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('usuarios').update({
      selfie_status: 'recusada',
      selfie_motivo_recusa: motivo,
      selfie_verificada_em: new Date().toISOString(),
      selfie_verificada_por: userData.user?.id || null,
      updated_at: new Date().toISOString()
    }).eq('id', usuario.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Selfie recusada.');
      await load();
    }
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="badge"><ShieldCheck size={14} /> Segurança</span>
            <h1>Aprovar verificações</h1>
            <p>Acompanhe documento e selfie dos responsáveis.</p>
          </div>
          <Link className="btn btn-secondary" href="/admin">Voltar admin</Link>
        </div>

        {message && <div className="notice" style={{ marginBottom: 14 }}>{message}</div>}

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="mini-card"><strong>{docsPendentes.length}</strong><br /><span className="muted">docs pendentes</span></div>
          <div className="mini-card"><strong>{selfiesPendentes.length}</strong><br /><span className="muted">selfies pendentes</span></div>
          <div className="mini-card"><strong>{verificacoesOk.length}</strong><br /><span className="muted">verificações ok</span></div>
        </div>

        {loading ? <div className="card">Carregando verificações...</div> : !usuarios.length ? (
          <EmptyState title="Nenhuma verificação enviada" description="Quando um usuário enviar documento ou selfie, aparecerá aqui para análise." />
        ) : (
          <div className="grid grid-2">
            {usuarios.map((u) => {
              const docStatus = u.documento_status || 'nao_enviado';
              const selfieStatus = u.selfie_status || 'nao_enviada';
              const pendente = docStatus === 'pendente' || selfieStatus === 'pendente';
              const selfieAprovada = selfieStatus === 'aprovada';
              const docAprovado = docStatus === 'aprovado';
              return (
                <article className="card" key={u.id} style={{ border: pendente ? '2px solid rgba(202,138,4,.45)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ fontSize: 22 }}>{u.nome}</strong>
                      <p className="muted" style={{ margin: '4px 0 0' }}>{u.email}<br />{u.whatsapp}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge" style={{ color: statusColor(docStatus) }}><FileText size={14} /> {statusDocumentoLabel(docStatus)}</span>
                      <span className="badge" style={{ color: statusColor(selfieStatus) }}><Camera size={14} /> {statusSelfieLabel(selfieStatus)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                    <p className="muted" style={{ margin: 0 }}><strong>CPF:</strong> {u.cpf || '—'}</p>
                    <p className="muted" style={{ margin: 0 }}><strong>Documento:</strong> {u.documento_numero || '—'} / {u.documento_orgao_emissor || '—'}-{u.documento_uf || '—'}</p>
                    <p className="muted" style={{ margin: 0 }}><strong>Localização:</strong> {u.localizacao_validada ? `validada (${Math.round(u.localizacao_accuracy || 0)}m)` : 'pendente'}</p>
                  </div>

                  {u.selfie_url || u.foto_url ? (
                    <div className="card" style={{ background: '#f8faf4', marginTop: 14 }}>
                      <strong>Selfie/foto do responsável</strong>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10 }}>
                        <img src={u.selfie_url || u.foto_url || ''} alt="Selfie" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dfe8d9' }} />
                        <div style={{ display: 'grid', gap: 8, flex: 1 }}>
                          {selfieAprovada ? <StatusOk>Selfie aprovada</StatusOk> : (
                            <>
                              <button className="btn btn-primary btn-full" type="button" onClick={() => aprovarSelfie(u)}><CheckCircle2 size={16} /> Aprovar selfie</button>
                              <button className="btn btn-danger btn-full" type="button" onClick={() => recusarSelfie(u)}><XCircle size={16} /> Recusar selfie</button>
                            </>
                          )}
                        </div>
                      </div>
                      {u.selfie_motivo_recusa && <div className="notice" style={{ marginTop: 10 }}>Recusa da selfie: {u.selfie_motivo_recusa}</div>}
                    </div>
                  ) : (
                    <div className="notice" style={{ marginTop: 14 }}>Selfie ainda não enviada.</div>
                  )}

                  <div className="card" style={{ background: '#fff', marginTop: 14 }}>
                    <strong>Documento</strong>
                    {u.documento_motivo_recusa && <div className="notice" style={{ marginTop: 10 }}>Recusa do documento: {u.documento_motivo_recusa}</div>}
                    <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                      {docUrls[u.id] ? (
                        <a className="btn btn-secondary btn-full" href={docUrls[u.id]} target="_blank" rel="noreferrer"><FileText size={16} /> Ver documento privado</a>
                      ) : u.documento_url ? (
                        <div className="notice"><AlertTriangle size={16} /> Documento enviado, mas não consegui gerar link privado.</div>
                      ) : (
                        <div className="notice">Documento ainda não enviado.</div>
                      )}
                      {docAprovado ? <StatusOk>Documento aprovado</StatusOk> : (
                        <>
                          <button className="btn btn-primary btn-full" type="button" onClick={() => aprovarDocumento(u)}><CheckCircle2 size={16} /> Aprovar documento</button>
                          <button className="btn btn-danger btn-full" type="button" onClick={() => recusarDocumento(u)}><XCircle size={16} /> Recusar documento</button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminDocumentosPage() {
  return <AuthGuard adminOnly><DocumentosContent /></AuthGuard>;
}
