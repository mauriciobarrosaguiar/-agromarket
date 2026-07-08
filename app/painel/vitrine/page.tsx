'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ImagePlus, Lock, Send, Store } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slug';
import { uploadVitrineImagem } from '@/lib/upload';
import type { Usuario, Vitrine } from '@/types';

const POSICOES = [
  { value: 'center', label: 'Centro' },
  { value: 'top', label: 'Topo' },
  { value: 'bottom', label: 'Baixo' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' }
];

function MinhaVitrineContent() {
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: perfilData } = await supabase.from('usuarios').select('*').eq('id', userData.user.id).single();
      const usuario = perfilData as Usuario;
      setPerfil(usuario);

      const { data: vitrineData } = await supabase.from('vitrines').select('*').eq('usuario_id', userData.user.id).maybeSingle();
      setVitrine((vitrineData || null) as Vitrine | null);
      setLoading(false);
    }

    load();
  }, []);

  function update<K extends keyof Vitrine>(key: K, value: Vitrine[K]) {
    setVitrine((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function solicitarVitrine() {
    if (!perfil) return;

    setSaving(true);
    setMessage(null);

    const baseSlug = `${slugify(perfil.nome || 'vendedor')}-${perfil.id.slice(0, 6)}`;
    const nova = {
      usuario_id: perfil.id,
      nome_vitrine: perfil.nome || 'Minha vitrine',
      slug: baseSlug,
      descricao: 'Vitrine de produtos e serviços no AgroMarket.',
      cidade: perfil.cidade || '',
      estado: perfil.estado || 'TO',
      whatsapp: perfil.whatsapp || '',
      vitrine_ativa: false,
      plano: 'aguardando_aprovacao',
      gratis_ate: null,
      logo_object_fit: 'cover',
      logo_object_position: 'center',
      banner_object_position: 'center'
    };

    const { data, error } = await supabase.from('vitrines').insert(nova).select('*').single();

    if (error) setMessage(error.message);
    else {
      setVitrine(data as Vitrine);
      setMessage('Solicitação de vitrine enviada. Você já pode preparar a lojinha, mas ela só fica pública após autorização do admin.');
    }

    setSaving(false);
  }

  async function selecionarImagem(e: ChangeEvent<HTMLInputElement>, tipo: 'logo' | 'banner') {
    const file = e.target.files?.[0];
    if (!file || !vitrine) return;

    setUploading(tipo);
    setMessage(null);

    try {
      const url = await uploadVitrineImagem(file, vitrine.usuario_id, tipo);
      const campo = tipo === 'logo' ? 'foto_url' : 'banner_url';
      const { data, error } = await supabase
        .from('vitrines')
        .update({ [campo]: url, updated_at: new Date().toISOString() })
        .eq('id', vitrine.id)
        .select('*')
        .single();

      if (error) throw error;
      setVitrine(data as Vitrine);
      setMessage(tipo === 'logo' ? 'Logo atualizada.' : 'Banner atualizado.');
    } catch (err) {
      const texto = err instanceof Error ? err.message : 'Erro ao enviar imagem.';
      setMessage(texto);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!vitrine) return;

    setSaving(true);
    setMessage(null);

    const slugBase = slugify(vitrine.slug || vitrine.nome_vitrine);
    const payload = {
      nome_vitrine: vitrine.nome_vitrine,
      slug: slugBase,
      descricao: vitrine.descricao,
      foto_url: vitrine.foto_url || null,
      banner_url: vitrine.banner_url || null,
      logo_object_fit: vitrine.logo_object_fit || 'cover',
      logo_object_position: vitrine.logo_object_position || 'center',
      banner_object_position: vitrine.banner_object_position || 'center',
      cidade: vitrine.cidade,
      estado: vitrine.estado,
      whatsapp: vitrine.whatsapp,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('vitrines').update(payload).eq('id', vitrine.id).select('*').single();

    if (error) setMessage(error.message);
    else {
      setVitrine(data as Vitrine);
      setMessage(vitrine.vitrine_ativa ? 'Vitrine salva.' : 'Vitrine salva. Ela continua aguardando autorização do admin para ficar pública.');
    }

    setSaving(false);
  }

  if (loading) return <div className="card">Carregando sua vitrine...</div>;

  if (!vitrine) {
    return (
      <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
        {message && <div className="notice">{message}</div>}
        <span className="badge"><Lock size={14} /> Vitrine com autorização</span>
        <h2>Sua lojinha ainda não está liberada</h2>
        <p className="muted">Para evitar lojas falsas, a vitrine só é criada quando você solicita e o administrador autoriza. Você pode anunciar normalmente mesmo sem vitrine.</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="btn btn-primary btn-full" type="button" onClick={solicitarVitrine} disabled={saving}>
            <Send size={18} /> {saving ? 'Enviando solicitação...' : 'Solicitar liberação da vitrine'}
          </button>
          <Link className="btn btn-secondary btn-full" href="/anunciar">Anunciar sem vitrine</Link>
          <Link className="btn btn-secondary btn-full" href="/painel/perfil">Voltar ao perfil</Link>
        </div>
      </div>
    );
  }

  const linkPublico = `/vendedor/${vitrine.slug}`;
  const logoFit = vitrine.logo_object_fit || 'cover';
  const logoPosition = vitrine.logo_object_position || 'center';
  const bannerPosition = vitrine.banner_object_position || 'center';
  const aguardandoAutorizacao = !vitrine.vitrine_ativa;

  return (
    <div className="grid grid-2">
      <form className="form card" onSubmit={salvar}>
        {message && <div className="notice">{message}</div>}
        {aguardandoAutorizacao && (
          <div className="notice">
            Sua vitrine foi solicitada e está aguardando autorização. Você pode preparar a lojinha, mas ela só ficará pública depois da liberação do administrador.
          </div>
        )}

        <div className="card" style={{ background: '#f8faf4' }}>
          <h3 style={{ marginTop: 0 }}>Imagens da vitrine</h3>
          <p className="muted">Logo recomendada: quadrada, 600 x 600 px. Banner recomendado: horizontal, 1200 x 500 px.</p>

          <div className="form-row">
            <div className="field">
              <span className="label">Logo da vitrine</span>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => selecionarImagem(e, 'logo')} />
              <button className="btn btn-secondary btn-full" type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading !== null}>
                <ImagePlus size={18} /> {uploading === 'logo' ? 'Enviando logo...' : 'Selecionar logo'}
              </button>
              <div style={{ width: 118, height: 118, borderRadius: 28, background: '#eaf3e3', display: 'grid', placeItems: 'center', overflow: 'hidden', color: '#14532d', border: '1px solid #dfe8d9' }}>
                {vitrine.foto_url ? <img src={vitrine.foto_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: logoFit as any, objectPosition: logoPosition }} /> : <Store size={32} />}
              </div>
            </div>

            <div className="field">
              <span className="label">Banner da vitrine</span>
              <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => selecionarImagem(e, 'banner')} />
              <button className="btn btn-secondary btn-full" type="button" onClick={() => bannerInputRef.current?.click()} disabled={uploading !== null}>
                <ImagePlus size={18} /> {uploading === 'banner' ? 'Enviando banner...' : 'Selecionar banner'}
              </button>
              <div style={{ height: 118, borderRadius: 22, background: vitrine.banner_url ? `url(${vitrine.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', border: '1px solid #dfe8d9' }} />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 14 }}>
            <label className="field">
              <span className="label">Ajuste da logo</span>
              <select className="select" value={logoFit} onChange={(e) => update('logo_object_fit', e.target.value as Vitrine['logo_object_fit'])}>
                <option value="cover">Preencher espaço</option>
                <option value="contain">Mostrar inteira</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Parte da logo</span>
              <select className="select" value={logoPosition} onChange={(e) => update('logo_object_position', e.target.value)}>
                {POSICOES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <label className="field" style={{ marginTop: 14 }}>
            <span className="label">Parte do banner</span>
            <select className="select" value={bannerPosition} onChange={(e) => update('banner_object_position', e.target.value)}>
              {POSICOES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="label">Nome da vitrine *</span>
          <input className="input" value={vitrine.nome_vitrine} onChange={(e) => update('nome_vitrine', e.target.value)} placeholder="Ex: Chácara Flor da Dona Mariquinha" />
        </label>

        <label className="field">
          <span className="label">Link personalizado *</span>
          <input className="input" value={vitrine.slug} onChange={(e) => update('slug', slugify(e.target.value))} placeholder="chacara-flor-da-dona-mariquinha" />
          <span className="muted">Seu link ficará assim: /vendedor/{vitrine.slug}</span>
        </label>

        <label className="field">
          <span className="label">Descrição</span>
          <textarea className="textarea" value={vitrine.descricao || ''} onChange={(e) => update('descricao', e.target.value)} placeholder="Conte o que você vende, onde atende e seus diferenciais." />
        </label>

        <div className="form-row">
          <label className="field">
            <span className="label">Cidade</span>
            <input className="input" value={vitrine.cidade || ''} onChange={(e) => update('cidade', e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Estado</span>
            <input className="input" value={vitrine.estado || ''} onChange={(e) => update('estado', e.target.value.toUpperCase())} maxLength={2} />
          </label>
        </div>

        <label className="field">
          <span className="label">WhatsApp da vitrine</span>
          <input className="input" value={vitrine.whatsapp || ''} onChange={(e) => update('whatsapp', e.target.value)} placeholder={perfil?.whatsapp || '5563999999999'} />
        </label>

        <details className="card" style={{ background: '#f8faf4' }}>
          <summary style={{ fontWeight: 900, cursor: 'pointer' }}>Avançado: usar imagem por URL</summary>
          <div className="form" style={{ marginTop: 12 }}>
            <label className="field">
              <span className="label">URL da logo</span>
              <input className="input" value={vitrine.foto_url || ''} onChange={(e) => update('foto_url', e.target.value)} placeholder="Opcional: cole o link de uma imagem" />
            </label>
            <label className="field">
              <span className="label">URL do banner</span>
              <input className="input" value={vitrine.banner_url || ''} onChange={(e) => update('banner_url', e.target.value)} placeholder="Opcional: cole o link de um banner" />
            </label>
          </div>
        </details>

        <button className="btn btn-primary btn-full" disabled={saving || uploading !== null}>{saving ? 'Salvando...' : 'Salvar vitrine'}</button>
      </form>

      <aside className="card">
        <h2>Prévia da lojinha</h2>
        <p className="muted">A vitrine é uma lojinha pública, mas só aparece para compradores depois da autorização do admin.</p>
        <div style={{ display: 'grid', gap: 8, margin: '14px 0' }}>
          <span className="badge">Plano: {vitrine.plano === 'gratis_lancamento' ? 'Grátis no lançamento' : vitrine.plano}</span>
          {vitrine.gratis_ate && <span className="badge">Grátis até: {new Date(vitrine.gratis_ate).toLocaleDateString('pt-BR')}</span>}
          <span className="badge">Status: {vitrine.vitrine_ativa ? 'Pública' : 'Aguardando autorização'}</span>
        </div>

        <div className="card" style={{ background: '#f8faf4', padding: 0, overflow: 'hidden' }}>
          <div style={{ minHeight: 120, background: vitrine.banner_url ? `url(${vitrine.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', padding: 14, display: 'flex', alignItems: 'end' }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: '#fff', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#14532d' }}>
              {vitrine.foto_url ? <img src={vitrine.foto_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: logoFit as any, objectPosition: logoPosition }} /> : <Store size={26} />}
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <strong>{vitrine.nome_vitrine}</strong>
            <p className="muted">{vitrine.cidade || 'Cidade'} - {vitrine.estado || 'UF'}</p>
            <p>{vitrine.descricao}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {vitrine.vitrine_ativa ? (
            <Link className="btn btn-primary btn-full" href={linkPublico}>Abrir lojinha pública</Link>
          ) : (
            <button className="btn btn-secondary btn-full" type="button" disabled>Disponível após autorização</button>
          )}
          <Link className="btn btn-secondary btn-full" href="/anunciar">Anunciar sem vitrine</Link>
          <Link className="btn btn-secondary btn-full" href="/painel/perfil">Voltar ao perfil</Link>
        </div>
      </aside>
    </div>
  );
}

export default function MinhaVitrinePage() {
  return (
    <AuthGuard>
      <main className="page">
        <div className="container">
          <div className="section-head">
            <div>
              <h1>Minha vitrine</h1>
              <p>Configure sua lojinha pública. A publicação depende da autorização do administrador.</p>
            </div>
          </div>
          <MinhaVitrineContent />
        </div>
      </main>
    </AuthGuard>
  );
}
