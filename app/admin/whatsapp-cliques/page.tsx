'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, MessageCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { AnuncioWhatsappClique } from '@/types';

type Filtro = {
  busca: string;
  inicio: string;
  fim: string;
};

function dataHoraBR(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

function csvEscape(value?: string | number | null) {
  const texto = String(value ?? '').replace(/"/g, '""');
  return `"${texto}"`;
}

function AdminWhatsappCliquesContent() {
  const [cliques, setCliques] = useState<AnuncioWhatsappClique[]>([]);
  const [filtro, setFiltro] = useState<Filtro>({ busca: '', inicio: '', fim: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase
      .from('anuncio_whatsapp_cliques')
      .select('*, anuncios(titulo, slug, cidade, estado)')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (filtro.inicio) query = query.gte('created_at', `${filtro.inicio}T00:00:00`);
    if (filtro.fim) query = query.lte('created_at', `${filtro.fim}T23:59:59`);

    const { data, error } = await query;
    if (error) setMessage(error.message);
    else setCliques((data || []) as AnuncioWhatsappClique[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtrados = useMemo(() => {
    const termo = filtro.busca.trim().toLowerCase();
    if (!termo) return cliques;
    return cliques.filter((item) => `${item.anuncios?.titulo || ''} ${item.comprador_nome || ''} ${item.comprador_email || ''} ${item.comprador_whatsapp || ''} ${item.comprador_cidade || ''} ${item.comprador_estado || ''}`.toLowerCase().includes(termo));
  }, [cliques, filtro.busca]);

  const porAnuncio = useMemo(() => {
    const mapa = new Map<string, { titulo: string; total: number }>();
    filtrados.forEach((item) => {
      const key = item.anuncio_id;
      const atual = mapa.get(key) || { titulo: item.anuncios?.titulo || 'Anúncio sem título', total: 0 };
      atual.total += 1;
      mapa.set(key, atual);
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [filtrados]);

  function baixarCsv() {
    const linhas = [
      ['Data', 'Anúncio', 'Cidade anúncio', 'Comprador', 'E-mail', 'WhatsApp comprador', 'Cidade comprador', 'Origem'].map(csvEscape).join(','),
      ...filtrados.map((item) => [
        dataHoraBR(item.created_at),
        item.anuncios?.titulo || '',
        `${item.anuncios?.cidade || ''} - ${item.anuncios?.estado || ''}`,
        item.comprador_nome || '',
        item.comprador_email || '',
        item.comprador_whatsapp || '',
        `${item.comprador_cidade || ''} - ${item.comprador_estado || ''}`,
        item.origem
      ].map(csvEscape).join(','))
    ];

    const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cliques-whatsapp-agromarket-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="badge"><MessageCircle size={14} /> Relatório comercial</span>
            <h1>Cliques no WhatsApp</h1>
            <p>Veja quem clicou no WhatsApp de cada anúncio e exporte para mostrar resultado ao dono da loja.</p>
          </div>
          <Link className="btn btn-secondary" href="/admin">Voltar admin</Link>
        </div>

        {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}

        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <div className="mini-card"><strong>{filtrados.length}</strong><br /><span className="muted">cliques filtrados</span></div>
          <div className="mini-card"><strong>{porAnuncio.length}</strong><br /><span className="muted">anúncios com clique</span></div>
          <div className="mini-card"><strong>{filtrados.filter((item) => item.comprador_whatsapp).length}</strong><br /><span className="muted">com WhatsApp do comprador</span></div>
        </div>

        <section className="card form" style={{ marginBottom: 18 }}>
          <h2>Filtros e exportação</h2>
          <div className="form-row">
            <label className="field">
              <span className="label">Buscar</span>
              <input className="input" value={filtro.busca} onChange={(e) => setFiltro((prev) => ({ ...prev, busca: e.target.value }))} placeholder="Anúncio, comprador, e-mail, WhatsApp..." />
            </label>
            <label className="field">
              <span className="label">Data inicial</span>
              <input className="input" type="date" value={filtro.inicio} onChange={(e) => setFiltro((prev) => ({ ...prev, inicio: e.target.value }))} />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span className="label">Data final</span>
              <input className="input" type="date" value={filtro.fim} onChange={(e) => setFiltro((prev) => ({ ...prev, fim: e.target.value }))} />
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" onClick={load}>Aplicar filtros</button>
              <button className="btn btn-secondary" type="button" onClick={baixarCsv}><Download size={18} /> Baixar CSV</button>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head section-head-compact">
            <div>
              <h2>Resumo por anúncio</h2>
              <p>Mostra quantos interessados cada anúncio gerou.</p>
            </div>
          </div>
          {porAnuncio.length ? (
            <div className="grid grid-3">
              {porAnuncio.slice(0, 12).map((item) => (
                <div className="card" key={item.titulo}>
                  <strong>{item.titulo}</strong>
                  <div className="price" style={{ fontSize: 28 }}>{item.total}</div>
                  <p className="muted">clique(s) no WhatsApp</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="Nenhum clique encontrado" description="Quando alguém logado clicar para chamar no WhatsApp, aparecerá aqui." />}
        </section>

        <section className="section">
          <div className="section-head section-head-compact">
            <div>
              <h2>Cliques detalhados</h2>
              <p>Dados do usuário logado que clicou.</p>
            </div>
          </div>
          {loading ? <div className="card">Carregando...</div> : filtrados.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Anúncio</th>
                    <th>Comprador</th>
                    <th>Contato</th>
                    <th>Local</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((item) => (
                    <tr key={item.id}>
                      <td>{dataHoraBR(item.created_at)}</td>
                      <td>
                        <strong>{item.anuncios?.titulo || 'Anúncio'}</strong><br />
                        <span className="muted">{item.anuncios?.cidade || ''} - {item.anuncios?.estado || ''}</span>
                      </td>
                      <td>{item.comprador_nome || 'Usuário logado'}<br /><span className="muted">{item.comprador_email}</span></td>
                      <td>{item.comprador_whatsapp || 'Não informado'}</td>
                      <td>{item.comprador_cidade || '—'} - {item.comprador_estado || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="Nenhum clique no período" />}
        </section>
      </div>
    </main>
  );
}

export default function AdminWhatsappCliquesPage() {
  return <AuthGuard adminOnly><AdminWhatsappCliquesContent /></AuthGuard>;
}
