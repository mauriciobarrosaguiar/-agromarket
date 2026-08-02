'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Boxes,
  CircleDollarSign,
  PackagePlus,
  Pencil,
  ShoppingCart,
  Users
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';

type Aba = 'resumo' | 'produtos' | 'estoque' | 'vendas' | 'clientes';

type Produto = {
  id: string;
  usuario_id: string;
  vitrine_id?: string | null;
  nome: string;
  categoria: string;
  unidade: string;
  custo_unitario: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  created_at?: string;
};

type Cliente = {
  id: string;
  usuario_id: string;
  nome: string;
  whatsapp?: string | null;
  endereco?: string | null;
  limite_credito: number;
  observacoes?: string | null;
  ativo: boolean;
};

type Venda = {
  id: string;
  cliente_id?: string | null;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  taxa_entrega: number;
  total: number;
  forma_pagamento: string;
  status_pagamento: 'pago' | 'parcial' | 'pendente';
  valor_pago: number;
  data_venda: string;
  observacao?: string | null;
  created_at?: string;
  agro_produtos?: { nome: string; unidade: string } | null;
  agro_clientes?: { nome: string } | null;
};

type Movimento = {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  saldo_anterior: number;
  saldo_posterior: number;
  observacao?: string | null;
  created_at: string;
  agro_produtos?: { nome: string; unidade: string } | null;
};

const categorias = [
  'Ovos',
  'Aves e carnes',
  'Hortaliças',
  'Frutas',
  'Leite e derivados',
  'Mel e derivados',
  'Mudas e sementes',
  'Animais',
  'Outros'
];

const unidades = [
  'unidade',
  'dúzia',
  'kg',
  'litro',
  'maço',
  'bandeja',
  'caixa',
  'saco',
  'animal'
];

const tiposMovimento = [
  { value: 'producao', label: 'Produção / colheita' },
  { value: 'compra', label: 'Compra para estoque' },
  { value: 'devolucao', label: 'Devolução de cliente' },
  { value: 'ajuste_entrada', label: 'Ajuste de entrada' },
  { value: 'perda', label: 'Perda / descarte' },
  { value: 'consumo', label: 'Consumo próprio' },
  { value: 'doacao', label: 'Doação' },
  { value: 'ajuste_saida', label: 'Ajuste de saída' }
];

const formasPagamento = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'fiado', label: 'Fiado' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outro', label: 'Outro' }
];

function numero(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moeda(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numero(value));
}

function quantidade(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3
  }).format(numero(value));
}

function dataBR(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');
}

function hojeLocal() {
  const agora = new Date();
  const offset = agora.getTimezoneOffset();
  return new Date(agora.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function AgroGestaoContent() {
  const [aba, setAba] = useState<Aba>('resumo');
  const [usuarioId, setUsuarioId] = useState('');
  const [vitrineId, setVitrineId] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [produtoEdicaoId, setProdutoEdicaoId] = useState<string | null>(null);
  const [produtoNome, setProdutoNome] = useState('');
  const [produtoCategoria, setProdutoCategoria] = useState('Ovos');
  const [produtoUnidade, setProdutoUnidade] = useState('dúzia');
  const [produtoCusto, setProdutoCusto] = useState('');
  const [produtoPreco, setProdutoPreco] = useState('');
  const [produtoMinimo, setProdutoMinimo] = useState('');

  const [movimentoProdutoId, setMovimentoProdutoId] = useState('');
  const [movimentoTipo, setMovimentoTipo] = useState('producao');
  const [movimentoQuantidade, setMovimentoQuantidade] = useState('');
  const [movimentoObservacao, setMovimentoObservacao] = useState('');

  const [vendaProdutoId, setVendaProdutoId] = useState('');
  const [vendaClienteId, setVendaClienteId] = useState('');
  const [vendaQuantidade, setVendaQuantidade] = useState('');
  const [vendaPreco, setVendaPreco] = useState('');
  const [vendaDesconto, setVendaDesconto] = useState('');
  const [vendaEntrega, setVendaEntrega] = useState('');
  const [vendaForma, setVendaForma] = useState('pix');
  const [vendaStatus, setVendaStatus] = useState<'pago' | 'parcial' | 'pendente'>('pago');
  const [vendaValorPago, setVendaValorPago] = useState('');
  const [vendaData, setVendaData] = useState(hojeLocal());
  const [vendaObservacao, setVendaObservacao] = useState('');

  const [clienteEdicaoId, setClienteEdicaoId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteWhatsapp, setClienteWhatsapp] = useState('');
  const [clienteEndereco, setClienteEndereco] = useState('');
  const [clienteLimite, setClienteLimite] = useState('');
  const [clienteObservacoes, setClienteObservacoes] = useState('');

  async function carregar() {
    setCarregando(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setCarregando(false);
      return;
    }

    setUsuarioId(user.id);

    const [
      { data: vitrine },
      { data: produtosData, error: produtosError },
      { data: clientesData },
      { data: vendasData },
      { data: movimentosData }
    ] = await Promise.all([
      supabase.from('vitrines').select('id').eq('usuario_id', user.id).maybeSingle(),
      supabase.from('agro_produtos').select('*').eq('usuario_id', user.id).order('nome'),
      supabase.from('agro_clientes').select('*').eq('usuario_id', user.id).order('nome'),
      supabase
        .from('agro_vendas')
        .select('*, agro_produtos(nome,unidade), agro_clientes(nome)')
        .eq('usuario_id', user.id)
        .order('data_venda', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('agro_movimentacoes')
        .select('*, agro_produtos(nome,unidade)')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(300)
    ]);

    setVitrineId(vitrine?.id || null);

    if (produtosError) {
      setMensagem(
        produtosError.message.includes('agro_produtos')
          ? 'O banco do AgroGestão ainda precisa receber a atualização SQL.'
          : produtosError.message
      );
    }

    setProdutos(
      ((produtosData || []) as Produto[]).map((item) => ({
        ...item,
        custo_unitario: numero(item.custo_unitario),
        preco_venda: numero(item.preco_venda),
        estoque_atual: numero(item.estoque_atual),
        estoque_minimo: numero(item.estoque_minimo)
      }))
    );

    setClientes(
      ((clientesData || []) as Cliente[]).map((item) => ({
        ...item,
        limite_credito: numero(item.limite_credito)
      }))
    );

    setVendas(
      ((vendasData || []) as Venda[]).map((item) => ({
        ...item,
        quantidade: numero(item.quantidade),
        preco_unitario: numero(item.preco_unitario),
        desconto: numero(item.desconto),
        taxa_entrega: numero(item.taxa_entrega),
        total: numero(item.total),
        valor_pago: numero(item.valor_pago)
      }))
    );

    setMovimentos(
      ((movimentosData || []) as Movimento[]).map((item) => ({
        ...item,
        quantidade: numero(item.quantidade),
        saldo_anterior: numero(item.saldo_anterior),
        saldo_posterior: numero(item.saldo_posterior)
      }))
    );

    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const produtosAtivos = useMemo(
    () => produtos.filter((produto) => produto.ativo),
    [produtos]
  );

  const clientesAtivos = useMemo(
    () => clientes.filter((cliente) => cliente.ativo),
    [clientes]
  );

  const inicioMes = hojeLocal().slice(0, 7);
  const vendasMes = vendas.filter((venda) => venda.data_venda.startsWith(inicioMes));
  const faturamentoMes = vendasMes.reduce((total, venda) => total + venda.total, 0);
  const recebidoMes = vendasMes.reduce((total, venda) => total + venda.valor_pago, 0);
  const aReceber = vendas.reduce(
    (total, venda) => total + Math.max(venda.total - venda.valor_pago, 0),
    0
  );
  const valorEstoque = produtosAtivos.reduce(
    (total, produto) => total + produto.estoque_atual * produto.preco_venda,
    0
  );
  const produtosBaixos = produtosAtivos.filter(
    (produto) => produto.estoque_atual <= produto.estoque_minimo
  );

  const vendaProduto = produtosAtivos.find((produto) => produto.id === vendaProdutoId);
  const totalVendaPrevisto = Math.max(
    numero(vendaQuantidade) * numero(vendaPreco) -
      numero(vendaDesconto) +
      numero(vendaEntrega),
    0
  );

  function limparProduto() {
    setProdutoEdicaoId(null);
    setProdutoNome('');
    setProdutoCategoria('Ovos');
    setProdutoUnidade('dúzia');
    setProdutoCusto('');
    setProdutoPreco('');
    setProdutoMinimo('');
  }

  async function salvarProduto(event: FormEvent) {
    event.preventDefault();
    setMensagem(null);

    if (!usuarioId || !produtoNome.trim()) {
      setMensagem('Informe o nome do produto.');
      return;
    }

    setSalvando(true);
    const payload = {
      usuario_id: usuarioId,
      vitrine_id: vitrineId,
      nome: produtoNome.trim(),
      categoria: produtoCategoria,
      unidade: produtoUnidade,
      custo_unitario: numero(produtoCusto),
      preco_venda: numero(produtoPreco),
      estoque_minimo: numero(produtoMinimo)
    };

    const response = produtoEdicaoId
      ? await supabase
          .from('agro_produtos')
          .update(payload)
          .eq('id', produtoEdicaoId)
          .eq('usuario_id', usuarioId)
      : await supabase.from('agro_produtos').insert(payload);

    if (response.error) {
      setMensagem(response.error.message);
    } else {
      setMensagem(produtoEdicaoId ? 'Produto atualizado.' : 'Produto cadastrado.');
      limparProduto();
      await carregar();
    }

    setSalvando(false);
  }

  function editarProduto(produto: Produto) {
    setProdutoEdicaoId(produto.id);
    setProdutoNome(produto.nome);
    setProdutoCategoria(produto.categoria);
    setProdutoUnidade(produto.unidade);
    setProdutoCusto(String(produto.custo_unitario || ''));
    setProdutoPreco(String(produto.preco_venda || ''));
    setProdutoMinimo(String(produto.estoque_minimo || ''));
    setAba('produtos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function alterarProdutoAtivo(produto: Produto) {
    const { error } = await supabase
      .from('agro_produtos')
      .update({ ativo: !produto.ativo })
      .eq('id', produto.id)
      .eq('usuario_id', usuarioId);

    if (error) setMensagem(error.message);
    else await carregar();
  }

  async function registrarMovimento(event: FormEvent) {
    event.preventDefault();
    setMensagem(null);

    if (!movimentoProdutoId || numero(movimentoQuantidade) <= 0) {
      setMensagem('Selecione o produto e informe a quantidade.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.rpc('agro_registrar_movimentacao', {
      produto_uuid: movimentoProdutoId,
      tipo_text: movimentoTipo,
      quantidade_numeric: numero(movimentoQuantidade),
      observacao_text: movimentoObservacao.trim() || null
    });

    if (error) {
      setMensagem(error.message);
    } else {
      setMensagem('Movimentação registrada e estoque atualizado.');
      setMovimentoQuantidade('');
      setMovimentoObservacao('');
      await carregar();
    }

    setSalvando(false);
  }

  function selecionarProdutoVenda(produtoId: string) {
    setVendaProdutoId(produtoId);
    const produto = produtosAtivos.find((item) => item.id === produtoId);
    setVendaPreco(produto ? String(produto.preco_venda || '') : '');
  }

  async function registrarVenda(event: FormEvent) {
    event.preventDefault();
    setMensagem(null);

    if (!vendaProdutoId || numero(vendaQuantidade) <= 0) {
      setMensagem('Selecione o produto e informe a quantidade vendida.');
      return;
    }

    setSalvando(true);
    const { error } = await supabase.rpc('agro_registrar_venda', {
      produto_uuid: vendaProdutoId,
      cliente_uuid: vendaClienteId || null,
      quantidade_numeric: numero(vendaQuantidade),
      preco_unitario_numeric: numero(vendaPreco),
      desconto_numeric: numero(vendaDesconto),
      taxa_entrega_numeric: numero(vendaEntrega),
      forma_pagamento_text: vendaForma,
      status_pagamento_text: vendaStatus,
      valor_pago_numeric: numero(vendaValorPago),
      data_venda_date: vendaData,
      observacao_text: vendaObservacao.trim() || null
    });

    if (error) {
      setMensagem(error.message);
    } else {
      setMensagem('Venda registrada e estoque baixado automaticamente.');
      setVendaProdutoId('');
      setVendaClienteId('');
      setVendaQuantidade('');
      setVendaPreco('');
      setVendaDesconto('');
      setVendaEntrega('');
      setVendaForma('pix');
      setVendaStatus('pago');
      setVendaValorPago('');
      setVendaData(hojeLocal());
      setVendaObservacao('');
      await carregar();
    }

    setSalvando(false);
  }

  async function quitarVenda(venda: Venda) {
    const { error } = await supabase
      .from('agro_vendas')
      .update({ status_pagamento: 'pago', valor_pago: venda.total })
      .eq('id', venda.id)
      .eq('usuario_id', usuarioId);

    if (error) setMensagem(error.message);
    else {
      setMensagem('Pagamento marcado como recebido.');
      await carregar();
    }
  }

  function limparCliente() {
    setClienteEdicaoId(null);
    setClienteNome('');
    setClienteWhatsapp('');
    setClienteEndereco('');
    setClienteLimite('');
    setClienteObservacoes('');
  }

  async function salvarCliente(event: FormEvent) {
    event.preventDefault();
    setMensagem(null);

    if (!usuarioId || !clienteNome.trim()) {
      setMensagem('Informe o nome do cliente.');
      return;
    }

    setSalvando(true);
    const payload = {
      usuario_id: usuarioId,
      nome: clienteNome.trim(),
      whatsapp: clienteWhatsapp.trim() || null,
      endereco: clienteEndereco.trim() || null,
      limite_credito: numero(clienteLimite),
      observacoes: clienteObservacoes.trim() || null
    };

    const response = clienteEdicaoId
      ? await supabase
          .from('agro_clientes')
          .update(payload)
          .eq('id', clienteEdicaoId)
          .eq('usuario_id', usuarioId)
      : await supabase.from('agro_clientes').insert(payload);

    if (response.error) {
      setMensagem(response.error.message);
    } else {
      setMensagem(clienteEdicaoId ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      limparCliente();
      await carregar();
    }

    setSalvando(false);
  }

  function editarCliente(cliente: Cliente) {
    setClienteEdicaoId(cliente.id);
    setClienteNome(cliente.nome);
    setClienteWhatsapp(cliente.whatsapp || '');
    setClienteEndereco(cliente.endereco || '');
    setClienteLimite(String(cliente.limite_credito || ''));
    setClienteObservacoes(cliente.observacoes || '');
    setAba('clientes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function alterarClienteAtivo(cliente: Cliente) {
    const { error } = await supabase
      .from('agro_clientes')
      .update({ ativo: !cliente.ativo })
      .eq('id', cliente.id)
      .eq('usuario_id', usuarioId);

    if (error) setMensagem(error.message);
    else await carregar();
  }

  const botoesAbas: Array<{ id: Aba; label: string; icon: typeof BarChart3 }> = [
    { id: 'resumo', label: 'Visão geral', icon: BarChart3 },
    { id: 'produtos', label: 'Produtos', icon: Boxes },
    { id: 'estoque', label: 'Estoque', icon: PackagePlus },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'clientes', label: 'Clientes', icon: Users }
  ];

  if (carregando) {
    return (
      <main className="page">
        <div className="container">
          <div className="card section">Carregando AgroGestão...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="badge">AgroGestão</span>
            <h1>Estoque e vendas</h1>
            <p>Controle simples da produção até o recebimento.</p>
          </div>
          <Link className="btn btn-secondary" href="/painel">
            <ArrowLeft size={16} /> Voltar ao painel
          </Link>
        </div>

        {mensagem && (
          <div className="notice" style={{ marginBottom: 16 }}>
            {mensagem}
          </div>
        )}

        <div
          className="card"
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            padding: 10,
            marginBottom: 18
          }}
        >
          {botoesAbas.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={aba === id ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setAba(id)}
            >
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>

        {aba === 'resumo' && (
          <>
            <div className="stats-grid">
              <StatCard label="Vendas no mês" value={moeda(faturamentoMes)} />
              <StatCard label="Recebido no mês" value={moeda(recebidoMes)} />
              <StatCard label="Total a receber" value={moeda(aReceber)} />
              <StatCard label="Estoque para venda" value={moeda(valorEstoque)} />
              <StatCard label="Produtos cadastrados" value={produtosAtivos.length} />
            </div>

            {produtosBaixos.length > 0 && (
              <div
                className="card section"
                style={{ border: '2px solid rgba(185, 28, 28, .24)' }}
              >
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={22} /> Estoque baixo
                </h2>
                <div className="grid grid-2">
                  {produtosBaixos.map((produto) => (
                    <div
                      key={produto.id}
                      className="card"
                      style={{ background: '#fff8f8', boxShadow: 'none' }}
                    >
                      <strong>{produto.nome}</strong>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        Atual: {quantidade(produto.estoque_atual)} {produto.unidade} ·
                        mínimo: {quantidade(produto.estoque_minimo)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-2 section">
              <section className="card">
                <h2>Últimas vendas</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  {vendas.slice(0, 6).map((venda) => (
                    <div
                      key={venda.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: 10
                      }}
                    >
                      <strong>{venda.agro_produtos?.nome || 'Produto'}</strong>
                      <div className="muted">
                        {quantidade(venda.quantidade)}{' '}
                        {venda.agro_produtos?.unidade || ''} · {moeda(venda.total)} ·{' '}
                        {venda.status_pagamento}
                      </div>
                    </div>
                  ))}
                  {!vendas.length && (
                    <p className="muted">Nenhuma venda registrada.</p>
                  )}
                </div>
              </section>

              <section className="card">
                <h2>Últimos movimentos</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  {movimentos.slice(0, 6).map((movimento) => (
                    <div
                      key={movimento.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: 10
                      }}
                    >
                      <strong>{movimento.agro_produtos?.nome || 'Produto'}</strong>
                      <div className="muted">
                        {movimento.tipo.replaceAll('_', ' ')} ·{' '}
                        {quantidade(movimento.quantidade)}{' '}
                        {movimento.agro_produtos?.unidade || ''}
                      </div>
                    </div>
                  ))}
                  {!movimentos.length && (
                    <p className="muted">Nenhum movimento registrado.</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {aba === 'produtos' && (
          <>
            <form className="card form" onSubmit={salvarProduto}>
              <div className="section-head">
                <div>
                  <h2>{produtoEdicaoId ? 'Editar produto' : 'Cadastrar produto'}</h2>
                  <p>O estoque inicial entra depois pela tela Estoque.</p>
                </div>
                {produtoEdicaoId && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={limparProduto}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Nome *</span>
                  <input
                    className="input"
                    value={produtoNome}
                    onChange={(event) => setProdutoNome(event.target.value)}
                    placeholder="Ex: Ovos caipiras"
                  />
                </label>
                <label className="field">
                  <span className="label">Categoria</span>
                  <select
                    className="select"
                    value={produtoCategoria}
                    onChange={(event) => setProdutoCategoria(event.target.value)}
                  >
                    {categorias.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Unidade de venda</span>
                  <select
                    className="select"
                    value={produtoUnidade}
                    onChange={(event) => setProdutoUnidade(event.target.value)}
                  >
                    {unidades.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Estoque mínimo</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.001"
                    value={produtoMinimo}
                    onChange={(event) => setProdutoMinimo(event.target.value)}
                    placeholder="Ex: 5"
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Custo por unidade</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={produtoCusto}
                    onChange={(event) => setProdutoCusto(event.target.value)}
                    placeholder="R$ 0,00"
                  />
                </label>
                <label className="field">
                  <span className="label">Preço de venda</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={produtoPreco}
                    onChange={(event) => setProdutoPreco(event.target.value)}
                    placeholder="R$ 0,00"
                  />
                </label>
              </div>

              <button className="btn btn-primary" disabled={salvando} type="submit">
                {salvando
                  ? 'Salvando...'
                  : produtoEdicaoId
                    ? 'Atualizar produto'
                    : 'Cadastrar produto'}
              </button>
            </form>

            <div className="grid grid-2 section">
              {produtos.map((produto) => (
                <article
                  className="card"
                  key={produto.id}
                  style={{ opacity: produto.ativo ? 1 : 0.65 }}
                >
                  <span className="badge">
                    {produto.ativo ? produto.categoria : 'Inativo'}
                  </span>
                  <h2 style={{ marginBottom: 6 }}>{produto.nome}</h2>
                  <p className="muted" style={{ marginTop: 0 }}>
                    {quantidade(produto.estoque_atual)} {produto.unidade} em estoque
                  </p>
                  <p>
                    Venda: <strong>{moeda(produto.preco_venda)}</strong>
                    <br />
                    Custo: {moeda(produto.custo_unitario)}
                  </p>
                  <div className="actions" style={{ justifyContent: 'flex-start' }}>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => editarProduto(produto)}
                    >
                      <Pencil size={16} /> Editar
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => alterarProdutoAtivo(produto)}
                    >
                      {produto.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {aba === 'estoque' && (
          <>
            <form className="card form" onSubmit={registrarMovimento}>
              <h2>Registrar produção ou saída</h2>
              {!produtosAtivos.length && (
                <div className="notice">
                  Cadastre pelo menos um produto antes de movimentar o estoque.
                </div>
              )}

              <div className="form-row">
                <label className="field">
                  <span className="label">Produto *</span>
                  <select
                    className="select"
                    value={movimentoProdutoId}
                    onChange={(event) => setMovimentoProdutoId(event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {produtosAtivos.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.nome} · estoque {quantidade(produto.estoque_atual)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Movimento *</span>
                  <select
                    className="select"
                    value={movimentoTipo}
                    onChange={(event) => setMovimentoTipo(event.target.value)}
                  >
                    {tiposMovimento.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Quantidade *</span>
                  <input
                    className="input"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={movimentoQuantidade}
                    onChange={(event) => setMovimentoQuantidade(event.target.value)}
                    placeholder="Ex: 12"
                  />
                </label>
                <label className="field">
                  <span className="label">Observação</span>
                  <input
                    className="input"
                    value={movimentoObservacao}
                    onChange={(event) => setMovimentoObservacao(event.target.value)}
                    placeholder="Ex: Coleta da manhã"
                  />
                </label>
              </div>

              <button
                className="btn btn-primary"
                disabled={salvando || !produtosAtivos.length}
                type="submit"
              >
                {salvando ? 'Registrando...' : 'Atualizar estoque'}
              </button>
            </form>

            <section className="card section">
              <h2>Histórico do estoque</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {movimentos.map((movimento) => (
                  <div
                    key={movimento.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: 12
                    }}
                  >
                    <div>
                      <strong>{movimento.agro_produtos?.nome || 'Produto'}</strong>
                      <div className="muted">
                        {movimento.tipo.replaceAll('_', ' ')} · {dataBR(movimento.created_at)}
                      </div>
                      {movimento.observacao && (
                        <div className="muted">{movimento.observacao}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>
                        {quantidade(movimento.quantidade)}{' '}
                        {movimento.agro_produtos?.unidade || ''}
                      </strong>
                      <div className="muted">
                        {quantidade(movimento.saldo_anterior)} →{' '}
                        {quantidade(movimento.saldo_posterior)}
                      </div>
                    </div>
                  </div>
                ))}
                {!movimentos.length && (
                  <p className="muted">Nenhum movimento registrado.</p>
                )}
              </div>
            </section>
          </>
        )}

        {aba === 'vendas' && (
          <>
            <form className="card form" onSubmit={registrarVenda}>
              <h2>Registrar venda</h2>
              {!produtosAtivos.length && (
                <div className="notice">
                  Cadastre um produto e adicione estoque antes da primeira venda.
                </div>
              )}

              <div className="form-row">
                <label className="field">
                  <span className="label">Produto *</span>
                  <select
                    className="select"
                    value={vendaProdutoId}
                    onChange={(event) => selecionarProdutoVenda(event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {produtosAtivos.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.nome} · {quantidade(produto.estoque_atual)}{' '}
                        {produto.unidade}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Cliente</span>
                  <select
                    className="select"
                    value={vendaClienteId}
                    onChange={(event) => setVendaClienteId(event.target.value)}
                  >
                    <option value="">Venda sem cadastro</option>
                    {clientesAtivos.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Quantidade *</span>
                  <input
                    className="input"
                    type="number"
                    min="0.001"
                    max={vendaProduto?.estoque_atual || undefined}
                    step="0.001"
                    value={vendaQuantidade}
                    onChange={(event) => setVendaQuantidade(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="label">Preço unitário *</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={vendaPreco}
                    onChange={(event) => setVendaPreco(event.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Desconto</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={vendaDesconto}
                    onChange={(event) => setVendaDesconto(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="label">Taxa de entrega</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={vendaEntrega}
                    onChange={(event) => setVendaEntrega(event.target.value)}
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Forma de pagamento</span>
                  <select
                    className="select"
                    value={vendaForma}
                    onChange={(event) => setVendaForma(event.target.value)}
                  >
                    {formasPagamento.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">Situação</span>
                  <select
                    className="select"
                    value={vendaStatus}
                    onChange={(event) =>
                      setVendaStatus(
                        event.target.value as 'pago' | 'parcial' | 'pendente'
                      )
                    }
                  >
                    <option value="pago">Pago</option>
                    <option value="parcial">Parcialmente pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </label>
              </div>

              {vendaStatus === 'parcial' && (
                <label className="field">
                  <span className="label">Valor recebido</span>
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={vendaValorPago}
                    onChange={(event) => setVendaValorPago(event.target.value)}
                  />
                </label>
              )}

              <div className="form-row">
                <label className="field">
                  <span className="label">Data da venda</span>
                  <input
                    className="input"
                    type="date"
                    value={vendaData}
                    onChange={(event) => setVendaData(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="label">Observação</span>
                  <input
                    className="input"
                    value={vendaObservacao}
                    onChange={(event) => setVendaObservacao(event.target.value)}
                    placeholder="Retirada, entrega, combinado..."
                  />
                </label>
              </div>

              <div
                className="card"
                style={{
                  background: '#f8faf4',
                  boxShadow: 'none',
                  marginBottom: 12
                }}
              >
                <strong>Total da venda: {moeda(totalVendaPrevisto)}</strong>
              </div>

              <button
                className="btn btn-primary"
                disabled={salvando || !produtosAtivos.length}
                type="submit"
              >
                {salvando ? 'Registrando...' : 'Confirmar venda'}
              </button>
            </form>

            <section className="card section">
              <h2>Histórico de vendas</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {vendas.map((venda) => (
                  <div
                    key={venda.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: 12
                    }}
                  >
                    <div>
                      <strong>{venda.agro_produtos?.nome || 'Produto'}</strong>
                      <div className="muted">
                        {venda.agro_clientes?.nome || 'Cliente não informado'} ·{' '}
                        {dataBR(venda.data_venda)}
                      </div>
                      <div className="muted">
                        {quantidade(venda.quantidade)}{' '}
                        {venda.agro_produtos?.unidade || ''} · {venda.forma_pagamento}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong>{moeda(venda.total)}</strong>
                      <div>
                        <span
                          className={`badge ${
                            venda.status_pagamento === 'pago'
                              ? 'status-aprovado'
                              : 'status-pendente'
                          }`}
                        >
                          {venda.status_pagamento}
                        </span>
                      </div>
                      {venda.status_pagamento !== 'pago' && (
                        <button
                          className="btn btn-secondary"
                          style={{ marginTop: 8 }}
                          type="button"
                          onClick={() => quitarVenda(venda)}
                        >
                          Marcar como pago
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!vendas.length && (
                  <p className="muted">Nenhuma venda registrada.</p>
                )}
              </div>
            </section>
          </>
        )}

        {aba === 'clientes' && (
          <>
            <form className="card form" onSubmit={salvarCliente}>
              <div className="section-head">
                <div>
                  <h2>{clienteEdicaoId ? 'Editar cliente' : 'Cadastrar cliente'}</h2>
                  <p>Use o cadastro para acompanhar compras e valores pendentes.</p>
                </div>
                {clienteEdicaoId && (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={limparCliente}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Nome *</span>
                  <input
                    className="input"
                    value={clienteNome}
                    onChange={(event) => setClienteNome(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="label">WhatsApp</span>
                  <input
                    className="input"
                    value={clienteWhatsapp}
                    onChange={(event) => setClienteWhatsapp(event.target.value)}
                    placeholder="63 99999-9999"
                  />
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span className="label">Endereço</span>
                  <input
                    className="input"
                    value={clienteEndereco}
                    onChange={(event) => setClienteEndereco(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="label">Limite de crédito</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={clienteLimite}
                    onChange={(event) => setClienteLimite(event.target.value)}
                  />
                </label>
              </div>

              <label className="field">
                <span className="label">Observações</span>
                <textarea
                  className="textarea"
                  value={clienteObservacoes}
                  onChange={(event) => setClienteObservacoes(event.target.value)}
                />
              </label>

              <button className="btn btn-primary" disabled={salvando} type="submit">
                {salvando
                  ? 'Salvando...'
                  : clienteEdicaoId
                    ? 'Atualizar cliente'
                    : 'Cadastrar cliente'}
              </button>
            </form>

            <div className="grid grid-2 section">
              {clientes.map((cliente) => {
                const pendenteCliente = vendas
                  .filter((venda) => venda.cliente_id === cliente.id)
                  .reduce(
                    (total, venda) =>
                      total + Math.max(venda.total - venda.valor_pago, 0),
                    0
                  );

                return (
                  <article
                    className="card"
                    key={cliente.id}
                    style={{ opacity: cliente.ativo ? 1 : 0.65 }}
                  >
                    <span className="badge">
                      {cliente.ativo ? 'Cliente' : 'Inativo'}
                    </span>
                    <h2 style={{ marginBottom: 6 }}>{cliente.nome}</h2>
                    <p className="muted" style={{ marginTop: 0 }}>
                      {cliente.whatsapp || 'WhatsApp não informado'}
                    </p>
                    <p>
                      Pendente: <strong>{moeda(pendenteCliente)}</strong>
                      <br />
                      Limite: {moeda(cliente.limite_credito)}
                    </p>
                    <div className="actions" style={{ justifyContent: 'flex-start' }}>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => editarCliente(cliente)}
                      >
                        <Pencil size={16} /> Editar
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => alterarClienteAtivo(cliente)}
                      >
                        {cliente.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  </article>
                );
              })}
              {!clientes.length && (
                <div className="card">
                  <p className="muted">Nenhum cliente cadastrado.</p>
                </div>
              )}
            </div>
          </>
        )}

        <div
          className="card section"
          style={{
            background:
              'linear-gradient(135deg, rgba(11,61,37,.98), rgba(31,93,47,.96))',
            color: 'white'
          }}
        >
          <CircleDollarSign size={30} />
          <h2 style={{ color: 'white' }}>Primeira versão do AgroGestão</h2>
          <p style={{ color: 'rgba(255,255,255,.82)' }}>
            Este módulo funciona separado dos anúncios. Assim, o produtor pode controlar
            estoque e vendas sem alterar a estrutura atual da lojinha.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function AgroGestaoPage() {
  return (
    <AuthGuard>
      <AgroGestaoContent />
    </AuthGuard>
  );
}
