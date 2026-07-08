'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { makeUniqueSlug } from '@/lib/slug';
import { uploadAnuncioFoto } from '@/lib/upload';
import { CIDADES_POR_ESTADO, ESTADOS, TIPOS_ANUNCIO, UNIDADES } from '@/lib/constants';
import type { Categoria, Anuncio, TipoAnuncio, Usuario } from '@/types';

type FormState = {
  tipo_anuncio: TipoAnuncio;
  categoria_id: string;
  titulo: string;
  descricao: string;
  preco: string;
  preco_a_combinar: boolean;
  quantidade: string;
  unidade: string;
  cidade: string;
  estado: string;
  bairro: string;
  whatsapp: string;
  nome_contato: string;
};

const initialState: FormState = {
  tipo_anuncio: 'produto',
  categoria_id: '',
  titulo: '',
  descricao: '',
  preco: '',
  preco_a_combinar: false,
  quantidade: '',
  unidade: 'unidade',
  cidade: '',
  estado: 'TO',
  bairro: '',
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

function formatarMoeda(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = typeof valor === 'number' ? valor : parseDecimal(String(valor));
  if (numero === null) return '';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

export default function AnuncioForm({ anuncio }: { anuncio?: Anuncio }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(initialState);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);

  const cidades = useMemo(() => {
    const lista = CIDADES_POR_ESTADO[state.estado] || [];
    if (state.cidade && !lista.includes(state.cidade)) return [state.cidade, ...lista];
    return lista;
  }, [state.estado, state.cidade]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('categorias').select('*').eq('ativo', true).order('ordem');
      setCategorias((data || []) as Categoria[]);
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
      setPerfil(userProfile);
      setState((prev) => ({
        ...prev,
        nome_contato: userProfile.nome || prev.nome_contato,
        whatsapp: userProfile.whatsapp || prev.whatsapp,
        estado: userProfile.estado || prev.estado || 'TO',
        cidade: userProfile.cidade || prev.cidade
      }));
    }

    loadPerfil();
  }, [anuncio]);

  useEffect(() => {
    if (!anuncio) return;
    setState({
      tipo_anuncio: anuncio.tipo_anuncio,
      categoria_id: anuncio.categoria_id,
      titulo: anuncio.titulo,
      descricao: anuncio.descricao,
      preco: anuncio.preco ? formatarMoeda(Number(anuncio.preco)) : '',
      preco_a_combinar: anuncio.preco_a_combinar,
      quantidade: anuncio.quantidade ? String(anuncio.quantidade).replace('.', ',') : '',
      unidade: anuncio.unidade || 'unidade',
      cidade: anuncio.cidade,
      estado: anuncio.estado,
      bairro: anuncio.bairro || '',
      whatsapp: anuncio.whatsapp,
      nome_contato: anuncio.nome_contato
    });
  }, [anuncio]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function updateEstado(uf: string) {
    setState((prev) => ({ ...prev, estado: uf, cidade: '' }));
  }

  async function getUsuarioLogado() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) return sessionData.session.user;

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) return userData.user;

    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingStep(null);
    setLoading(true);

    let anuncioIdCriado: string | null = null;

    try {
      const user = await getUsuarioLogado();
      if (!user) {
        throw new Error('Sua sessão não está ativa neste navegador. Entre novamente pelo botão Perfil e tente publicar de novo.');
      }

      if (!state.titulo || !state.descricao || !state.categoria_id || !state.estado || !state.cidade || !state.whatsapp || !state.nome_contato) {
        throw new Error('Preencha os campos obrigatórios.');
      }

      if (!anuncio && (!files || files.length === 0)) {
        throw new Error('Adicione pelo menos uma foto. Não permitimos anúncio sem imagem.');
      }

      const precoNumero = state.preco_a_combinar || !state.preco ? null : parseDecimal(state.preco);
      const quantidadeNumero = state.quantidade ? parseDecimal(state.quantidade) : null;

      if (!state.preco_a_combinar && state.preco && precoNumero === null) {
        throw new Error('Informe um preço válido. Exemplo: R$ 28,00.');
      }

      if (state.quantidade && quantidadeNumero === null) {
        throw new Error('A quantidade deve conter somente números.');
      }

      const payload = {
        usuario_id: user.id,
        categoria_id: state.categoria_id,
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
        whatsapp: state.whatsapp.trim(),
        nome_contato: state.nome_contato.trim(),
        status: 'pendente',
        destaque: false
      };

      let anuncioId = anuncio?.id;

      setSavingStep('Salvando anúncio...');
      if (anuncioId) {
        const { error } = await comTempoLimite(
          supabase.from('anuncios').update(payload).eq('id', anuncioId),
          20000,
          'Demorou demais para salvar. Verifique sua conexão e tente novamente.'
        );
        if (error) throw error;
      } else {
        const { data, error } = await comTempoLimite(
          supabase.from('anuncios').insert(payload).select('id').single(),
          20000,
          'Demorou demais para salvar. Verifique sua conexão e tente novamente.'
        );
        if (error) throw error;
        anuncioId = data.id;
        anuncioIdCriado = data.id;
      }

      if (files && files.length > 0 && anuncioId) {
        const list = Array.from(files).slice(0, 5);
        let fotosEnviadas = 0;

        for (let i = 0; i < list.length; i++) {
          setSavingStep(`Enviando foto ${i + 1} de ${list.length}...`);
          const url = await comTempoLimite(
            uploadAnuncioFoto(list[i], anuncioId, i),
            45000,
            'A foto demorou demais para enviar. Tente uma imagem menor ou uma internet melhor.'
          );
          const { error: photoError } = await comTempoLimite(
            supabase.from('fotos_anuncios').insert({
              anuncio_id: anuncioId,
              url_foto: url,
              ordem: i,
              principal: i === 0
            }),
            15000,
            'Demorou demais para registrar a foto.'
          );
          if (photoError) throw photoError;
          fotosEnviadas++;
        }

        if (fotosEnviadas === 0) {
          throw new Error('Não foi possível enviar a foto. O anúncio não será salvo sem imagem.');
        }
      }

      router.push('/painel/anuncios');
    } catch (err) {
      if (anuncioIdCriado) {
        await supabase.from('anuncios').delete().eq('id', anuncioIdCriado);
      }

      const message = err instanceof Error ? err.message : 'Erro ao salvar anúncio.';
      setError(message);
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
      <div className="form-row">
        <label className="field">
          <span className="label">Tipo de anúncio *</span>
          <select className="select" value={state.tipo_anuncio} onChange={(e) => update('tipo_anuncio', e.target.value as TipoAnuncio)}>
            {TIPOS_ANUNCIO.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Categoria *</span>
          <select className="select" value={state.categoria_id} onChange={(e) => update('categoria_id', e.target.value)}>
            <option value="">Selecione</option>
            {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="label">Título *</span>
        <input className="input" value={state.titulo} onChange={(e) => update('titulo', e.target.value)} placeholder="Ex: Leitão caipira 12 a 15 kg" />
      </label>

      <label className="field">
        <span className="label">Descrição *</span>
        <textarea className="textarea" value={state.descricao} onChange={(e) => update('descricao', e.target.value)} placeholder="Explique o produto, serviço ou vaga com detalhes." />
      </label>

      <div className="form-row">
        <label className="field">
          <span className="label">Preço</span>
          <input
            className="input"
            value={state.preco}
            disabled={state.preco_a_combinar}
            inputMode="decimal"
            onChange={(e) => update('preco', limparDecimal(e.target.value))}
            onBlur={() => update('preco', formatarMoeda(state.preco))}
            placeholder="Ex: R$ 28,00"
          />
        </label>
        <label className="field" style={{ justifyContent: 'end' }}>
          <span className="checkbox-row"><input type="checkbox" checked={state.preco_a_combinar} onChange={(e) => update('preco_a_combinar', e.target.checked)} /> Preço a combinar</span>
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span className="label">Quantidade</span>
          <input
            className="input"
            value={state.quantidade}
            inputMode="decimal"
            onChange={(e) => update('quantidade', limparDecimal(e.target.value))}
            placeholder="Ex: 10"
          />
        </label>
        <label className="field">
          <span className="label">Unidade</span>
          <select className="select" value={state.unidade} onChange={(e) => update('unidade', e.target.value)}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span className="label">Estado *</span>
          <select className="select" value={state.estado} onChange={(e) => updateEstado(e.target.value)}>
            <option value="">Selecione o estado</option>
            {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Cidade *</span>
          <select className="select" value={state.cidade} onChange={(e) => update('cidade', e.target.value)} disabled={!state.estado}>
            <option value="">{state.estado ? 'Selecione a cidade' : 'Escolha o estado primeiro'}</option>
            {cidades.map((nomeCidade) => <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>)}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="label">Bairro</span>
        <input className="input" value={state.bairro} onChange={(e) => update('bairro', e.target.value)} placeholder="Opcional" />
      </label>

      <div className="form-row">
        <label className="field">
          <span className="label">Nome do contato *</span>
          <input className="input" value={state.nome_contato} readOnly title="Esse nome vem do seu cadastro" />
          <span className="muted">Vem do seu cadastro. Para alterar, vá em Perfil.</span>
        </label>
        <label className="field">
          <span className="label">WhatsApp *</span>
          <input className="input" value={state.whatsapp} readOnly title="Esse WhatsApp vem do seu cadastro" />
          <span className="muted">Vem do seu cadastro. Para alterar, vá em Perfil.</span>
        </label>
      </div>

      <label className="field">
        <span className="label">Fotos *</span>
        <input className="input" type="file" multiple accept="image/png,image/jpeg,image/webp" required={!anuncio} onChange={(e) => setFiles(e.target.files)} />
        <span className="muted">Obrigatório: pelo menos 1 foto. Até 5 fotos no MVP. A primeira foto vira capa.</span>
      </label>

      <button className="btn btn-primary btn-full" disabled={loading} type="submit">
        {loading ? (savingStep || 'Salvando...') : anuncio ? 'Salvar alterações' : 'Enviar anúncio para aprovação'}
      </button>
    </form>
  );
}
