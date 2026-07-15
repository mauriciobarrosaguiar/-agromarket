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

function dataBR(value?: string | null) {
  if (!value) return 'sem vencimento';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

export default function VitrineCupomRedeemer() {
  const pathname = usePathname();
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [codigo, setCodigo] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fechado, setFechado] = useState(false);

  const deveExibir = pathname === '/painel/vitrine' && vitrine && !vitrineLiberada(vitrine) && !fechado;

  async function load() {
    if (pathname !== '/painel/vitrine') return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
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
    if (!vitrine) return;
    if (!codigo.trim()) {
      setMessage('Digite o código do cupom.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.rpc('aplicar_cupom_vitrine', {
      codigo_text: codigo.trim(),
      vitrine_uuid: vitrine.id
    });

    if (error) {
      setMessage(error.message);
    } else {
      const resultado = data as { gratis_ate?: string | null; ilimitado?: boolean } | null;
      setMessage(resultado?.ilimitado ? 'Cupom aplicado. Sua lojinha foi liberada grátis sem vencimento.' : `Cupom aplicado. Sua lojinha foi liberada grátis até ${dataBR(resultado?.gratis_ate)}.`);
      await load();
      window.setTimeout(() => window.location.reload(), 1200);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div>
          <strong style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Gift size={18} /> Tem cupom de lojinha grátis?</strong>
          <p className="muted" style={{ margin: '4px 0 10px' }}>Digite o código antes de gerar ou pagar o Pix.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => setFechado(true)} style={{ padding: 8 }} aria-label="Fechar cupom"><X size={16} /></button>
      </div>

      {message && <div className="notice" style={{ marginBottom: 10 }}>{message}</div>}

      <form onSubmit={aplicarCupom} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: LOJINHA15" />
        <button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Aplicando...' : 'Aplicar'}</button>
      </form>
    </div>
  );
}
