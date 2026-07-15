'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Plus } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';

type Cupom = {
  id: string;
  codigo: string;
  descricao?: string | null;
  dias_gratis?: number | null;
  ilimitado: boolean;
  uso_maximo?: number | null;
  uso_atual: number;
  ativo: boolean;
  valido_ate?: string | null;
  created_at?: string;
};

function hojeMaisDias(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function AdminCuponsContent() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [diasGratis, setDiasGratis] = useState('90');
  const [usoMaximo, setUsoMaximo] = useState('15');
  const [validoAte, setValidoAte] = useState(hojeMaisDias(60));
  const [ilimitado, setIlimitado] = useState(false);

  async function load() {
    const { data } = await supabase.from('vitrine_cupons').select('*').order('created_at', { ascending: false });
    setCupons((data || []) as Cupom[]);
  }

  useEffect(() => { load(); }, []);

  async function criarCupom(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!codigo.trim()) {
      setMessage('Informe o código do cupom.');
      return;
    }

    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('vitrine_cupons').insert({
      codigo: codigo.trim().toUpperCase(),
      descricao: descricao.trim() || null,
      dias_gratis: ilimitado ? null : Number(diasGratis || 30),
      ilimitado,
      uso_maximo: usoMaximo ? Number(usoMaximo) : null,
      valido_ate: validoAte || null,
      ativo: true,
      criado_por: userData.user?.id || null
    });

    if (error) setMessage(error.message);
    else {
      setMessage('Cupom criado com sucesso.');
      setCodigo('');
      setDescricao('');
      setDiasGratis('90');
      setUsoMaximo('15');
      setValidoAte(hojeMaisDias(60));
      setIlimitado(false);
      await load();
    }
    setSaving(false);
  }

  async function alternarAtivo(cupom: Cupom) {
    const { error } = await supabase.from('vitrine_cupons').update({ ativo: !cupom.ativo, updated_at: new Date().toISOString() }).eq('id', cupom.id);
    if (error) setMessage(error.message);
    else await load();
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="badge"><Gift size={14} /> Cupons de vitrine</span>
            <h1>Cupons para lojinha grátis</h1>
            <p>Crie códigos para liberar vitrine gratuita antes do pagamento.</p>
          </div>
          <Link className="btn btn-secondary" href="/admin">Voltar admin</Link>
        </div>

        {message && <div className="notice">{message}</div>}

        <form className="card form" onSubmit={criarCupom} style={{ marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>Novo cupom</h2>
          <div className="form-row">
            <label className="field"><span className="label">Código *</span><input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: LOJINHA15" /></label>
            <label className="field"><span className="label">Limite de usos</span><input className="input" inputMode="numeric" value={usoMaximo} onChange={(e) => setUsoMaximo(e.target.value.replace(/\D/g, ''))} placeholder="Ex: 15" /></label>
          </div>
          <label className="field"><span className="label">Descrição</span><input className="input" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Campanha de lançamento" /></label>
          <div className="form-row">
            <label className="field"><span className="label">Dias grátis</span><input className="input" inputMode="numeric" disabled={ilimitado} value={diasGratis} onChange={(e) => setDiasGratis(e.target.value.replace(/\D/g, ''))} /></label>
            <label className="field"><span className="label">Válido até</span><input className="input" type="date" value={validoAte} onChange={(e) => setValidoAte(e.target.value)} /></label>
          </div>
          <label className="checkbox-row"><input type="checkbox" checked={ilimitado} onChange={(e) => setIlimitado(e.target.checked)} /> Grátis ilimitada, sem vencimento</label>
          <button className="btn btn-primary" disabled={saving}><Plus size={18} /> {saving ? 'Criando...' : 'Criar cupom'}</button>
        </form>

        <div className="grid grid-2">
          {cupons.map((cupom) => (
            <article className="card" key={cupom.id}>
              <span className="badge">{cupom.ativo ? 'Ativo' : 'Inativo'}</span>
              <h2 style={{ marginBottom: 6 }}>{cupom.codigo}</h2>
              <p className="muted">{cupom.descricao || 'Sem descrição.'}</p>
              <p className="muted">Liberação: <strong>{cupom.ilimitado ? 'grátis ilimitada' : `${cupom.dias_gratis || 30} dias grátis`}</strong></p>
              <p className="muted">Usos: <strong>{cupom.uso_atual}</strong>{cupom.uso_maximo ? ` / ${cupom.uso_maximo}` : ''}</p>
              <p className="muted">Válido até: {cupom.valido_ate ? new Date(`${cupom.valido_ate}T12:00:00`).toLocaleDateString('pt-BR') : 'sem vencimento'}</p>
              <button className="btn btn-secondary btn-full" onClick={() => alternarAtivo(cupom)}>{cupom.ativo ? 'Desativar cupom' : 'Ativar cupom'}</button>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function AdminCuponsPage() {
  return <AuthGuard adminOnly><AdminCuponsContent /></AuthGuard>;
}
