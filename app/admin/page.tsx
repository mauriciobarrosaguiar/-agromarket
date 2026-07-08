'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BadgeDollarSign, BellRing, Boxes, CheckCircle2, DatabaseBackup, LayoutDashboard, Megaphone, MessageCircle, ShieldCheck, Store, Tags, Users } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';
import type { Anuncio, AnuncioWhatsappClique, Denuncia, DestaqueSolicitacao, PatrocinadoHome, Usuario, Vitrine } from '@/types';

function AdminContent() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vitrines, setVitrines] = useState<Vitrine[]>([]);
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [destaques, setDestaques] = useState<DestaqueSolicitacao[]>([]);
  const [patrocinados, setPatrocinados] = useState<PatrocinadoHome[]>([]);
  const [cliques, setCliques] = useState<AnuncioWhatsappClique[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: ads }, { data: users }, { data: lojas }, { data: reports }, { data: highlights }, { data: banners }, { data: clicks }] = await Promise.all([
        supabase.from('anuncios').select('*'),
        supabase.from('usuarios').select('*'),
        supabase.from('vitrines').select('*'),
        supabase.from('denuncias').select('*'),
        supabase.from('destaque_solicitacoes').select('*'),
        supabase.from('patrocinados_home').select('*'),
        supabase.from('anuncio_whatsapp_cliques').select('*').limit(1000)
      ]);
      setAnuncios((ads || []) as Anuncio[]);
      setUsuarios((users || []) as Usuario[]);
      setVitrines((lojas || []) as Vitrine[]);
      setDenuncias((reports || []) as Denuncia[]);
      setDestaques((highlights || []) as DestaqueSolicitacao[]);
      setPatrocinados((banners || []) as PatrocinadoHome[]);
      setCliques((clicks || []) as AnuncioWhatsappClique[]);
    }
    load();
  }, []);

  const pendentes = anuncios.filter((a) => a.status === 'pendente').length;
  const aprovados = anuncios.filter((a) => a.status === 'aprovado').length;
  const destaquesPendentes = destaques.filter((d) => d.status === 'pendente').length;
  const denunciasAbertas = denuncias.filter((d) => d.status === 'aberta').length;
  const bannersAtivos = patrocinados.filter((p) => p.ativo).length;
  const atencao = pendentes + destaquesPendentes + denunciasAbertas;

  const grupos = [
    {
      titulo: 'Operação diária',
      descricao: 'Aprovação, moderação e controle do marketplace.',
      itens: [
        { href: '/admin/pendentes', titulo: 'Aprovar anúncios', texto: `${pendentes} anúncio(s) aguardando análise`, icon: CheckCircle2, destaque: pendentes > 0 },
        { href: '/admin/destaques', titulo: 'Aprovar destaques', texto: `${destaquesPendentes} solicitação(ões) pendente(s)`, icon: BellRing, destaque: destaquesPendentes > 0 },
        { href: '/admin/denuncias', titulo: 'Denúncias', texto: `${denunciasAbertas} denúncia(s) aberta(s)`, icon: AlertTriangle, destaque: denunciasAbertas > 0 },
        { href: '/admin/anuncios', titulo: 'Todos os anúncios', texto: 'Editar status, pausar, reprovar e destacar.', icon: Megaphone, destaque: false }
      ]
    },
    {
      titulo: 'Comercial e monetização',
      descricao: 'Preços, planos, patrocinados e relatórios para clientes.',
      itens: [
        { href: '/admin/monetizacao', titulo: 'Planos e pagamentos', texto: 'Editar preços, Asaas, Efí e PIX.', icon: BadgeDollarSign, destaque: false },
        { href: '/admin/vitrines', titulo: 'Vitrines', texto: `${vitrines.length} vitrine(s) cadastrada(s)`, icon: Store, destaque: false },
        { href: '/admin/patrocinados', titulo: 'Patrocinados da home', texto: `${bannersAtivos} banner(s) ativo(s) no carrossel`, icon: Megaphone, destaque: bannersAtivos > 0 },
        { href: '/admin/whatsapp-cliques', titulo: 'Cliques no WhatsApp', texto: `${cliques.length} clique(s) registrados para relatório`, icon: MessageCircle, destaque: false }
      ]
    },
    {
      titulo: 'Base e segurança',
      descricao: 'Usuários, categorias, backup e checklist de produção.',
      itens: [
        { href: '/admin/usuarios', titulo: 'Usuários', texto: `${usuarios.length} usuário(s) cadastrado(s)`, icon: Users, destaque: false },
        { href: '/admin/categorias', titulo: 'Categorias', texto: 'Editar categorias do marketplace.', icon: Tags, destaque: false },
        { href: '/admin/seguranca', titulo: 'Backup e segurança', texto: 'Checklist, documentos privados e backup manual.', icon: DatabaseBackup, destaque: false }
      ]
    }
  ];

  return (
    <main className="page">
      <div className="container">
        <section className="card" style={{ background: 'linear-gradient(135deg, #052e16, #166534)', color: '#fff', marginBottom: 18 }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}><LayoutDashboard size={14} /> Central administrativa</span>
          <h1 style={{ color: '#fff', marginBottom: 8 }}>Admin AgroMarket</h1>
          <p style={{ color: 'rgba(255,255,255,.84)', marginBottom: 18 }}>Controle operação, monetização, segurança, usuários, vitrines, pagamentos, patrocinados e relatórios em um só lugar.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" href="/admin/monetizacao"><BadgeDollarSign size={18} /> Planos e pagamentos</Link>
            <Link className="btn btn-secondary" href="/admin/patrocinados"><Megaphone size={18} /> Patrocinados</Link>
            <Link className="btn btn-secondary" href="/admin/whatsapp-cliques"><MessageCircle size={18} /> Relatório WhatsApp</Link>
            <Link className="btn btn-secondary" href="/admin/seguranca"><ShieldCheck size={18} /> Backup e segurança</Link>
            {atencao > 0 && <Link className="btn btn-secondary" href="/painel"><BellRing size={18} /> {atencao} pendência(s)</Link>}
          </div>
        </section>

        <div className="stats-grid">
          <StatCard label="Anúncios" value={anuncios.length} href="/admin/anuncios" />
          <StatCard label="Pendentes" value={pendentes} href="/admin/pendentes" />
          <StatCard label="Aprovados" value={aprovados} href="/admin/anuncios" />
          <StatCard label="Destaques pendentes" value={destaquesPendentes} href="/admin/destaques" />
          <StatCard label="Denúncias abertas" value={denunciasAbertas} href="/admin/denuncias" />
          <StatCard label="Patrocinados" value={bannersAtivos} href="/admin/patrocinados" />
          <StatCard label="Cliques WhatsApp" value={cliques.length} href="/admin/whatsapp-cliques" />
          <StatCard label="Usuários" value={usuarios.length} href="/admin/usuarios" />
          <StatCard label="Vitrines" value={vitrines.length} href="/admin/vitrines" />
        </div>

        {grupos.map((grupo) => (
          <section className="section" key={grupo.titulo}>
            <div className="section-head section-head-compact">
              <div>
                <h2>{grupo.titulo}</h2>
                <p>{grupo.descricao}</p>
              </div>
            </div>
            <div className="grid grid-4">
              {grupo.itens.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    className="card"
                    href={item.href}
                    style={{ textDecoration: 'none', border: item.destaque ? '2px solid rgba(22, 101, 52, .42)' : undefined }}
                  >
                    <div style={{ width: 46, height: 46, borderRadius: 16, background: item.destaque ? '#dcfce7' : '#f1f5ec', display: 'grid', placeItems: 'center', color: '#14532d', marginBottom: 12 }}>
                      <Icon size={24} />
                    </div>
                    <strong style={{ display: 'block', fontSize: 20 }}>{item.titulo}</strong>
                    <p className="muted">{item.texto}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return <AuthGuard adminOnly><AdminContent /></AuthGuard>;
}
