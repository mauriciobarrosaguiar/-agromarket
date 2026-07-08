'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Camera, FileText, MapPin } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';
import { uploadPerfilArquivo } from '@/lib/upload';
import type { Usuario } from '@/types';

const MAX_ACCURACY_METERS = 150;

function PerfilContent() {
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const cidades = useMemo(() => {
    const uf = perfil?.estado || 'TO';
    const lista = CIDADES_POR_ESTADO[uf] || [];
    if (perfil?.cidade && !lista.includes(perfil.cidade)) return [perfil.cidade, ...lista];
    return lista;
  }, [perfil?.estado, perfil?.cidade]);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from('usuarios').select('*').eq('id', userData.user.id).single();
      setPerfil(data as Usuario);
    }
    load();
  }, []);

  function capturarLocalizacaoReal() {
    setMessage(null);

    if (!navigator.geolocation) {
      setMessage('Seu navegador não permite capturar localização real.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = Math.round(pos.coords.accuracy || 999999);

        if (accuracy > MAX_ACCURACY_METERS) {
          setMessage(`Localização recusada: precisão baixa (${accuracy}m). Ative GPS, desative economia de bateria e tente em local aberto.`);
          setGeoLoading(false);
          return;
        }

        setPerfil((prev) => prev ? {
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          localizacao_accuracy: accuracy,
          localizacao_capturada_em: new Date().toISOString(),
          localizacao_validada: true
        } : prev);
        setMessage(`Localização real validada com precisão de ${accuracy}m.`);
        setGeoLoading(false);
      },
      () => {
        setMessage('Não consegui capturar a localização. Permita o GPS e tente novamente.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!perfil) return;

    setLoading(true);
    setMessage(null);

    try {
      let selfieUrl = perfil.selfie_url || perfil.foto_url || null;
      let documentoUrl = perfil.documento_url || null;

      if (selfieFile) {
        selfieUrl = await uploadPerfilArquivo(selfieFile, perfil.id, 'selfie');
      }

      if (documentoFile) {
        documentoUrl = await uploadPerfilArquivo(documentoFile, perfil.id, 'documento');
      }

      if (!selfieUrl) {
        throw new Error('Adicione uma selfie/foto do perfil. Ela será obrigatória para anunciar.');
      }

      if (!perfil.latitude || !perfil.longitude || !perfil.localizacao_validada) {
        throw new Error('Capture sua localização real pelo botão “Validar localização real”.');
      }

      if ((perfil.localizacao_accuracy || 999999) > MAX_ACCURACY_METERS) {
        throw new Error('A localização precisa ser capturada com melhor precisão para evitar localização fictícia.');
      }

      const { error } = await supabase.from('usuarios').update({
        nome: perfil.nome,
        whatsapp: perfil.whatsapp,
        cidade: perfil.cidade,
        estado: perfil.estado,
        foto_url: selfieUrl,
        selfie_url: selfieUrl,
        documento_url: documentoUrl,
        latitude: perfil.latitude,
        longitude: perfil.longitude,
        localizacao_accuracy: perfil.localizacao_accuracy,
        localizacao_capturada_em: perfil.localizacao_capturada_em,
        localizacao_validada: true,
        updated_at: new Date().toISOString()
      }).eq('id', perfil.id);

      if (error) throw error;

      setPerfil({ ...perfil, foto_url: selfieUrl, selfie_url: selfieUrl, documento_url: documentoUrl, localizacao_validada: true });
      setSelfieFile(null);
      setDocumentoFile(null);
      setMessage('Perfil salvo com foto e localização real validadas.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  }

  if (!perfil) return <div className="card">Carregando...</div>;

  const fotoPerfil = perfil.selfie_url || perfil.foto_url;
  const localizacaoOk = perfil.localizacao_validada && perfil.latitude && perfil.longitude;

  return (
    <form className="form card" onSubmit={submit}>
      {message && <div className="notice">{message}</div>}

      <div className="notice">
        Para anunciar com mais segurança, agora o perfil precisa ter <strong>selfie/foto</strong> e <strong>localização real validada por GPS</strong>. Documento é opcional e não aparece publicamente.
      </div>

      <div className="card" style={{ background: '#f8faf4' }}>
        <h2 style={{ marginTop: 0 }}>Foto do divulgador *</h2>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 96, height: 96, borderRadius: 28, background: '#dcfce7', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#14532d', fontWeight: 900 }}>
            {fotoPerfil ? <img src={fotoPerfil} alt="Foto do perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={34} />}
          </div>
          <label className="field" style={{ flex: 1, minWidth: 220 }}>
            <span className="label">Enviar selfie/foto *</span>
            <input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
            <span className="muted">Obrigatório para liberar anúncios com mais confiança.</span>
          </label>
        </div>
      </div>

      <label className="field"><span className="label">Nome</span><input className="input" value={perfil.nome} onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })} /></label>
      <label className="field"><span className="label">WhatsApp</span><input className="input" value={perfil.whatsapp || ''} onChange={(e) => setPerfil({ ...perfil, whatsapp: e.target.value })} /></label>

      <div className="form-row">
        <label className="field">
          <span className="label">Estado</span>
          <select className="select" value={perfil.estado || 'TO'} onChange={(e) => setPerfil({ ...perfil, estado: e.target.value, cidade: '' })}>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Cidade</span>
          <select className="select" value={perfil.cidade || ''} onChange={(e) => setPerfil({ ...perfil, cidade: e.target.value })}>
            <option value="">Selecione a cidade</option>
            {cidades.map((nomeCidade) => <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>)}
          </select>
        </label>
      </div>

      <div className="card" style={{ background: '#f8faf4' }}>
        <h2 style={{ marginTop: 0 }}>Localização real *</h2>
        <p className="muted">A localização não pode ser digitada. Ela precisa ser capturada pelo GPS do celular com boa precisão.</p>
        <button className="btn btn-secondary btn-full" type="button" onClick={capturarLocalizacaoReal} disabled={geoLoading}>
          <MapPin size={18} /> {geoLoading ? 'Validando GPS...' : localizacaoOk ? 'Localização validada' : 'Validar localização real'}
        </button>
        {localizacaoOk && (
          <div className="notice" style={{ marginTop: 12 }}>
            Localização validada. Precisão: {Math.round(perfil.localizacao_accuracy || 0)}m.
          </div>
        )}
      </div>

      <div className="card" style={{ background: '#f8faf4' }}>
        <h2 style={{ marginTop: 0 }}>Documento do divulgador</h2>
        <p className="muted">Opcional neste momento. Não aparece publicamente no anúncio.</p>
        <label className="field">
          <span className="label"><FileText size={16} /> Documento opcional</span>
          <input className="input" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setDocumentoFile(e.target.files?.[0] || null)} />
        </label>
        {perfil.documento_url && <div className="notice">Documento já enviado.</div>}
      </div>

      <button className="btn btn-primary btn-full" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar perfil'}
      </button>
    </form>
  );
}

export default function PerfilPage() {
  return <AuthGuard><main className="page"><div className="container" style={{ maxWidth: 680 }}><h1>Meu perfil</h1><PerfilContent /></div></main></AuthGuard>;
}
