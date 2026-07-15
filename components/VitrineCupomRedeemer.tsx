'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Vitrine } from '@/types';

function vitrineLiberada(vitrine: Vitrine | null) {
  if (!vitrine?.vitrine_ativa) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  if (vitrine.assinatura_status === 'ativa') return !vitrine.assinatura_vencimento || vitrine.assinatura_vencimento >= hoje;
  if (vitrine.assinatura_status === 'gratis_lancamento') {
    const vencimento = vitrine.gratis_ate || vitrine.assinatura_vencimento;
    return !vencimento || vencimento >= hoje;
  }
  return false;
}

export default function VitrineCupomRedeemer() {
  const pathname = usePathname();
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [logado, setLogado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fechado, setFechado] = useState(false);

  const deveExibir = pathname === '/painel/vitrine' && logado && !vitrineLiberada(vitrine) && !fechado;

  async function load() {
    if (pathname !== '/painel/vitrine') return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    setLogado(Boolean(userId));
    if (!userId) return;

    const { data } = await supabase
      .from('vitrines')
      .select('*')
      .eq('usuario_id', userId)
      .maybeSingle();

    setVitrine((data || null) as Vitrine | null);
  }

  useEffect(() => { load(); }, [pathname]);

  async function aplicarCupom(e: FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) {
      setMessage('Digite o cupom.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const rpc = vitrine
      ? supabase.rpc('aplicar_cupom_vitrine', { codigo_text: codigo.trim(), vitrine_uuid: vitrine.id })
      : supabase.rpc('criar_vitrine_com_cupom', { codigo_text: codigo.trim() });

    const { error } = await rpc;

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Cupom aplicado.');
      await load();
      window.setTimeout(() => window.location.reload(), 800);
    }

    setLoading(false);
  }

  if (!deveExibir) return null;

  return (
    <div
      className="card"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 84,
        zIndex: 870,
        padding: 12,
        boxShadow: '0 18px 45px rgba(0,0,0,.16)',
        border: '2px solid rgba(22,101,52,.18)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Gift size={18} /> Cupom</strong>
        <button className="btn btn-secondary" type="button" onClick={() => setFechado(true)} style={{ padding: 8 }} aria-label="Fechar cupom"><X size={16} /></button>
      </div>

      {message && <div className="notice" style={{ marginBottom: 10 }}>{message}</div>}

      <form onSubmit={aplicarCupom} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Cupom" />
        <button className="btn btn-primary" disabled={loading} type="submit">{loading ? '...' : 'Aplicar'}</button>
      </form>
    </div>
  );
}
