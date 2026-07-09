'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/site-url';

type MessageType = 'success' | 'error' | 'info';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>('info');

  function showMessage(texto: string, tipo: MessageType) {
    setMessage(texto);
    setMessageType(tipo);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      showMessage(error.message, 'error');
      setLoading(false);
      return;
    }

    showMessage('Login realizado. Abrindo seu painel...', 'success');
    window.location.href = '/painel';
  }

  async function reenviarConfirmacao() {
    if (!email) {
      showMessage('Informe seu e-mail para reenviar a confirmação.', 'error');
      return;
    }

    setResending(true);
    setMessage(null);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/login')
      }
    });

    showMessage(error ? error.message : 'Enviamos um novo e-mail de confirmação. Confira sua caixa de entrada e spam.', error ? 'error' : 'success');
    setResending(false);
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <h1>Entrar</h1>
          <p className="muted">Acesse sua conta para anunciar e gerenciar seus anúncios.</p>
          {message && <div className={`notice notice-${messageType} action-feedback`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
          <form className="form" onSubmit={submit}>
            <label className="field">
              <span className="label">E-mail</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span className="label">Senha</span>
              <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </label>
            <button className="btn btn-primary btn-full" disabled={loading} aria-busy={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          </form>

          <Link className="btn btn-secondary btn-full" href="/recuperar-senha">Esqueci minha senha</Link>

          <button className="btn btn-secondary btn-full" type="button" onClick={reenviarConfirmacao} disabled={resending} aria-busy={resending}>
            {resending ? 'Reenviando confirmação...' : 'Reenviar confirmação de e-mail'}
          </button>

          <p className="muted">Ainda não tem conta? <Link href="/cadastro"><strong>Cadastrar</strong></Link></p>
        </div>
      </div>
    </main>
  );
}
