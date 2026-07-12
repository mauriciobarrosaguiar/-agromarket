'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileText, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/types';

function documentoLabel(status?: string | null) {
  if (status === 'aprovado') return 'Documento aprovado';
  if (status === 'pendente') return 'Documento pendente';
  if (status === 'recusado') return 'Documento recusado';
  return 'Sem documento';
}

function UsuariosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<string | null>(null);

  async function load() {
    const [{ data: current }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    ]);
    setUsuarioLogadoId(current.user?.id || null);

    const lista = (data || []) as Usuario[];
    setUsuarios(lista);

    const urls: Record<string, string> = {};
    await Promise.all(lista.filter((u) => u.documento_url).map(async (u) => {
      const { data: signed } = await supabase.storage.from('agromarket-private').createSignedUrl(u.documento_url as string, 60 * 30);
      if (signed?.signedUrl) urls[u.id] = signed.signedUrl;
    }));
    setDocUrls(urls);
  }

  useEffect(() => { load(); }, []);

  async function mudarTipo(id: string, tipo: string) {
    await supabase.from('usuarios').update({ tipo_usuario: tipo }).eq('id', id);
    await load();
  }

  async function bloquear(id: string, status: string) {
    await supabase.from('usuarios').update({ status }).eq('id', id);
    await load();
  }

  async function excluirUsuario(usuario: Usuario) {
    if (usuario.id === usuarioLogadoId) {
      setMessage('Por segurança, você não pode excluir seu próprio usuário logado.');
      return;
    }

    const confirmacao = window.confirm(
      `Excluir definitivamente o usuário ${usuario.nome || usuario.email}?\n\n` +
      'Isso remove o acesso/login, perfil e dados vinculados que usam exclusão em cascata, como anúncios e vitrines. Essa ação não pode ser desfeita.'
    );

    if (!confirmacao) return;

    const textoConfirmacao = window.prompt('Digite EXCLUIR para confirmar a exclusão definitiva:');
    if (textoConfirmacao !== 'EXCLUIR') {
      setMessage('Exclusão cancelada. Confirmação não informada.');
      return;
    }

    setExcluindoId(usuario.id);
    setMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setMessage('Sessão expirada. Entre novamente para excluir usuários.');
      setExcluindoId(null);
      return;
    }

    const resposta = await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      setMessage(resultado.error || 'Não foi possível excluir o usuário.');
    } else {
      setMessage(resultado.warning || resultado.message || 'Usuário excluído com sucesso.');
      await load();
    }

    setExcluindoId(null);
  }

  async function aprovarDocumento(id: string) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('usuarios').update({
      documento_status: 'aprovado',
      documento_motivo_recusa: null,
      documento_verificado_em: new Date().toISOString(),
      documento_verificado_por: userData.user?.id || null,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (error) setMessage(error.message);
    else {
      setMessage('Documento aprovado. Agora o usuário pode criar/renovar lojinha.');
      await load();
    }
  }

  async function recusarDocumento(id: string) {
    const motivo = prompt('Motivo da recusa do documento:') || 'Documento inválido ou não conferido.';
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('usuarios').update({
      documento_status: 'recusado',
      documento_motivo_recusa: motivo,
      documento_verificado_em: new Date().toISOString(),
      documento_verificado_por: userData.user?.id || null,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (error) setMessage(error.message);
    else {
      setMessage('Documento recusado. O usuário precisará enviar novamente.');
      await load();
    }
  }

  return (
    <div className="form">
      {message && <div className="notice">{message}</div>}

      <div className="grid grid-3">
        <div className="mini-card"><strong>{usuarios.length}</strong><br /><span className="muted">usuários</span></div>
        <div className="mini-card"><strong>{usuarios.filter((u) => u.documento_status === 'pendente').length}</strong><br /><span className="muted">docs pendentes</span></div>
        <div className="mini-card"><strong>{usuarios.filter((u) => u.documento_status === 'aprovado').length}</strong><br /><span className="muted">docs aprovados</span></div>
      </div>

      <div className="grid grid-2">
        {usuarios.map((u) => (
          <article className="card" key={u.id} style={{ border: u.documento_status === 'pendente' ? '2px solid rgba(202,138,4,.42)' : undefined }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#14532d' }}>
                {u.selfie_url || u.foto_url ? <img src={u.selfie_url || u.foto_url || ''} alt={u.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShieldCheck size={24} />}
              </div>
              <div>
                <strong>{u.nome}</strong>
                <p className="muted" style={{ margin: '2px 0 0' }}>{u.email}<br />{u.whatsapp}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className="badge">{u.tipo_usuario}</span>
              <span className="badge">{u.status}</span>
              <span className="badge"><FileText size={14} /> {documentoLabel(u.documento_status)}</span>
            </div>

            <p className="muted">CPF: {u.cpf || '—'}<br />Documento: {u.documento_numero || '—'} / {u.documento_orgao_emissor || '—'}-{u.documento_uf || '—'}</p>
            <p className="muted">Localização: {u.localizacao_validada ? `validada (${Math.round(u.localizacao_accuracy || 0)}m)` : 'pendente'}</p>
            {u.documento_motivo_recusa && <div className="notice">Recusa: {u.documento_motivo_recusa}</div>}

            <div style={{ display: 'grid', gap: 8 }}>
              {u.documento_url && docUrls[u.id] && <a className="btn btn-secondary btn-full" href={docUrls[u.id]} target="_blank" rel="noreferrer"><FileText size={16} /> Ver documento privado</a>}
              {u.documento_url && <button className="btn btn-primary btn-full" onClick={() => aprovarDocumento(u.id)}><CheckCircle2 size={16} /> Aprovar documento</button>}
              {u.documento_url && <button className="btn btn-danger btn-full" onClick={() => recusarDocumento(u.id)}><XCircle size={16} /> Recusar documento</button>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => mudarTipo(u.id, 'admin')}>Tornar admin</button>
                <button className="btn btn-secondary" onClick={() => mudarTipo(u.id, 'anunciante')}>Anunciante</button>
                <button className="btn btn-danger" onClick={() => bloquear(u.id, u.status === 'bloqueado' ? 'ativo' : 'bloqueado')}>{u.status === 'bloqueado' ? 'Desbloquear' : 'Bloquear'}</button>
                <button className="btn btn-danger" onClick={() => excluirUsuario(u)} disabled={excluindoId === u.id || u.id === usuarioLogadoId} title={u.id === usuarioLogadoId ? 'Você não pode excluir seu próprio usuário logado.' : 'Excluir usuário definitivamente'}>
                  <Trash2 size={16} /> {excluindoId === u.id ? 'Excluindo...' : 'Excluir usuário'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><div className="section-head"><div><h1>Usuários</h1><p>Aprove documentos, bloqueie ou exclua usuários quando necessário.</p></div><Link className="btn btn-secondary" href="/admin">Voltar admin</Link></div><UsuariosContent /></div></main></AuthGuard>;
}
