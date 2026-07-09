'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, FileText, ShieldCheck, XCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/types';

function statusLabel(status?: string | null) {
  if (status === 'aprovado') return 'Aprovado';
  if (status === 'pendente') return 'Pendente de análise';
  if (status === 'recusado') return 'Recusado';
  return 'Não enviado';
}

function statusColor(status?: string | null) {
  if (status === 'aprovado') return '#166534';
  if (status === 'pendente') return '#9a3412';
  if (status === 'recusado') return '#991b1b';
  return '#64748b';
}

function DocumentosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pendentes = useMemo(() => usuarios.filter((u) => u.documento_status === 'pendente'), [usuarios]);
  const aprovados = useMemo(() => usuarios.filter((u) => u.documento_status === 'aprovado'), [usuarios]);
  const recusados = useMemo(() => usuarios.filter((u) => u.documento_status === 'recusado'), [usuarios]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .not('documento_url', 'is', null)
      .order('documento_status', { ascending: false })
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
      setMessage('Documento aprovado. O usuário já pode criar/renovar lojinha, desde que a localização esteja validada.');
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
      setMessage('Documento recusado. O usuário precisará enviar outro arquivo.');
      await load();
    }
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="badge"><ShieldCheck size={14} /> Segurança</span>
            <h1>Aprovar documentos</h1>
            <p>Confira manualmente documentos enviados. Enviar arquivo não libera lojinha automaticamente.</p>
          </div>
          <Link className="btn btn-secondary" href="/admin">Voltar admin</Link>
        </div>

        {message && <div className="notice" style={{ marginBottom: 14 }}>{message}</div>}

        <div className="notice" style={{ marginBottom: 14 }}>
          <strong>Regra:</strong> foto qualquer deve ser recusada. Só aprove se o documento estiver legível e bater com CPF, nome e dados informados no perfil.
        </div>

        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="mini-card"><strong>{pendentes.length}</strong><br /><span className="muted">pendentes</span></div>
          <div className="mini-card"><strong>{aprovados.length}</strong><br /><span className="muted">aprovados</span></div>
          <div className="mini-card"><strong>{recusados.length}</strong><br /><span className="muted">recusados</span></div>
        </div>

        {loading ? <div className="card">Carregando documentos...</div> : !usuarios.length ? (
          <EmptyState title="Nenhum documento enviado" description="Quando um usuário enviar documento, ele aparecerá aqui para análise." />
        ) : (
          <div className="grid grid-2">
            {usuarios.map((u) => {
              const status = u.documento_status || 'nao_enviado';
              const pendente = status === 'pendente';
              return (
                <article className="card" key={u.id} style={{ border: pendente ? '2px solid rgba(202,138,4,.45)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ fontSize: 22 }}>{u.nome}</strong>
                      <p className="muted" style={{ margin: '4px 0 0' }}>{u.email}<br />{u.whatsapp}</p>
                    </div>
                    <span className="badge" style={{ color: statusColor(status) }}><FileText size={14} /> {statusLabel(status)}</span>
                  </div>

                  <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                    <p className="muted" style={{ margin: 0 }}><strong>CPF:</strong> {u.cpf || '—'}</p>
                    <p className="muted" style={{ margin: 0 }}><strong>Documento:</strong> {u.documento_numero || '—'} / {u.documento_orgao_emissor || '—'}-{u.documento_uf || '—'}</p>
                    <p className="muted" style={{ margin: 0 }}><strong>Localização:</strong> {u.localizacao_validada ? `validada (${Math.round(u.localizacao_accuracy || 0)}m)` : 'pendente'}</p>
                  </div>

                  {u.selfie_url || u.foto_url ? (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14 }}>
                      <img src={u.selfie_url || u.foto_url || ''} alt="Selfie" style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover', border: '1px solid #dfe8d9' }} />
                      <span className="muted">Selfie/foto do responsável</span>
                    </div>
                  ) : (
                    <div className="notice" style={{ marginTop: 14 }}>Selfie ainda não enviada.</div>
                  )}

                  {u.documento_motivo_recusa && <div className="notice" style={{ marginTop: 14 }}>Última recusa: {u.documento_motivo_recusa}</div>}

                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    {docUrls[u.id] ? (
                      <a className="btn btn-secondary btn-full" href={docUrls[u.id]} target="_blank" rel="noreferrer"><FileText size={16} /> Ver documento privado</a>
                    ) : (
                      <div className="notice"><AlertTriangle size={16} /> Documento enviado, mas não consegui gerar link privado.</div>
                    )}
                    <button className="btn btn-primary btn-full" type="button" onClick={() => aprovarDocumento(u)}><CheckCircle2 size={16} /> Aprovar documento</button>
                    <button className="btn btn-danger btn-full" type="button" onClick={() => recusarDocumento(u)}><XCircle size={16} /> Recusar documento</button>
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
