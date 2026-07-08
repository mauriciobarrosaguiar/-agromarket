'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { makeUniqueSlug } from '@/lib/slug';
import { uploadAnuncioFoto } from '@/lib/upload';
import { CIDADES_POR_ESTADO, ESTADOS, TIPOS_ANUNCIO, UNIDADES } from '@/lib/constants';
import type { Categoria, Anuncio, TipoAnuncio } from '@/types';

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

export default function AnuncioForm({ anuncio }: { anuncio?: Anuncio }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(initialState);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!anuncio) return;
    setState({
      tipo_anuncio: anuncio.tipo_anuncio,
      categoria_id: anuncio.categoria_id,
      titulo: anuncio.titulo,
      descricao: anuncio.descricao,
      preco: anuncio.preco ? String(anuncio.preco) : '',
      preco_a_combinar: anuncio.preco_a_combinar,
      quantidade: anuncio.quantidade ? String(anuncio.quantidade) : '',
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
    setLoading(true);

    try {
      const user = await getUsuarioLogado();
      if (!user) {
        const voltarPara = encodeURIComponent('/anunciar');
        throw new Error(`Sua sessão não está ativa neste navegador. Entre novamente para publicar o anúncio. Abra /login?next=${voltarPara}`);
      }

      if (!state.titulo || !state.descricao || !state.categoria_id || !state.estado || !state.cidade || !state.whatsapp || !state.nome_contato) {
        throw new Error('Preencha os campos obrigatórios.');
      }

      const payload = {
        usuario_id: user.id,
        categoria_id: state.categoria_id,
        tipo_anuncio: state.tipo_anuncio,
        titulo: state.titulo.trim(),
        slug: anuncio?.slug || makeUniqueSlug(state.titulo),
        descricao: state.descricao.trim(),
        preco: state.preco_a_combinar || !state.preco ? null : Number(String(state.preco).replace(',', '.')),
        preco_a_combinar: state.preco_a_combinar,
        quantidade: state.quantidade ? Number(String(state.quantidade).replace(',', '.')) : null,
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

      if (anuncioId) {
        const { error } = await supabase.from('anuncios').update(payload).eq('id', anuncioId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('anuncios').insert(payload).select('id').single();
        if (error) throw error;
        anuncioId = data.id;
      }

      if (files && files.length > 0 && anuncioId) {
        const list = Array.from(files).slice(0, 5);
        for (let i = 0; i < list.length; i++) {
          const url = await uploadAnuncioFoto(list[i], anuncioId, i);
          const { error: photoError } = await supabase.from('fotos_anuncios').insert({
            anuncio_id: anuncioId,
            url_foto: url,
            ordem: i,
            principal: i === 0
          });
          if (photoError) throw photoError;
        }
      }

      router.push('/painel/anuncios');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar anúncio.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {error && <div className="notice">{error}</div>}
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
          <input className="input" value={state.preco} disabled={state.preco_a_combinar} onChange={(e) => update('preco', e.target.value)} placeholder="Ex: 150,00" />
        </label>
        <label className="field" style={{ justifyContent: 'end' }}>
          <span className="checkbox-row"><input type="checkbox" checked={state.preco_a_combinar} onChange={(e) => update('preco_a_combinar', e.target.checked)} /> Preço a combinar</span>
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span className="label">Quantidade</span>
          <input className="input" value={state.quantidade} onChange={(e) => update('quantidade', e.target.value)} placeholder="Ex: 10" />
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
          <input className="input" value={state.nome_contato} onChange={(e) => update('nome_contato', e.target.value)} placeholder="Seu nome ou empresa" />
        </label>
        <label className="field">
          <span className="label">WhatsApp *</span>
          <input className="input" value={state.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="5563999999999" />
        </label>
      </div>

      <label className="field">
        <span className="label">Fotos</span>
        <input className="input" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => setFiles(e.target.files)} />
        <span className="muted">Até 5 fotos no MVP. A primeira foto vira capa.</span>
      </label>

      <button className="btn btn-primary btn-full" disabled={loading} type="submit">
        {loading ? 'Salvando...' : anuncio ? 'Salvar alterações' : 'Enviar anúncio para aprovação'}
      </button>
    </form>
  );
}
