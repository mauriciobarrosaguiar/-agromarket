'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, LogOut, Menu, Plus, Search, Store, UserRound, X } from 'lucide-react';
import InstallAppButton from '@/components/InstallAppButton';

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sair() {
    if (saindo) return;
    setSaindo(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="AgroMarket" onClick={() => setMenuOpen(false)}>
          <span className="logo-mark">Ag</span>
          <span>AgroMarket</span>
        </Link>

        <nav className="nav nav-pill">
          <Link href="/"><Home size={16} /> Início</Link>
          <Link href="/anuncios"><Search size={16} /> Buscar</Link>
          <Link href="/vitrines"><Store size={16} /> Lojinhas</Link>
          <Link href="/anunciar">Anunciar</Link>
          {email && <Link href="/painel/perfil"><UserRound size={16} /> Perfil</Link>}
        </nav>

        <div className="actions header-actions-desktop">
          <InstallAppButton variant="button" label="Baixar app" />
          <Link className="btn btn-amber header-cta" href="/anunciar"><Plus size={18} /> Anunciar grátis</Link>
          {email ? (
            <>
              <Link className="btn btn-secondary" href="/painel/perfil"><UserRound size={18} /> Perfil</Link>
              <button className="btn btn-secondary" onClick={sair} disabled={saindo} aria-busy={saindo}>
                <LogOut size={18} /> {saindo ? 'Saindo...' : 'Sair'}
              </button>
            </>
          ) : (
            <Link className="btn btn-secondary" href="/login"><UserRound size={18} /> Entrar</Link>
          )}
        </div>

        <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Abrir menu">
          {menuOpen ? <X size={25} /> : <Menu size={27} />}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu-panel">
          <Link href="/" onClick={() => setMenuOpen(false)}>Início</Link>
          <Link href="/anuncios" onClick={() => setMenuOpen(false)}>Buscar anúncios</Link>
          <Link href="/vitrines" onClick={() => setMenuOpen(false)}>Lojinhas</Link>
          <Link href="/anunciar" onClick={() => setMenuOpen(false)}>Anunciar grátis</Link>
          <InstallAppButton variant="button" label="Baixar app" full />
          <Link href="/painel/perfil" onClick={() => setMenuOpen(false)}>Perfil</Link>
          {email ? (
            <button type="button" onClick={sair} disabled={saindo}>{saindo ? 'Saindo...' : 'Sair'}</button>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)}>Entrar</Link>
          )}
        </div>
      )}
    </header>
  );
}
