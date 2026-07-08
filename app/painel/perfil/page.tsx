'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';
import type { Usuario } from '@/types';

function PerfilContent() {
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    const { error } = await supabase.from('usuarios').update({
      nome: perfil.nome,
      whatsapp: perfil.whatsapp,
      cidade: perfil.cidade,
      estado: perfil.estado
    }).eq('id', perfil.id);
    setMessage(error ? error.message : 'Perfil salvo.');
  }

  if (!perfil) return <div className="card">Carregando...</div>;

  return (
    <form className="form card" onSubmit={submit}>
      {message && <div className="notice">{message}</div>}
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
      <button className="btn btn-primary">Salvar perfil</button>
    </form>
  );
}

export default function PerfilPage() {
  return <AuthGuard><main className="page"><div className="container" style={{ maxWidth: 680 }}><h1>Meu perfil</h1><PerfilContent /></div></main></AuthGuard>;
}
