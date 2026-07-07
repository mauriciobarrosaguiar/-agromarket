'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Anuncio, Categoria } from '@/types';
import AnuncioCard from '@/components/AnuncioCard';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState('');
  const [cidade, setCidade] = useState('');
  const [tipo, setTipo] = useState('');
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQ(params.get('q') || '');
    setCategoria(params.get('categoria') || '');
    setCidade(params.get('cidade') || '');
    setTipo(params.get('tipo') || '');
  }, []);

  useEffect(() => {
    supabase.from('categorias').select('*').eq('ativo', true).order('ordem').then(({ data }) => setCategorias((data || []) as Categoria[]));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from('anuncios')
        .select('*, categorias(*), fotos_anuncios(*)')
        .eq('status', 'aprovado')
        .order('destaque', { ascending: false })
        .order('created_at', { ascending: false });

      if (q) query = query.or(`titulo.ilike.%${q}%,descricao.ilike.%${q}%,cidade.ilike.%${q}%`);
      if (categoria) query = query.eq('categoria_id', categoria);
      if (cidade) query = query.ilike('cidade', `%${cidade}%`);
      if (tipo) query = query.eq('tipo_anuncio', tipo);

      const { data } = await query;
      setAnuncios((data || []) as Anuncio[]);
      setLoading(false);
    }
    load();
  }, [q, categoria, cidade, tipo]);

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <h1>Anúncios</h1>
            <p>Busque produtos agro, animais, serviços, máquinas e empregos.</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <SearchBar compact />
          <div className="form-row" style={{ marginTop: 12 }}>
            <label className="field">
              <span className="label">Categoria</span>
              <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label">Cidade</span>
              <input className="input" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Palmas" />
            </label>
          </div>
          <label className="field" style={{ marginTop: 12 }}>
            <span className="label">Tipo</span>
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="animal">Animal</option>
              <option value="produto">Produto</option>
              <option value="servico">Serviço</option>
              <option value="emprego">Emprego</option>
              <option value="maquina">Máquina</option>
              <option value="equipamento">Equipamento</option>
            </select>
          </label>
        </div>

        {loading ? <div className="card">Carregando anúncios...</div> : anuncios.length ? (
          <div className="grid grid-4">
            {anuncios.map((ad) => <AnuncioCard key={ad.id} anuncio={ad} />)}
          </div>
        ) : <EmptyState title="Nenhum anúncio encontrado" description="Tente mudar os filtros ou crie o primeiro anúncio." />}
      </div>
    </main>
  );
}
