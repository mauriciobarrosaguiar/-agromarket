'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';

function getRedirectUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/login`;
}

export default function CadastroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('TO');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const cidades = useMemo(() => CIDADES_POR_ESTADO[estado] || [], [estado]);

  function trocarEstado(uf: string) {
    setEstado(uf);
    setCidade('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!nome || !email || !senha || !whatsapp || !estado || !cidade) {
      setMessage('Preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: getRedirectUrl()
      }
    });

    if (error || !data.user) {
      setMessage(error?.message || 'Erro ao cadastrar.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('usuarios').upsert({
      id: data.user.id,
      nome,
      email,
      whatsapp,
      cidade,
      estado,
      tipo_usuario: 'anunciante',
      status: 'ativo'
    });

    if (profileError) setMessage(profileError.message);
    else setMessage('Cadastro criado. Enviamos a confirmação para seu e-mail. Depois de confirmar, faça login.');
    setLoading(false);
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 620 }}>
        <div className="card">
          <h1>Criar conta</h1>
          <p className="muted">Cadastre-se para divulgar produtos, serviços e oportunidades.</p>
          {message && <div className="notice">{message}</div>}
          <form className="form" onSubmit={submit}>
            <label className="field"><span className="label">Nome</span><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
            <label className="field"><span className="label">E-mail</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field"><span className="label">Senha</span><input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
            <label className="field"><span className="label">WhatsApp</span><input className="input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5563999999999" /></label>

            <div className="form-row">
              <label className="field">
                <span className="label">Estado</span>
                <select className="select" value={estado} onChange={(e) => trocarEstado(e.target.value)}>
                  <option value="">Selecione o estado</option>
                  {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </label>

              <label className="field">
                <span className="label">Cidade</span>
                <select className="select" value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={!estado}>
                  <option value="">{estado ? 'Selecione a cidade' : 'Escolha o estado primeiro'}</option>
                  {cidades.map((nomeCidade) => <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>)}
                </select>
              </label>
            </div>

            <button className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Criando...' : 'Criar conta'}</button>
          </form>
          <p className="muted">Já tem conta? <Link href="/login"><strong>Entrar</strong></Link></p>
        </div>
      </div>
    </main>
  );
}
