'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BadgeDollarSign, Megaphone, Send, ShieldCheck } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { uploadPatrocinadoImagem } from '@/lib/upload';
import type { PatrocinadoHome, Usuario, Vitrine } from '@/types';

type FormState = {
  titulo: string;
  subtitulo: string;
  imagem_url: string;
  whatsapp_anunciante: string;
  link_url: string;
  inicio_em: string;
  fim_em: string;
};

const vazio: FormState = {
  titulo: '',
  subtitulo: '',
  imagem_url: '',
  whatsapp_anunciante: '',
  link_url: '',
  inicio_em: '',
  fim_em: ''
};

function vitrineLiberada(vitrine: Vitrine | null) {
  if (!vitrine?.vitrine_ativa) return false;
  const hoje = new Date().toISOString().slice(0, 10);

  if (vitrine.assinatura_status === 'ativa') {
    return !vitrine.assinatura_vencimento || vitrine.assinatura_vencimento >= hoje;
  }

  if (vitrine.assinatura_status === 'gratis_lancamento') {
    const vencimento = vitrine.gratis_ate || vitrine.assinatura_vencimento;
    return !vencimento || vencimento >= hoje;
  }

  return false;
}

function statusLabel(status?: string | null) {
  if (status === 'pendente_pagamento') return 'Aguardando pagamento';
  if (status === 'pendente') return 'Pagamento confirmado, aguardando aprovação';
  if (status === 'aprovado') return 'Aprovado e publicado';
  if (status === 'recusado') return 'Recusado';
  return 'Em análise';
}

function dataBR(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function PainelPatrocinadoContent() {
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<PatrocinadoHome[]>([]);
  const [form, setForm] = useState<FormState>(vazio);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const podeSolicitar = useMemo(() => vitrineLiberada(vitrine), [vitrine]);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const [{ data: perfilData }, { data: vitrineData }] = await Promise.all([
      supabase.from('usuarios').select('*').eq('id', userData.user.id).maybeSingle(),
      supabase.from('vitrines').select('*').eq('usuario_id', userData.user.id).maybeSingle()
    ]);

    const usuario = perfilData as Usuario | null;
    const loja = vitrineData as Vitrine | null;
    setPerfil(usuario);
    setVitrine(loja);

    if (loja) {
      setForm((prev) => ({
        ...prev,
        titulo: prev.titulo || loja.nome_vitrine,
        subtitulo: prev.subtitulo || loja.descricao || '',
        whatsapp_anunciante: prev.whatsapp_anunciante || loja.whatsapp || usuario?.whatsapp || '',
        link_url: prev.link_url || `/vendedor/${loja.slug}`
      }));

      const { data: banners } = await supabase
        .from('patrocinados_home')
        .select('*')
        .eq('usuario_id', userData.user.id)
        .order('created_at', { ascending: false });
      setSolicitacoes((banners || []) as PatrocinadoHome[]);
    }

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function selecionarImagem(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vitrine) return;

    setUploading(true);
    setMessage(null);

    try {
      const url = await uploadPatrocinadoImagem(file, vitrine.id);
      set('imagem_url', url);
      setMessage('Imagem enviada. Agora envie a solicitação e conclua o pagamento.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao enviar imagem.');
    }

    setUploading(false);
    e.target.value = '';
  }

  async function solicitar(e: FormEvent) {
    e.preventDefault();
    if (!perfil || !vitrine) return;

    if (!podeSolicitar) {
      setMessage('Para contratar banner patrocinado, sua lojinha precisa estar ativa ou liberada pelo administrador.');
      return;
    }

    if (!form.titulo.trim() || !form.imagem_url.trim() || !form.whatsapp_anunciante.trim()) {
      setMessage('Informe título, imagem do banner e WhatsApp.');
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from('patrocinados_home').insert({
      usuario_id: perfil.id,
      vitrine_id: vitrine.id,
      titulo: form.titulo.trim(),
      subtitulo: form.subtitulo.trim() || null,
      imagem_url: form.imagem_url.trim(),
      link_url: form.link_url.trim() || `/vendedor/${vitrine.slug}`,
      nome_anunciante: vitrine.nome_vitrine,
      whatsapp_anunciante: form.whatsapp_anunciante.trim(),
      cidade: vitrine.cidade || perfil.cidade || null,
      estado: vitrine.estado || perfil.estado || null,
      ordem: 0,
      ativo: false,
      status: 'pendente_pagamento',
      inicio_em: form.inicio_em || null,
      fim_em: form.fim_em || null
    });

    if (error) setMessage(error.message);
    else {
      setMessage('Solicitação enviada. Após a confirmação do pagamento, o banner será aprovado/liberado para aparecer na home.');
      setForm({ ...vazio, titulo: vitrine.nome_vitrine, subtitulo: vitrine.descricao || '', whatsapp_anunciante: vitrine.whatsapp || perfil.whatsapp || '', link_url: `/vendedor/${vitrine.slug}` });
      await load();
    }

    setSaving(false);
  }

  if (loading) return <div className="card">Carregando...</div>;

  if (!vitrine) {
    return (
      <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
        <EmptyState title="Você ainda não tem lojinha" description="Para contratar banner patrocinado, primeiro crie sua lojinha/vitrine." />
        <Link className="btn btn-primary btn-full" href="/painel/vitrine">Criar lojinha</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-2">
      <form className="card form" onSubmit={solicitar}>
        {message && <div className="notice">{message}</div>}

        <div className="card" style={{ background: podeSolicitar ? '#f0fdf4' : '#fff7ed', border: podeSolicitar ? '1px solid #bbf7d0' : '1px solid #fed7aa' }}>
          <span className="badge">{podeSolicitar ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />} Requisito</span>
          <h2 style={{ marginBottom: 6 }}>{podeSolicitar ? 'Lojinha liberada' : 'Lojinha ainda não liberada'}</h2>
          <p className="muted">Somente assinantes de vitrine ou lojinhas liberadas pelo administrador podem solicitar banner patrocinado.</p>
          {!podeSolicitar && <Link className="btn btn-primary btn-full" href="/painel/vitrine">Gerenciar mensalidade da lojinha</Link>}
        </div>

        <div className="notice">
          <strong>Fluxo:</strong> você envia a arte, conclui o pagamento pelo gateway configurado e o banner entra para liberação. Depois de aprovado, ele aparece no carrossel da página inicial.
        </div>

        <label className="field">
          <span className="label">Título do patrocinado *</span>
          <input className="input" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex: Ovos férteis disponíveis" />
        </label>

        <label className="field">
          <span className="label">Descrição curta</span>
          <textarea className="textarea" value={form.subtitulo} onChange={(e) => set('subtitulo', e.target.value)} placeholder="Resumo da oferta para aparecer em Ver todos." />
        </label>

        <label className="field">
          <span className="label">WhatsApp que receberá os interessados *</span>
          <input className="input" value={form.whatsapp_anunciante} onChange={(e) => set('whatsapp_anunciante', e.target.value)} placeholder="5563999999999" />
        </label>

        <label className="field">
          <span className="label">Link alternativo</span>
          <input className="input" value={form.link_url} onChange={(e) => set('link_url', e.target.value)} placeholder={`/vendedor/${vitrine.slug}`} />
          <span className="muted">Na home, o clique abre o WhatsApp cadastrado. O link fica como alternativa.</span>
        </label>

        <div className="form-row">
          <label className="field">
            <span className="label">Data inicial desejada</span>
            <input className="input" type="date" value={form.inicio_em} onChange={(e) => set('inicio_em', e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Data final desejada</span>
            <input className="input" type="date" value={form.fim_em} onChange={(e) => set('fim_em', e.target.value)} />
          </label>
        </div>

        <div className="card" style={{ background: '#f8faf4' }}>
          <span className="label">Imagem do banner *</span>
          <p className="muted">Crie uma arte pronta, pois a home mostra somente a imagem limpa. Recomendado: 1080 x 520 px ou 16:9.</p>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selecionarImagem} />
          <label className="field" style={{ marginTop: 12 }}>
            <span className="label">Ou cole URL da imagem</span>
            <input className="input" value={form.imagem_url} onChange={(e) => set('imagem_url', e.target.value)} placeholder="https://..." />
          </label>
          {form.imagem_url && <img src={form.imagem_url} alt="Prévia" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 18, marginTop: 12 }} />}
        </div>

        <button className="btn btn-primary btn-full" type="submit" disabled={saving || uploading || !podeSolicitar}>
          <BadgeDollarSign size={18} /> {saving ? 'Enviando...' : uploading ? 'Enviando imagem...' : 'Solicitar banner e pagamento'}
        </button>
      </form>

      <aside className="card">
        <h2>Minhas solicitações</h2>
        {!solicitacoes.length ? <EmptyState title="Nenhum banner solicitado" description="Quando você solicitar um banner, o status aparecerá aqui." /> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {solicitacoes.map((item) => (
              <article className="card" key={item.id} style={{ padding: 0, overflow: 'hidden' }}>
                <img src={item.imagem_url} alt={item.titulo} style={{ width: '100%', height: 130, objectFit: 'cover' }} />
                <div style={{ padding: 12 }}>
                  <strong>{item.titulo}</strong>
                  <p className="muted">Status: {statusLabel(item.status)}</p>
                  <p className="muted">Período: {dataBR(item.inicio_em)} até {dataBR(item.fim_em)}</p>
                  {item.motivo_recusa && <div className="notice">Recusa: {item.motivo_recusa}</div>}
                </div>
              </article>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

export default function PainelPatrocinadoPage() {
  return (
    <AuthGuard>
      <main className="page">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="badge"><Megaphone size={14} /> Patrocinado</span>
              <h1>Contratar banner patrocinado</h1>
              <p>Assinantes de vitrine podem solicitar banner para aparecer na página inicial. Ele só fica público após pagamento confirmado e liberação.</p>
            </div>
            <Link className="btn btn-secondary" href="/painel/vitrine">Voltar à vitrine</Link>
          </div>
          <PainelPatrocinadoContent />
        </div>
      </main>
    </AuthGuard>
  );
}
