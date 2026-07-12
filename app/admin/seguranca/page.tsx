'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, DatabaseBackup, Download, ShieldCheck } from 'lucide-react';
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

const BACKUP_TABLES = [
  'usuarios',
  'categorias',
  'subcategorias',
  'anuncios',
  'fotos_anuncios',
  'denuncias',
  'cidades',
  'destaques',
  'planos',
  'assinaturas',
  'logs',
  'vitrines',
  'vitrine_pagamentos',
  'monetizacao_planos',
  'pagamento_configuracoes',
  'patrocinados_home',
  'destaque_solicitacoes',
  'vendedor_avaliacoes',
  'anuncio_whatsapp_cliques',
  'site_configuracoes',
  'backup_logs'
] as const;

const BACKUP_PAGE_SIZE = 1000;

type BackupTableName = (typeof BACKUP_TABLES)[number];
type BackupRows = Record<BackupTableName, unknown[]>;
type BackupErrors = Partial<Record<BackupTableName, string>>;

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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
  const [backupInProgress, setBackupInProgress] = useState(false);

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
    const observacao = prompt('Observacao do backup:', 'Backup manual conferido no Supabase.');
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

  async function carregarTabelaBackup(table: BackupTableName) {
    const rows: unknown[] = [];
    let page = 0;

    while (true) {
      const from = page * BACKUP_PAGE_SIZE;
      const to = from + BACKUP_PAGE_SIZE - 1;
      const { data, error } = await supabase.from(table).select('*').range(from, to);

      if (error) throw error;

      const batch = data || [];
      rows.push(...batch);

      if (batch.length < BACKUP_PAGE_SIZE) break;
      page += 1;
    }

    return rows;
  }

  async function baixarBackup() {
    if (backupInProgress) return;

    const ok = confirm('Baixar agora um backup JSON das tabelas principais do AgroMarket?');
    if (!ok) return;

    setBackupInProgress(true);
    setMessage('Gerando backup. Aguarde o download iniciar...');

    const startedAt = new Date().toISOString();
    const dados = {} as BackupRows;
    const erros: BackupErrors = {};

    try {
      for (const table of BACKUP_TABLES) {
        try {
          dados[table] = await carregarTabelaBackup(table);
        } catch (error) {
          dados[table] = [];
          erros[table] = error instanceof Error ? error.message : 'Erro ao exportar tabela.';
        }
      }

      const finishedAt = new Date().toISOString();
      const filename = `agromarket-backup-${finishedAt.slice(0, 10)}-${finishedAt.slice(11, 19).replaceAll(':', '')}.json`;
      const payload = {
        metadata: {
          app: 'AgroMarket',
          tipo: 'backup_json_admin',
          gerado_em: finishedAt,
          iniciado_em: startedAt,
          arquivo: filename,
          tabelas: BACKUP_TABLES,
          totais: Object.fromEntries(BACKUP_TABLES.map((table) => [table, dados[table].length])),
          avisos: [
            'Este arquivo exporta dados acessiveis pela sessao admin via Supabase/RLS.',
            'Arquivos do Storage ficam referenciados por URL/caminho; o binario dos arquivos nao e incluido.',
            'Usuarios do Supabase Auth fora da tabela public.usuarios nao sao exportados por este botao.'
          ],
          erros
        },
        dados
      };

      downloadJsonFile(filename, payload);

      const { data: userData } = await supabase.auth.getUser();
      const { error: logError } = await supabase.from('backup_logs').insert({
        tipo: 'download_json',
        status: 'feito',
        observacao: Object.keys(erros).length
          ? `Backup baixado pelo painel admin com avisos: ${filename}`
          : `Backup baixado pelo painel admin: ${filename}`,
        admin_id: userData.user?.id || null
      });

      if (logError) {
        setMessage(`Backup baixado, mas o registro no historico falhou: ${logError.message}`);
      } else {
        setMessage(Object.keys(erros).length ? 'Backup baixado com avisos. Algumas tabelas nao puderam ser exportadas.' : 'Backup baixado com sucesso.');
        await load();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao gerar backup.');
    } finally {
      setBackupInProgress(false);
    }
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h1>Backup e seguranca</h1>
          <p>Checklist de producao, seguranca dos perfis e controle de backup.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Voltar admin</Link>
      </div>

      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}
      {loading ? <div className="card">Carregando...</div> : (
        <>
          <div className="grid grid-3">
            <div className="card"><strong className="price">{counts.anunciosPendentes}</strong><p className="muted">Anuncios pendentes</p></div>
            <div className="card"><strong className="price">{counts.destaquesPendentes}</strong><p className="muted">Destaques pendentes</p></div>
            <div className="card"><strong className="price">{counts.denunciasAbertas}</strong><p className="muted">Denuncias abertas</p></div>
            <div className="card"><strong className="price">{counts.usuariosSemFoto}</strong><p className="muted">Usuarios sem foto/selfie</p></div>
            <div className="card"><strong className="price">{counts.usuariosSemLocalizacao}</strong><p className="muted">Usuarios sem GPS validado</p></div>
            <div className="card"><strong className="price">{counts.documentosEnviados}</strong><p className="muted">Documentos opcionais enviados</p></div>
          </div>

          <section className="card section">
            <h2><ShieldCheck size={22} /> Checklist de seguranca</h2>
            <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Usuario comum nao deve acessar paginas /admin.</li>
              <li>Anuncio novo deve entrar como pendente.</li>
              <li>Foto do anuncio e obrigatoria.</li>
              <li>Perfil do anunciante exige foto/selfie.</li>
              <li>Perfil do anunciante exige localizacao real por GPS.</li>
              <li>Documento do perfil e opcional e fica em area privada.</li>
              <li>Denuncias devem aparecer em /admin/denuncias.</li>
              <li>Destaques pendentes devem aparecer em /admin/destaques.</li>
            </ul>
          </section>

          <section className="card section">
            <h2><DatabaseBackup size={22} /> Backup pelo app</h2>
            <p className="muted">Clique para baixar um arquivo JSON com as tabelas principais do AgroMarket. Guarde esse arquivo em local seguro.</p>
            <div className="notice" style={{ marginBottom: 12 }}>
              O backup pelo app salva os dados do banco acessiveis pelo admin. Fotos e documentos ficam referenciados por URL/caminho; para copia completa dos arquivos, confira tambem o Storage no Supabase.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={baixarBackup} disabled={backupInProgress}>
                <Download size={18} /> {backupInProgress ? 'Gerando backup...' : 'Baixar backup agora'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={registrarBackup}>
                <CheckCircle2 size={18} /> Registrar conferencia manual
              </button>
            </div>
          </section>

          <section className="card section">
            <h2>Ultimos registros</h2>
            {logs.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {logs.map((log) => (
                  <div className="notice" key={log.id}>
                    <strong>{log.status}</strong> - {new Date(log.created_at || '').toLocaleString('pt-BR')}
                    {log.observacao && <p style={{ margin: '6px 0 0' }}>{log.observacao}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="muted">Nenhum backup registrado ainda.</p>}
          </section>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary" href="/admin/pendentes">Anuncios pendentes</Link>
            <Link className="btn btn-secondary" href="/admin/destaques">Destaques</Link>
            <Link className="btn btn-secondary" href="/admin/denuncias">Denuncias</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminSegurancaPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><AdminSegurancaContent /></div></main></AuthGuard>;
}
