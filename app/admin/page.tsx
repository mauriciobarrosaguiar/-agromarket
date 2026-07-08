'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';
import type { Anuncio, Denuncia, Usuario, Vitrine } from '@/types';

function AdminContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vitrines, setVitrines] = useState<Vitrine[]>([]);
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: ads }, { data: users }, { data: lojas }, { data: reports }] = await Promise.all([
        supabase.from('anuncios').select('*'),
        supabase.from('usuarios').select('*'),
        supabase.from('vitrines').select('*'),
        supabase.from('denuncias').select('*')
      ]);
      setAnuncios((ads || []) as Anuncio[]);
      setUsuarios((users || []) as Usuario[]);
      setVitrines((lojas || []) as Vitrine[]);
      setDenuncias((reports || []) as Denuncia[]);
    }
    load();
  }, []);

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div><h1>Admin AgroMarket</h1><p>Controle anúncios, usuários, categorias, vitrines e denúncias.</p></div>
        </div>
        <div className="stats-grid">
          <StatCard label="Anúncios" value={anuncios.length} />
          <StatCard label="Pendentes" value={anuncios.filter((a) => a.status === 'pendente').length} />
          <StatCard label="Aprovados" value={anuncios.filter((a) => a.status === 'aprovado').length} />
          <StatCard label="Denúncias abertas" value={denuncias.filter((d) => d.status === 'aberta').length} />
          <StatCard label="Usuários" value={usuarios.length} />
          <StatCard label="Vitrines" value={vitrines.length} />
        </div>
        <div className="grid grid-4 section">
          <Link className="card" href="/admin/pendentes"><strong>Pendentes</strong><p className="muted">Aprovar ou recusar anúncios.</p></Link>
          <Link className="card" href="/admin/denuncias"><strong>Denúncias</strong><p className="muted">Analisar denúncias e bloquear anúncios.</p></Link>
          <Link className="card" href="/admin/anuncios"><strong>Anúncios</strong><p className="muted">Gerenciar todos os anúncios.</p></Link>
          <Link className="card" href="/admin/vitrines"><strong>Vitrines</strong><p className="muted">Liberar, destacar ou desativar vitrines.</p></Link>
          <Link className="card" href="/admin/categorias"><strong>Categorias</strong><p className="muted">Criar e editar categorias.</p></Link>
          <Link className="card" href="/admin/usuarios"><strong>Usuários</strong><p className="muted">Ver anunciantes.</p></Link>
        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return <AuthGuard adminOnly><AdminContent /></AuthGuard>;
}
