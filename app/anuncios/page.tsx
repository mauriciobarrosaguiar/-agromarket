'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocateFixed, Search, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CIDADES_POR_ESTADO, ESTADOS, TIPOS_ANUNCIO } from '@/lib/constants';
import type { Anuncio, Categoria } from '@/types';
import AnuncioCard from '@/components/AnuncioCard';
import EmptyState from '@/components/EmptyState';

type Ordenacao = 'recentes' | 'menor_preco' | 'maior_preco' | 'mais_vistos' | 'perto_de_mim';
type PrecoFiltro = 'todos' | 'com_preco' | 'a_combinar';

type Coordenadas = {
  lat: number;
  lng: number;
};

function parseValor(valor: string): number | null {
  if (!valor) return null;
  const numero = Number(valor.replace(/[^\d,\.]/g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function distanciaKm(origem: Coordenadas, anuncio: Anuncio) {
  if (!anuncio.latitude || !anuncio.longitude) return null;
  const raioTerra = 6371;
  const dLat = ((Number(anuncio.latitude) - origem.lat) * Math.PI) / 180;
  const dLng = ((Number(anuncio.longitude) - origem.lng) * Math.PI) / 180;
  const lat1 = (origem.lat * Math.PI) / 180;
  const lat2 = (Number(anuncio.latitude) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function limparBusca(valor: string) {
  return valor.trim().replace(/[,%]/g, ' ');
}

export default function AnunciosPage() {
  const router = useRouter();
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [tipo, setTipo] = useState('');
  const [precoMin, setPrecoMin] = useState('');
  const [precoMax, setPrecoMax] = useState('');
  const [precoFiltro, setPrecoFiltro] = useState<PrecoFiltro>('todos');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recentes');
  const [distancia, setDistancia] = useState('');
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [q, setQ] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const cidades = useMemo(() => estado ? (CIDADES_POR_ESTADO[estado] || []) : [], [estado]);
  const filtrosAtivos = [q, categoria, estado, cidade, tipo, precoMin, precoMax, precoFiltro !== 'todos' ? precoFiltro : '', distancia, ordenacao !== 'recentes' ? ordenacao : ''].filter(Boolean).length;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQ(params.get('q') || '');
    setCategoria(params.get('categoria') || '');
    setEstado(params.get('estado') || '');
    setCidade(params.get('cidade') || '');
    setTipo(params.get('tipo') || '');
    setPrecoMin(params.get('preco_min') || '');
    setPrecoMax(params.get('preco_max') || '');
    setPrecoFiltro((params.get('preco') as PrecoFiltro) || 'todos');
    setOrdenacao((params.get('ordem') as Ordenacao) || 'recentes');
    setDistancia(params.get('distancia') || '');
  }, []);

  useEffect(() => {
    supabase.from('categorias').select('*').eq('ativo', true).order('ordem').then(({ data }) => setCategorias((data || []) as Categoria[]));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage(null);

      let query = supabase
        .from('anuncios')
        .select('*, categorias(*), fotos_anuncios(*)')
        .eq('status', 'aprovado');

      const busca = limparBusca(q);
      if (busca) {
        query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%,cidade.ilike.%${busca}%,bairro.ilike.%${busca}%,endereco.ilike.%${busca}%`);
      }

      if (categoria) query = query.eq('categoria_id', categoria);
      if (estado) query = query.eq('estado', estado);
      if (cidade) query = query.ilike('cidade', `%${cidade}%`);
      if (tipo) query = query.eq('tipo_anuncio', tipo);
      if (precoFiltro === 'a_combinar') query = query.eq('preco_a_combinar', true);
      if (precoFiltro === 'com_preco') query = query.eq('preco_a_combinar', false).not('preco', 'is', null);

      const min = parseValor(precoMin);
      const max = parseValor(precoMax);
      if (min !== null) query = query.gte('preco', min);
      if (max !== null) query = query.lte('preco', max);

      if (ordenacao === 'menor_preco') {
        query = query.order('preco_a_combinar', { ascending: true }).order('preco', { ascending: true, nullsFirst: false });
      } else if (ordenacao === 'maior_preco') {
        query = query.order('preco', { ascending: false, nullsFirst: false });
      } else if (ordenacao === 'mais_vistos') {
        query = query.order('visualizacoes', { ascending: false }).order('created_at', { ascending: false });
      } else {
        query = query.order('destaque', { ascending: false }).order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        setMessage(error.message);
        setAnuncios([]);
        setLoading(false);
        return;
      }

      let lista = (data || []) as Anuncio[];

      if ((distancia || ordenacao === 'perto_de_mim') && coords) {
        const limite = parseValor(distancia);
        lista = lista
          .map((ad) => ({ ...ad, distancia_calculada: distanciaKm(coords, ad) }) as Anuncio & { distancia_calculada: number | null })
          .filter((ad) => ad.distancia_calculada !== null && (limite === null || ad.distancia_calculada <= limite))
          .sort((a, b) => (a.distancia_calculada || 999999) - (b.distancia_calculada || 999999));
      }

      if ((distancia || ordenacao === 'perto_de_mim') && !coords) {
        setMessage('Para filtrar por distância, toque em “Usar minha localização”.');
      }

      setAnuncios(lista);
      setLoading(false);
    }

    load();
  }, [q, categoria, estado, cidade, tipo, precoMin, precoMax, precoFiltro, ordenacao, distancia, coords]);

  function aplicarFiltros(e?: FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (categoria) params.set('categoria', categoria);
    if (estado) params.set('estado', estado);
    if (cidade) params.set('cidade', cidade);
    if (tipo) params.set('tipo', tipo);
    if (precoMin) params.set('preco_min', precoMin);
    if (precoMax) params.set('preco_max', precoMax);
    if (precoFiltro !== 'todos') params.set('preco', precoFiltro);
    if (ordenacao !== 'recentes') params.set('ordem', ordenacao);
    if (distancia) params.set('distancia', distancia);
    router.push(`/anuncios?${params.toString()}`);
  }

  function limparFiltros() {
    setQ('');
    setCategoria('');
    setEstado('');
    setCidade('');
    setTipo('');
    setPrecoMin('');
    setPrecoMax('');
    setPrecoFiltro('todos');
    setOrdenacao('recentes');
    setDistancia('');
    setMessage(null);
    router.push('/anuncios');
  }

  function mudarEstado(uf: string) {
    setEstado(uf);
    setCidade('');
  }

  function usarMinhaLocalizacao() {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage('Seu navegador não permite localização automática.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        setMessage('Localização capturada. Agora você pode ordenar ou filtrar por distância.');
      },
      () => {
        setGeoLoading(false);
        setMessage('Não consegui pegar sua localização. Verifique a permissão do GPS.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Anúncios</h1>
            <p>Busque produtos agro, animais, serviços, máquinas e empregos.</p>
          </div>
        </div>

        <form className="card form" style={{ marginBottom: 18 }} onSubmit={aplicarFiltros}>
          {message && <div className="notice">{message}</div>}

          <div className="search-row" style={{ marginTop: 0 }}>
            <input
              className="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar milho, soja, leitão, ovos, trator..."
            />
            <button className="btn btn-primary" type="submit"><Search size={18} /> Buscar</button>
          </div>

          <div className="form-row">
            <label className="field">
              <span className="label">Categoria</span>
              <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
              </select>
            </label>

            <label className="field">
              <span className="label">Tipo</span>
              <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Todos</option>
                {TIPOS_ANUNCIO.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span className="label">Estado</span>
              <select className="select" value={estado} onChange={(e) => mudarEstado(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </label>

            <label className="field">
              <span className="label">Cidade</span>
              <select className="select" value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={!estado}>
                <option value="">{estado ? 'Todas' : 'Escolha o estado primeiro'}</option>
                {cidades.map((nomeCidade) => <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span className="label">Preço mínimo</span>
              <input className="input" inputMode="decimal" value={precoMin} onChange={(e) => setPrecoMin(e.target.value.replace(/[^\d,\.]/g, ''))} placeholder="Ex: 20" />
            </label>

            <label className="field">
              <span className="label">Preço máximo</span>
              <input className="input" inputMode="decimal" value={precoMax} onChange={(e) => setPrecoMax(e.target.value.replace(/[^\d,\.]/g, ''))} placeholder="Ex: 150" />
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span className="label">Preço</span>
              <select className="select" value={precoFiltro} onChange={(e) => setPrecoFiltro(e.target.value as PrecoFiltro)}>
                <option value="todos">Todos</option>
                <option value="com_preco">Somente com preço</option>
                <option value="a_combinar">Somente a combinar</option>
              </select>
            </label>

            <label className="field">
              <span className="label">Ordenar por</span>
              <select className="select" value={ordenacao} onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}>
                <option value="recentes">Mais recentes</option>
                <option value="menor_preco">Menor preço</option>
                <option value="maior_preco">Maior preço</option>
                <option value="mais_vistos">Mais vistos</option>
                <option value="perto_de_mim">Perto de mim</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span className="label">Distância máxima</span>
              <select className="select" value={distancia} onChange={(e) => setDistancia(e.target.value)}>
                <option value="">Sem limite</option>
                <option value="10">Até 10 km</option>
                <option value="25">Até 25 km</option>
                <option value="50">Até 50 km</option>
                <option value="100">Até 100 km</option>
                <option value="200">Até 200 km</option>
              </select>
            </label>

            <label className="field" style={{ justifyContent: 'end' }}>
              <button className="btn btn-secondary btn-full" type="button" onClick={usarMinhaLocalizacao} disabled={geoLoading}>
                <LocateFixed size={18} /> {geoLoading ? 'Pegando localização...' : coords ? 'Localização ativa' : 'Usar minha localização'}
              </button>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><SlidersHorizontal size={17} /> {filtrosAtivos} filtro(s) ativo(s)</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" type="button" onClick={limparFiltros}><X size={17} /> Limpar</button>
              <button className="btn btn-primary" type="submit">Aplicar filtros</button>
            </div>
          </div>
        </form>

        {loading ? <div className="card">Carregando anúncios...</div> : anuncios.length ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>{anuncios.length} anúncio(s) encontrado(s).</p>
            <div className="grid grid-4">
              {anuncios.map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
            </div>
          </>
        ) : <EmptyState title="Nenhum anúncio encontrado" description="Tente mudar os filtros ou crie o primeiro anúncio." />}
      </div>
    </main>
  );
}
