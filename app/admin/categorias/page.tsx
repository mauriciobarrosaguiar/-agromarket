'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slug';
import type { Categoria, Subcategoria } from '@/types';

function CategoriasContent() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('produto');
  const [icone, setIcone] = useState('AG');
  const [categoriaSub, setCategoriaSub] = useState('');
  const [nomeSub, setNomeSub] = useState('');

  const categoriasAtivas = useMemo(() => categorias.filter((cat) => cat.ativo), [categorias]);

  async function load() {
    const [{ data: cats }, { data: subs }] = await Promise.all([
      supabase.from('categorias').select('*').order('ordem'),
      supabase.from('subcategorias').select('*').order('ordem')
    ]);
    setCategorias((cats || []) as Categoria[]);
    setSubcategorias((subs || []) as Subcategoria[]);
    if (!categoriaSub && cats?.length) {
      const primeiraAtiva = (cats as Categoria[]).find((cat) => cat.ativo);
      if (primeiraAtiva) setCategoriaSub(primeiraAtiva.id);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!nome) return;
    await supabase.from('categorias').insert({ nome, slug: slugify(nome), tipo, icone, ordem: categorias.length + 1, ativo: true });
    setNome('');
    await load();
  }

  async function criarSubcategoria(e: FormEvent) {
    e.preventDefault();
    if (!categoriaSub || !nomeSub) return;

    const ordem = subcategorias.filter((sub) => sub.categoria_id === categoriaSub).length + 1;
    await supabase.from('subcategorias').insert({ categoria_id: categoriaSub, nome: nomeSub, slug: slugify(nomeSub), ordem, ativo: true });
    setNomeSub('');
    await load();
  }

  async function toggle(cat: Categoria) {
    await supabase.from('categorias').update({ ativo: !cat.ativo, updated_at: new Date().toISOString() }).eq('id', cat.id);
    await load();
  }

  async function toggleSub(sub: Subcategoria) {
    await supabase.from('subcategorias').update({ ativo: !sub.ativo, updated_at: new Date().toISOString() }).eq('id', sub.id);
    await load();
  }

  return (
    <div className="grid grid-2">
      <div className="card form">
        <div className="notice">
          O AgroMarket agora usa 12 categorias principais. Subcategorias ajudam o comprador a filtrar melhor e deixam os anúncios mais organizados.
        </div>

        <form className="form" onSubmit={submit}>
          <h2>Nova categoria</h2>
          <label className="field"><span className="label">Nome</span><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
          <label className="field"><span className="label">Tipo</span><input className="input" value={tipo} onChange={(e) => setTipo(e.target.value)} /></label>
          <label className="field"><span className="label">Ícone/sigla</span><input className="input" value={icone} onChange={(e) => setIcone(e.target.value)} /></label>
          <button className="btn btn-primary">Salvar categoria</button>
        </form>

        <form className="form" onSubmit={criarSubcategoria} style={{ marginTop: 18 }}>
          <h2>Nova subcategoria</h2>
          <label className="field">
            <span className="label">Categoria principal</span>
            <select className="select" value={categoriaSub} onChange={(e) => setCategoriaSub(e.target.value)}>
              {categoriasAtivas.map((cat) => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
            </select>
          </label>
          <label className="field"><span className="label">Nome da subcategoria</span><input className="input" value={nomeSub} onChange={(e) => setNomeSub(e.target.value)} placeholder="Ex: Codornas" /></label>
          <button className="btn btn-primary">Salvar subcategoria</button>
        </form>
      </div>

      <div className="card">
        <h2>Categorias e subcategorias</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {categorias.map((cat) => {
            const subs = subcategorias.filter((sub) => sub.categoria_id === cat.id);
            return (
              <article className="card" key={cat.id} style={{ background: cat.ativo ? '#fff' : '#f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                  <div>
                    <strong>{cat.icone} {cat.nome}</strong><br />
                    <span className="muted">{cat.tipo} • ordem {cat.ordem}</span>
                  </div>
                  <button className="btn btn-secondary" onClick={() => toggle(cat)}>{cat.ativo ? 'Desativar' : 'Ativar'}</button>
                </div>

                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
                  {subs.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className="badge"
                      onClick={() => toggleSub(sub)}
                      title={sub.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      style={{ opacity: sub.ativo ? 1 : .45, border: 0 }}
                    >
                      {sub.nome}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CategoriasPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><h1>Categorias</h1><CategoriasContent /></div></main></AuthGuard>;
}
