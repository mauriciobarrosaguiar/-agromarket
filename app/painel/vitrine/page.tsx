'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ImagePlus, Store } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slug';
import { uploadVitrineImagem } from '@/lib/upload';
import type { Usuario, Vitrine } from '@/types';

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

      if (vitrineData) {
        setVitrine(vitrineData as Vitrine);
      } else {
        const baseSlug = `${slugify(usuario?.nome || 'vendedor')}-${userData.user.id.slice(0, 6)}`;
        const nova = {
          usuario_id: userData.user.id,
          nome_vitrine: usuario?.nome || 'Minha vitrine',
          slug: baseSlug,
          descricao: 'Vitrine de produtos e serviços no AgroMarket.',
          cidade: usuario?.cidade || '',
          estado: usuario?.estado || 'TO',
          whatsapp: usuario?.whatsapp || '',
          vitrine_ativa: true,
          plano: 'gratis_lancamento',
          gratis_ate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        };

        const { data: criada } = await supabase.from('vitrines').insert(nova).select('*').single();
        setVitrine(criada as Vitrine);
      }

      setLoading(false);
    }

    load();
  }, []);

  function update<K extends keyof Vitrine>(key: K, value: Vitrine[K]) {
    setVitrine((prev) => prev ? { ...prev, [key]: value } : prev);
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
      cidade: vitrine.cidade,
      estado: vitrine.estado,
      whatsapp: vitrine.whatsapp,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('vitrines').update(payload).eq('id', vitrine.id).select('*').single();

    if (error) setMessage(error.message);
    else {
      setVitrine(data as Vitrine);
      setMessage('Vitrine salva.');
    }

    setSaving(false);
  }

  if (loading) return <div className="card">Carregando sua vitrine...</div>;
  if (!vitrine) return <div className="card">Não foi possível carregar sua vitrine.</div>;

  const linkPublico = `/vendedor/${vitrine.slug}`;

  return (
    <div className="grid grid-2">
      <form className="form card" onSubmit={salvar}>
        {message && <div className="notice">{message}</div>}

        <div className="card" style={{ background: '#f8faf4' }}>
          <h3 style={{ marginTop: 0 }}>Imagens da vitrine</h3>
          <p className="muted">Toque nos botões abaixo para selecionar as imagens do celular.</p>

          <div className="form-row">
            <div className="field">
              <span className="label">Logo da vitrine</span>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => selecionarImagem(e, 'logo')} />
              <button className="btn btn-secondary btn-full" type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading !== null}>
                <ImagePlus size={18} /> {uploading === 'logo' ? 'Enviando logo...' : 'Selecionar logo'}
              </button>
              <div style={{ width: 92, height: 92, borderRadius: 24, background: '#eaf3e3', display: 'grid', placeItems: 'center', overflow: 'hidden', color: '#14532d', border: '1px solid #dfe8d9' }}>
                {vitrine.foto_url ? <img src={vitrine.foto_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Store size={32} />}
              </div>
            </div>

            <div className="field">
              <span className="label">Banner da vitrine</span>
              <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => selecionarImagem(e, 'banner')} />
              <button className="btn btn-secondary btn-full" type="button" onClick={() => bannerInputRef.current?.click()} disabled={uploading !== null}>
                <ImagePlus size={18} /> {uploading === 'banner' ? 'Enviando banner...' : 'Selecionar banner'}
              </button>
              <div style={{ height: 92, borderRadius: 22, background: vitrine.banner_url ? `url(${vitrine.banner_url}) center/cover` : 'linear-gradient(135deg, #052e16, #166534)', border: '1px solid #dfe8d9' }} />
            </div>
          </div>
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
        <h2>Prévia da vitrine</h2>
        <p className="muted">No lançamento, a vitrine está liberada gratuitamente para atrair vendedores.</p>
        <div style={{ display: 'grid', gap: 8, margin: '14px 0' }}>
          <span className="badge">Plano: {vitrine.plano === 'gratis_lancamento' ? 'Grátis no lançamento' : vitrine.plano}</span>
          {vitrine.gratis_ate && <span className="badge">Grátis até: {new Date(vitrine.gratis_ate).toLocaleDateString('pt-BR')}</span>}
          <span className="badge">Status: {vitrine.vitrine_ativa ? 'Ativa' : 'Desativada'}</span>
        </div>

        <div className="card" style={{ background: '#f8faf4', padding: 0, overflow: 'hidden' }}>
          <div style={{ minHeight: 100, background: vitrine.banner_url ? `url(${vitrine.banner_url}) center/cover` : 'linear-gradient(135deg, #052e16, #166534)' }} />
          <div style={{ padding: 14 }}>
            <strong>{vitrine.nome_vitrine}</strong>
            <p className="muted">{vitrine.cidade || 'Cidade'} - {vitrine.estado || 'UF'}</p>
            <p>{vitrine.descricao}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          <Link className="btn btn-primary btn-full" href={linkPublico}>Abrir minha vitrine</Link>
          <Link className="btn btn-secondary btn-full" href="/painel">Voltar ao painel</Link>
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
              <p>Configure seu perfil público com todos os seus produtos.</p>
            </div>
          </div>
          <MinhaVitrineContent />
        </div>
      </main>
    </AuthGuard>
  );
}
