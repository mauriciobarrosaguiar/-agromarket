'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/types';

export default function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      if (!adminOnly) {
        setAllowed(true);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
      setAllowed(data?.tipo_usuario === 'admin');
      setLoading(false);
    }
    check();
  }, [adminOnly]);

  if (loading) return <main className="page"><div className="container"><div className="card">Carregando...</div></div></main>;

  if (!allowed) {
    return (
      <main className="page">
        <div className="container">
          <div className="card">
            <h1>Acesso restrito</h1>
            <p className="muted">Entre com uma conta autorizada para acessar esta área.</p>
            <Link href="/login" className="btn btn-primary">Fazer login</Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
