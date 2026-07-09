'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Mail, ShieldCheck } from 'lucide-react';

type MessageType = 'success' | 'error' | 'info';

function onlyNumbers(value: string) {
  return value.replace(/\D/g, '');
}

function formatCpf(value: string) {
  const cpf = onlyNumbers(value).slice(0, 11);
  return cpf
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function RecuperarSenhaPage() {
  const [identificador, setIdentificador] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType>('info');

  function updateIdentificador(value: string) {
    if (value.includes('@') || /[a-zA-Z]/.test(value)) setIdentificador(value.toLowerCase());
    else setIdentificador(formatCpf(value));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage(null);

    const response = await fetch('/api/auth/recuperar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identificador })
    });

    const data = await response.json().catch(() => null);
    setMessage(data?.message || 'Se os dados estiverem cadastrados, enviaremos as instruções por e-mail.');
    setMessageType(response.ok ? 'success' : 'error');
    setLoading(false);
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">
          <span className="badge"><ShieldCheck size={14} /> Segurança da conta</span>
          <h1>Recuperar senha</h1>
          <p className="muted">Informe seu e-mail cadastrado ou CPF. Se encontrarmos sua conta, enviaremos um link seguro para trocar a senha.</p>

          {message && <div className={`notice notice-${messageType} action-feedback`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}

          <form className="form" onSubmit={submit}>
            <label className="field">
              <span className="label">E-mail ou CPF</span>
              <input
                className="input"
                value={identificador}
                onChange={(e) => updateIdentificador(e.target.value)}
                placeholder="email@exemplo.com ou 000.000.000-00"
                autoComplete="username"
              />
            </label>

            <button className="btn btn-primary btn-full" disabled={loading} aria-busy={loading}>
              <Mail size={18} /> {loading ? 'Enviando link...' : 'Enviar link de recuperação'}
            </button>
          </form>

          <div className="notice notice-info">
            Por segurança, não informamos se o e-mail ou CPF existe. Confira a caixa de entrada e o spam.
          </div>

          <p className="muted">Lembrou a senha? <Link href="/login"><strong>Entrar</strong></Link></p>
        </div>
      </div>
    </main>
  );
}
