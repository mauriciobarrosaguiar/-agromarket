'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { LockKeyhole, Store, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AccessCache = {
  userId: string;
  allowed: boolean;
  reason: 'admin' | 'lojinha_ativa' | 'sem_lojinha' | 'vencida';
  savedAt: string;
};

const ACCESS_KEY = 'agromarket-lojinha-features-v1';

function readStoredUserId() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      const id = parsed?.user?.id || parsed?.session?.user?.id || parsed?.currentSession?.user?.id;
      if (typeof id === 'string' && id) return id;
    }
  } catch {
    return null;
  }
  return null;
}

function readCache(userId?: string | null): AccessCache | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCESS_KEY) || 'null') as AccessCache | null;
    if (!parsed || (userId && parsed.userId !== userId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: AccessCache) {
  try { localStorage.setItem(ACCESS_KEY, JSON.stringify(cache)); } catch { /* segue online */ }
}

function vitrineValida(vitrine: Record<string, unknown> | null) {
  if (!vitrine || vitrine.vitrine_ativa !== true) return false;
  const status = String(vitrine.assinatura_status || '');
  const hoje = new Date().toISOString().slice(0, 10);
  if (status === 'ativa') {
    const vencimento = String(vitrine.assinatura_vencimento || '');
    return !vencimento || vencimento >= hoje;
  }
  if (status === 'gratis_lancamento') {
    const vencimento = String(vitrine.gratis_ate || vitrine.assinatura_vencimento || '');
    return !vencimento || vencimento >= hoje;
  }
  return false;
}

export default function LojinhaFeatureGuard({ children, recurso }: { children: ReactNode; recurso: string }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [reason, setReason] = useState<AccessCache['reason']>('sem_lojinha');

  useEffect(() => {
    let active = true;
    const storedUserId = readStoredUserId();
    const cached = readCache(storedUserId);

    if (!navigator.onLine && cached) {
      setAllowed(cached.allowed);
      setReason(cached.reason);
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!active) return;
      const fallback = readCache(readStoredUserId());
      setAllowed(Boolean(fallback?.allowed));
      setReason(fallback?.reason || 'sem_lojinha');
      setLoading(false);
    }, 5000);

    async function check() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id || storedUserId;
        if (!userId) throw new Error('sem_usuario');

        if (!navigator.onLine) {
          const fallback = readCache(userId);
          if (active) {
            setAllowed(Boolean(fallback?.allowed));
            setReason(fallback?.reason || 'sem_lojinha');
            setLoading(false);
          }
          return;
        }

        const [{ data: usuario }, { data: vitrine }] = await Promise.all([
          supabase.from('usuarios').select('tipo_usuario').eq('id', userId).maybeSingle(),
          supabase.from('vitrines').select('id,vitrine_ativa,assinatura_status,assinatura_vencimento,gratis_ate').eq('usuario_id', userId).maybeSingle()
        ]);

        const admin = usuario?.tipo_usuario === 'admin';
        const liberada = admin || vitrineValida(vitrine as Record<string, unknown> | null);
        const status = String(vitrine?.assinatura_status || '');
        const nextReason: AccessCache['reason'] = admin
          ? 'admin'
          : liberada
            ? 'lojinha_ativa'
            : vitrine && ['vencida', 'cancelada', 'pendente_pagamento'].includes(status)
              ? 'vencida'
              : 'sem_lojinha';

        writeCache({ userId, allowed: liberada, reason: nextReason, savedAt: new Date().toISOString() });
        if (active) {
          setAllowed(liberada);
          setReason(nextReason);
          setLoading(false);
        }
      } catch {
        const fallback = readCache(readStoredUserId());
        if (active) {
          setAllowed(Boolean(fallback?.allowed));
          setReason(fallback?.reason || 'sem_lojinha');
          setLoading(false);
        }
      } finally {
        window.clearTimeout(timeout);
      }
    }

    check();
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return <main className="page"><div className="container"><div className="card">Verificando acesso à lojinha...</div></div></main>;
  }

  if (allowed) return <>{children}</>;

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 620 }}>
        <section className="card" style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ width: 66, height: 66, display: 'grid', placeItems: 'center', margin: '0 auto 14px', borderRadius: 22, color: '#8a5b08', background: '#fff3cf' }}>
            <LockKeyhole size={32} />
          </div>
          <span className="badge"><Store size={14} /> Plano Lojinha</span>
          <h1 style={{ marginBottom: 10 }}>{recurso} faz parte da Lojinha</h1>
          <p className="muted">
            {reason === 'vencida'
              ? 'Sua lojinha está aguardando pagamento, vencida ou inativa. Renove para liberar este recurso novamente.'
              : 'Este recurso é liberado para quem possui uma lojinha ativa no AgroMarket.'}
          </p>
          <div style={{ display: 'grid', gap: 9, margin: '20px 0', textAlign: 'left' }}>
            <div><CheckCircle2 size={17} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Lojinha pública no AgroMarket</div>
            <div><CheckCircle2 size={17} style={{ verticalAlign: 'middle', marginRight: 8 }} /> AgroGestão: estoque, vendas e clientes</div>
            <div><CheckCircle2 size={17} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Incubação de ovos e estatísticas</div>
          </div>
          <strong style={{ display: 'block', fontSize: 26, color: '#0b4b2d', marginBottom: 18 }}>R$ 29,90 por mês</strong>
          <div style={{ display: 'grid', gap: 10 }}>
            <Link href="/painel/vitrine" className="btn btn-primary btn-full">Criar ou renovar minha lojinha</Link>
            <Link href="/painel/perfil" className="btn btn-secondary btn-full">Voltar ao perfil</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
