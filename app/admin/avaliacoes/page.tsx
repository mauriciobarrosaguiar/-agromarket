'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, Trash2 } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import type { Vitrine } from '@/types';

type VitrineLinha = Vitrine & {
  usuarios?: { nome: string; email: string; whatsapp?: string | null } | null;
};

type AvaliacaoManual = {
  id: string;
  vitrine_id: string;
  nome_avaliador: string;
  nota: number;
  comentario: string;
  origem?: string | null;
  data_avaliacao?: string | null;
  status: string;
  vitrines?: { nome_vitrine: string; slug: string } | null;
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function dataBR(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function AdminAvaliacoesContent() {
  const [vitrines, setVitrines] = useState<VitrineLinha[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoManual[]>([]);
  const [busca, setBusca] = useState('');
  const [vitrineId, setVitrineId] = useState('');
  const [nomeAvaliador, setNomeAvaliador] = useState('');
  const [nota, setNota] = useState(5);
  const [origem, setOrigem] = useState('WhatsApp');
  const [dataAvaliacao, setDataAvaliacao] = useState(hojeISO());
  const [comentario, setComentario] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const vitrinesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return vitrines.slice(0, 10);

    return vitrines.filter((vitrine) => `${vitrine.nome_vitrine} ${vitrine.slug} ${vitrine.usuarios?.nome || ''} ${vitrine.usuarios?.email || ''} ${vitrine.usuarios?.whatsapp || ''}`.toLowerCase().includes(termo)).slice(0, 10);
  }, [busca, vitrines]);

  const vitrineSelecionada = vitrines.find((vitrine) => vitrine.id === vitrineId) || null;

  async function load() {
    const [{ data: lojas }, { data: reviews }] = await Promise.all([
      supabase
        .from('vitrines')
        .select('*, usuarios(nome,email,whatsapp)')
        .order('nome_vitrine', { ascending: true }),
      supabase
        .from('vitrine_avaliacoes_manuais')
        .select('*, vitrines(nome_vitrine, slug)')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    setVitrines((lojas || []) as VitrineLinha[]);
    setAvaliacoes((reviews || []) as AvaliacaoManual[]);
  }

  useEffect(() => { load(); }, []);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!vitrineId) {
      setMessage('Selecione a lojinha.');
      return;
    }
    if (!nomeAvaliador.trim()) {
      setMessage('Informe o nome do cliente que avaliou.');
      return;
    }
    if (!comentario.trim()) {
      setMessage('Cole ou transcreva o comentário recebido.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc('admin_registrar_avaliacao_manual', {
      vitrine_uuid: vitrineId,
      nome_avaliador_text: nomeAvaliador.trim(),
      nota_int: nota,
      comentario_text: comentario.trim(),
      origem_text: origem.trim() || 'WhatsApp',
      data_avaliacao_date: dataAvaliacao || hojeISO()
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Avaliação registrada na lojinha.');
      setNomeAvaliador('');
      setNota(5);
      setOrigem('WhatsApp');
      setDataAvaliacao(hojeISO());
      setComentario('');
      await load();
    }
    setSaving(false);
  }

  async function atualizarStatus(id: string, status: 'aprovada' | 'oculta' | 'removida') {
    const { error } = await supabase
      .from('vitrine_avaliacoes_manuais')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) setMessage(error.message);
    else await load();
  }

  async function excluir(id: string) {
    if (!confirm('Excluir definitivamente esta avaliação?')) return;
    const { error } = await supabase.from('vitrine_avaliacoes_manuais').delete().eq('id', id);
    if (error) setMessage(error.message);
    else await load();
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="badge"><Star size={14} /> Avaliações</span>
            <h1>Avaliações manuais</h1>
            <p>Transcreva avaliações reais recebidas por WhatsApp, presencialmente ou de clientes antigos.</p>
          </div>
          <Link className="btn btn-secondary" href="/admin">Voltar admin</Link>
        </div>

        {message && <div className="notice" style={{ marginBottom: 14 }}>{message}</div>}

        <form className="card form" onSubmit={salvar} style={{ marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>Nova avaliação</h2>

          <label className="field">
            <span className="label">Buscar lojinha</span>
            <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite nome da lojinha, responsável, e-mail ou WhatsApp" />
          </label>

          <div className="card" style={{ background: '#f8faf4', padding: 12 }}>
            {vitrineSelecionada && <div className="notice notice-success" style={{ marginBottom: 10 }}>Selecionada: <strong>{vitrineSelecionada.nome_vitrine}</strong></div>}
            <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {vitrinesFiltradas.map((vitrine) => (
                <button
                  className={vitrine.id === vitrineId ? 'btn btn-primary btn-full' : 'btn btn-secondary btn-full'}
                  key={vitrine.id}
                  type="button"
                  onClick={() => { setVitrineId(vitrine.id); setBusca(`${vitrine.nome_vitrine} • ${vitrine.usuarios?.nome || ''}`); }}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <span>
                    <strong>{vitrine.nome_vitrine}</strong><br />
                    {vitrine.usuarios?.nome || 'Responsável não informado'} • {vitrine.cidade || 'Cidade'}-{vitrine.estado || 'UF'}
                  </span>
                </button>
              ))}
              {!vitrinesFiltradas.length && <p className="muted" style={{ margin: 0 }}>Nenhuma lojinha encontrada.</p>}
            </div>
          </div>

          <div className="form-row">
            <label className="field"><span className="label">Nome do cliente *</span><input className="input" value={nomeAvaliador} onChange={(e) => setNomeAvaliador(e.target.value)} placeholder="Ex: João Silva" /></label>
            <label className="field"><span className="label">Nota *</span><select className="select" value={nota} onChange={(e) => setNota(Number(e.target.value))}>{[5,4,3,2,1].map((item) => <option key={item} value={item}>{item} estrela(s)</option>)}</select></label>
          </div>

          <div className="form-row">
            <label className="field"><span className="label">Origem</span><select className="select" value={origem} onChange={(e) => setOrigem(e.target.value)}><option>WhatsApp</option><option>Presencial</option><option>Cliente antigo</option><option>Instagram</option><option>Outro</option></select></label>
            <label className="field"><span className="label">Data</span><input className="input" type="date" value={dataAvaliacao} onChange={(e) => setDataAvaliacao(e.target.value)} /></label>
          </div>

          <label className="field"><span className="label">Comentário recebido *</span><textarea className="textarea" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Cole ou transcreva aqui a avaliação recebida." /></label>

          <button className="btn btn-primary" disabled={saving} type="submit">{saving ? 'Salvando...' : 'Salvar avaliação'}</button>
        </form>

        <div className="grid grid-2">
          {avaliacoes.map((avaliacao) => (
            <article className="card" key={avaliacao.id}>
              <span className="badge">{avaliacao.status}</span>
              <h2 style={{ marginBottom: 6 }}>{avaliacao.vitrines?.nome_vitrine || 'Lojinha'}</h2>
              <p className="muted" style={{ marginTop: 0 }}>{avaliacao.nome_avaliador} • {avaliacao.nota} estrela(s) • {avaliacao.origem || 'Origem não informada'} • {dataBR(avaliacao.data_avaliacao)}</p>
              <p style={{ whiteSpace: 'pre-wrap' }}>{avaliacao.comentario}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => atualizarStatus(avaliacao.id, avaliacao.status === 'aprovada' ? 'oculta' : 'aprovada')}>{avaliacao.status === 'aprovada' ? 'Ocultar' : 'Publicar'}</button>
                <button className="btn btn-danger" onClick={() => excluir(avaliacao.id)}><Trash2 size={16} /> Excluir</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function AdminAvaliacoesPage() {
  return <AuthGuard adminOnly><AdminAvaliacoesContent /></AuthGuard>;
}
