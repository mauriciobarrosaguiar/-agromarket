'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Save, Settings, Sparkles, MessageCircle, Eye } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';

type HomeConfig = {
  badge: string;
  titulo: string;
  subtitulo: string;
  placeholder_busca: string;
  botao_anunciar: string;
  botao_perto: string;
  botao_vitrines: string;
};

type SuporteConfig = {
  whatsapp: string;
  mensagem: string;
};

const HOME_PADRAO: HomeConfig = {
  badge: 'Anuncie Grátis',
  titulo: 'Compre e venda no agro perto de você.',
  subtitulo: 'Produtos rurais, animais, máquinas, serviços e oportunidades em um só lugar, com negociação direta pelo WhatsApp.',
  placeholder_busca: 'Buscar leitão, ovos férteis, ração...',
  botao_anunciar: 'Quero anunciar',
  botao_perto: 'Ver perto de mim',
  botao_vitrines: 'Ver lojinhas'
};

const SUPORTE_PADRAO: SuporteConfig = {
  whatsapp: '5535988377599',
  mensagem: 'Olá, preciso de suporte no AgroMarket.'
};

function ConfiguracoesContent() {
  const [home, setHome] = useState<HomeConfig>(HOME_PADRAO);
  const [suporte, setSuporte] = useState<SuporteConfig>(SUPORTE_PADRAO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('site_configuracoes').select('*').in('chave', ['home', 'suporte']);
      const homeDb = data?.find((item) => item.chave === 'home')?.valor as Partial<HomeConfig> | undefined;
      const suporteDb = data?.find((item) => item.chave === 'suporte')?.valor as Partial<SuporteConfig> | undefined;

      setHome({ ...HOME_PADRAO, ...(homeDb || {}) });
      setSuporte({ ...SUPORTE_PADRAO, ...(suporteDb || {}) });
      setLoading(false);
    }

    load();
  }, []);

  function setHomeField<K extends keyof HomeConfig>(key: K, value: HomeConfig[K]) {
    setHome((prev) => ({ ...prev, [key]: value }));
  }

  function setSuporteField<K extends keyof SuporteConfig>(key: K, value: SuporteConfig[K]) {
    setSuporte((prev) => ({ ...prev, [key]: value }));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    const updatedBy = userData.user?.id || null;

    const { error } = await supabase.from('site_configuracoes').upsert([
      { chave: 'home', valor: home, descricao: 'Textos principais da página inicial', updated_by: updatedBy, updated_at: new Date().toISOString() },
      { chave: 'suporte', valor: suporte, descricao: 'Contato oficial de suporte', updated_by: updatedBy, updated_at: new Date().toISOString() }
    ]);

    if (error) {
      setMessage(error.message);
      setMessageType('error');
    } else {
      setMessage('Configurações salvas. A página inicial e o botão de suporte já podem usar os novos dados.');
      setMessageType('success');
    }

    setSaving(false);
  }

  if (loading) return <div className="card">Carregando configurações...</div>;

  return (
    <form className="grid grid-2" onSubmit={salvar}>
      <section className="card form">
        {message && <div className={`notice notice-${messageType} action-feedback`}>{message}</div>}

        <span className="badge"><Settings size={14} /> Área do administrador</span>
        <h2>Editar informações do sistema</h2>
        <p className="muted">Use esta tela para alterar os textos principais sem mexer no código. Somente administradores conseguem acessar e salvar.</p>

        <div className="card" style={{ background: '#f8faf4' }}>
          <span className="badge"><Sparkles size={14} /> Página inicial</span>
          <div className="form" style={{ marginTop: 12 }}>
            <label className="field">
              <span className="label">Selo do card verde</span>
              <input className="input" value={home.badge} onChange={(e) => setHomeField('badge', e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Título principal</span>
              <input className="input" value={home.titulo} onChange={(e) => setHomeField('titulo', e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Subtítulo</span>
              <textarea className="textarea" value={home.subtitulo} onChange={(e) => setHomeField('subtitulo', e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Texto dentro da busca</span>
              <input className="input" value={home.placeholder_busca} onChange={(e) => setHomeField('placeholder_busca', e.target.value)} />
            </label>
            <div className="form-row">
              <label className="field">
                <span className="label">Botão anunciar</span>
                <input className="input" value={home.botao_anunciar} onChange={(e) => setHomeField('botao_anunciar', e.target.value)} />
              </label>
              <label className="field">
                <span className="label">Botão busca</span>
                <input className="input" value={home.botao_perto} onChange={(e) => setHomeField('botao_perto', e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span className="label">Botão vitrines</span>
              <input className="input" value={home.botao_vitrines} onChange={(e) => setHomeField('botao_vitrines', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="card" style={{ background: '#f8faf4' }}>
          <span className="badge"><MessageCircle size={14} /> Suporte</span>
          <div className="form" style={{ marginTop: 12 }}>
            <label className="field">
              <span className="label">WhatsApp de suporte</span>
              <input className="input" value={suporte.whatsapp} onChange={(e) => setSuporteField('whatsapp', e.target.value)} placeholder="5535988377599" />
            </label>
            <label className="field">
              <span className="label">Mensagem automática</span>
              <textarea className="textarea" value={suporte.mensagem} onChange={(e) => setSuporteField('mensagem', e.target.value)} />
            </label>
          </div>
        </div>

        <button className="btn btn-primary btn-full" disabled={saving} aria-busy={saving}>
          <Save size={18} /> {saving ? 'Salvando...' : 'Salvar informações'}
        </button>
      </section>

      <aside className="card">
        <span className="badge"><Eye size={14} /> Prévia</span>
        <h2>Como ficará na home</h2>
        <p className="muted">Esta prévia segue o mesmo visual do sistema para você conferir antes de salvar.</p>

        <div className="hero-card" style={{ padding: 22, borderRadius: 24, marginTop: 14 }}>
          <span className="badge"><Sparkles size={15} /> {home.badge}</span>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.02, letterSpacing: '-0.05em', margin: '10px 0' }}>{home.titulo}</h1>
          <p style={{ color: 'rgba(255,255,255,.86)', fontSize: 17, lineHeight: 1.28 }}>{home.subtitulo}</p>
          <div style={{ background: '#fff', color: '#66715d', borderRadius: 16, padding: '14px 16px', marginTop: 14 }}>{home.placeholder_busca}</div>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <span className="btn btn-primary"><Sparkles size={16} /> {home.botao_anunciar}</span>
            <span className="btn btn-secondary">{home.botao_perto}</span>
            <span className="btn btn-secondary">{home.botao_vitrines}</span>
          </div>
        </div>

        <div className="card" style={{ background: '#f8faf4', marginTop: 16 }}>
          <strong>Suporte</strong>
          <p className="muted" style={{ marginBottom: 8 }}>Botão fixo abrirá:</p>
          <p style={{ margin: 0, fontWeight: 900 }}>WhatsApp: {suporte.whatsapp}</p>
          <p className="muted">Mensagem: {suporte.mensagem}</p>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          <Link className="btn btn-secondary btn-full" href="/">Ver página inicial</Link>
          <Link className="btn btn-secondary btn-full" href="/admin">Voltar ao admin</Link>
        </div>
      </aside>
    </form>
  );
}

export default function AdminConfiguracoesPage() {
  return (
    <AuthGuard adminOnly>
      <main className="page">
        <div className="container">
          <div className="section-head">
            <div>
              <h1>Configurações do sistema</h1>
              <p>Altere textos e informações públicas do AgroMarket.</p>
            </div>
          </div>
          <ConfiguracoesContent />
        </div>
      </main>
    </AuthGuard>
  );
}
