'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type OfflineAuth = {
  userId: string;
  isAdmin: boolean;
  savedAt: string;
};

const OFFLINE_AUTH_KEY = 'agromarket-offline-auth-v1';

function readOfflineAuth(): OfflineAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_AUTH_KEY);
    return raw ? JSON.parse(raw) as OfflineAuth : null;
  } catch {
    return null;
  }
}

function saveOfflineAuth(userId: string, isAdmin = false) {
  try {
    localStorage.setItem(OFFLINE_AUTH_KEY, JSON.stringify({
      userId,
      isAdmin,
      savedAt: new Date().toISOString()
    } satisfies OfflineAuth));
  } catch {
    // O acesso online continua funcionando mesmo sem armazenamento local.
  }
}

export default function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      const offline = !navigator.onLine;
      const cached = readOfflineAuth();
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData.session?.user || null;

      if (!offline) {
        try {
          const { data: userData, error } = await supabase.auth.getUser();
          if (userData.user) user = userData.user;
          else if (!error) user = null;
        } catch {
          // Se a conexão cair durante a verificação, usa a sessão salva no aparelho.
        }
      }

      if (!user && offline && cached?.userId) {
        if (active) {
          setAllowed(adminOnly ? cached.isAdmin : true);
          setLoading(false);
        }
        return;
      }

      if (!user) {
        if (active) {
          setAllowed(false);
          setLoading(false);
        }
        return;
      }

      if (!adminOnly) {
        saveOfflineAuth(user.id, cached?.userId === user.id ? cached.isAdmin : false);
        if (active) {
          setAllowed(true);
          setLoading(false);
        }
        return;
      }

      if (offline) {
        if (active) {
          setAllowed(cached?.userId === user.id && cached.isAdmin === true);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.from('usuarios').select('tipo_usuario').eq('id', user.id).single();
      const isAdmin = data?.tipo_usuario === 'admin';
      saveOfflineAuth(user.id, isAdmin);
      if (active) {
        setAllowed(isAdmin);
        setLoading(false);
      }
    }

    check();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(OFFLINE_AUTH_KEY);
        setAllowed(false);
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const cached = readOfflineAuth();
        saveOfflineAuth(session.user.id, cached?.userId === session.user.id ? cached.isAdmin : false);
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
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
