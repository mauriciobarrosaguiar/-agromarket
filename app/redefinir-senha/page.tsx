'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RedefinirSenhaPage() {
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [preparando, setPreparando] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function prepararSessao() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setMessage('Link inválido ou expirado. Solicite uma nova recuperação de senha.');
      }

      setPreparando(false);
    }

    prepararSessao();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (senha.length < 6) {
      setMessage('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmar) {
      setMessage('As senhas não conferem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Senha alterada com sucesso. Agora você já pode entrar normalmente.');
      setSenha('');
      setConfirmar('');
    }

    setLoading(false);
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">
          <span className="badge"><ShieldCheck size={14} /> Segurança da conta</span>
          <h1>Nova senha</h1>
          <p className="muted">Digite uma nova senha para acessar sua conta AgroMarket.</p>

          {message && <div className="notice">{message}</div>}

          {preparando ? <div className="card">Validando link...</div> : (
            <form className="form" onSubmit={submit}>
              <label className="field">
                <span className="label">Nova senha</span>
                <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
              </label>

              <label className="field">
                <span className="label">Confirmar nova senha</span>
                <input className="input" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" />
              </label>

              <button className="btn btn-primary btn-full" disabled={loading}>
                <KeyRound size={18} /> {loading ? 'Salvando...' : 'Alterar senha'}
              </button>
            </form>
          )}

          <p className="muted">Voltar para <Link href="/login"><strong>login</strong></Link></p>
        </div>
      </div>
    </main>
  );
}
