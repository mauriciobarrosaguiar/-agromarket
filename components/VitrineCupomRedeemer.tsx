'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileText, Gift, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Vitrine } from '@/types';

type CupomResumo = {
  codigo?: string | null;
  descricao?: string | null;
  dias_gratis?: number | null;
  ilimitado?: boolean | null;
};

type CupomUso = {
  id: string;
  cupom_id: string;
  vitrine_id: string;
  status: 'reservado' | 'ativado' | 'cancelado' | 'expirado' | string;
  reservado_em?: string | null;
  ativado_em?: string | null;
  expira_em?: string | null;
  cupom?: CupomResumo | null;
};

type AplicarCupomResultado = {
  ok?: boolean;
  codigo?: string;
  status?: string;
  ja_aplicado?: boolean;
};

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
  const [usoCupom, setUsoCupom] = useState<CupomUso | null>(null);
  const [logado, setLogado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fechado, setFechado] = useState(false);

  const cupomReservado = usoCupom?.status === 'reservado';
  const deveExibir = pathname === '/painel/vitrine'
    && logado
    && !fechado
    && (cupomReservado || !vitrineLiberada(vitrine));

  async function load() {
    if (pathname !== '/painel/vitrine') return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    setLogado(Boolean(userId));

    if (!userId) {
      setVitrine(null);
      setUsoCupom(null);
      return;
    }

    const [{ data: vitrineData }, { data: usoData }] = await Promise.all([
      supabase
        .from('vitrines')
        .select('*')
        .eq('usuario_id', userId)
        .maybeSingle(),
      supabase
        .from('vitrine_cupom_usos')
        .select('id,cupom_id,vitrine_id,status,reservado_em,ativado_em,expira_em')
        .eq('usuario_id', userId)
        .in('status', ['reservado', 'ativado'])
        .order('reservado_em', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    setVitrine((vitrineData || null) as Vitrine | null);

    if (!usoData) {
      setUsoCupom(null);
      return;
    }

    const { data: cupomData } = await supabase
      .from('vitrine_cupons')
      .select('codigo,descricao,dias_gratis,ilimitado')
      .eq('id', usoData.cupom_id)
      .maybeSingle();

    setUsoCupom({ ...(usoData as CupomUso), cupom: (cupomData || null) as CupomResumo | null });
  }

  useEffect(() => {
    load();
  }, [pathname]);

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

    const { data, error } = await rpc;

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const resultado = (data || {}) as AplicarCupomResultado;
    setMessage(
      resultado.status === 'ativado'
        ? 'Cupom aplicado! Sua lojinha foi liberada.'
        : 'Cupom aplicado! O benefício foi reservado. Agora conclua a verificação do perfil.'
    );

    setCodigo('');
    await load();
    setLoading(false);

    window.setTimeout(() => window.location.reload(), 900);
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
        padding: 14,
        boxShadow: '0 18px 45px rgba(0,0,0,.16)',
        border: '2px solid rgba(22,101,52,.18)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 18 }}>
          {cupomReservado ? <CheckCircle2 size={20} /> : <Gift size={20} />}
          {cupomReservado ? 'Cupom reservado' : 'Cupom'}
        </strong>
        <button className="btn btn-secondary" type="button" onClick={() => setFechado(true)} style={{ padding: 8 }} aria-label="Fechar cupom">
          <X size={16} />
        </button>
      </div>

      {message && <div className="notice" style={{ marginBottom: 10 }}>{message}</div>}

      {cupomReservado ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="notice" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <strong>{usoCupom?.cupom?.codigo || 'Cupom aplicado'}</strong>
            <div style={{ marginTop: 4 }}>
              Seu benefício está garantido. Conclua o envio da selfie, documento e localização. A lojinha será liberada automaticamente quando a verificação estiver completa.
            </div>
          </div>
          <Link className="btn btn-primary btn-full" href="/painel/perfil">
            <FileText size={18} /> Continuar verificação
          </Link>
        </div>
      ) : (
        <>
          <div className="notice" style={{ marginBottom: 12, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            Aplique o cupom agora para garantir o benefício. A documentação poderá ser concluída depois.
          </div>
          <form onSubmit={aplicarCupom} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8 }}>
            <input
              className="input"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Cupom"
              autoCapitalize="characters"
              autoComplete="off"
            />
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? 'Aplicando...' : 'Aplicar'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
