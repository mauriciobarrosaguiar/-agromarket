'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogOut, Plus, UserRound } from 'lucide-react';

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sair() {
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
          <Link href="/anuncios">Anúncios</Link>
          <Link href="/categoria/animais">Animais</Link>
          <Link href="/categoria/servicos-rurais">Serviços</Link>
          <Link href="/categoria/empregos">Empregos</Link>
        </nav>

        <div className="actions">
          <Link className="btn btn-primary" href="/anunciar"><Plus size={18} /> Anunciar</Link>
          {email ? (
            <>
              <Link className="btn btn-secondary desktop-only" href="/painel"><UserRound size={18} /> Painel</Link>
              <button className="btn btn-secondary" onClick={sair}><LogOut size={18} /> Sair</button>
            </>
          ) : (
            <Link className="btn btn-secondary" href="/login"><UserRound size={18} /> Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
