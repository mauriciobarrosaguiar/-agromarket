'use client';

import { FormEvent, useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slug';
import type { Categoria } from '@/types';

function CategoriasContent() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('produto');
  const [icone, setIcone] = useState('🌱');

  async function load() {
    const { data } = await supabase.from('categorias').select('*').order('ordem');
    setCategorias((data || []) as Categoria[]);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!nome) return;
    await supabase.from('categorias').insert({ nome, slug: slugify(nome), tipo, icone, ordem: categorias.length + 1, ativo: true });
    setNome('');
    await load();
  }

  async function toggle(cat: Categoria) {
    await supabase.from('categorias').update({ ativo: !cat.ativo }).eq('id', cat.id);
    await load();
  }

  return (
    <div className="grid grid-2">
      <form className="card form" onSubmit={submit}>
        <h2>Nova categoria</h2>
        <label className="field"><span className="label">Nome</span><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
        <label className="field"><span className="label">Tipo</span><input className="input" value={tipo} onChange={(e) => setTipo(e.target.value)} /></label>
        <label className="field"><span className="label">Ícone/emoji</span><input className="input" value={icone} onChange={(e) => setIcone(e.target.value)} /></label>
        <button className="btn btn-primary">Salvar categoria</button>
      </form>
      <div className="card">
        <h2>Categorias</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              {categorias.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.icone} <strong>{cat.nome}</strong><br /><span className="muted">{cat.tipo}</span></td>
                  <td>{cat.ativo ? 'Ativa' : 'Inativa'}</td>
                  <td><button className="btn btn-secondary" onClick={() => toggle(cat)}>{cat.ativo ? 'Desativar' : 'Ativar'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CategoriasPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><h1>Categorias</h1><CategoriasContent /></div></main></AuthGuard>;
}
