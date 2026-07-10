'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, LogOut, Plus, Search, Store, UserRound } from 'lucide-react';

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);

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
        <Link href="/" className="logo" aria-label="AgroMarket">
          <span className="logo-mark">Ag</span>
          <span>AgroMarket</span>
        </Link>

        <nav className="nav nav-pill">
          <Link href="/"><Home size={16} /> Início</Link>
          <Link href="/anuncios"><Search size={16} /> Buscar</Link>
          <Link href="/vitrines"><Store size={16} /> Lojinhas</Link>
          <Link href="/painel/perfil"><UserRound size={16} /> Perfil</Link>
        </nav>

        <div className="actions">
          <Link className="btn btn-amber header-cta" href="/anunciar"><Plus size={18} /> Anunciar grátis</Link>
          {email ? (
            <button className="btn btn-secondary" onClick={sair} disabled={saindo} aria-busy={saindo}>
              <LogOut size={18} /> {saindo ? 'Saindo...' : 'Sair'}
            </button>
          ) : (
            <Link className="btn btn-secondary" href="/login"><UserRound size={18} /> Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
