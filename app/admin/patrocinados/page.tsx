'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Megaphone, Save, Trash2, XCircle } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { uploadPatrocinadoImagem } from '@/lib/upload';
import type { PatrocinadoHome } from '@/types';

type FormState = {
  id?: string;
  titulo: string;
  subtitulo: string;
  imagem_url: string;
  link_url: string;
  nome_anunciante: string;
  whatsapp_anunciante: string;
  cidade: string;
  estado: string;
  ordem: number;
  ativo: boolean;
  status: string;
  inicio_em: string;
  fim_em: string;
};

const vazio: FormState = {
  titulo: '',
  subtitulo: '',
  imagem_url: '',
  link_url: '',
  nome_anunciante: '',
  whatsapp_anunciante: '',
  cidade: '',
  estado: 'TO',
  ordem: 0,
  ativo: true,
  status: 'aprovado',
  inicio_em: '',
  fim_em: ''
};

function toForm(item: PatrocinadoHome): FormState {
  return {
    id: item.id,
    titulo: item.titulo || '',
    subtitulo: item.subtitulo || '',
    imagem_url: item.imagem_url || '',
    link_url: item.link_url || '',
    nome_anunciante: item.nome_anunciante || '',
    whatsapp_anunciante: item.whatsapp_anunciante || '',
    cidade: item.cidade || '',
    estado: item.estado || 'TO',
    ordem: item.ordem || 0,
    ativo: item.ativo,
    status: item.status || 'aprovado',
    inicio_em: item.inicio_em || '',
    fim_em: item.fim_em || ''
  };
}

function statusLabel(item: PatrocinadoHome) {
  if (item.status === 'pendente') return 'Pendente de aprovação';
  if (item.status === 'recusado') return 'Recusado';
  if (!item.ativo) return 'Pausado';
  return 'Aprovado/ativo';
}

function AdminPatrocinadosContent() {
  const [itens, setItens] = useState<PatrocinadoHome[]>([]);
  const [form, setForm] = useState<FormState>(vazio);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pendentes = useMemo(() => itens.filter((item) => item.status === 'pendente').length, [itens]);
  const ativos = useMemo(() => itens.filter((item) => item.status === 'aprovado' && item.ativo).length, [itens]);
  const totalViews = useMemo(() => itens.reduce((acc, item) => acc + (item.visualizacoes || 0), 0), [itens]);
  const totalCliques = useMemo(() => itens.reduce((acc, item) => acc + (item.cliques || 0), 0), [itens]);

  async function load() {
    const { data } = await supabase
      .from('patrocinados_home')
      .select('*, usuarios!patrocinados_home_usuario_id_fkey(nome, email, whatsapp), vitrines!patrocinados_home_vitrine_id_fkey(nome_vitrine, slug)')
      .order('status')
      .order('ordem')
      .order('created_at', { ascending: false });
    setItens((data || []) as PatrocinadoHome[]);
  }

  useEffect(() => { load(); }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function selecionarImagem(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const idBase = form.id || `novo-${Date.now()}`;
      const url = await uploadPatrocinadoImagem(file, idBase);
      set('imagem_url', url);
      setMessage('Imagem enviada. Agora salve o patrocinado.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao enviar imagem.');
    }

    setUploading(false);
    e.target.value = '';
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      titulo: form.titulo.trim(),
      subtitulo: form.subtitulo.trim() || null,
      imagem_url: form.imagem_url.trim(),
      link_url: form.link_url.trim() || null,
      nome_anunciante: form.nome_anunciante.trim() || null,
      whatsapp_anunciante: form.whatsapp_anunciante.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim() || null,
      ordem: Number(form.ordem) || 0,
      ativo: form.ativo,
      status: form.status || 'aprovado',
      inicio_em: form.inicio_em || null,
      fim_em: form.fim_em || null,
      updated_at: new Date().toISOString()
    };

    if (!payload.titulo || !payload.imagem_url) {
      setMessage('Informe pelo menos título e imagem do patrocinado.');
      setSaving(false);
      return;
    }

    const result = form.id
      ? await supabase.from('patrocinados_home').update(payload).eq('id', form.id)
      : await supabase.from('patrocinados_home').insert({ ...payload, status: 'aprovado', ativo: true });

    if (result.error) setMessage(result.error.message);
    else {
      setMessage(form.id ? 'Patrocinado atualizado.' : 'Patrocinado criado e aprovado.');
      setForm(vazio);
      await load();
    }

    setSaving(false);
  }

  async function aprovar(item: PatrocinadoHome) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('patrocinados_home').update({
      status: 'aprovado',
      ativo: true,
      motivo_recusa: null,
      admin_id: userData.user?.id || null,
      aprovado_em: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', item.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Banner aprovado e publicado na home.');
      await load();
    }
  }

  async function recusar(item: PatrocinadoHome) {
    const motivo = prompt('Motivo da recusa, opcional:') || null;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('patrocinados_home').update({
      status: 'recusado',
      ativo: false,
      motivo_recusa: motivo,
      admin_id: userData.user?.id || null,
      updated_at: new Date().toISOString()
    }).eq('id', item.id);

    if (error) setMessage(error.message);
    else {
      setMessage('Banner recusado.');
      await load();
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este patrocinado?')) return;
    const { error } = await supabase.from('patrocinados_home').delete().eq('id', id);
    if (error) setMessage(error.message);
    else {
      setMessage('Patrocinado excluído.');
      if (form.id === id) setForm(vazio);
      await load();
    }
  }

  async function alternar(item: PatrocinadoHome) {
    const { error } = await supabase.from('patrocinados_home').update({ ativo: !item.ativo, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) setMessage(error.message);
    else await load();
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="badge"><Megaphone size={14} /> Espaço patrocinado</span>
            <h1>Patrocinados da Home</h1>
            <p>Cadastre banners e aprove solicitações feitas pelos assinantes de vitrine.</p>
          </div>
          <Link className="btn btn-secondary" href="/admin">Voltar admin</Link>
        </div>

        {message && <div className="notice" style={{ marginBottom: 14 }}>{message}</div>}

        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <div className="mini-card"><strong>{itens.length}</strong><br /><span className="muted">banners</span></div>
          <div className="mini-card"><strong>{ativos}</strong><br /><span className="muted">ativos</span></div>
          <div className="mini-card"><strong>{pendentes}</strong><br /><span className="muted">pendentes</span></div>
          <div className="mini-card"><strong>{totalViews.toLocaleString('pt-BR')}</strong><br /><span className="muted">visualizações</span></div>
          <div className="mini-card"><strong>{totalCliques.toLocaleString('pt-BR')}</strong><br /><span className="muted">cliques</span></div>
        </div>

        <div className="grid grid-2">
          <form className="card form" onSubmit={salvar}>
            <h2>{form.id ? 'Editar patrocinado' : 'Novo patrocinado'}</h2>
            <label className="field"><span className="label">Título *</span><input className="input" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex: Ração em promoção" /></label>
            <label className="field"><span className="label">Subtítulo</span><textarea className="textarea" value={form.subtitulo} onChange={(e) => set('subtitulo', e.target.value)} placeholder="Texto curto para controle interno e página Ver todos." /></label>
            <div className="form-row">
              <label className="field"><span className="label">Nome do anunciante</span><input className="input" value={form.nome_anunciante} onChange={(e) => set('nome_anunciante', e.target.value)} placeholder="Ex: Agropecuária X" /></label>
              <label className="field"><span className="label">WhatsApp do anunciante</span><input className="input" value={form.whatsapp_anunciante} onChange={(e) => set('whatsapp_anunciante', e.target.value)} placeholder="5563999999999" /></label>
            </div>
            <label className="field"><span className="label">Link alternativo</span><input className="input" value={form.link_url} onChange={(e) => set('link_url', e.target.value)} placeholder="Opcional. Se tiver WhatsApp, o clique abre o WhatsApp." /></label>
            <div className="form-row">
              <label className="field"><span className="label">Cidade</span><input className="input" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Palmas" /></label>
              <label className="field"><span className="label">Estado</span><input className="input" value={form.estado} onChange={(e) => set('estado', e.target.value.toUpperCase())} maxLength={2} /></label>
            </div>
            <div className="form-row">
              <label className="field"><span className="label">Início</span><input className="input" type="date" value={form.inicio_em} onChange={(e) => set('inicio_em', e.target.value)} /></label>
              <label className="field"><span className="label">Fim</span><input className="input" type="date" value={form.fim_em} onChange={(e) => set('fim_em', e.target.value)} /></label>
            </div>
            <div className="form-row">
              <label className="field"><span className="label">Ordem</span><input className="input" inputMode="numeric" value={form.ordem} onChange={(e) => set('ordem', Number(e.target.value) || 0)} /></label>
              <label className="field"><span className="label">Status</span><select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}><option value="aprovado">Aprovado</option><option value="pendente">Pendente</option><option value="recusado">Recusado</option></select></label>
            </div>
            <label className="checkbox-row"><input type="checkbox" checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)} /> Banner ativo na home</label>
            <div className="card" style={{ background: '#f8faf4' }}>
              <span className="label">Imagem do banner *</span>
              <p className="muted">Recomendado: 1080 x 520 px ou 16:9. A home mostra a imagem limpa, sem textos por cima.</p>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selecionarImagem} />
              <label className="field" style={{ marginTop: 12 }}><span className="label">Ou cole URL da imagem</span><input className="input" value={form.imagem_url} onChange={(e) => set('imagem_url', e.target.value)} placeholder="https://..." /></label>
              {form.imagem_url && <img src={form.imagem_url} alt="Prévia" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 18, marginTop: 12 }} />}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <button className="btn btn-primary btn-full" type="submit" disabled={saving || uploading}><Save size={18} /> {saving ? 'Salvando...' : uploading ? 'Enviando imagem...' : 'Salvar patrocinado'}</button>
              {form.id && <button className="btn btn-secondary btn-full" type="button" onClick={() => setForm(vazio)}>Novo patrocinado</button>}
            </div>
          </form>

          <section className="card">
            <h2>Banners cadastrados</h2>
            {!itens.length ? <EmptyState title="Nenhum patrocinado cadastrado" description="Cadastre o primeiro banner para aparecer na home." /> : (
              <div style={{ display: 'grid', gap: 12 }}>
                {itens.map((item) => (
                  <article className="card" key={item.id} style={{ padding: 0, overflow: 'hidden', border: item.status === 'pendente' ? '2px solid rgba(202, 138, 4, .45)' : undefined }}>
                    <img src={item.imagem_url} alt={item.titulo} style={{ width: '100%', height: 130, objectFit: 'cover' }} />
                    <div style={{ padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <strong>{item.titulo}</strong>
                        <span className="badge">{statusLabel(item)}</span>
                      </div>
                      <p className="muted">{item.nome_anunciante || item.vitrines?.nome_vitrine || 'Sem anunciante'} • Ordem {item.ordem}</p>
                      {item.usuarios && <p className="muted">Solicitante: {item.usuarios.nome} • {item.usuarios.email}</p>}
                      {item.vitrines && <p className="muted">Vitrine: {item.vitrines.nome_vitrine}</p>}
                      <p className="muted">{item.visualizacoes || 0} views • {item.cliques || 0} cliques</p>
                      {item.motivo_recusa && <div className="notice">Recusa: {item.motivo_recusa}</div>}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {item.status === 'pendente' && <button className="btn btn-primary" type="button" onClick={() => aprovar(item)}><CheckCircle2 size={16} /> Aprovar</button>}
                        {item.status === 'pendente' && <button className="btn btn-danger" type="button" onClick={() => recusar(item)}><XCircle size={16} /> Recusar</button>}
                        <button className="btn btn-secondary" type="button" onClick={() => setForm(toForm(item))}>Editar</button>
                        {item.status === 'aprovado' && <button className="btn btn-secondary" type="button" onClick={() => alternar(item)}>{item.ativo ? 'Pausar' : 'Ativar'}</button>}
                        <button className="btn btn-danger" type="button" onClick={() => excluir(item.id)}><Trash2 size={16} /> Excluir</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AdminPatrocinadosPage() {
  return <AuthGuard adminOnly><AdminPatrocinadosContent /></AuthGuard>;
}
