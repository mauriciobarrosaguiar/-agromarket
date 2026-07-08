'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';

function TrocarSenhaContent() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!senhaAtual) {
      setMessage('Informe sua senha atual.');
      return;
    }

    if (novaSenha.length < 6) {
      setMessage('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmar) {
      setMessage('As senhas não conferem.');
      return;
    }

    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

    if (!email) {
      setMessage('Não consegui confirmar seu usuário. Entre novamente e tente de novo.');
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: senhaAtual });

    if (loginError) {
      setMessage('Senha atual incorreta.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) setMessage(error.message);
    else {
      setMessage('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmar('');
    }

    setLoading(false);
  }

  return (
    <form className="form card" onSubmit={submit}>
      {message && <div className="notice">{message}</div>}

      <label className="field">
        <span className="label">Senha atual</span>
        <input className="input" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" />
      </label>

      <label className="field">
        <span className="label">Nova senha</span>
        <input className="input" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
      </label>

      <label className="field">
        <span className="label">Confirmar nova senha</span>
        <input className="input" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" />
      </label>

      <button className="btn btn-primary btn-full" disabled={loading}>
        <KeyRound size={18} /> {loading ? 'Alterando...' : 'Alterar senha'}
      </button>
    </form>
  );
}

export default function SenhaPage() {
  return (
    <AuthGuard>
      <main className="page">
        <div className="container" style={{ maxWidth: 560 }}>
          <Link href="/painel/perfil" className="muted">← Voltar ao perfil</Link>
          <h1>Trocar senha</h1>
          <p className="muted">Altere sua senha de acesso ao AgroMarket.</p>
          <TrocarSenhaContent />
        </div>
      </main>
    </AuthGuard>
  );
}
