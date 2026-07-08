'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, FileText, KeyRound, LayoutDashboard, MapPin, X } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';
import { uploadPerfilArquivo } from '@/lib/upload';
import type { Usuario } from '@/types';

const MAX_ACCURACY_METERS = 150;

function onlyNumbers(value: string) {
  return value.replace(/\D/g, '');
}

function formatCpf(value: string) {
  const cpf = onlyNumbers(value).slice(0, 11);
  return cpf
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

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
      const cpfLimpo = onlyNumbers(perfil.cpf || '');
      let selfieUrl = perfil.selfie_url || perfil.foto_url || null;
      let documentoUrl = perfil.documento_url || null;

      if (selfieFile) {
        selfieUrl = await uploadPerfilArquivo(selfieFile, perfil.id, 'selfie');
      }

      if (documentoFile) {
        documentoUrl = await uploadPerfilArquivo(documentoFile, perfil.id, 'documento');
      }

      if (!perfil.nome || !perfil.whatsapp || !perfil.estado || !perfil.cidade) {
        throw new Error('Preencha nome, WhatsApp, estado e cidade.');
      }

      if (!cpfLimpo || cpfLimpo.length !== 11) {
        throw new Error('Informe um CPF válido com 11 números.');
      }

      if (!perfil.data_nascimento || !perfil.documento_numero || !perfil.documento_orgao_emissor || !perfil.documento_uf) {
        throw new Error('Preencha os dados do documento.');
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
        cpf: cpfLimpo,
        data_nascimento: perfil.data_nascimento,
        documento_tipo: perfil.documento_tipo || 'cpf_rg',
        documento_numero: perfil.documento_numero,
        documento_orgao_emissor: perfil.documento_orgao_emissor,
        documento_uf: perfil.documento_uf,
        cadastro_completo: true,
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

      setPerfil({ ...perfil, cpf: cpfLimpo, foto_url: selfieUrl, selfie_url: selfieUrl, documento_url: documentoUrl, cadastro_completo: true, localizacao_validada: true });
      setSelfieFile(null);
      setDocumentoFile(null);
      setMessage('Perfil salvo com cadastro completo, selfie tirada na hora e localização real validada.');
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
        Para anunciar com mais segurança, o perfil precisa ter <strong>selfie tirada na hora</strong>, <strong>CPF/dados do documento</strong> e <strong>localização real validada por GPS</strong>. O documento enviado é opcional e não aparece publicamente.
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <Link href="/painel" className="btn btn-primary btn-full"><LayoutDashboard size={18} /> Abrir painel</Link>
        <Link href="/painel/senha" className="btn btn-secondary btn-full"><KeyRound size={18} /> Trocar senha</Link>
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

      <label className="field"><span className="label">Nome completo *</span><input className="input" value={perfil.nome} onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })} /></label>
      <label className="field"><span className="label">WhatsApp *</span><input className="input" value={perfil.whatsapp || ''} onChange={(e) => setPerfil({ ...perfil, whatsapp: e.target.value })} /></label>

      <div className="card" style={{ background: '#f8faf4' }}>
        <h2 style={{ marginTop: 0 }}>Dados do documento *</h2>
        <p className="muted">Usado para segurança e recuperação da conta. Não aparece publicamente.</p>
        <label className="field"><span className="label">CPF *</span><input className="input" value={formatCpf(perfil.cpf || '')} onChange={(e) => setPerfil({ ...perfil, cpf: formatCpf(e.target.value) })} inputMode="numeric" /></label>
        <label className="field"><span className="label">Data de nascimento *</span><input className="input" type="date" value={perfil.data_nascimento || ''} onChange={(e) => setPerfil({ ...perfil, data_nascimento: e.target.value })} /></label>
        <div className="form-row">
          <label className="field"><span className="label">RG / Documento *</span><input className="input" value={perfil.documento_numero || ''} onChange={(e) => setPerfil({ ...perfil, documento_numero: e.target.value })} /></label>
          <label className="field"><span className="label">Órgão emissor *</span><input className="input" value={perfil.documento_orgao_emissor || ''} onChange={(e) => setPerfil({ ...perfil, documento_orgao_emissor: e.target.value })} placeholder="Ex: SSP" /></label>
        </div>
        <label className="field">
          <span className="label">UF do documento *</span>
          <select className="select" value={perfil.documento_uf || 'TO'} onChange={(e) => setPerfil({ ...perfil, documento_uf: e.target.value })}>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span className="label">Estado *</span>
          <select className="select" value={perfil.estado || 'TO'} onChange={(e) => setPerfil({ ...perfil, estado: e.target.value, cidade: '' })}>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Cidade *</span>
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
        <h2 style={{ marginTop: 0 }}>Arquivo do documento</h2>
        <p className="muted">Opcional neste momento. Não aparece publicamente no anúncio e fica em área privada.</p>
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
  return <AuthGuard><main className="page"><div className="container" style={{ maxWidth: 720 }}><h1>Meu perfil</h1><PerfilContent /></div></main></AuthGuard>;
}
