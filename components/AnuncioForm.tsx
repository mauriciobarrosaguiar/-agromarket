'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, MapPin, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { makeUniqueSlug } from '@/lib/slug';
import { uploadAnuncioFoto } from '@/lib/upload';
import { CIDADES_POR_ESTADO, ESTADOS, TIPOS_ANUNCIO, UNIDADES } from '@/lib/constants';
import type { Categoria, Anuncio, FotoAnuncio, Subcategoria, TipoAnuncio, Usuario } from '@/types';

const MAX_ACCURACY_METERS = 150;

type FormState = {
  tipo_anuncio: TipoAnuncio;
  categoria_id: string;
  subcategoria_id: string;
  titulo: string;
  descricao: string;
  preco: string;
  preco_a_combinar: boolean;
  quantidade: string;
  unidade: string;
  cidade: string;
  estado: string;
  bairro: string;
  latitude: string;
  longitude: string;
  localizacao_accuracy: string;
  whatsapp: string;
  nome_contato: string;
};

const initialState: FormState = {
  tipo_anuncio: 'produto',
  categoria_id: '',
  subcategoria_id: '',
  titulo: '',
  descricao: '',
  preco: '',
  preco_a_combinar: false,
  quantidade: '',
  unidade: 'unidade',
  cidade: '',
  estado: 'TO',
  bairro: '',
  latitude: '',
  longitude: '',
  localizacao_accuracy: '',
  whatsapp: '',
  nome_contato: ''
};

function limparDecimal(valor: string) {
  return valor.replace(/[^\d,]/g, '').replace(/,+/g, ',');
}

function parseDecimal(valor: string): number | null {
  const limpo = limparDecimal(valor).replace(',', '.');
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

function parseCoordenada(valor: string): number | null {
  if (!valor) return null;
  const numero = Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function formatarMoeda(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = typeof valor === 'number' ? valor : parseDecimal(String(valor));
  if (numero === null) return '';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ordenarFotos(fotos?: FotoAnuncio[]) {
  return [...(fotos || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
}

async function comTempoLimite<T>(promise: PromiseLike<T>, ms: number, mensagem: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(mensagem)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

type AnuncioFormProps = {
  anuncio?: Anuncio;
  adminMode?: boolean;
  redirectTo?: string;
};

export default function AnuncioForm({ anuncio, adminMode = false, redirectTo = '/painel/anuncios' }: AnuncioFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(initialState);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [fotosExistentes, setFotosExistentes] = useState<FotoAnuncio[]>([]);
  const [fotosParaExcluir, setFotosParaExcluir] = useState<string[]>([]);

  const cidades = useMemo(() => {
    const lista = CIDADES_POR_ESTADO[state.estado] || [];
    if (state.cidade && !lista.includes(state.cidade)) return [state.cidade, ...lista];
    return lista;
  }, [state.estado, state.cidade]);

  const subcategoriasDaCategoria = useMemo(
    () => subcategorias.filter((sub) => sub.categoria_id === state.categoria_id),
    [subcategorias, state.categoria_id]
  );

  const fotosVisiveis = useMemo(
    () => fotosExistentes.filter((foto) => !fotosParaExcluir.includes(foto.id)),
    [fotosExistentes, fotosParaExcluir]
  );

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: subs }] = await Promise.all([
        supabase.from('categorias').select('*').eq('ativo', true).order('ordem'),
        supabase.from('subcategorias').select('*').eq('ativo', true).order('ordem')
      ]);
      setCategorias((cats || []) as Categoria[]);
      setSubcategorias((subs || []) as Subcategoria[]);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadPerfil() {
      if (anuncio) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase.from('usuarios').select('*').eq('id', userData.user.id).single();
      if (!data) return;

      const userProfile = data as Usuario;
      setState((prev) => ({
        ...prev,
        nome_contato: userProfile.nome || prev.nome_contato,
        whatsapp: userProfile.whatsapp || prev.whatsapp,
        estado: userProfile.estado || prev.estado || 'TO',
        cidade: userProfile.cidade || prev.cidade,
        latitude: userProfile.latitude ? String(userProfile.latitude) : prev.latitude,
        longitude: userProfile.longitude ? String(userProfile.longitude) : prev.longitude,
        localizacao_accuracy: userProfile.localizacao_accuracy ? String(Math.round(userProfile.localizacao_accuracy)) : prev.localizacao_accuracy
      }));
    }

    loadPerfil();
  }, [anuncio]);

  useEffect(() => {
    if (!anuncio) {
      setFotosExistentes([]);
      setFotosParaExcluir([]);
      return;
    }

    setState({
      tipo_anuncio: anuncio.tipo_anuncio,
      categoria_id: anuncio.categoria_id,
      subcategoria_id: anuncio.subcategoria_id || '',
      titulo: anuncio.titulo,
      descricao: anuncio.descricao,
      preco: anuncio.preco ? formatarMoeda(Number(anuncio.preco)) : '',
      preco_a_combinar: anuncio.preco_a_combinar,
      quantidade: anuncio.quantidade ? String(anuncio.quantidade).replace('.', ',') : '',
      unidade: anuncio.unidade || 'unidade',
      cidade: anuncio.cidade,
      estado: anuncio.estado,
      bairro: anuncio.bairro || '',
      latitude: anuncio.latitude ? String(anuncio.latitude) : '',
      longitude: anuncio.longitude ? String(anuncio.longitude) : '',
      localizacao_accuracy: '',
      whatsapp: anuncio.whatsapp,
      nome_contato: anuncio.nome_contato
    });
    setFotosExistentes(ordenarFotos(anuncio.fotos_anuncios));
    setFotosParaExcluir([]);
  }, [anuncio]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function updateCategoria(categoriaId: string) {
    const cat = categorias.find((item) => item.id === categoriaId);
    setState((prev) => ({ ...prev, categoria_id: categoriaId, subcategoria_id: '', tipo_anuncio: (cat?.tipo || prev.tipo_anuncio) as TipoAnuncio }));
  }

  function updateEstado(uf: string) { setState((prev) => ({ ...prev, estado: uf, cidade: '' })); }

  function alternarExclusaoFoto(fotoId: string) {
    setFotosParaExcluir((prev) => (prev.includes(fotoId) ? prev.filter((id) => id !== fotoId) : [...prev, fotoId]));
  }

  async function usarLocalizacaoAtual() {
    setError(null);
    if (!navigator.geolocation) {
      setError('Seu navegador não permitiu pegar localização automática. Você ainda pode enviar o anúncio escolhendo cidade e estado.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = Math.round(pos.coords.accuracy || 999999);
        setState((prev) => ({ ...prev, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude), localizacao_accuracy: String(accuracy) }));
        if (accuracy > MAX_ACCURACY_METERS) setError(`Localização capturada, mas com precisão baixa (${accuracy}m). O anúncio pode ser enviado mesmo assim, usando cidade/estado.`);
        setGeoLoading(false);
      },
      () => { setError('Não consegui pegar sua localização agora. Você pode continuar usando cidade e estado.'); setGeoLoading(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  async function getUsuarioLogado() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) return sessionData.session.user;
    const { data: userData } = await supabase.auth.getUser();
    return userData.user || null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingStep(null);
    setLoading(true);
    let anuncioIdCriado: string | null = null;
    try {
      const user = await getUsuarioLogado();
      if (!user) throw new Error('Sua sessão não está ativa neste navegador. Entre novamente pelo botão Perfil e tente publicar de novo.');
      if (!state.titulo || !state.descricao || !state.categoria_id || !state.estado || !state.cidade || !state.whatsapp || !state.nome_contato) throw new Error('Preencha os campos obrigatórios: categoria, título, descrição, cidade, WhatsApp e contato.');
      if (!anuncio && (!files || files.length === 0)) throw new Error('Adicione pelo menos uma foto para publicar o anúncio.');

      const quantidadeNovasFotos = files?.length || 0;
      const totalFotosDepoisDoSalvar = fotosVisiveis.length + quantidadeNovasFotos;
      if (anuncio && totalFotosDepoisDoSalvar === 0) throw new Error('Mantenha pelo menos uma foto atual ou adicione uma nova antes de salvar.');
      if (totalFotosDepoisDoSalvar > 5) throw new Error('O anúncio pode ter no máximo 5 fotos. Remova fotos atuais ou selecione menos imagens.');

      const precoNumero = state.preco_a_combinar || !state.preco ? null : parseDecimal(state.preco);
      const quantidadeNumero = state.quantidade ? parseDecimal(state.quantidade) : null;
      const latitudeNumero = parseCoordenada(state.latitude);
      const longitudeNumero = parseCoordenada(state.longitude);
      if (!state.preco_a_combinar && state.preco && precoNumero === null) throw new Error('Informe um preço válido. Exemplo: R$ 28,00.');
      if (state.quantidade && quantidadeNumero === null) throw new Error('A quantidade deve conter somente números.');

      const payload = {
        usuario_id: adminMode && anuncio ? anuncio.usuario_id : user.id,
        categoria_id: state.categoria_id,
        subcategoria_id: state.subcategoria_id || null,
        tipo_anuncio: state.tipo_anuncio,
        titulo: state.titulo.trim(),
        slug: anuncio?.slug || makeUniqueSlug(state.titulo),
        descricao: state.descricao.trim(),
        preco: precoNumero,
        preco_a_combinar: state.preco_a_combinar,
        quantidade: quantidadeNumero,
        unidade: state.unidade,
        cidade: state.cidade.trim(),
        estado: state.estado,
        bairro: state.bairro.trim() || null,
        endereco: null,
        referencia: null,
        latitude: latitudeNumero,
        longitude: longitudeNumero,
        whatsapp: state.whatsapp.trim(),
        nome_contato: state.nome_contato.trim(),
        status: adminMode && anuncio ? anuncio.status : 'pendente',
        destaque: adminMode && anuncio ? anuncio.destaque : false
      };

      let anuncioId = anuncio?.id;
      setSavingStep('Salvando anúncio...');
      if (anuncioId) {
        const query = supabase.from('anuncios').update(payload).eq('id', anuncioId);
        const updateQuery = adminMode ? query : query.eq('usuario_id', user.id);
        const { error } = await comTempoLimite(updateQuery, 20000, 'Demorou demais para salvar. Verifique sua conexão e tente novamente.');
        if (error) throw error;
      } else {
        const { data, error } = await comTempoLimite(supabase.from('anuncios').insert(payload).select('id').single(), 20000, 'Demorou demais para salvar. Verifique sua conexão e tente novamente.');
        if (error) throw error;
        anuncioId = data.id;
        anuncioIdCriado = data.id;
      }

      if (files && files.length > 0 && anuncioId) {
        const list = Array.from(files);
        let fotosEnviadas = 0;
        const ordemBase = fotosVisiveis.length;
        for (let i = 0; i < list.length; i++) {
          setSavingStep(`Enviando foto ${i + 1} de ${list.length}...`);
          const ordemDaFoto = ordemBase + i;
          const url = await comTempoLimite(uploadAnuncioFoto(list[i], anuncioId, ordemDaFoto), 45000, 'A foto demorou demais para enviar. Tente uma imagem menor ou uma internet melhor.');
          const { error: photoError } = await comTempoLimite(supabase.from('fotos_anuncios').insert({ anuncio_id: anuncioId, url_foto: url, ordem: ordemDaFoto, principal: fotosVisiveis.length === 0 && i === 0 }), 15000, 'Demorou demais para registrar a foto.');
          if (photoError) throw photoError;
          fotosEnviadas++;
        }
        if (fotosEnviadas === 0) throw new Error('Não foi possível enviar a foto. O anúncio não será salvo sem imagem.');
      }

      if (fotosParaExcluir.length > 0 && anuncioId) {
        setSavingStep('Removendo fotos selecionadas...');
        const { error: deletePhotosError } = await comTempoLimite(supabase.from('fotos_anuncios').delete().eq('anuncio_id', anuncioId).in('id', fotosParaExcluir), 15000, 'Demorou demais para remover as fotos.');
        if (deletePhotosError) throw deletePhotosError;
        const principalMantida = fotosVisiveis.some((foto) => foto.principal);
        if (!principalMantida && fotosVisiveis.length > 0) {
          const { error: capaError } = await comTempoLimite(supabase.from('fotos_anuncios').update({ principal: true }).eq('id', fotosVisiveis[0].id).eq('anuncio_id', anuncioId), 15000, 'Demorou demais para atualizar a foto de capa.');
          if (capaError) throw capaError;
        }
      }

      router.push(redirectTo);
    } catch (err) {
      if (anuncioIdCriado) await supabase.from('anuncios').delete().eq('id', anuncioIdCriado);
      setError(err instanceof Error ? err.message : 'Erro ao salvar anúncio.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSavingStep(null);
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {error && <div className="notice">{error}</div>}
      {savingStep && <div className="notice">{savingStep}</div>}
      {!adminMode && <div className="notice notice-success"><CheckCircle2 size={18} /> Cadastro enxuto: preencha produto, foto, cidade e WhatsApp. Documento e selfie ficam para lojinha/verificação, não bloqueiam anúncio simples.</div>}
      {anuncio && !adminMode && <div className="notice">Ao salvar alterações, o anúncio volta para aprovação do administrador.</div>}

      <div className="card" style={{ background: '#f8faf4' }}>
        <h3 style={{ marginTop: 0 }}>1. O que você vai anunciar?</h3>
        <div className="form-row"><label className="field"><span className="label">Categoria *</span><select className="select" value={state.categoria_id} onChange={(e) => updateCategoria(e.target.value)}><option value="">Selecione</option>{categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}</select></label><label className="field"><span className="label">Subcategoria</span><select className="select" value={state.subcategoria_id} onChange={(e) => update('subcategoria_id', e.target.value)} disabled={!state.categoria_id}><option value="">{state.categoria_id ? 'Opcional' : 'Escolha a categoria primeiro'}</option>{subcategoriasDaCategoria.map((sub) => <option key={sub.id} value={sub.id}>{sub.nome}</option>)}</select></label></div>
        <label className="field"><span className="label">Título *</span><input className="input" value={state.titulo} onChange={(e) => update('titulo', e.target.value)} placeholder="Ex: Leitão caipira 12 a 15 kg" /></label>
        <label className="field"><span className="label">Descrição *</span><textarea className="textarea" value={state.descricao} onChange={(e) => update('descricao', e.target.value)} placeholder="Explique de forma simples: estado do produto, quantidade, retirada/entrega e observações." /></label>
        <label className="field"><span className="label">Tipo de anúncio</span><select className="select" value={state.tipo_anuncio} onChange={(e) => update('tipo_anuncio', e.target.value as TipoAnuncio)}>{TIPOS_ANUNCIO.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}</select></label>
      </div>

      <div className="card" style={{ background: '#f8faf4' }}>
        <h3 style={{ marginTop: 0 }}>2. Preço e quantidade</h3>
        <div className="form-row"><label className="field"><span className="label">Preço</span><input className="input" value={state.preco} disabled={state.preco_a_combinar} inputMode="decimal" onChange={(e) => update('preco', limparDecimal(e.target.value))} onBlur={() => update('preco', formatarMoeda(state.preco))} placeholder="Ex: R$ 28,00" /></label><label className="field" style={{ justifyContent: 'end' }}><span className="checkbox-row"><input type="checkbox" checked={state.preco_a_combinar} onChange={(e) => update('preco_a_combinar', e.target.checked)} /> Preço a combinar</span></label></div>
        <div className="form-row"><label className="field"><span className="label">Quantidade</span><input className="input" value={state.quantidade} inputMode="decimal" onChange={(e) => update('quantidade', limparDecimal(e.target.value))} placeholder="Ex: 10" /></label><label className="field"><span className="label">Unidade</span><select className="select" value={state.unidade} onChange={(e) => update('unidade', e.target.value)}>{UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}</select></label></div>
      </div>

      <div className="card" style={{ background: '#f8faf4' }}>
        <h3 style={{ marginTop: 0 }}>3. Local e contato</h3>
        <div className="form-row"><label className="field"><span className="label">Estado *</span><select className="select" value={state.estado} onChange={(e) => updateEstado(e.target.value)}><option value="">Selecione</option>{ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></label><label className="field"><span className="label">Cidade *</span><select className="select" value={state.cidade} onChange={(e) => update('cidade', e.target.value)} disabled={!state.estado}><option value="">{state.estado ? 'Selecione' : 'Escolha o estado primeiro'}</option>{cidades.map((nomeCidade) => <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>)}</select></label></div>
        <label className="field"><span className="label">Bairro</span><input className="input" value={state.bairro} onChange={(e) => update('bairro', e.target.value)} placeholder="Opcional" /></label>
        <div className="form-row"><label className="field"><span className="label">Nome do contato *</span><input className="input" value={state.nome_contato} readOnly={!adminMode} onChange={(e) => update('nome_contato', e.target.value)} title={adminMode ? 'Editável pelo admin' : 'Vem do seu cadastro'} /></label><label className="field"><span className="label">WhatsApp *</span><input className="input" value={state.whatsapp} readOnly={!adminMode} onChange={(e) => update('whatsapp', e.target.value)} title={adminMode ? 'Editável pelo admin' : 'Vem do seu cadastro'} /></label></div>
        <button className="btn btn-secondary btn-full" type="button" onClick={usarLocalizacaoAtual} disabled={geoLoading}><MapPin size={18} /> {geoLoading ? 'Atualizando localização...' : state.latitude && state.longitude ? 'Atualizar localização automática' : 'Usar minha localização automática'}</button>
        {state.latitude && state.longitude && <div className="notice" style={{ marginTop: 12 }}>Localização capturada. Precisão: {state.localizacao_accuracy || '?'}m.</div>}
      </div>

      <div className="card" style={{ background: '#f8faf4' }}>
        <h3 style={{ marginTop: 0 }}>4. Fotos</h3>
        {anuncio && <div className="photo-editor-card"><div className="photo-editor-head"><div><h3>Fotos atuais</h3><p className="muted">Marque uma foto para excluir. A remoção acontece somente ao salvar.</p></div><span className="badge">{fotosVisiveis.length}/5 fotos</span></div>{fotosExistentes.length > 0 && <div className="photo-edit-grid">{fotosExistentes.map((foto, index) => { const marcadaParaExcluir = fotosParaExcluir.includes(foto.id); return <div className={`photo-edit-card${marcadaParaExcluir ? ' photo-edit-card-removed' : ''}`} key={foto.id}><div className="photo-edit-image-wrap"><img src={foto.url_foto} alt={`Foto ${index + 1}`} />{foto.principal && <span className="badge photo-edit-badge">Capa</span>}{marcadaParaExcluir && <span className="photo-edit-removed-label">Será excluída</span>}</div><button className={`btn ${marcadaParaExcluir ? 'btn-secondary' : 'btn-danger'} btn-full`} disabled={loading} type="button" onClick={() => alternarExclusaoFoto(foto.id)}>{marcadaParaExcluir ? 'Manter foto' : <><Trash2 size={16} /> Excluir foto</>}</button></div>; })}</div>}</div>}
        <label className="field"><span className="label">{anuncio ? 'Adicionar novas fotos' : 'Fotos *'}</span><input className="input" type="file" multiple accept="image/png,image/jpeg,image/webp" required={!anuncio} onChange={(e) => setFiles(e.target.files)} /><span className="muted"><Camera size={15} /> Até 5 fotos. A primeira foto vira capa.</span></label>
      </div>

      <button className="btn btn-primary btn-full" disabled={loading} type="submit">{loading ? (savingStep || 'Salvando...') : adminMode ? 'Salvar como admin' : anuncio ? 'Salvar alterações e enviar para aprovação' : 'Enviar anúncio para aprovação'}</button>
    </form>
  );
}
