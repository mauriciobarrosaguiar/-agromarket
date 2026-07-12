'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgeDollarSign, CalendarClock, Gift, Infinity, Plus, Trash2, UserRound } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';
import type { Usuario, Vitrine, VitrinePagamento } from '@/types';
import EmptyState from '@/components/EmptyState';

type VitrineLinha = Vitrine & {
  usuarios?: { nome: string; email: string; whatsapp?: string | null } | null;
  vitrine_pagamentos?: VitrinePagamento[];
};

type DatasLiberacao = Record<string, string>;

type NovaVitrineForm = {
  usuarioId: string;
  buscaCliente: string;
  nomeVitrine: string;
  descricao: string;
  cidade: string;
  estado: string;
  whatsapp: string;
  liberarGratis: boolean;
  gratisIlimitada: boolean;
  gratisAte: string;
};

function dataBR(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function somarDias(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function onlyNumbers(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function money(value?: number | string | null) {
  const numero = typeof value === 'number' ? value : Number(value || 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(v: VitrineLinha) {
  if (v.assinatura_status === 'gratis_lancamento' && !v.assinatura_vencimento && !v.gratis_ate) return 'Grátis ilimitada';
  if (v.assinatura_status === 'gratis_lancamento') return `Grátis até ${dataBR(v.gratis_ate || v.assinatura_vencimento)}`;
  if (v.assinatura_status === 'ativa') return 'Mensalidade ativa';
  if (v.assinatura_status === 'vencida') return 'Mensalidade vencida';
  if (v.assinatura_status === 'cancelada') return 'Cancelada';
  return 'Aguardando pagamento';
}

function detalhePlano(v: VitrineLinha) {
  if (v.assinatura_status === 'gratis_lancamento' && !v.assinatura_vencimento && !v.gratis_ate) return 'Uso gratuito sem data de vencimento.';
  if (v.assinatura_status === 'gratis_lancamento') return `Uso gratuito liberado até ${dataBR(v.gratis_ate || v.assinatura_vencimento)}.`;
  if (v.assinatura_status === 'ativa') return `Mensalidade liberada até ${dataBR(v.assinatura_vencimento)}.`;
  return `Vencimento: ${dataBR(v.assinatura_vencimento)}`;
}

function formInicial(): NovaVitrineForm {
  return {
    usuarioId: '',
    buscaCliente: '',
    nomeVitrine: '',
    descricao: '',
    cidade: '',
    estado: 'TO',
    whatsapp: '',
    liberarGratis: true,
    gratisIlimitada: false,
    gratisAte: somarDias(30)
  };
}

function AdminVitrinesContent() {
  const [vitrines, setVitrines] = useState<VitrineLinha[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [datas, setDatas] = useState<DatasLiberacao>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [novaVitrine, setNovaVitrine] = useState<NovaVitrineForm>(() => formInicial());

  const usuarioSelecionado = usuarios.find((u) => u.id === novaVitrine.usuarioId) || null;
  const usuariosComVitrine = useMemo(() => new Set(vitrines.map((v) => v.usuario_id)), [vitrines]);
  const cidadesNovaVitrine = CIDADES_POR_ESTADO[novaVitrine.estado] || [];
  const clientesFiltrados = useMemo(() => {
    const termo = novaVitrine.buscaCliente.trim().toLowerCase();
    const numeros = onlyNumbers(novaVitrine.buscaCliente);

    if (!termo && !numeros) return usuarios.filter((usuario) => !usuariosComVitrine.has(usuario.id)).slice(0, 8);

    return usuarios.filter((usuario) => {
      const jaTemVitrine = usuariosComVitrine.has(usuario.id);
      if (jaTemVitrine && usuario.id !== novaVitrine.usuarioId) return false;

      const cpf = onlyNumbers(usuario.cpf);
      const whatsapp = onlyNumbers(usuario.whatsapp);
      const texto = `${usuario.nome || ''} ${usuario.email || ''} ${usuario.cidade || ''} ${usuario.estado || ''}`.toLowerCase();

      return texto.includes(termo) || (numeros.length >= 3 && (cpf.includes(numeros) || whatsapp.includes(numeros)));
    }).slice(0, 8);
  }, [novaVitrine.buscaCliente, novaVitrine.usuarioId, usuarios, usuariosComVitrine]);

  async function load() {
    const [{ data }, { data: users }] = await Promise.all([
      supabase
        .from('vitrines')
        .select('*, usuarios(nome, email, whatsapp), vitrine_pagamentos(*)')
        .order('created_at', { ascending: false }),
      supabase
        .from('usuarios')
        .select('*')
        .order('nome', { ascending: true })
    ]);

    const lista = (data || []) as VitrineLinha[];
    setVitrines(lista);
    setUsuarios((users || []) as Usuario[]);
    setDatas((prev) => {
      const novo = { ...prev };
      lista.forEach((v) => {
        if (!novo[v.id]) novo[v.id] = v.gratis_ate || v.assinatura_vencimento || somarDias(30);
      });
      return novo;
    });
  }

  useEffect(() => { load(); }, []);

  function selecionarUsuario(usuarioId: string) {
    const usuario = usuarios.find((u) => u.id === usuarioId);
    setNovaVitrine((prev) => ({
      ...prev,
      usuarioId,
      buscaCliente: usuario ? `${usuario.nome || 'Cliente'} • CPF ${usuario.cpf || 'sem CPF'} • ${usuario.email || ''}` : prev.buscaCliente,
      nomeVitrine: usuario?.nome ? `Vitrine ${usuario.nome}` : prev.nomeVitrine,
      cidade: usuario?.cidade || prev.cidade,
      estado: usuario?.estado || prev.estado || 'TO',
      whatsapp: usuario?.whatsapp || prev.whatsapp
    }));
  }

  function alterarBuscaCliente(valor: string) {
    setNovaVitrine((prev) => ({ ...prev, buscaCliente: valor, usuarioId: '' }));
  }

  async function criarVitrineCliente(e: FormEvent) {
    e.preventDefault();

    if (!novaVitrine.usuarioId) {
      setMessage('Digite o nome ou CPF e selecione o cliente que será vinculado à vitrine.');
      return;
    }

    if (!novaVitrine.nomeVitrine.trim()) {
      setMessage('Informe o nome da vitrine.');
      return;
    }

    if (!novaVitrine.gratisIlimitada && novaVitrine.liberarGratis && !novaVitrine.gratisAte) {
      setMessage('Informe a data final da gratuidade ou marque grátis ilimitada.');
      return;
    }

    setCriando(true);
    setMessage(null);

    const { data, error } = await supabase.rpc('admin_criar_vitrine_cliente', {
      cliente_uuid: novaVitrine.usuarioId,
      nome_vitrine_text: novaVitrine.nomeVitrine.trim(),
      descricao_text: novaVitrine.descricao.trim() || null,
      cidade_text: novaVitrine.cidade || usuarioSelecionado?.cidade || null,
      estado_text: novaVitrine.estado || usuarioSelecionado?.estado || 'TO',
      whatsapp_text: novaVitrine.whatsapp || usuarioSelecionado?.whatsapp || null,
      liberar_gratis: novaVitrine.liberarGratis,
      gratis_ate_data: novaVitrine.liberarGratis && !novaVitrine.gratisIlimitada ? novaVitrine.gratisAte : null,
      gratis_ilimitada: novaVitrine.gratisIlimitada
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Vitrine cadastrada e vinculada ao cliente.');
      setNovaVitrine(formInicial());
      await load();
      if (data) setDatas((prev) => ({ ...prev, [String(data)]: novaVitrine.gratisAte || somarDias(30) }));
    }

    setCriando(false);
  }

  async function atualizar(id: string, patch: Partial<Vitrine>) {
    setLoadingId(id);
    setMessage(null);

    const { error } = await supabase.from('vitrines').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);

    if (error) setMessage(error.message);
    else {
      setMessage('Vitrine atualizada.');
      await load();
    }

    setLoadingId(null);
  }

  async function confirmarMensalidade(vitrine: VitrineLinha, pagamento?: VitrinePagamento) {
    if (!pagamento) {
      setMessage('Essa vitrine ainda não tem pagamento pendente.');
      return;
    }

    setLoadingId(vitrine.id);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    const hoje = new Date();
    const base = vitrine.assinatura_vencimento && new Date(`${vitrine.assinatura_vencimento}T12:00:00`) > hoje
      ? new Date(`${vitrine.assinatura_vencimento}T12:00:00`)
      : hoje;
    base.setDate(base.getDate() + 30 * (pagamento.meses || 1));
    const novoVencimento = base.toISOString().slice(0, 10);

    const { error: pagamentoError } = await supabase.from('vitrine_pagamentos').update({
      status: 'pago',
      admin_id: userData.user?.id || null,
      pago_em: new Date().toISOString(),
      vencimento_gerado: novoVencimento,
      updated_at: new Date().toISOString()
    }).eq('id', pagamento.id);

    if (pagamentoError) {
      setMessage(pagamentoError.message);
      setLoadingId(null);
      return;
    }

    const { error } = await supabase.from('vitrines').update({
      vitrine_ativa: true,
      assinatura_status: 'ativa',
      assinatura_inicio: vitrine.assinatura_inicio || hojeISO(),
      assinatura_vencimento: novoVencimento,
      gratis_ate: null,
      ultimo_pagamento_em: new Date().toISOString(),
      plano: 'vitrine_mensal',
      plano_id: pagamento.plano_id || vitrine.plano_id || null,
      updated_at: new Date().toISOString()
    }).eq('id', vitrine.id);

    if (error) setMessage(error.message);
    else {
      setMessage(`Mensalidade confirmada. Vitrine liberada até ${dataBR(novoVencimento)}.`);
      await load();
    }

    setLoadingId(null);
  }

  async function liberarGratis(vitrine: VitrineLinha, vencimento: string) {
    if (!vencimento) {
      setMessage('Informe a data final da gratuidade.');
      return;
    }

    await atualizar(vitrine.id, {
      vitrine_ativa: true,
      assinatura_status: 'gratis_lancamento',
      assinatura_inicio: vitrine.assinatura_inicio || hojeISO(),
      assinatura_vencimento: vencimento,
      gratis_ate: vencimento,
      plano: 'vitrine_gratis'
    } as Partial<Vitrine>);
    setMessage(`Lojinha gratuita liberada até ${dataBR(vencimento)}.`);
  }

  async function liberarGratisDias(vitrine: VitrineLinha, dias: number) {
    const vencimento = somarDias(dias);
    setDatas((prev) => ({ ...prev, [vitrine.id]: vencimento }));
    await liberarGratis(vitrine, vencimento);
  }

  async function liberarIlimitada(vitrine: VitrineLinha) {
    await atualizar(vitrine.id, {
      vitrine_ativa: true,
      assinatura_status: 'gratis_lancamento',
      assinatura_inicio: vitrine.assinatura_inicio || hojeISO(),
      assinatura_vencimento: null,
      gratis_ate: null,
      plano: 'vitrine_gratis_ilimitada'
    } as Partial<Vitrine>);
    setMessage('Lojinha gratuita ilimitada liberada.');
  }

  async function marcarVencida(vitrine: VitrineLinha) {
    await atualizar(vitrine.id, { vitrine_ativa: false, assinatura_status: 'vencida', gratis_ate: null } as Partial<Vitrine>);
  }

  async function excluirVitrine(vitrine: VitrineLinha) {
    const nome = vitrine.nome_vitrine || 'lojinha';
    const confirmar = window.confirm(
      `Excluir definitivamente a lojinha "${nome}"?\n\nEssa acao remove a vitrine, pagamentos e avaliacoes vinculadas. Os anuncios do vendedor nao serao excluidos.`
    );

    if (!confirmar) return;

    const digitado = window.prompt(`Para confirmar, digite exatamente o nome da lojinha:\n${nome}`);
    if (digitado !== nome) {
      setMessage('Exclusao cancelada. O nome digitado nao confere com a lojinha.');
      return;
    }

    setLoadingId(vitrine.id);
    setMessage(null);

    const now = new Date().toISOString();
    const { error: patrocinadosError } = await supabase
      .from('patrocinados_home')
      .update({ vitrine_id: null, ativo: false, status: 'cancelado', updated_at: now })
      .eq('vitrine_id', vitrine.id);

    if (patrocinadosError) {
      setMessage(patrocinadosError.message);
      setLoadingId(null);
      return;
    }

    const { error: avaliacoesError } = await supabase.from('vendedor_avaliacoes').delete().eq('vitrine_id', vitrine.id);
    if (avaliacoesError) {
      setMessage(avaliacoesError.message);
      setLoadingId(null);
      return;
    }

    const { error: pagamentosError } = await supabase.from('vitrine_pagamentos').delete().eq('vitrine_id', vitrine.id);
    if (pagamentosError) {
      setMessage(pagamentosError.message);
      setLoadingId(null);
      return;
    }

    const { error } = await supabase.from('vitrines').delete().eq('id', vitrine.id);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage(`Lojinha "${nome}" excluida.`);
      setDatas((prev) => {
        const novo = { ...prev };
        delete novo[vitrine.id];
        return novo;
      });
      await load();
    }

    setLoadingId(null);
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <span className="badge"><BadgeDollarSign size={14} /> Vitrines mensais</span>
          <h1>Gerenciar vitrines</h1>
          <p>Cadastre vitrines para clientes, vincule ao usuário responsável, confirme mensalidades ou libere cortesias.</p>
        </div>
        <Link className="btn btn-secondary" href="/admin">Voltar admin</Link>
      </div>

      {message && <div className="notice">{message}</div>}

      <form className="card form" onSubmit={criarVitrineCliente} style={{ marginBottom: 20 }}>
        <div className="section-head section-head-compact">
          <div>
            <span className="badge"><Plus size={14} /> Cadastrar para cliente</span>
            <h2 style={{ marginBottom: 4 }}>Nova vitrine vinculada</h2>
            <p className="muted">Digite o nome, CPF, e-mail ou WhatsApp do cliente e selecione o responsável.</p>
          </div>
        </div>

        <label className="field">
          <span className="label">Buscar cliente responsável *</span>
          <input
            className="input"
            value={novaVitrine.buscaCliente}
            onChange={(e) => alterarBuscaCliente(e.target.value)}
            placeholder="Digite nome, CPF, e-mail ou WhatsApp"
          />
        </label>

        <div className="card" style={{ background: '#fffdf8', padding: 12 }}>
          {usuarioSelecionado ? (
            <div className="notice notice-success" style={{ marginBottom: 10 }}>
              Selecionado: <strong>{usuarioSelecionado.nome}</strong> • CPF {usuarioSelecionado.cpf || '—'} • {usuarioSelecionado.email}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 0 }}>Selecione um cliente da lista abaixo. Usuários que já têm vitrine ficam ocultos ou bloqueados.</p>
          )}

          <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {clientesFiltrados.map((usuario) => {
              const jaTemVitrine = usuariosComVitrine.has(usuario.id);
              const selecionado = usuario.id === novaVitrine.usuarioId;
              return (
                <button
                  key={usuario.id}
                  type="button"
                  className={selecionado ? 'btn btn-primary btn-full' : 'btn btn-secondary btn-full'}
                  disabled={jaTemVitrine && !selecionado}
                  onClick={() => selecionarUsuario(usuario.id)}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <UserRound size={17} />
                  <span>
                    <strong>{usuario.nome}</strong><br />
                    CPF {usuario.cpf || '—'} • {usuario.email || 'sem e-mail'} • {usuario.whatsapp || 'sem WhatsApp'}
                    {jaTemVitrine && !selecionado ? ' • já possui vitrine' : ''}
                  </span>
                </button>
              );
            })}
            {!clientesFiltrados.length && <p className="muted" style={{ margin: 0 }}>Nenhum cliente encontrado para essa busca.</p>}
          </div>
        </div>

        <div className="form-row">
          <label className="field">
            <span className="label">Nome da vitrine *</span>
            <input className="input" value={novaVitrine.nomeVitrine} onChange={(e) => setNovaVitrine((prev) => ({ ...prev, nomeVitrine: e.target.value }))} placeholder="Ex: Chácara São José" />
          </label>
          <label className="field">
            <span className="label">WhatsApp da vitrine</span>
            <input className="input" value={novaVitrine.whatsapp} onChange={(e) => setNovaVitrine((prev) => ({ ...prev, whatsapp: e.target.value }))} placeholder="5563999999999" />
          </label>
        </div>

        <label className="field">
          <span className="label">Descrição</span>
          <textarea className="textarea" value={novaVitrine.descricao} onChange={(e) => setNovaVitrine((prev) => ({ ...prev, descricao: e.target.value }))} placeholder="Produtos, animais, serviços ou informações do cliente." />
        </label>

        <div className="form-row">
          <label className="field">
            <span className="label">Estado</span>
            <select className="select" value={novaVitrine.estado} onChange={(e) => setNovaVitrine((prev) => ({ ...prev, estado: e.target.value, cidade: '' }))}>
              {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Cidade</span>
            <select className="select" value={novaVitrine.cidade} onChange={(e) => setNovaVitrine((prev) => ({ ...prev, cidade: e.target.value }))}>
              <option value="">Selecione a cidade</option>
              {cidadesNovaVitrine.map((cidade) => <option key={cidade} value={cidade}>{cidade}</option>)}
              {novaVitrine.cidade && !cidadesNovaVitrine.includes(novaVitrine.cidade) && <option value={novaVitrine.cidade}>{novaVitrine.cidade}</option>}
            </select>
          </label>
        </div>

        <div className="card" style={{ background: '#f8faf4' }}>
          <strong>Liberação inicial</strong>
          <p className="muted" style={{ marginTop: 6 }}>Você pode já deixar a vitrine pública como cortesia ou criar aguardando pagamento.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 800 }}>
              <input type="checkbox" checked={novaVitrine.liberarGratis} onChange={(e) => setNovaVitrine((prev) => ({ ...prev, liberarGratis: e.target.checked }))} />
              Liberar grátis agora
            </label>
            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 800 }}>
              <input type="checkbox" checked={novaVitrine.gratisIlimitada} disabled={!novaVitrine.liberarGratis} onChange={(e) => setNovaVitrine((prev) => ({ ...prev, gratisIlimitada: e.target.checked }))} />
              Grátis ilimitada
            </label>
          </div>
          {novaVitrine.liberarGratis && !novaVitrine.gratisIlimitada && (
            <label className="field">
              <span className="label">Liberar grátis até</span>
              <input className="input" type="date" value={novaVitrine.gratisAte} onChange={(e) => setNovaVitrine((prev) => ({ ...prev, gratisAte: e.target.value }))} />
            </label>
          )}
        </div>

        <button className="btn btn-primary" disabled={criando} aria-busy={criando}>
          <Plus size={18} /> {criando ? 'Cadastrando vitrine...' : 'Cadastrar vitrine para cliente'}
        </button>
      </form>

      {!vitrines.length ? <EmptyState title="Nenhuma vitrine solicitada" /> : (
        <div className="grid grid-2">
          {vitrines.map((v) => {
            const pagamentos = [...(v.vitrine_pagamentos || [])].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
            const pendente = pagamentos.find((p) => p.status === 'pendente');
            const aguardando = !v.vitrine_ativa || !['ativa', 'gratis_lancamento'].includes(String(v.assinatura_status));
            const dataLiberacao = datas[v.id] || v.gratis_ate || v.assinatura_vencimento || somarDias(30);

            return (
              <div className="card" key={v.id} style={{ border: pendente ? '2px solid rgba(202, 138, 4, .42)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ marginTop: 0, marginBottom: 6 }}>{v.nome_vitrine}</h2>
                    <p className="muted" style={{ margin: '0 0 4px', display: 'flex', gap: 6, alignItems: 'center' }}><UserRound size={16} /> Responsável: <strong>{v.usuarios?.nome || 'Nome não informado'}</strong></p>
                    <p className="muted" style={{ margin: '0 0 4px' }}>E-mail: {v.usuarios?.email || '—'}</p>
                    {v.usuarios?.whatsapp && <p className="muted" style={{ margin: 0 }}>WhatsApp: {v.usuarios.whatsapp}</p>}
                  </div>
                  <span className="badge">{statusLabel(v)}</span>
                </div>

                <p className="muted">{v.cidade || 'Cidade'} - {v.estado || 'UF'}</p>
                <p>{v.descricao || 'Sem descrição.'}</p>

                <div style={{ display: 'grid', gap: 8, margin: '12px 0' }}>
                  <span className="badge"><CalendarClock size={14} /> {detalhePlano(v)}</span>
                  <span className="badge">Status público: {v.vitrine_ativa ? 'Pública' : 'Fora do ar'}</span>
                  {v.destaque && <span className="badge">Destaque</span>}
                  {v.verificado && <span className="badge">Verificado</span>}
                </div>

                {pendente ? (
                  <div className="notice">
                    Pagamento pendente: <strong>{money(pendente.valor)}</strong> por {pendente.meses || 1} mês(es). Confirme somente depois de receber.
                  </div>
                ) : aguardando ? (
                  <div className="notice">Sem mensalidade ativa. Você pode liberar grátis, ilimitada ou aguardar pagamento do usuário.</div>
                ) : null}

                <div className="card" style={{ background: '#f8faf4', margin: '12px 0' }}>
                  <strong><Gift size={16} /> Liberação gratuita da lojinha</strong>
                  <p className="muted" style={{ marginTop: 6 }}>Use para cortesia, teste, parceria ou cliente especial.</p>
                  <div className="form-row" style={{ marginBottom: 10 }}>
                    <label className="field">
                      <span className="label">Liberar até</span>
                      <input className="input" type="date" value={dataLiberacao} onChange={(e) => setDatas((prev) => ({ ...prev, [v.id]: e.target.value }))} />
                    </label>
                    <div style={{ display: 'grid', alignContent: 'end' }}>
                      <button className="btn btn-primary btn-full" disabled={loadingId === v.id} onClick={() => liberarGratis(v, dataLiberacao)}>Salvar data grátis</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => liberarGratisDias(v, 30)}>Grátis 30 dias</button>
                    <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => liberarGratisDias(v, 90)}>Grátis 90 dias</button>
                    <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => liberarGratisDias(v, 180)}>Grátis 180 dias</button>
                    <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => liberarIlimitada(v)}><Infinity size={16} /> Grátis ilimitada</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {v.vitrine_ativa && <Link className="btn btn-secondary" href={`/vendedor/${v.slug}`}>Ver vitrine</Link>}
                  {pendente && <button className="btn btn-primary" disabled={loadingId === v.id} onClick={() => confirmarMensalidade(v, pendente)}>Confirmar pagamento e liberar 30 dias</button>}
                  <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => marcarVencida(v)}>Marcar vencida</button>
                  <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { vitrine_ativa: !v.vitrine_ativa })}>{v.vitrine_ativa ? 'Desativar' : 'Ativar manual'}</button>
                  <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { destaque: !v.destaque })}>{v.destaque ? 'Remover destaque' : 'Destacar'}</button>
                  <button className="btn btn-secondary" disabled={loadingId === v.id} onClick={() => atualizar(v.id, { verificado: !v.verificado })}>{v.verificado ? 'Remover verificado' : 'Verificar'}</button>
                  <button className="btn btn-danger" disabled={loadingId === v.id} onClick={() => excluirVitrine(v)}><Trash2 size={16} /> Excluir lojinha</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminVitrinesPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><AdminVitrinesContent /></div></main></AuthGuard>;
}
