'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  Download,
  Menu,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Users,
  X
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import styles from './agrogestao.module.css';

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

type KpiTone = 'default' | 'success' | 'warning';

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

const tituloAba: Record<Aba, { eyebrow: string; titulo: string; descricao: string }> = {
  resumo: {
    eyebrow: 'OPERAÇÃO',
    titulo: 'Visão geral',
    descricao: 'Aqui está o resumo da sua gestão.'
  },
  produtos: {
    eyebrow: 'CADASTROS',
    titulo: 'Produtos',
    descricao: 'Cadastre e acompanhe os itens que você vende.'
  },
  estoque: {
    eyebrow: 'OPERAÇÃO',
    titulo: 'Estoque',
    descricao: 'Registre a produção que entra e a mercadoria que sai.'
  },
  vendas: {
    eyebrow: 'OPERAÇÃO',
    titulo: 'Vendas',
    descricao: 'Da venda ao recebimento, em um único registro.'
  },
  clientes: {
    eyebrow: 'CADASTROS',
    titulo: 'Clientes',
    descricao: 'Quem compra, quanto deve e quando comprou pela última vez.'
  }
};

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

function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || 'AG';
}

function iconeProduto(categoria: string) {
  const categoriaNormalizada = categoria.toLowerCase();
  if (categoriaNormalizada.includes('ovo')) return '🥚';
  if (categoriaNormalizada.includes('leite') || categoriaNormalizada.includes('derivado')) return '🧀';
  if (categoriaNormalizada.includes('mel')) return '🍯';
  if (categoriaNormalizada.includes('hort')) return '🥬';
  if (categoriaNormalizada.includes('fruta')) return '🍊';
  if (categoriaNormalizada.includes('ave') || categoriaNormalizada.includes('carne')) return '🐔';
  if (categoriaNormalizada.includes('muda') || categoriaNormalizada.includes('semente')) return '🌱';
  if (categoriaNormalizada.includes('animal')) return '🐄';
  return '📦';
}

function KpiCard({
  label,
  value,
  detail,
  tone = 'default'
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: KpiTone;
}) {
  return (
    <article className={`${styles.kpiCard} ${styles[`kpi_${tone}`]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function SectionCard({
  title,
  aside,
  children,
  className = ''
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.sectionCard} ${className}`}>
      <div className={styles.sectionCardHeader}>
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function AgroGestaoContent() {
  const [aba, setAba] = useState<Aba>('resumo');
  const [menuAberto, setMenuAberto] = useState(false);
  const [usuarioId, setUsuarioId] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('Produtor');
  const [vitrineId, setVitrineId] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const [buscaCliente, setBuscaCliente] = useState('');

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

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

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
      { data: perfil },
      { data: vitrine },
      { data: produtosData, error: produtosError },
      { data: clientesData },
      { data: vendasData },
      { data: movimentosData }
    ] = await Promise.all([
      supabase.from('usuarios').select('nome').eq('id', user.id).maybeSingle(),
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

    setNomeUsuario(perfil?.nome || user.user_metadata?.nome || 'Produtor');
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
  const ticketMedio = vendasMes.length ? faturamentoMes / vendasMes.length : 0;

  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const movimentosSeteDias = movimentos.filter(
    (movimento) => new Date(movimento.created_at) >= seteDiasAtras
  );

  const saldoPorCliente = useMemo<Map<string, number>>(() => {
    const saldos = new Map<string, number>();
    vendas.forEach((venda) => {
      if (!venda.cliente_id) return;
      saldos.set(
        venda.cliente_id,
        (saldos.get(venda.cliente_id) || 0) + Math.max(venda.total - venda.valor_pago, 0)
      );
    });
    return saldos;
  }, [vendas]);

  const ultimaCompraPorCliente = useMemo<Map<string, string>>(() => {
    const datas = new Map<string, string>();
    vendas.forEach((venda) => {
      if (!venda.cliente_id) return;
      const atual = datas.get(venda.cliente_id);
      if (!atual || venda.data_venda > atual) datas.set(venda.cliente_id, venda.data_venda);
    });
    return datas;
  }, [vendas]);

  const topClientes = clientesAtivos
    .map((cliente) => ({ cliente, saldo: saldoPorCliente.get(cliente.id) || 0 }))
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 4);

  const clientesComSaldo = clientesAtivos.filter(
    (cliente) => (saldoPorCliente.get(cliente.id) || 0) > 0
  ).length;
  const maiorSaldo = clientesAtivos.reduce(
    (maior, cliente) => Math.max(maior, saldoPorCliente.get(cliente.id) || 0),
    0
  );

  const categoriasDisponiveis = ['Todos', ...Array.from(new Set(produtosAtivos.map((p) => p.categoria)))];
  const produtosFiltrados = produtos.filter((produto) => {
    const combinaBusca = produto.nome.toLowerCase().includes(buscaProduto.toLowerCase());
    const combinaCategoria = categoriaFiltro === 'Todos' || produto.categoria === categoriaFiltro;
    return combinaBusca && combinaCategoria;
  });

  const clientesFiltrados = clientes.filter((cliente) => {
    const termo = buscaCliente.toLowerCase();
    return (
      cliente.nome.toLowerCase().includes(termo) ||
      (cliente.whatsapp || '').toLowerCase().includes(termo) ||
      (cliente.endereco || '').toLowerCase().includes(termo)
    );
  });

  const vendaProduto = produtosAtivos.find((produto) => produto.id === vendaProdutoId);
  const totalVendaPrevisto = Math.max(
    numero(vendaQuantidade) * numero(vendaPreco) - numero(vendaDesconto) + numero(vendaEntrega),
    0
  );

  const botoesAbas: Array<{ id: Aba; label: string; icon: typeof BarChart3 }> = [
    { id: 'resumo', label: 'Visão geral', icon: BarChart3 },
    { id: 'produtos', label: 'Produtos', icon: Boxes },
    { id: 'estoque', label: 'Estoque', icon: PackagePlus },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'clientes', label: 'Clientes', icon: Users }
  ];

  function navegar(id: Aba) {
    setAba(id);
    setMenuAberto(false);
    requestAnimationFrame(() => {
      document.getElementById('agro-main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function rolarPara(id: string) {
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

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
    navegar('produtos');
    rolarPara('produto-form');
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

  function exportarProdutosCsv() {
    const cabecalho = ['Produto', 'Categoria', 'Unidade', 'Custo', 'Preço', 'Estoque', 'Mínimo'];
    const linhas = produtosAtivos.map((produto) => [
      produto.nome,
      produto.categoria,
      produto.unidade,
      produto.custo_unitario,
      produto.preco_venda,
      produto.estoque_atual,
      produto.estoque_minimo
    ]);
    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agrogestao-produtos-${hojeLocal()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
    navegar('clientes');
    rolarPara('cliente-form');
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

  if (carregando) {
    return (
      <div className={styles.viewport}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingLogo}>Ag</div>
          <strong>Carregando AgroGestão...</strong>
        </div>
      </div>
    );
  }

  const cabecalho = tituloAba[aba];

  return (
    <div className={styles.viewport}>
      <aside className={`${styles.sidebar} ${menuAberto ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>Ag</span>
          <div>
            <strong>AgroGestão</strong>
            <small>Estoque e vendas</small>
          </div>
          <button
            className={styles.closeMenu}
            type="button"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.sidebarSectionLabel}>OPERAÇÃO</div>
        <nav className={styles.sidebarNav}>
          {botoesAbas.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={aba === id ? styles.navActive : ''}
              type="button"
              onClick={() => navegar(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
              {aba === id && <i />}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <span>Gestão simples para quem produz.</span>
          <a href="/painel">Voltar ao AgroMarket</a>
        </div>
      </aside>

      {menuAberto && (
        <button
          className={styles.overlay}
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
          <div className={styles.topbarSpacer} />
          <button type="button" className={styles.iconButton} aria-label="Notificações">
            <Bell size={21} />
          </button>
          <div className={styles.avatar} title={nomeUsuario}>
            {iniciais(nomeUsuario)}
          </div>
        </header>

        <main id="agro-main-content" className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <span>{cabecalho.eyebrow}</span>
              <h1>{cabecalho.titulo}</h1>
              <p>{cabecalho.descricao}</p>
            </div>
          </div>

          {mensagem && (
            <div className={styles.notice}>
              <span>{mensagem}</span>
              <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar aviso">
                <X size={17} />
              </button>
            </div>
          )}

          {aba === 'resumo' && (
            <div className={styles.screenStack}>
              <div className={styles.kpiGrid}>
                <KpiCard label="VENDAS DO MÊS" value={moeda(faturamentoMes)} detail={`${vendasMes.length} vendas registradas`} />
                <KpiCard label="RECEBIDO" value={moeda(recebidoMes)} detail="Confirmadas" tone="success" />
                <KpiCard label="A RECEBER" value={moeda(aReceber)} detail={`${vendas.filter((v) => v.status_pagamento !== 'pago').length} pedidos em aberto`} tone="warning" />
                <KpiCard label="ESTOQUE PARA VENDA" value={moeda(valorEstoque)} detail={`${produtosAtivos.length} produtos cadastrados`} />
              </div>

              {produtosBaixos.length > 0 && (
                <div className={styles.lowStockBanner}>
                  <AlertTriangle size={21} />
                  <div>
                    <strong>{produtosBaixos.length} produto(s) abaixo do mínimo</strong>
                    <span>Revise o estoque para não perder vendas.</span>
                  </div>
                  <button type="button" onClick={() => navegar('estoque')}>
                    Ver estoque <ChevronRight size={17} />
                  </button>
                </div>
              )}

              <div className={styles.twoColumns}>
                <SectionCard
                  title="Atividades recentes"
                  aside={<button className={styles.textButton} type="button" onClick={() => navegar('vendas')}>Ver todas</button>}
                >
                  <div className={styles.activityList}>
                    {vendas.slice(0, 3).map((venda) => (
                      <div className={styles.activityItem} key={`venda-${venda.id}`}>
                        <span className={styles.activityIcon}><ShoppingCart size={17} /></span>
                        <div>
                          <strong>Venda para {venda.agro_clientes?.nome || 'cliente'}</strong>
                          <small>{venda.agro_produtos?.nome || 'Produto'} · {dataBR(venda.data_venda)}</small>
                        </div>
                        <b>{moeda(venda.total)}</b>
                      </div>
                    ))}
                    {movimentos.slice(0, 2).map((movimento) => (
                      <div className={styles.activityItem} key={`mov-${movimento.id}`}>
                        <span className={styles.activityIcon}><PackagePlus size={17} /></span>
                        <div>
                          <strong>Movimento de estoque</strong>
                          <small>{movimento.agro_produtos?.nome || 'Produto'} · {dataBR(movimento.created_at)}</small>
                        </div>
                        <b>{quantidade(movimento.quantidade)}</b>
                      </div>
                    ))}
                    {!vendas.length && !movimentos.length && (
                      <div className={styles.emptyState}>Nenhuma atividade registrada.</div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Top clientes"
                  aside={<button className={styles.textButton} type="button" onClick={() => navegar('clientes')}>Ver todos</button>}
                >
                  <div className={styles.clientMiniList}>
                    {topClientes.map(({ cliente, saldo }) => (
                      <div key={cliente.id}>
                        <span className={styles.clientInitial}>{iniciais(cliente.nome)}</span>
                        <div>
                          <strong>{cliente.nome}</strong>
                          <small>{cliente.endereco || 'Local não informado'}</small>
                        </div>
                        <b>{moeda(saldo)}</b>
                      </div>
                    ))}
                    {!topClientes.length && <div className={styles.emptyState}>Nenhum cliente cadastrado.</div>}
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {aba === 'produtos' && (
            <div className={styles.screenStack}>
              <div className={styles.toolbar}>
                <label className={styles.searchBox}>
                  <Search size={18} />
                  <input value={buscaProduto} onChange={(event) => setBuscaProduto(event.target.value)} placeholder="Buscar produto..." />
                </label>
                <button className={styles.filterButton} type="button" aria-label="Filtros">
                  <SlidersHorizontal size={19} />
                </button>
                <button className={styles.secondaryAction} type="button" onClick={exportarProdutosCsv}>
                  <Download size={17} /> Exportar CSV
                </button>
              </div>

              <div className={styles.categoryChips}>
                {categoriasDisponiveis.map((categoria) => (
                  <button
                    key={categoria}
                    type="button"
                    className={categoriaFiltro === categoria ? styles.chipActive : ''}
                    onClick={() => setCategoriaFiltro(categoria)}
                  >
                    {categoria}
                  </button>
                ))}
              </div>

              <SectionCard title="Produtos cadastrados" aside={<span className={styles.countLabel}>{produtosFiltrados.length} itens</span>}>
                <div className={styles.productList}>
                  {produtosFiltrados.map((produto) => {
                    const baixo = produto.estoque_atual <= produto.estoque_minimo;
                    return (
                      <article className={`${styles.productRow} ${!produto.ativo ? styles.rowInactive : ''}`} key={produto.id}>
                        <span className={styles.productEmoji}>{iconeProduto(produto.categoria)}</span>
                        <div className={styles.productMain}>
                          <strong>{produto.nome}</strong>
                          <small>{produto.unidade} · {produto.categoria}</small>
                          <b>{moeda(produto.preco_venda)}</b>
                        </div>
                        <div className={`${styles.stockBadge} ${baixo ? styles.stockLow : styles.stockOk}`}>
                          <strong>{quantidade(produto.estoque_atual)}</strong>
                          <small>{baixo ? 'baixo' : 'em estoque'}</small>
                        </div>
                        <div className={styles.rowActions}>
                          <button type="button" onClick={() => editarProduto(produto)}><Pencil size={16} /> Editar</button>
                          <button type="button" onClick={() => alterarProdutoAtivo(produto)}>{produto.ativo ? 'Desativar' : 'Reativar'}</button>
                        </div>
                      </article>
                    );
                  })}
                  {!produtosFiltrados.length && <div className={styles.emptyState}>Nenhum produto encontrado.</div>}
                </div>
              </SectionCard>

              <form id="produto-form" className={styles.formCard} onSubmit={salvarProduto}>
                <div className={styles.formHeader}>
                  <div>
                    <h2>{produtoEdicaoId ? 'Editar produto' : 'Cadastrar produto'}</h2>
                    <span>{produtoEdicaoId ? 'Atualize os dados do item' : 'Novo item'}</span>
                  </div>
                  {produtoEdicaoId && <button type="button" onClick={limparProduto}>Cancelar edição</button>}
                </div>
                <div className={styles.formGrid}>
                  <label><span>Nome *</span><input value={produtoNome} onChange={(event) => setProdutoNome(event.target.value)} placeholder="Ex: Ovo de codorna" /></label>
                  <label><span>Categoria</span><select value={produtoCategoria} onChange={(event) => setProdutoCategoria(event.target.value)}>{categorias.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label><span>Unidade de venda</span><select value={produtoUnidade} onChange={(event) => setProdutoUnidade(event.target.value)}>{unidades.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label><span>Estoque mínimo</span><input type="number" min="0" step="0.001" value={produtoMinimo} onChange={(event) => setProdutoMinimo(event.target.value)} placeholder="0" /></label>
                  <label><span>Custo por unidade</span><input type="number" min="0" step="0.01" value={produtoCusto} onChange={(event) => setProdutoCusto(event.target.value)} placeholder="R$ 0,00" /></label>
                  <label><span>Preço de venda</span><input type="number" min="0" step="0.01" value={produtoPreco} onChange={(event) => setProdutoPreco(event.target.value)} placeholder="R$ 0,00" /></label>
                </div>
                <button className={styles.primaryAction} disabled={salvando} type="submit">
                  {salvando ? 'Salvando...' : produtoEdicaoId ? 'Atualizar produto' : 'Cadastrar produto'}
                </button>
              </form>

              <button className={styles.floatingAction} type="button" onClick={() => rolarPara('produto-form')}>
                <Plus size={20} /> Novo produto
              </button>
            </div>
          )}

          {aba === 'estoque' && (
            <div className={styles.screenStack}>
              <div className={styles.kpiGrid}>
                <KpiCard label="VALOR EM ESTOQUE" value={moeda(valorEstoque)} />
                <KpiCard label="PRODUTOS" value={produtosAtivos.length} detail="cadastrados" />
                <KpiCard label="ABAIXO DO MÍNIMO" value={produtosBaixos.length} detail="requer reposição" tone="warning" />
                <KpiCard label="MOVIMENTOS (7 DIAS)" value={movimentosSeteDias.length} detail="entradas e saídas" />
              </div>

              <div className={styles.twoColumnsWide}>
                <SectionCard title="Saldo por produto" aside={<span className={styles.countLabel}>{produtosAtivos.length} itens</span>}>
                  <div className={styles.balanceList}>
                    {produtosAtivos.map((produto) => {
                      const baixo = produto.estoque_atual <= produto.estoque_minimo;
                      return (
                        <div key={produto.id}>
                          <div><strong>{produto.nome}</strong><small>{produto.unidade}</small></div>
                          <span className={baixo ? styles.balanceLow : styles.balanceOk}>{quantidade(produto.estoque_atual)} · {baixo ? 'baixo' : 'em estoque'}</span>
                        </div>
                      );
                    })}
                    {!produtosAtivos.length && <div className={styles.emptyState}>Nenhum produto cadastrado.</div>}
                  </div>
                </SectionCard>

                <SectionCard title="Últimos movimentos" aside={<span className={styles.countLabel}>{movimentos.length} registros</span>}>
                  <div className={styles.movementList}>
                    {movimentos.slice(0, 8).map((movimento) => {
                      const entrada = ['producao', 'compra', 'devolucao', 'ajuste_entrada'].includes(movimento.tipo);
                      return (
                        <div key={movimento.id}>
                          <span>{dataBR(movimento.created_at)}</span>
                          <div><strong>{movimento.agro_produtos?.nome || 'Produto'}</strong><small>{movimento.tipo.replaceAll('_', ' ')}</small></div>
                          <b className={entrada ? styles.valueIn : styles.valueOut}>{entrada ? '+' : '-'}{quantidade(movimento.quantidade)}</b>
                        </div>
                      );
                    })}
                    {!movimentos.length && <div className={styles.emptyState}>Nenhum movimento registrado.</div>}
                  </div>
                </SectionCard>
              </div>

              <form id="estoque-form" className={styles.formCard} onSubmit={registrarMovimento}>
                <div className={styles.formHeader}>
                  <div><h2>Novo lançamento</h2><span>Entrada ou saída</span></div>
                </div>
                {!produtosAtivos.length && <div className={styles.inlineAlert}>Cadastre pelo menos um produto antes de movimentar o estoque.</div>}
                <div className={styles.formGrid}>
                  <label><span>Produto *</span><select value={movimentoProdutoId} onChange={(event) => setMovimentoProdutoId(event.target.value)}><option value="">Selecione o produto</option>{produtosAtivos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} · estoque {quantidade(produto.estoque_atual)}</option>)}</select></label>
                  <label><span>Tipo *</span><select value={movimentoTipo} onChange={(event) => setMovimentoTipo(event.target.value)}>{tiposMovimento.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                  <label><span>Quantidade *</span><input type="number" min="0.001" step="0.001" value={movimentoQuantidade} onChange={(event) => setMovimentoQuantidade(event.target.value)} placeholder="0" /></label>
                  <label><span>Observação</span><input value={movimentoObservacao} onChange={(event) => setMovimentoObservacao(event.target.value)} placeholder="Ex: Coleta da manhã" /></label>
                </div>
                <button className={styles.primaryAction} disabled={salvando || !produtosAtivos.length} type="submit">{salvando ? 'Registrando...' : 'Registrar lançamento'}</button>
              </form>
            </div>
          )}

          {aba === 'vendas' && (
            <div className={styles.screenStack}>
              <div className={styles.kpiGrid}>
                <KpiCard label="VENDAS NO MÊS" value={moeda(faturamentoMes)} detail={`${vendasMes.length} registros`} />
                <KpiCard label="RECEBIDO" value={moeda(recebidoMes)} detail="Confirmadas" tone="success" />
                <KpiCard label="A RECEBER" value={moeda(aReceber)} detail={`${vendas.filter((v) => v.status_pagamento !== 'pago').length} pedidos em aberto`} tone="warning" />
                <KpiCard label="TICKET MÉDIO" value={moeda(ticketMedio)} />
              </div>

              <SectionCard title="Pedidos recentes" aside={<span className={styles.countLabel}>{vendas.length} registros</span>}>
                <div className={styles.salesList}>
                  {vendas.slice(0, 10).map((venda, index) => (
                    <article key={venda.id}>
                      <span className={styles.saleCode}>V-{String(vendas.length - index).padStart(4, '0')}</span>
                      <span>{dataBR(venda.data_venda)}</span>
                      <div><strong>{venda.agro_clientes?.nome || 'Venda sem cadastro'}</strong><small>{venda.agro_produtos?.nome || 'Produto'}</small></div>
                      <div className={styles.saleValue}><strong>{moeda(venda.total)}</strong><span className={venda.status_pagamento === 'pago' ? styles.statusPaid : styles.statusPending}>{venda.status_pagamento === 'pago' ? 'Recebido' : 'Pendente'}</span></div>
                      {venda.status_pagamento !== 'pago' && <button type="button" onClick={() => quitarVenda(venda)}>Marcar recebido</button>}
                    </article>
                  ))}
                  {!vendas.length && <div className={styles.emptyState}>Nenhuma venda registrada.</div>}
                </div>
              </SectionCard>

              <form id="venda-form" className={styles.formCard} onSubmit={registrarVenda}>
                <div className={styles.formHeader}>
                  <div><h2>Nova venda rápida</h2><span>Registro em poucos passos</span></div>
                </div>
                {!produtosAtivos.length && <div className={styles.inlineAlert}>Cadastre um produto e adicione estoque antes da primeira venda.</div>}
                <div className={styles.formGrid}>
                  <label><span>Cliente</span><select value={vendaClienteId} onChange={(event) => setVendaClienteId(event.target.value)}><option value="">Venda sem cadastro</option>{clientesAtivos.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select></label>
                  <label><span>Produto *</span><select value={vendaProdutoId} onChange={(event) => selecionarProdutoVenda(event.target.value)}><option value="">Selecione o produto</option>{produtosAtivos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} · {quantidade(produto.estoque_atual)} {produto.unidade}</option>)}</select></label>
                  <label><span>Quantidade *</span><input type="number" min="0.001" max={vendaProduto?.estoque_atual || undefined} step="0.001" value={vendaQuantidade} onChange={(event) => setVendaQuantidade(event.target.value)} placeholder="0" /></label>
                  <label><span>Preço unitário *</span><input type="number" min="0" step="0.01" value={vendaPreco} onChange={(event) => setVendaPreco(event.target.value)} placeholder="R$ 0,00" /></label>
                  <label><span>Desconto</span><input type="number" min="0" step="0.01" value={vendaDesconto} onChange={(event) => setVendaDesconto(event.target.value)} placeholder="R$ 0,00" /></label>
                  <label><span>Taxa de entrega</span><input type="number" min="0" step="0.01" value={vendaEntrega} onChange={(event) => setVendaEntrega(event.target.value)} placeholder="R$ 0,00" /></label>
                  <label><span>Forma de pagamento</span><select value={vendaForma} onChange={(event) => setVendaForma(event.target.value)}>{formasPagamento.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                  <label><span>Situação</span><select value={vendaStatus} onChange={(event) => setVendaStatus(event.target.value as 'pago' | 'parcial' | 'pendente')}><option value="pago">Pago</option><option value="parcial">Parcialmente pago</option><option value="pendente">Pendente</option></select></label>
                  {vendaStatus === 'parcial' && <label><span>Valor recebido</span><input type="number" min="0.01" step="0.01" value={vendaValorPago} onChange={(event) => setVendaValorPago(event.target.value)} /></label>}
                  <label><span>Data da venda</span><input type="date" value={vendaData} onChange={(event) => setVendaData(event.target.value)} /></label>
                  <label className={styles.fieldFull}><span>Observação</span><input value={vendaObservacao} onChange={(event) => setVendaObservacao(event.target.value)} placeholder="Retirada, entrega, combinado..." /></label>
                </div>
                <div className={styles.totalBox}><span>Valor total</span><strong>{moeda(totalVendaPrevisto)}</strong></div>
                <button className={styles.primaryAction} disabled={salvando || !produtosAtivos.length} type="submit">{salvando ? 'Registrando...' : 'Registrar venda'}</button>
              </form>
            </div>
          )}

          {aba === 'clientes' && (
            <div className={styles.screenStack}>
              <div className={styles.kpiGrid}>
                <KpiCard label="CLIENTES" value={clientesAtivos.length} />
                <KpiCard label="COM SALDO ABERTO" value={clientesComSaldo} tone="warning" />
                <KpiCard label="TOTAL A RECEBER" value={moeda(aReceber)} tone="warning" />
                <KpiCard label="MAIOR SALDO" value={moeda(maiorSaldo)} />
              </div>

              <label className={styles.searchBoxWide}>
                <Search size={18} />
                <input value={buscaCliente} onChange={(event) => setBuscaCliente(event.target.value)} placeholder="Buscar cliente..." />
              </label>

              <SectionCard title="Carteira de clientes" aside={<span className={styles.countLabel}>{clientesFiltrados.length} registros</span>}>
                <div className={styles.clientList}>
                  {clientesFiltrados.map((cliente) => {
                    const pendente = saldoPorCliente.get(cliente.id) || 0;
                    return (
                      <article className={!cliente.ativo ? styles.rowInactive : ''} key={cliente.id}>
                        <span className={styles.clientAvatar}>{iniciais(cliente.nome)}</span>
                        <div><strong>{cliente.nome}</strong><small>{cliente.endereco || 'Local não informado'} · {cliente.whatsapp || 'Sem telefone'}</small></div>
                        <div className={styles.clientBalance}><strong>{moeda(pendente)}</strong><small>Última compra: {dataBR(ultimaCompraPorCliente.get(cliente.id))}</small></div>
                        <div className={styles.rowActions}><button type="button" onClick={() => editarCliente(cliente)}><Pencil size={16} /> Editar</button><button type="button" onClick={() => alterarClienteAtivo(cliente)}>{cliente.ativo ? 'Desativar' : 'Reativar'}</button></div>
                      </article>
                    );
                  })}
                  {!clientesFiltrados.length && <div className={styles.emptyState}>Nenhum cliente encontrado.</div>}
                </div>
              </SectionCard>

              <form id="cliente-form" className={styles.formCard} onSubmit={salvarCliente}>
                <div className={styles.formHeader}>
                  <div><h2>{clienteEdicaoId ? 'Editar cliente' : 'Novo cliente'}</h2><span>{clienteEdicaoId ? 'Atualize o cadastro' : 'Cadastro rápido'}</span></div>
                  {clienteEdicaoId && <button type="button" onClick={limparCliente}>Cancelar edição</button>}
                </div>
                <div className={styles.formGrid}>
                  <label><span>Nome *</span><input value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} placeholder="Ex: Mercado Bom Preço" /></label>
                  <label><span>Telefone / WhatsApp</span><input value={clienteWhatsapp} onChange={(event) => setClienteWhatsapp(event.target.value)} placeholder="(00) 00000-0000" /></label>
                  <label><span>Cidade / endereço</span><input value={clienteEndereco} onChange={(event) => setClienteEndereco(event.target.value)} placeholder="Ex: Palmas" /></label>
                  <label><span>Limite de crédito</span><input type="number" min="0" step="0.01" value={clienteLimite} onChange={(event) => setClienteLimite(event.target.value)} placeholder="R$ 0,00" /></label>
                  <label className={styles.fieldFull}><span>Observação</span><textarea value={clienteObservacoes} onChange={(event) => setClienteObservacoes(event.target.value)} placeholder="Ex: entrega às quartas" /></label>
                </div>
                <button className={styles.primaryAction} disabled={salvando} type="submit">{salvando ? 'Salvando...' : clienteEdicaoId ? 'Atualizar cliente' : 'Cadastrar cliente'}</button>
              </form>

              <button className={styles.floatingAction} type="button" onClick={() => rolarPara('cliente-form')}>
                <Plus size={20} /> Novo cliente
              </button>
            </div>
          )}
        </main>

        <nav className={styles.bottomNav} aria-label="Navegação do AgroGestão">
          {botoesAbas.map(({ id, label, icon: Icon }) => (
            <button key={id} className={aba === id ? styles.bottomActive : ''} type="button" onClick={() => navegar(id)}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function AgroGestaoApp() {
  return (
    <AuthGuard>
      <AgroGestaoContent />
    </AuthGuard>
  );
}
