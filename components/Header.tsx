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

        <nav className="nav">
          <Link href="/"><Home size={17} /> Início</Link>
          <Link href="/anuncios"><Search size={17} /> Buscar</Link>
          <Link href="/vitrines"><Store size={17} /> Vitrine</Link>
          <Link href="/painel/perfil"><UserRound size={17} /> Perfil</Link>
        </nav>

        <div className="actions">
          <Link className="btn btn-primary" href="/anunciar"><Plus size={18} /> Anunciar</Link>
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
