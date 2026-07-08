'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

function getRedirectUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/login`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setMessage(error.message);
    else window.location.href = '/painel';
    setLoading(false);
  }

  async function reenviarConfirmacao() {
    if (!email) {
      setMessage('Informe seu e-mail para reenviar a confirmação.');
      return;
    }

    setResending(true);
    setMessage(null);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getRedirectUrl()
      }
    });

    setMessage(error ? error.message : 'Enviamos um novo e-mail de confirmação. Confira sua caixa de entrada e spam.');
    setResending(false);
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <h1>Entrar</h1>
          <p className="muted">Acesse sua conta para anunciar e gerenciar seus anúncios.</p>
          {message && <div className="notice">{message}</div>}
          <form className="form" onSubmit={submit}>
            <label className="field">
              <span className="label">E-mail</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Senha</span>
              <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </label>
            <button className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          </form>

          <button className="btn btn-secondary btn-full" type="button" onClick={reenviarConfirmacao} disabled={resending}>
            {resending ? 'Reenviando...' : 'Reenviar confirmação de e-mail'}
          </button>

          <p className="muted">Ainda não tem conta? <Link href="/cadastro"><strong>Cadastrar</strong></Link></p>
        </div>
      </div>
    </main>
  );
}
