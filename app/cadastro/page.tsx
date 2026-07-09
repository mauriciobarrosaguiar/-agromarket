'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/site-url';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';

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

export default function CadastroPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [documentoNumero, setDocumentoNumero] = useState('');
  const [documentoOrgao, setDocumentoOrgao] = useState('');
  const [documentoUf, setDocumentoUf] = useState('TO');
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

    const cpfLimpo = onlyNumbers(cpf);

    if (!nome || !email || !senha || !whatsapp || !cpfLimpo || !dataNascimento || !documentoNumero || !documentoOrgao || !documentoUf || !estado || !cidade) {
      setMessage('Preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    if (cpfLimpo.length !== 11) {
      setMessage('Informe um CPF válido com 11 números.');
      setLoading(false);
      return;
    }

    if (senha.length < 6) {
      setMessage('A senha precisa ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/login')
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
      email: email.toLowerCase(),
      whatsapp,
      cpf: cpfLimpo,
      data_nascimento: dataNascimento,
      documento_tipo: 'cpf_rg',
      documento_numero: documentoNumero,
      documento_orgao_emissor: documentoOrgao,
      documento_uf: documentoUf,
      cidade,
      estado,
      tipo_usuario: 'anunciante',
      status: 'ativo',
      cadastro_completo: true
    });

    if (profileError) {
      setMessage(profileError.message.includes('duplicate') ? 'Esse CPF já está cadastrado.' : profileError.message);
    } else {
      setMessage('Cadastro criado. Enviamos a confirmação para seu e-mail. Depois de confirmar, faça login.');
    }

    setLoading(false);
  }

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="card">
          <h1>Criar conta</h1>
          <p className="muted">Cadastro completo para divulgar produtos, serviços e oportunidades com mais segurança.</p>
          {message && <div className="notice">{message}</div>}
          <form className="form" onSubmit={submit}>
            <label className="field"><span className="label">Nome completo *</span><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></label>
            <label className="field"><span className="label">E-mail *</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field"><span className="label">Senha *</span><input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
            <label className="field"><span className="label">WhatsApp *</span><input className="input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5563999999999" /></label>

            <div className="card" style={{ background: '#f8faf4' }}>
              <h2 style={{ marginTop: 0 }}>Dados do documento</h2>
              <p className="muted">Esses dados ajudam na recuperação da conta e na segurança do marketplace. Não aparecem publicamente.</p>

              <label className="field"><span className="label">CPF *</span><input className="input" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" /></label>
              <label className="field"><span className="label">Data de nascimento *</span><input className="input" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} /></label>

              <div className="form-row">
                <label className="field"><span className="label">RG / Documento *</span><input className="input" value={documentoNumero} onChange={(e) => setDocumentoNumero(e.target.value)} /></label>
                <label className="field"><span className="label">Órgão emissor *</span><input className="input" value={documentoOrgao} onChange={(e) => setDocumentoOrgao(e.target.value)} placeholder="Ex: SSP" /></label>
              </div>

              <label className="field">
                <span className="label">UF do documento *</span>
                <select className="select" value={documentoUf} onChange={(e) => setDocumentoUf(e.target.value)}>
                  {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label className="field">
                <span className="label">Estado *</span>
                <select className="select" value={estado} onChange={(e) => trocarEstado(e.target.value)}>
                  <option value="">Selecione o estado</option>
                  {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </label>

              <label className="field">
                <span className="label">Cidade *</span>
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
