'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, DatabaseBackup, ShieldCheck } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';

type SecurityCounts = {
  usuariosSemFoto: number;
  usuariosSemLocalizacao: number;
  anunciosPendentes: number;
  destaquesPendentes: number;
  denunciasAbertas: number;
  documentosEnviados: number;
};

type BackupLog = {
  id: string;
  tipo: string;
  status: string;
  observacao?: string | null;
  created_at?: string;
};

function AdminSegurancaContent() {
  const [counts, setCounts] = useState<SecurityCounts>({
    usuariosSemFoto: 0,
    usuariosSemLocalizacao: 0,
    anunciosPendentes: 0,
    destaquesPendentes: 0,
    denunciasAbertas: 0,
    documentosEnviados: 0
  });
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const [usuarios, ads, destaques, denuncias, backups] = await Promise.all([
      supabase.from('usuarios').select('id,foto_url,selfie_url,localizacao_validada,documento_url'),
      supabase.from('anuncios').select('id,status'),
      supabase.from('destaque_solicitacoes').select('id,status'),
      supabase.from('denuncias').select('id,status'),
      supabase.from('backup_logs').select('*').order('created_at', { ascending: false }).limit(10)
    ]);

    const users = usuarios.data || [];
    setCounts({
      usuariosSemFoto: users.filter((u: any) => !u.selfie_url && !u.foto_url).length,
      usuariosSemLocalizacao: users.filter((u: any) => !u.localizacao_validada).length,
      anunciosPendentes: (ads.data || []).filter((a: any) => a.status === 'pendente').length,
      destaquesPendentes: (destaques.data || []).filter((d: any) => d.status === 'pendente').length,
      denunciasAbertas: (denuncias.data || []).filter((d: any) => d.status === 'aberta').length,
      documentosEnviados: users.filter((u: any) => Boolean(u.documento_url)).length
    });
    setLogs((backups.data || []) as BackupLog[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function registrarBackup() {
    const observacao = prompt('Observação do backup:', 'Backup manual conferido no Supabase.');
    if (observacao === null) return;

    setMessage(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('backup_logs').insert({
      tipo: 'manual',
      status: 'feito',
      observacao: observacao || 'Backup manual conferido.',
      admin_id: userData.user?.id || null
    });

    if (error) setMessage(error.message);
    else {
      setMessage('Registro de backup salvo.');
      await load();
    }
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h1>Backup e segurança</h1>
          <p>Checklist de produção, segurança dos perfis e controle de backup manual.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Voltar admin</Link>
      </div>

      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}
      {loading ? <div className="card">Carregando...</div> : (
        <>
          <div className="grid grid-3">
            <div className="card"><strong className="price">{counts.anunciosPendentes}</strong><p className="muted">Anúncios pendentes</p></div>
            <div className="card"><strong className="price">{counts.destaquesPendentes}</strong><p className="muted">Destaques pendentes</p></div>
            <div className="card"><strong className="price">{counts.denunciasAbertas}</strong><p className="muted">Denúncias abertas</p></div>
            <div className="card"><strong className="price">{counts.usuariosSemFoto}</strong><p className="muted">Usuários sem foto/selfie</p></div>
            <div className="card"><strong className="price">{counts.usuariosSemLocalizacao}</strong><p className="muted">Usuários sem GPS validado</p></div>
            <div className="card"><strong className="price">{counts.documentosEnviados}</strong><p className="muted">Documentos opcionais enviados</p></div>
          </div>

          <section className="card section">
            <h2><ShieldCheck size={22} /> Checklist de segurança</h2>
            <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Usuário comum não deve acessar páginas /admin.</li>
              <li>Anúncio novo deve entrar como pendente.</li>
              <li>Foto do anúncio é obrigatória.</li>
              <li>Perfil do anunciante exige foto/selfie.</li>
              <li>Perfil do anunciante exige localização real por GPS.</li>
              <li>Documento do perfil é opcional e fica em área privada.</li>
              <li>Denúncias devem aparecer em /admin/denuncias.</li>
              <li>Destaques pendentes devem aparecer em /admin/destaques.</li>
            </ul>
          </section>

          <section className="card section">
            <h2><DatabaseBackup size={22} /> Backup manual</h2>
            <p className="muted">Neste MVP, o controle de backup é manual. Faça o backup pelo painel do Supabase e registre aqui a conferência.</p>
            <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Entrar no Supabase do projeto AgroMarket.</li>
              <li>Conferir se as tabelas principais estão acessíveis.</li>
              <li>Exportar/baixar os dados ou conferir rotina de backup do Supabase.</li>
              <li>Registrar aqui que o backup foi conferido.</li>
            </ol>
            <button className="btn btn-primary" type="button" onClick={registrarBackup}><CheckCircle2 size={18} /> Registrar backup feito</button>
          </section>

          <section className="card section">
            <h2>Últimos registros</h2>
            {logs.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {logs.map((log) => (
                  <div className="notice" key={log.id}>
                    <strong>{log.status}</strong> · {new Date(log.created_at || '').toLocaleString('pt-BR')}
                    {log.observacao && <p style={{ margin: '6px 0 0' }}>{log.observacao}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="muted">Nenhum backup registrado ainda.</p>}
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary" href="/admin/pendentes">Anúncios pendentes</Link>
            <Link className="btn btn-secondary" href="/admin/destaques">Destaques</Link>
            <Link className="btn btn-secondary" href="/admin/denuncias">Denúncias</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminSegurancaPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><AdminSegurancaContent /></div></main></AuthGuard>;
}
