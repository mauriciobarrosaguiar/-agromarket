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
const AUTH_TIMEOUT_MS = 3500;

function readOfflineAuth(): OfflineAuth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_AUTH_KEY);
    return raw ? JSON.parse(raw) as OfflineAuth : null;
  } catch {
    return null;
  }
}

function readPersistedSupabaseUserId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const stored = JSON.parse(raw);
      const userId = stored?.user?.id
        || stored?.session?.user?.id
        || stored?.currentSession?.user?.id;

      if (typeof userId === 'string' && userId) return userId;
    }
  } catch {
    // Segue usando apenas a autorização simplificada salva pelo AgroMarket.
  }

  return null;
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
    let finished = false;

    const finish = (value: boolean) => {
      if (!active) return;
      finished = true;
      setAllowed(value);
      setLoading(false);
    };

    const cachedAtStart = readOfflineAuth();
    const persistedUserId = cachedAtStart?.userId || readPersistedSupabaseUserId();

    // No modo offline não aguardamos nenhuma chamada do Supabase.
    // A autorização previamente salva é aplicada imediatamente.
    if (!navigator.onLine && persistedUserId) {
      finish(adminOnly ? cachedAtStart?.isAdmin === true : true);
    }

    const timeout = window.setTimeout(() => {
      if (finished) return;
      const cached = readOfflineAuth();
      const userId = cached?.userId || readPersistedSupabaseUserId();
      finish(adminOnly ? cached?.isAdmin === true : Boolean(userId));
    }, AUTH_TIMEOUT_MS);

    async function check() {
      if (finished && !navigator.onLine) return;

      const cached = readOfflineAuth();
      const offline = !navigator.onLine;

      if (offline) {
        const userId = cached?.userId || readPersistedSupabaseUserId();
        finish(adminOnly ? cached?.isAdmin === true : Boolean(userId));
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let user = sessionData.session?.user || null;

        try {
          const { data: userData, error } = await supabase.auth.getUser();
          if (userData.user) user = userData.user;
          else if (!error) user = null;
        } catch {
          // Em conexão instável, utiliza a sessão já persistida no aparelho.
        }

        if (!user) {
          const userId = cached?.userId || readPersistedSupabaseUserId();
          finish(adminOnly ? cached?.isAdmin === true : Boolean(userId));
          return;
        }

        if (!adminOnly) {
          saveOfflineAuth(user.id, cached?.userId === user.id ? cached.isAdmin : false);
          finish(true);
          return;
        }

        const { data } = await supabase
          .from('usuarios')
          .select('tipo_usuario')
          .eq('id', user.id)
          .single();

        const isAdmin = data?.tipo_usuario === 'admin';
        saveOfflineAuth(user.id, isAdmin);
        finish(isAdmin);
      } catch {
        const fallback = readOfflineAuth();
        const userId = fallback?.userId || readPersistedSupabaseUserId();
        finish(adminOnly ? fallback?.isAdmin === true : Boolean(userId));
      }
    }

    check();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Uma queda de conexão ou token vencido não deve expulsar o usuário do modo offline.
        if (navigator.onLine) {
          localStorage.removeItem(OFFLINE_AUTH_KEY);
          finish(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const cached = readOfflineAuth();
        saveOfflineAuth(session.user.id, cached?.userId === session.user.id ? cached.isAdmin : false);
        if (!adminOnly) finish(true);
      }
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
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
