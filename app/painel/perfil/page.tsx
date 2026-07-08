'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, FileText, MapPin, X } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';
import { uploadPerfilArquivo } from '@/lib/upload';
import type { Usuario } from '@/types';

const MAX_ACCURACY_METERS = 150;

function PerfilContent() {
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  useEffect(() => {
    if (cameraAberta && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => null);
    }
  }, [cameraAberta]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [selfiePreview]);

  function pararCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraAberta(false);
  }

  async function abrirCameraSelfie() {
    setMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Seu navegador não permitiu abrir a câmera. Use o app/navegador atualizado e permita acesso à câmera.');
      return;
    }

    try {
      setCameraLoading(true);
      pararCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 900 },
          height: { ideal: 1200 }
        }
      });
      streamRef.current = stream;
      setCameraAberta(true);
    } catch {
      setMessage('Não consegui abrir a câmera frontal. Permita o acesso à câmera e tente novamente.');
    } finally {
      setCameraLoading(false);
    }
  }

  async function tirarSelfieAgora() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMessage('A câmera ainda não carregou. Aguarde um instante e tente novamente.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setMessage('Não consegui capturar a selfie. Tente novamente.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setMessage('Não consegui gerar a foto. Tente novamente.');
        return;
      }

      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const preview = URL.createObjectURL(file);
      setSelfieFile(file);
      setSelfiePreview(preview);
      setMessage('Selfie capturada na hora. Agora salve o perfil.');
      pararCamera();
    }, 'image/jpeg', 0.9);
  }

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
        throw new Error('Tire uma selfie na hora pela câmera. Não aceitamos foto enviada da galeria.');
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
      setMessage('Perfil salvo com selfie tirada na hora e localização real validadas.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      setLoading(false);
    }
  }

  if (!perfil) return <div className="card">Carregando...</div>;

  const fotoPerfil = selfiePreview || perfil.selfie_url || perfil.foto_url;
  const localizacaoOk = perfil.localizacao_validada && perfil.latitude && perfil.longitude;

  return (
    <form className="form card" onSubmit={submit}>
      {message && <div className="notice">{message}</div>}

      <div className="notice">
        Para anunciar com mais segurança, o perfil precisa ter <strong>selfie tirada na hora</strong> e <strong>localização real validada por GPS</strong>. Documento é opcional e não aparece publicamente.
      </div>

      <div className="card" style={{ background: '#f8faf4' }}>
        <h2 style={{ marginTop: 0 }}>Selfie do divulgador *</h2>
        <p className="muted">A selfie deve ser tirada agora pela câmera frontal. Não é permitido escolher foto da galeria.</p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 112, height: 112, borderRadius: 32, background: '#dcfce7', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#14532d', fontWeight: 900 }}>
            {fotoPerfil ? <img src={fotoPerfil} alt="Selfie do perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={38} />}
          </div>
          <div style={{ flex: 1, minWidth: 220, display: 'grid', gap: 10 }}>
            <button className="btn btn-primary btn-full" type="button" onClick={abrirCameraSelfie} disabled={cameraLoading || loading}>
              <Camera size={18} /> {cameraLoading ? 'Abrindo câmera...' : selfieFile || fotoPerfil ? 'Tirar nova selfie' : 'Abrir câmera para selfie'}
            </button>
            <span className="muted">Obrigatório para liberar anúncios com mais confiança.</span>
          </div>
        </div>

        {cameraAberta && (
          <div className="card" style={{ background: '#fff', marginTop: 14 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 18, background: '#111' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <button className="btn btn-primary" type="button" onClick={tirarSelfieAgora}><Camera size={18} /> Tirar selfie</button>
              <button className="btn btn-secondary" type="button" onClick={pararCamera}><X size={18} /> Cancelar</button>
            </div>
          </div>
        )}
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
        {perfil.documento_url && <div className="notice">Documento já enviado em área privada.</div>}
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
