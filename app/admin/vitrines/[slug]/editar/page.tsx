'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ImagePlus, Save } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { uploadVitrineImagem } from '@/lib/upload';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';
import type { Vitrine } from '@/types';

type FormState = {
  nome_vitrine: string;
  descricao: string;
  cidade: string;
  estado: string;
  whatsapp: string;
  vitrine_ativa: boolean;
  destaque: boolean;
  verificado: boolean;
  foto_url: string;
  banner_url: string;
  logo_object_fit: string;
  logo_object_position: string;
  banner_object_position: string;
};

function vazio(): FormState {
  return {
    nome_vitrine: '',
    descricao: '',
    cidade: '',
    estado: 'TO',
    whatsapp: '',
    vitrine_ativa: false,
    destaque: false,
    verificado: false,
    foto_url: '',
    banner_url: '',
    logo_object_fit: 'contain',
    logo_object_position: 'center',
    banner_object_position: 'center'
  };
}

function EditarVitrineAdminContent() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [form, setForm] = useState<FormState>(() => vazio());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const cidades = CIDADES_POR_ESTADO[form.estado] || [];

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('vitrines').select('*').eq('slug', params.slug).maybeSingle();
      const item = data as Vitrine | null;
      setVitrine(item);
      if (item) {
        setForm({
          nome_vitrine: item.nome_vitrine || '',
          descricao: item.descricao || '',
          cidade: item.cidade || '',
          estado: item.estado || 'TO',
          whatsapp: item.whatsapp || '',
          vitrine_ativa: Boolean(item.vitrine_ativa),
          destaque: Boolean(item.destaque),
          verificado: Boolean(item.verificado),
          foto_url: item.foto_url || '',
          banner_url: item.banner_url || '',
          logo_object_fit: item.logo_object_fit || 'contain',
          logo_object_position: item.logo_object_position || 'center',
          banner_object_position: item.banner_object_position || 'center'
        });
      }
      setLoading(false);
    }
    load();
  }, [params.slug]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function changeLogo(e: ChangeEvent<HTMLInputElement>) {
    setLogoFile(e.target.files?.[0] || null);
  }

  function changeBanner(e: ChangeEvent<HTMLInputElement>) {
    setBannerFile(e.target.files?.[0] || null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!vitrine) return;
    setSaving(true);
    setMessage(null);

    try {
      let fotoUrl = form.foto_url;
      let bannerUrl = form.banner_url;

      if (logoFile) fotoUrl = await uploadVitrineImagem(logoFile, vitrine.usuario_id, 'logo');
      if (bannerFile) bannerUrl = await uploadVitrineImagem(bannerFile, vitrine.usuario_id, 'banner');

      const { error } = await supabase.from('vitrines').update({
        nome_vitrine: form.nome_vitrine.trim(),
        descricao: form.descricao.trim() || null,
        cidade: form.cidade,
        estado: form.estado,
        whatsapp: form.whatsapp.trim(),
        vitrine_ativa: form.vitrine_ativa,
        destaque: form.destaque,
        verificado: form.verificado,
        foto_url: fotoUrl || null,
        banner_url: bannerUrl || null,
        logo_object_fit: form.logo_object_fit,
        logo_object_position: form.logo_object_position,
        banner_object_position: form.banner_object_position,
        updated_at: new Date().toISOString()
      }).eq('id', vitrine.id);

      if (error) throw error;
      setMessage('Lojinha atualizada.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar lojinha.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Carregando...</div>;
  if (!vitrine) return <div className="card">Lojinha não encontrada.</div>;

  return (
    <form className="card form" onSubmit={submit}>
      {message && <div className="notice">{message}</div>}

      <div className="form-row">
        <label className="field"><span className="label">Nome da lojinha</span><input className="input" value={form.nome_vitrine} onChange={(e) => update('nome_vitrine', e.target.value)} /></label>
        <label className="field"><span className="label">WhatsApp</span><input className="input" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} /></label>
      </div>

      <label className="field"><span className="label">Descrição</span><textarea className="textarea" value={form.descricao} onChange={(e) => update('descricao', e.target.value)} /></label>

      <div className="form-row">
        <label className="field"><span className="label">Estado</span><select className="select" value={form.estado} onChange={(e) => setForm((prev) => ({ ...prev, estado: e.target.value, cidade: '' }))}>{ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></label>
        <label className="field"><span className="label">Cidade</span><select className="select" value={form.cidade} onChange={(e) => update('cidade', e.target.value)}><option value="">Selecione</option>{cidades.map((cidade) => <option key={cidade} value={cidade}>{cidade}</option>)}{form.cidade && !cidades.includes(form.cidade) && <option value={form.cidade}>{form.cidade}</option>}</select></label>
      </div>

      <div className="grid grid-2">
        <div className="card" style={{ background: '#f8faf4' }}>
          <strong><ImagePlus size={16} /> Logo</strong>
          {form.foto_url && <img src={form.foto_url} alt="Logo atual" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 18, background: '#fff', marginTop: 10 }} />}
          <label className="field"><span className="label">Trocar logo</span><input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={changeLogo} /></label>
          <label className="field"><span className="label">Encaixe da logo</span><select className="select" value={form.logo_object_fit} onChange={(e) => update('logo_object_fit', e.target.value)}><option value="contain">Mostrar inteira</option><option value="cover">Preencher</option></select></label>
        </div>

        <div className="card" style={{ background: '#f8faf4' }}>
          <strong><ImagePlus size={16} /> Capa/Banner</strong>
          {form.banner_url && <img src={form.banner_url} alt="Banner atual" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 18, background: '#fff', marginTop: 10 }} />}
          <label className="field"><span className="label">Trocar capa</span><input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={changeBanner} /></label>
          <label className="field"><span className="label">Posição da capa</span><select className="select" value={form.banner_object_position} onChange={(e) => update('banner_object_position', e.target.value)}><option value="center">Centro</option><option value="top">Topo</option><option value="bottom">Baixo</option><option value="left">Esquerda</option><option value="right">Direita</option></select></label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label className="checkbox-row"><input type="checkbox" checked={form.vitrine_ativa} onChange={(e) => update('vitrine_ativa', e.target.checked)} /> Pública</label>
        <label className="checkbox-row"><input type="checkbox" checked={form.destaque} onChange={(e) => update('destaque', e.target.checked)} /> Destaque</label>
        <label className="checkbox-row"><input type="checkbox" checked={form.verificado} onChange={(e) => update('verificado', e.target.checked)} /> Verificada</label>
      </div>

      <button className="btn btn-primary btn-full" disabled={saving}><Save size={18} /> {saving ? 'Salvando...' : 'Salvar lojinha'}</button>
    </form>
  );
}

export default function EditarVitrineAdminPage() {
  return (
    <AuthGuard adminOnly>
      <main className="page">
        <div className="container" style={{ maxWidth: 980 }}>
          <div className="section-head">
            <div><h1>Editar lojinha</h1><p>Altere dados, logo, capa e status público.</p></div>
            <Link className="btn btn-secondary" href="/admin/vitrines">Voltar vitrines</Link>
          </div>
          <EditarVitrineAdminContent />
        </div>
      </main>
    </AuthGuard>
  );
}
