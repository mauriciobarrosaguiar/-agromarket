'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
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
          <p className="muted">Ainda não tem conta? <Link href="/cadastro"><strong>Cadastrar</strong></Link></p>
        </div>
      </div>
    </main>
  );
}
