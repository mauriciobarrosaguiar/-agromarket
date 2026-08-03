'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileText,
  HandCoins,
  HelpCircle,
  Menu,
  MessageCircle,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Users,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import styles from './agrogestao.module.css';

type Aba = 'resumo' | 'produtos' | 'estoque' | 'vendas' | 'clientes';
type PagamentoStatus = 'pago' | 'parcial' | 'pendente';
type KpiTone = 'default' | 'success' | 'warning';
type TipoFila =
  | 'produto_criar'
  | 'produto_atualizar'
  | 'movimento'
  | 'venda'
  | 'cliente_criar'
  | 'cliente_atualizar'
  | 'recebimento';

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
  status_pagamento: PagamentoStatus;
  valor_pago: number;
  data_venda: string;
  observacao?: string | null;
  created_at?: string;
  cancelada_em?: string | null;
  motivo_cancelamento?: string | null;
  agro_produtos?: { nome: string; unidade: string } | null;
  agro_clientes?: { nome: string } | null;
};

type Movimento = {
  id: string;
  produto_id: string;
  venda_id?: string | null;
  tipo: string;
  quantidade: number;
  saldo_anterior: number;
  saldo_posterior: number;
  observacao?: string | null;
  created_at: string;
  agro_produtos?: { nome: string; unidade: string } | null;
};

type AcaoFila = {
  id: string;
  tipo: TipoFila;
  payload: Record<string, unknown>;
  criadaEm: string;
};

type UltimaAcao = {
  tipo: 'movimento' | 'venda';
  id: string;
  texto: string;
};

type RecebimentoAberto = {
  clienteId: string;
  nome: string;
  saldo: number;
  valor: string;
} | null;

const FILA_KEY = 'agrogestao-fila-offline-v3';
const CACHE_KEY = 'agrogestao-cache-v3';
const ONBOARDING_KEY = 'agrogestao-onboarding-v2';

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
  { value: 'producao', label: 'Produzi ou colhi', ajuda: 'Entrou porque foi produzido na propriedade.', entrada: true, emoji: '🌱' },
  { value: 'compra', label: 'Comprei para revender', ajuda: 'Entrou porque você comprou de outra pessoa.', entrada: true, emoji: '🛒' },
  { value: 'devolucao', label: 'Cliente devolveu', ajuda: 'O produto voltou para seu estoque.', entrada: true, emoji: '↩️' },
  { value: 'ajuste_entrada', label: 'Corrigir para mais', ajuda: 'Use quando o estoque real estiver maior que o sistema.', entrada: true, emoji: '➕' },
  { value: 'perda', label: 'Perdi ou descartei', ajuda: 'Produto estragado, quebrado ou perdido.', entrada: false, emoji: '⚠️' },
  { value: 'consumo', label: 'Usei em casa', ajuda: 'Produto consumido pela família ou propriedade.', entrada: false, emoji: '🏠' },
  { value: 'doacao', label: 'Doei', ajuda: 'Produto entregue sem venda.', entrada: false, emoji: '🤝' },
  { value: 'ajuste_saida', label: 'Corrigir para menos', ajuda: 'Use quando o estoque real estiver menor que o sistema.', entrada: false, emoji: '➖' }
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
    eyebrow: 'INÍCIO',
    titulo: 'Minha produção',
    descricao: 'Veja o que vendeu, o que tem no estoque e o que precisa de atenção.'
  },
  produtos: {
    eyebrow: 'O QUE VOCÊ VENDE',
    titulo: 'Produtos',
    descricao: 'Cadastre ovos, frangos, hortaliças, leite e tudo o que você comercializa.'
  },
  estoque: {
    eyebrow: 'ENTRADAS E SAÍDAS',
    titulo: 'Estoque',
    descricao: 'Conte ao sistema o que produziu, perdeu, usou ou comprou.'
  },
  vendas: {
    eyebrow: 'DINHEIRO DA PRODUÇÃO',
    titulo: 'Vendas',
    descricao: 'Registre a venda e informe se o cliente pagou ou ficou devendo.'
  },
  clientes: {
    eyebrow: 'QUEM COMPRA DE VOCÊ',
    titulo: 'Clientes',
    descricao: 'Veja os clientes, as compras e quem ainda precisa pagar.'
  }
};

const DEMO_PRODUTOS: Produto[] = [
  {
    id: 'demo-produto-1', usuario_id: 'demo', nome: 'Ovo caipira', categoria: 'Ovos', unidade: 'dúzia',
    custo_unitario: 9, preco_venda: 18, estoque_atual: 24, estoque_minimo: 8, ativo: true
  },
  {
    id: 'demo-produto-2', usuario_id: 'demo', nome: 'Cheiro-verde', categoria: 'Hortaliças', unidade: 'maço',
    custo_unitario: 1.2, preco_venda: 4, estoque_atual: 5, estoque_minimo: 10, ativo: true
  }
];

const DEMO_CLIENTES: Cliente[] = [
  { id: 'demo-cliente-1', usuario_id: 'demo', nome: 'Mercadinho do João', whatsapp: '63999999999', endereco: 'Palmas', limite_credito: 300, ativo: true },
  { id: 'demo-cliente-2', usuario_id: 'demo', nome: 'Maria da Feira', whatsapp: '63988888888', endereco: 'Porto Nacional', limite_credito: 150, ativo: true }
];

const DEMO_VENDAS: Venda[] = [
  {
    id: 'demo-venda-1', cliente_id: 'demo-cliente-1', produto_id: 'demo-produto-1', quantidade: 5,
    preco_unitario: 18, desconto: 0, taxa_entrega: 10, total: 100, forma_pagamento: 'pix',
    status_pagamento: 'pago', valor_pago: 100, data_venda: '2026-08-02',
    agro_produtos: { nome: 'Ovo caipira', unidade: 'dúzia' }, agro_clientes: { nome: 'Mercadinho do João' }
  },
  {
    id: 'demo-venda-2', cliente_id: 'demo-cliente-2', produto_id: 'demo-produto-2', quantidade: 10,
    preco_unitario: 4, desconto: 0, taxa_entrega: 0, total: 40, forma_pagamento: 'fiado',
    status_pagamento: 'pendente', valor_pago: 0, data_venda: '2026-08-01',
    agro_produtos: { nome: 'Cheiro-verde', unidade: 'maço' }, agro_clientes: { nome: 'Maria da Feira' }
  }
];

const DEMO_MOVIMENTOS: Movimento[] = [
  {
    id: 'demo-mov-1', produto_id: 'demo-produto-1', tipo: 'producao', quantidade: 12,
    saldo_anterior: 12, saldo_posterior: 24, created_at: '2026-08-02T09:00:00Z',
    agro_produtos: { nome: 'Ovo caipira', unidade: 'dúzia' }
  }
];

function numero(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let texto = String(value ?? '').trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (!texto) return 0;
  if (texto.includes(',')) texto = texto.replace(/\./g, '').replace(',', '.');
  const parsed = Number(texto);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moeda(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero(value));
}

function quantidade(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(numero(value));
}

function dataBR(value?: string | null) {
  if (!value) return '—';
  const data = value.includes('T') ? new Date(value) : new Date(`${value.slice(0, 10)}T12:00:00`);
  return data.toLocaleDateString('pt-BR');
}

function hojeLocal() {
  const agora = new Date();
  const offset = agora.getTimezoneOffset();
  return new Date(agora.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function iniciais(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('') || 'AG';
}

function somenteNumeros(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function iconeProduto(categoria: string) {
  const nome = categoria.toLowerCase();
  if (nome.includes('ovo')) return '🥚';
  if (nome.includes('leite') || nome.includes('derivado')) return '🧀';
  if (nome.includes('mel')) return '🍯';
  if (nome.includes('hort')) return '🥬';
  if (nome.includes('fruta')) return '🍊';
  if (nome.includes('ave') || nome.includes('carne')) return '🐔';
  if (nome.includes('muda') || nome.includes('semente')) return '🌱';
  if (nome.includes('animal')) return '🐄';
  return '📦';
}

function rotuloMovimento(tipo: string) {
  return tiposMovimento.find((item) => item.value === tipo)?.label || tipo.replaceAll('_', ' ');
}

function mensagemAmigavel(texto: string) {
  if (texto.toLowerCase().includes('estoque insuficiente')) return texto.replace('Estoque insuficiente.', 'Você não tem quantidade suficiente no estoque.');
  if (texto.toLowerCase().includes('network') || texto.toLowerCase().includes('fetch')) return 'A internet falhou. O registro foi guardado para tentar novamente.';
  return texto;
}

function KpiCard({ label, value, detail, tone = 'default' }: { label: string; value: string | number; detail?: string; tone?: KpiTone }) {
  return (
    <article className={`${styles.kpiCard} ${styles[`kpi_${tone}`]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function SectionCard({ title, aside, children, className = '' }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
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

function Ajuda({ children }: { children: ReactNode }) {
  return <small className={styles.fieldHelp}><HelpCircle size={14} />{children}</small>;
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
  const [ultimaAcao, setUltimaAcao] = useState<UltimaAcao | null>(null);
  const [online, setOnline] = useState(true);
  const [filaOffline, setFilaOffline] = useState<AcaoFila[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [mostrarBoasVindas, setMostrarBoasVindas] = useState(false);
  const [modoDemonstracao, setModoDemonstracao] = useState(false);

  const [buscaProduto, setBuscaProduto] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const [buscaCliente, setBuscaCliente] = useState('');

  const [produtoEdicaoId, setProdutoEdicaoId] = useState<string | null>(null);
  const [produtoEtapa, setProdutoEtapa] = useState(1);
  const [produtoNome, setProdutoNome] = useState('');
  const [produtoCategoria, setProdutoCategoria] = useState('Ovos');
  const [produtoUnidade, setProdutoUnidade] = useState('dúzia');
  const [produtoCusto, setProdutoCusto] = useState('');
  const [produtoPreco, setProdutoPreco] = useState('');
  const [produtoEstoqueInicial, setProdutoEstoqueInicial] = useState('');
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
  const [vendaStatus, setVendaStatus] = useState<PagamentoStatus>('pago');
  const [vendaValorPago, setVendaValorPago] = useState('');
  const [vendaData, setVendaData] = useState(hojeLocal());
  const [vendaObservacao, setVendaObservacao] = useState('');

  const [clienteEdicaoId, setClienteEdicaoId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteWhatsapp, setClienteWhatsapp] = useState('');
  const [clienteEndereco, setClienteEndereco] = useState('');
  const [clienteLimite, setClienteLimite] = useState('');
  const [clienteObservacoes, setClienteObservacoes] = useState('');
  const [recebimentoAberto, setRecebimentoAberto] = useState<RecebimentoAberto>(null);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setOnline(navigator.onLine);
    const fila = localStorage.getItem(FILA_KEY);
    if (fila) {
      try { setFilaOffline(JSON.parse(fila)); } catch { localStorage.removeItem(FILA_KEY); }
    }
    if (localStorage.getItem(ONBOARDING_KEY) !== 'concluido') setMostrarBoasVindas(true);
    return () => { document.body.style.overflow = overflowAnterior; };
  }, []);

  function aplicarCache() {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    try {
      const cache = JSON.parse(raw);
      setProdutos(cache.produtos || []);
      setClientes(cache.clientes || []);
      setVendas(cache.vendas || []);
      setMovimentos(cache.movimentos || []);
      setNomeUsuario(cache.nomeUsuario || 'Produtor');
      return true;
    } catch {
      return false;
    }
  }

  async function carregar() {
    if (modoDemonstracao) {
      setCarregando(false);
      return;
    }

    if (!navigator.onLine) {
      aplicarCache();
      setCarregando(false);
      return;
    }

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
      supabase.from('agro_vendas').select('*, agro_produtos(nome,unidade), agro_clientes(nome)').eq('usuario_id', user.id).order('data_venda', { ascending: false }).order('created_at', { ascending: false }).limit(500),
      supabase.from('agro_movimentacoes').select('*, agro_produtos(nome,unidade)').eq('usuario_id', user.id).order('created_at', { ascending: false }).limit(300)
    ]);

    const nome = perfil?.nome || user.user_metadata?.nome || 'Produtor';
    setNomeUsuario(nome);
    setVitrineId(vitrine?.id || null);

    if (produtosError) setMensagem(produtosError.message.includes('agro_produtos') ? 'O banco do AgroGestão ainda precisa receber a atualização.' : produtosError.message);

    const produtosLimpos = ((produtosData || []) as Produto[]).map((item) => ({ ...item, custo_unitario: numero(item.custo_unitario), preco_venda: numero(item.preco_venda), estoque_atual: numero(item.estoque_atual), estoque_minimo: numero(item.estoque_minimo) }));
    const clientesLimpos = ((clientesData || []) as Cliente[]).map((item) => ({ ...item, limite_credito: numero(item.limite_credito) }));
    const vendasLimpas = ((vendasData || []) as Venda[]).map((item) => ({ ...item, quantidade: numero(item.quantidade), preco_unitario: numero(item.preco_unitario), desconto: numero(item.desconto), taxa_entrega: numero(item.taxa_entrega), total: numero(item.total), valor_pago: numero(item.valor_pago) }));
    const movimentosLimpos = ((movimentosData || []) as Movimento[]).map((item) => ({ ...item, quantidade: numero(item.quantidade), saldo_anterior: numero(item.saldo_anterior), saldo_posterior: numero(item.saldo_posterior) }));

    setProdutos(produtosLimpos);
    setClientes(clientesLimpos);
    setVendas(vendasLimpas);
    setMovimentos(movimentosLimpos);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ produtos: produtosLimpos, clientes: clientesLimpos, vendas: vendasLimpas, movimentos: movimentosLimpos, nomeUsuario: nome }));
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, [modoDemonstracao]);

  function salvarFila(novaFila: AcaoFila[]) {
    setFilaOffline(novaFila);
    localStorage.setItem(FILA_KEY, JSON.stringify(novaFila));
  }

  function colocarNaFila(tipo: TipoFila, payload: Record<string, unknown>) {
    const item: AcaoFila = { id: crypto.randomUUID(), tipo, payload, criadaEm: new Date().toISOString() };
    salvarFila([...filaOffline, item]);
    setMensagem('Sem internet. O registro foi guardado e será enviado quando a conexão voltar.');
  }

  async function executarItemFila(item: AcaoFila) {
    switch (item.tipo) {
      case 'produto_criar': return supabase.rpc('agro_criar_produto', item.payload);
      case 'produto_atualizar': {
        const { id, ...payload } = item.payload;
        return supabase.from('agro_produtos').update(payload).eq('id', String(id)).eq('usuario_id', usuarioId);
      }
      case 'movimento': return supabase.rpc('agro_registrar_movimentacao', item.payload);
      case 'venda': return supabase.rpc('agro_registrar_venda', item.payload);
      case 'cliente_criar': return supabase.from('agro_clientes').insert(item.payload);
      case 'cliente_atualizar': {
        const { id, ...payload } = item.payload;
        return supabase.from('agro_clientes').update(payload).eq('id', String(id)).eq('usuario_id', usuarioId);
      }
      case 'recebimento': return supabase.rpc('agro_registrar_recebimento_cliente', item.payload);
    }
  }

  async function sincronizarFila() {
    const filaAtual: AcaoFila[] = (() => {
      try { return JSON.parse(localStorage.getItem(FILA_KEY) || '[]'); } catch { return []; }
    })();
    if (!filaAtual.length || !navigator.onLine || sincronizando) return;

    setSincronizando(true);
    const pendentes: AcaoFila[] = [];
    for (const item of filaAtual) {
      const response = await executarItemFila(item);
      if (response.error) pendentes.push(item);
    }
    salvarFila(pendentes);
    setSincronizando(false);
    if (!pendentes.length) {
      setMensagem('Tudo certo: os registros feitos sem internet foram enviados.');
      await carregar();
    } else {
      setMensagem(`${pendentes.length} registro(s) ainda aguardam envio.`);
    }
  }

  useEffect(() => {
    const aoConectar = () => { setOnline(true); window.setTimeout(sincronizarFila, 300); };
    const aoDesconectar = () => setOnline(false);
    window.addEventListener('online', aoConectar);
    window.addEventListener('offline', aoDesconectar);
    if (online && filaOffline.length) sincronizarFila();
    return () => {
      window.removeEventListener('online', aoConectar);
      window.removeEventListener('offline', aoDesconectar);
    };
  }, [usuarioId, online]);

  const produtosExibidos = modoDemonstracao ? DEMO_PRODUTOS : produtos;
  const clientesExibidos = modoDemonstracao ? DEMO_CLIENTES : clientes;
  const vendasExibidas = modoDemonstracao ? DEMO_VENDAS : vendas;
  const movimentosExibidos = modoDemonstracao ? DEMO_MOVIMENTOS : movimentos;
  const produtosAtivos = useMemo(() => produtosExibidos.filter((produto) => produto.ativo), [produtosExibidos]);
  const clientesAtivos = useMemo(() => clientesExibidos.filter((cliente) => cliente.ativo), [clientesExibidos]);
  const vendasValidas = useMemo(() => vendasExibidas.filter((venda) => !venda.cancelada_em), [vendasExibidas]);

  const inicioMes = hojeLocal().slice(0, 7);
  const vendasMes = vendasValidas.filter((venda) => venda.data_venda.startsWith(inicioMes));
  const faturamentoMes = vendasMes.reduce((total, venda) => total + venda.total, 0);
  const recebidoMes = vendasMes.reduce((total, venda) => total + venda.valor_pago, 0);
  const aReceber = vendasValidas.reduce((total, venda) => total + Math.max(venda.total - venda.valor_pago, 0), 0);
  const valorEstoque = produtosAtivos.reduce((total, produto) => total + produto.estoque_atual * produto.preco_venda, 0);
  const produtosBaixos = produtosAtivos.filter((produto) => produto.estoque_atual <= produto.estoque_minimo);
  const ticketMedio = vendasMes.length ? faturamentoMes / vendasMes.length : 0;

  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const movimentosSeteDias = movimentosExibidos.filter((movimento) => new Date(movimento.created_at) >= seteDiasAtras);

  const saldoPorCliente = useMemo<Map<string, number>>(() => {
    const saldos = new Map<string, number>();
    vendasValidas.forEach((venda) => {
      if (!venda.cliente_id) return;
      saldos.set(venda.cliente_id, (saldos.get(venda.cliente_id) || 0) + Math.max(venda.total - venda.valor_pago, 0));
    });
    return saldos;
  }, [vendasValidas]);

  const ultimaCompraPorCliente = useMemo<Map<string, string>>(() => {
    const datas = new Map<string, string>();
    vendasValidas.forEach((venda) => {
      if (!venda.cliente_id) return;
      const atual = datas.get(venda.cliente_id);
      if (!atual || venda.data_venda > atual) datas.set(venda.cliente_id, venda.data_venda);
    });
    return datas;
  }, [vendasValidas]);

  const devedores = clientesAtivos
    .map((cliente) => ({ cliente, saldo: saldoPorCliente.get(cliente.id) || 0 }))
    .filter((item) => item.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);
  const topClientes = devedores.slice(0, 4);
  const maiorSaldo = devedores[0]?.saldo || 0;

  const categoriasDisponiveis = ['Todos', ...Array.from(new Set(produtosAtivos.map((produto) => produto.categoria)))];
  const produtosFiltrados = produtosExibidos.filter((produto) => produto.nome.toLowerCase().includes(buscaProduto.toLowerCase()) && (categoriaFiltro === 'Todos' || produto.categoria === categoriaFiltro));
  const clientesFiltrados = clientesExibidos.filter((cliente) => {
    const termo = buscaCliente.toLowerCase();
    return cliente.nome.toLowerCase().includes(termo) || (cliente.whatsapp || '').toLowerCase().includes(termo) || (cliente.endereco || '').toLowerCase().includes(termo);
  });

  const movimentoProduto = produtosAtivos.find((produto) => produto.id === movimentoProdutoId);
  const movimentoInfo = tiposMovimento.find((item) => item.value === movimentoTipo) || tiposMovimento[0];
  const movimentoNovoSaldo = movimentoProduto
    ? movimentoProduto.estoque_atual + (movimentoInfo.entrada ? numero(movimentoQuantidade) : -numero(movimentoQuantidade))
    : 0;
  const movimentoInvalido = Boolean(movimentoProduto && movimentoNovoSaldo < 0);

  const vendaProduto = produtosAtivos.find((produto) => produto.id === vendaProdutoId);
  const vendaSaldoDepois = vendaProduto ? vendaProduto.estoque_atual - numero(vendaQuantidade) : 0;
  const vendaInvalida = Boolean(vendaProduto && vendaSaldoDepois < 0);
  const totalVendaPrevisto = Math.max(numero(vendaQuantidade) * numero(vendaPreco) - numero(vendaDesconto) + numero(vendaEntrega), 0);
  const lucroProduto = numero(produtoPreco) - numero(produtoCusto);

  const botoesAbas: Array<{ id: Aba; label: string; icon: typeof BarChart3 }> = [
    { id: 'resumo', label: 'Início', icon: BarChart3 },
    { id: 'produtos', label: 'Produtos', icon: Boxes },
    { id: 'estoque', label: 'Estoque', icon: PackagePlus },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'clientes', label: 'Clientes', icon: Users }
  ];

  function navegar(id: Aba) {
    setAba(id);
    setMenuAberto(false);
    requestAnimationFrame(() => document.getElementById('agro-main-content')?.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function abrirFormulario(id: Aba, textoBotao: string) {
    if (modoDemonstracao) {
      setMensagem('Você está no modo de treinamento. Saia da demonstração para salvar dados reais.');
      return;
    }
    navegar(id);
    window.setTimeout(() => {
      const botao = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.dataset.agroModalAction === 'true' && item.textContent?.includes(textoBotao));
      botao?.click();
    }, 160);
  }

  function rolarPara(id: string) {
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }

  function concluirBoasVindas(demo = false) {
    localStorage.setItem(ONBOARDING_KEY, 'concluido');
    setMostrarBoasVindas(false);
    setModoDemonstracao(demo);
    if (demo) setMensagem('Modo de treinamento ativado. Estes dados são apenas exemplos.');
  }

  function sairDemonstracao() {
    setModoDemonstracao(false);
    setMensagem('Você voltou para seus dados reais.');
  }

  function limparProduto() {
    setProdutoEdicaoId(null);
    setProdutoEtapa(1);
    setProdutoNome('');
    setProdutoCategoria('Ovos');
    setProdutoUnidade('dúzia');
    setProdutoCusto('');
    setProdutoPreco('');
    setProdutoEstoqueInicial('');
    setProdutoMinimo('');
  }

  async function salvarProduto(event: FormEvent) {
    event.preventDefault();
    setMensagem(null);
    if (!usuarioId || !produtoNome.trim()) {
      setMensagem('Informe o nome do produto.');
      setProdutoEtapa(1);
      return;
    }

    const payloadBase = {
      nome: produtoNome.trim(), categoria: produtoCategoria, unidade: produtoUnidade,
      custo_unitario: numero(produtoCusto), preco_venda: numero(produtoPreco), estoque_minimo: numero(produtoMinimo), vitrine_id: vitrineId
    };

    if (!online) {
      if (produtoEdicaoId) colocarNaFila('produto_atualizar', { id: produtoEdicaoId, ...payloadBase });
      else colocarNaFila('produto_criar', {
        nome_text: produtoNome.trim(), categoria_text: produtoCategoria, unidade_text: produtoUnidade,
        custo_numeric: numero(produtoCusto), preco_numeric: numero(produtoPreco), estoque_inicial_numeric: numero(produtoEstoqueInicial),
        estoque_minimo_numeric: numero(produtoMinimo), vitrine_uuid: vitrineId
      });
      limparProduto();
      return;
    }

    setSalvando(true);
    const response = produtoEdicaoId
      ? await supabase.from('agro_produtos').update(payloadBase).eq('id', produtoEdicaoId).eq('usuario_id', usuarioId)
      : await supabase.rpc('agro_criar_produto', {
          nome_text: produtoNome.trim(), categoria_text: produtoCategoria, unidade_text: produtoUnidade,
          custo_numeric: numero(produtoCusto), preco_numeric: numero(produtoPreco), estoque_inicial_numeric: numero(produtoEstoqueInicial),
          estoque_minimo_numeric: numero(produtoMinimo), vitrine_uuid: vitrineId
        });

    if (response.error) setMensagem(mensagemAmigavel(response.error.message));
    else {
      setMensagem(produtoEdicaoId ? 'Produto atualizado.' : 'Produto cadastrado.');
      limparProduto();
      await carregar();
    }
    setSalvando(false);
  }

  function editarProduto(produto: Produto) {
    if (modoDemonstracao) return setMensagem('Este é um exemplo. Saia do modo de treinamento para editar seus produtos.');
    setProdutoEdicaoId(produto.id);
    setProdutoEtapa(1);
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
    if (modoDemonstracao || !online) return setMensagem('Conecte-se à internet para ativar ou desativar um produto.');
    const { error } = await supabase.from('agro_produtos').update({ ativo: !produto.ativo }).eq('id', produto.id).eq('usuario_id', usuarioId);
    if (error) setMensagem(mensagemAmigavel(error.message)); else await carregar();
  }

  function exportarProdutosCsv() {
    const cabecalho = ['Produto', 'Categoria', 'Unidade', 'Custo', 'Preço', 'Estoque', 'Mínimo'];
    const linhas = produtosAtivos.map((produto) => [produto.nome, produto.categoria, produto.unidade, produto.custo_unitario, produto.preco_venda, produto.estoque_atual, produto.estoque_minimo]);
    const csv = [cabecalho, ...linhas].map((linha) => linha.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(';')).join('\n');
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
    if (!movimentoProdutoId || numero(movimentoQuantidade) <= 0) return setMensagem('Escolha o produto e informe uma quantidade maior que zero.');
    if (movimentoInvalido) return setMensagem(`Você tem somente ${quantidade(movimentoProduto?.estoque_atual || 0)} ${movimentoProduto?.unidade || ''}. Corrija a quantidade.`);

    const payload = { produto_uuid: movimentoProdutoId, tipo_text: movimentoTipo, quantidade_numeric: numero(movimentoQuantidade), observacao_text: movimentoObservacao.trim() || null };
    if (!online) {
      colocarNaFila('movimento', payload);
      setMovimentoQuantidade('');
      setMovimentoObservacao('');
      return;
    }

    setSalvando(true);
    const { data, error } = await supabase.rpc('agro_registrar_movimentacao', payload);
    if (error) setMensagem(mensagemAmigavel(error.message));
    else {
      setMensagem('Movimentação registrada e estoque atualizado.');
      if (data) setUltimaAcao({ tipo: 'movimento', id: String(data), texto: `${movimentoInfo.label}: ${quantidade(numero(movimentoQuantidade))}` });
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

  function limparVenda() {
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
  }

  async function registrarVenda(event: FormEvent) {
    event.preventDefault();
    setMensagem(null);
    if (!vendaProdutoId || numero(vendaQuantidade) <= 0) return setMensagem('Escolha o produto e informe a quantidade vendida.');
    if (vendaInvalida) return setMensagem(`Você tem somente ${quantidade(vendaProduto?.estoque_atual || 0)} ${vendaProduto?.unidade || ''}. Corrija a quantidade ou registre uma nova produção.`);
    if (vendaStatus === 'parcial' && (numero(vendaValorPago) <= 0 || numero(vendaValorPago) >= totalVendaPrevisto)) return setMensagem('No pagamento parcial, informe quanto recebeu. O valor precisa ser menor que o total.');

    const payload = {
      produto_uuid: vendaProdutoId, cliente_uuid: vendaClienteId || null, quantidade_numeric: numero(vendaQuantidade),
      preco_unitario_numeric: numero(vendaPreco), desconto_numeric: numero(vendaDesconto), taxa_entrega_numeric: numero(vendaEntrega),
      forma_pagamento_text: vendaForma, status_pagamento_text: vendaStatus, valor_pago_numeric: numero(vendaValorPago),
      data_venda_date: vendaData, observacao_text: vendaObservacao.trim() || null
    };

    if (!online) {
      colocarNaFila('venda', payload);
      limparVenda();
      return;
    }

    setSalvando(true);
    const { data, error } = await supabase.rpc('agro_registrar_venda', payload);
    if (error) setMensagem(mensagemAmigavel(error.message));
    else {
      setMensagem('Venda registrada e estoque baixado automaticamente.');
      if (data) setUltimaAcao({ tipo: 'venda', id: String(data), texto: `Venda de ${quantidade(numero(vendaQuantidade))} ${vendaProduto?.unidade || ''}` });
      limparVenda();
      await carregar();
    }
    setSalvando(false);
  }

  async function quitarVenda(venda: Venda) {
    if (!online || modoDemonstracao) return setMensagem('Conecte-se à internet e use seus dados reais para registrar o pagamento.');
    const { error } = await supabase.from('agro_vendas').update({ status_pagamento: 'pago', valor_pago: venda.total }).eq('id', venda.id).eq('usuario_id', usuarioId);
    if (error) setMensagem(mensagemAmigavel(error.message));
    else { setMensagem('Pagamento marcado como recebido.'); await carregar(); }
  }

  async function cancelarVenda(venda: Venda, perguntar = true) {
    if (!online || modoDemonstracao) return setMensagem('Conecte-se à internet e use seus dados reais para cancelar uma venda.');
    if (perguntar && !window.confirm('Cancelar esta venda e devolver a quantidade ao estoque?')) return;
    const { error } = await supabase.rpc('agro_cancelar_venda', { venda_uuid: venda.id, motivo_text: 'Cancelada pelo produtor no aplicativo' });
    if (error) setMensagem(mensagemAmigavel(error.message));
    else { setMensagem('Venda cancelada. A quantidade voltou para o estoque.'); await carregar(); }
  }

  async function corrigirVenda(venda: Venda) {
    if (!window.confirm('Para corrigir, a venda atual será cancelada e os dados serão colocados novamente no formulário. Continuar?')) return;
    await cancelarVenda(venda, false);
    setVendaProdutoId(venda.produto_id);
    setVendaClienteId(venda.cliente_id || '');
    setVendaQuantidade(String(venda.quantidade));
    setVendaPreco(String(venda.preco_unitario));
    setVendaDesconto(String(venda.desconto));
    setVendaEntrega(String(venda.taxa_entrega));
    setVendaForma(venda.forma_pagamento);
    setVendaStatus(venda.status_pagamento);
    setVendaValorPago(String(venda.valor_pago || ''));
    setVendaData(venda.data_venda);
    setVendaObservacao(venda.observacao || '');
    abrirFormulario('vendas', 'Nova venda');
  }

  async function desfazerUltima() {
    if (!ultimaAcao || !online || modoDemonstracao) return;
    if (!window.confirm(`Desfazer: ${ultimaAcao.texto}?`)) return;
    const response = ultimaAcao.tipo === 'venda'
      ? await supabase.rpc('agro_cancelar_venda', { venda_uuid: ultimaAcao.id, motivo_text: 'Venda desfeita logo após o registro' })
      : await supabase.rpc('agro_desfazer_movimentacao', { movimento_uuid: ultimaAcao.id });
    if (response.error) setMensagem(mensagemAmigavel(response.error.message));
    else {
      setMensagem('A última ação foi desfeita e o estoque foi corrigido.');
      setUltimaAcao(null);
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
    if (!usuarioId || !clienteNome.trim()) return setMensagem('Informe o nome do cliente.');
    const payload = { usuario_id: usuarioId, nome: clienteNome.trim(), whatsapp: clienteWhatsapp.trim() || null, endereco: clienteEndereco.trim() || null, limite_credito: numero(clienteLimite), observacoes: clienteObservacoes.trim() || null };

    if (!online) {
      if (clienteEdicaoId) colocarNaFila('cliente_atualizar', { id: clienteEdicaoId, ...payload });
      else colocarNaFila('cliente_criar', payload);
      limparCliente();
      return;
    }

    setSalvando(true);
    const response = clienteEdicaoId
      ? await supabase.from('agro_clientes').update(payload).eq('id', clienteEdicaoId).eq('usuario_id', usuarioId)
      : await supabase.from('agro_clientes').insert(payload);
    if (response.error) setMensagem(mensagemAmigavel(response.error.message));
    else {
      setMensagem(clienteEdicaoId ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      limparCliente();
      await carregar();
    }
    setSalvando(false);
  }

  function editarCliente(cliente: Cliente) {
    if (modoDemonstracao) return setMensagem('Saia do modo de treinamento para editar seus clientes.');
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
    if (!online || modoDemonstracao) return setMensagem('Conecte-se à internet e use seus dados reais para alterar o cliente.');
    const { error } = await supabase.from('agro_clientes').update({ ativo: !cliente.ativo }).eq('id', cliente.id).eq('usuario_id', usuarioId);
    if (error) setMensagem(mensagemAmigavel(error.message)); else await carregar();
  }

  async function registrarRecebimento(event: FormEvent) {
    event.preventDefault();
    if (!recebimentoAberto) return;
    const valor = numero(recebimentoAberto.valor) || recebimentoAberto.saldo;
    const payload = { cliente_uuid: recebimentoAberto.clienteId, valor_numeric: valor };
    if (!online) {
      colocarNaFila('recebimento', payload);
      setRecebimentoAberto(null);
      return;
    }
    setSalvando(true);
    const { data, error } = await supabase.rpc('agro_registrar_recebimento_cliente', payload);
    if (error) setMensagem(mensagemAmigavel(error.message));
    else {
      setMensagem(`Recebimento de ${moeda(numero(data))} registrado.`);
      setRecebimentoAberto(null);
      await carregar();
    }
    setSalvando(false);
  }

  function textoResumo() {
    const maisVendido = vendasMes.reduce<Record<string, number>>((mapa, venda) => {
      const nome = venda.agro_produtos?.nome || 'Produto';
      mapa[nome] = (mapa[nome] || 0) + venda.quantidade;
      return mapa;
    }, {});
    const produtoDestaque = Object.entries(maisVendido).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum ainda';
    return `Resumo do AgroGestão\n\nVendas do mês: ${moeda(faturamentoMes)}\nRecebido: ${moeda(recebidoMes)}\nFalta receber: ${moeda(aReceber)}\nValor do estoque: ${moeda(valorEstoque)}\nProduto mais vendido: ${produtoDestaque}\nProdutos abaixo do mínimo: ${produtosBaixos.length}`;
  }

  async function compartilharResumo() {
    const texto = textoResumo();
    if (navigator.share) {
      try { await navigator.share({ title: 'Resumo do AgroGestão', text: texto }); return; } catch { /* usuário cancelou */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  }

  function imprimirResumo() {
    const janela = window.open('', '_blank', 'width=820,height=900');
    if (!janela) return setMensagem('O navegador bloqueou a abertura do relatório. Libere pop-ups e tente novamente.');
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Resumo AgroGestão</title><style>body{font-family:Arial;padding:36px;color:#173322}h1{color:#0b4b2d}.card{border:1px solid #d9e5dc;border-radius:14px;padding:18px;margin:12px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}strong{font-size:24px;display:block;margin-top:8px}@media print{button{display:none}}</style></head><body><h1>Resumo do AgroGestão</h1><p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p><div class="grid"><div class="card">Vendas do mês<strong>${moeda(faturamentoMes)}</strong></div><div class="card">Recebido<strong>${moeda(recebidoMes)}</strong></div><div class="card">A receber<strong>${moeda(aReceber)}</strong></div><div class="card">Estoque para venda<strong>${moeda(valorEstoque)}</strong></div></div><div class="card">Produtos abaixo do mínimo: <strong>${produtosBaixos.length}</strong></div><button onclick="window.print()">Imprimir ou salvar em PDF</button></body></html>`);
    janela.document.close();
  }

  if (carregando) {
    return <div className={styles.viewport}><div className={styles.loadingCard}><div className={styles.loadingLogo}>Ag</div><strong>Carregando sua produção...</strong></div></div>;
  }

  const cabecalho = tituloAba[aba];

  return (
    <div className={styles.viewport}>
      <aside className={`${styles.sidebar} ${menuAberto ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>Ag</span>
          <div><strong>AgroGestão</strong><small>Simples para quem produz</small></div>
          <button className={styles.closeMenu} type="button" onClick={() => setMenuAberto(false)} aria-label="Fechar menu"><X size={22} /></button>
        </div>
        <div className={styles.sidebarSectionLabel}>ESCOLHA UMA ÁREA</div>
        <nav className={styles.sidebarNav}>
          {botoesAbas.map(({ id, label, icon: Icon }) => (
            <button key={id} className={aba === id ? styles.navActive : ''} type="button" onClick={() => navegar(id)}><Icon size={22} /><span>{label}</span>{aba === id && <i />}</button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}><span>Produziu, vendeu ou recebeu? Registre aqui.</span><a href="/painel">Voltar ao AgroMarket</a></div>
      </aside>

      {menuAberto && <button className={styles.overlay} type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />}

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <button type="button" className={styles.iconButton} onClick={() => setMenuAberto(true)} aria-label="Abrir menu"><Menu size={25} /></button>
          <div className={`${styles.connectionBadge} ${online ? styles.connectionOnline : styles.connectionOffline}`}>
            {online ? <Wifi size={17} /> : <WifiOff size={17} />}
            <span>{sincronizando ? 'Enviando registros...' : online ? filaOffline.length ? `${filaOffline.length} aguardando envio` : 'Conectado' : 'Sem internet'}</span>
          </div>
          <div className={styles.topbarSpacer} />
          {modoDemonstracao && <button className={styles.demoExit} type="button" onClick={sairDemonstracao}>Sair do exemplo</button>}
          <button type="button" className={styles.iconButton} aria-label="Avisos"><Bell size={22} /></button>
          <div className={styles.avatar} title={nomeUsuario}>{iniciais(nomeUsuario)}</div>
        </header>

        <main id="agro-main-content" className={styles.content}>
          <div className={styles.pageHeader}>
            <div><span>{cabecalho.eyebrow}</span><h1>{cabecalho.titulo}</h1><p>{cabecalho.descricao}</p></div>
          </div>

          {modoDemonstracao && <div className={styles.demoBanner}><BookOpen size={20} /><div><strong>Modo de treinamento</strong><span>Os valores mostrados são exemplos e não alteram seus dados.</span></div><button type="button" onClick={sairDemonstracao}>Usar meus dados</button></div>}

          {mensagem && (
            <div className={styles.notice}><span>{mensagem}</span><div className={styles.noticeActions}>{ultimaAcao && online && <button type="button" onClick={desfazerUltima}><RotateCcw size={16} /> Desfazer</button>}<button type="button" onClick={() => setMensagem(null)} aria-label="Fechar aviso"><X size={18} /></button></div></div>
          )}

          {aba === 'resumo' && (
            <div className={styles.screenStack}>
              {!produtosAtivos.length && !modoDemonstracao && (
                <section className={styles.firstStepCard}><span className={styles.firstStepIcon}>🌱</span><div><strong>Comece cadastrando o que você vende</strong><p>Exemplo: ovo caipira, frango, alface, queijo ou leite.</p></div><button type="button" onClick={() => abrirFormulario('produtos', 'Novo produto')}><Plus size={20} /> Cadastrar primeiro produto</button></section>
              )}

              <div className={styles.quickActions}>
                <button type="button" onClick={() => abrirFormulario('produtos', 'Novo produto')}><span><Boxes size={24} /></span><strong>Cadastrar produto</strong><small>Inclua também o estoque inicial</small></button>
                <button type="button" onClick={() => abrirFormulario('estoque', 'Novo lançamento')}><span><ArrowDownToLine size={24} /></span><strong>Produzi ou colhi</strong><small>Adicionar ao estoque</small></button>
                <button type="button" onClick={() => abrirFormulario('vendas', 'Nova venda')}><span><ShoppingCart size={24} /></span><strong>Registrar venda</strong><small>Baixa o estoque automaticamente</small></button>
                <button type="button" onClick={() => navegar('clientes')}><span><HandCoins size={24} /></span><strong>Quem está devendo</strong><small>{devedores.length} cliente(s) com saldo</small></button>
              </div>

              <div className={styles.kpiGrid}>
                <KpiCard label="VENDAS DO MÊS" value={moeda(faturamentoMes)} detail={`${vendasMes.length} venda(s)`} />
                <KpiCard label="DINHEIRO RECEBIDO" value={moeda(recebidoMes)} detail="Já confirmado" tone="success" />
                <KpiCard label="FALTA RECEBER" value={moeda(aReceber)} detail={`${devedores.length} cliente(s)`} tone="warning" />
                <KpiCard label="ESTOQUE PARA VENDA" value={moeda(valorEstoque)} detail={`${produtosAtivos.length} produto(s)`} />
              </div>

              {(produtosBaixos.length > 0 || devedores.length > 0) && (
                <div className={styles.alertGrid}>
                  {produtosBaixos.length > 0 && <section className={styles.alertCard}><AlertTriangle size={24} /><div><strong>Precisa produzir ou comprar</strong><span>{produtosBaixos.slice(0, 3).map((produto) => `${produto.nome}: ${quantidade(produto.estoque_atual)} ${produto.unidade}`).join(' • ')}</span></div><button type="button" onClick={() => abrirFormulario('estoque', 'Novo lançamento')}>Registrar produção</button></section>}
                  {devedores.length > 0 && <section className={styles.alertCard}><CircleDollarSign size={24} /><div><strong>Pagamentos pendentes</strong><span>Você tem {moeda(aReceber)} para receber.</span></div><button type="button" onClick={() => navegar('clientes')}>Ver quem deve</button></section>}
                </div>
              )}

              <div className={styles.twoColumns}>
                <SectionCard title="O que aconteceu recentemente" aside={<button className={styles.textButton} type="button" onClick={() => navegar('vendas')}>Ver vendas</button>}>
                  <div className={styles.activityList}>
                    {vendasValidas.slice(0, 3).map((venda) => <div className={styles.activityItem} key={`venda-${venda.id}`}><span className={styles.activityIcon}><ShoppingCart size={18} /></span><div><strong>Venda para {venda.agro_clientes?.nome || 'cliente sem cadastro'}</strong><small>{venda.agro_produtos?.nome || 'Produto'} · {dataBR(venda.data_venda)}</small></div><b>{moeda(venda.total)}</b></div>)}
                    {movimentosExibidos.slice(0, 2).map((movimento) => <div className={styles.activityItem} key={`mov-${movimento.id}`}><span className={styles.activityIcon}><PackagePlus size={18} /></span><div><strong>{rotuloMovimento(movimento.tipo)}</strong><small>{movimento.agro_produtos?.nome || 'Produto'} · {dataBR(movimento.created_at)}</small></div><b>{quantidade(movimento.quantidade)}</b></div>)}
                    {!vendasValidas.length && !movimentosExibidos.length && <div className={styles.emptyState}>Ainda não há registros. Use um dos botões acima.</div>}
                  </div>
                </SectionCard>

                <SectionCard title="Resumo do mês">
                  <div className={styles.reportSummary}><div><span>Ticket médio</span><strong>{moeda(ticketMedio)}</strong></div><div><span>Produtos baixos</span><strong>{produtosBaixos.length}</strong></div><div><span>Clientes devendo</span><strong>{devedores.length}</strong></div></div>
                  <div className={styles.reportButtons}><button type="button" onClick={compartilharResumo}><MessageCircle size={18} /> Enviar no WhatsApp</button><button type="button" onClick={imprimirResumo}><FileText size={18} /> Salvar em PDF</button></div>
                </SectionCard>
              </div>
            </div>
          )}

          {aba === 'produtos' && (
            <div className={styles.screenStack}>
              <div className={styles.toolbar}><label className={styles.searchBox}><Search size={19} /><input value={buscaProduto} onChange={(event) => setBuscaProduto(event.target.value)} placeholder="Digite o nome do produto" /></label><button className={styles.secondaryAction} type="button" onClick={exportarProdutosCsv}><Download size={18} /> Baixar lista</button></div>
              <div className={styles.categoryChips}>{categoriasDisponiveis.map((categoria) => <button key={categoria} type="button" className={categoriaFiltro === categoria ? styles.chipActive : ''} onClick={() => setCategoriaFiltro(categoria)}>{categoria}</button>)}</div>

              <SectionCard title="Meus produtos" aside={<span className={styles.countLabel}>{produtosFiltrados.length} item(ns)</span>}>
                <div className={styles.productList}>
                  {produtosFiltrados.map((produto) => {
                    const baixo = produto.estoque_atual <= produto.estoque_minimo;
                    return <article className={`${styles.productRow} ${!produto.ativo ? styles.rowInactive : ''}`} key={produto.id}><span className={styles.productEmoji}>{iconeProduto(produto.categoria)}</span><div className={styles.productMain}><strong>{produto.nome}</strong><small>Vendido por {produto.unidade} · {produto.categoria}</small><b>{moeda(produto.preco_venda)}</b></div><div className={`${styles.stockBadge} ${baixo ? styles.stockLow : styles.stockOk}`}><strong>{quantidade(produto.estoque_atual)}</strong><small>{baixo ? 'precisa repor' : 'disponível'}</small></div><div className={styles.rowActions}><button type="button" onClick={() => editarProduto(produto)}><Pencil size={17} /> Editar dados</button><button type="button" onClick={() => alterarProdutoAtivo(produto)}>{produto.ativo ? 'Parar de vender' : 'Voltar a vender'}</button></div></article>;
                  })}
                  {!produtosFiltrados.length && <div className={styles.emptyState}>Nenhum produto encontrado.</div>}
                </div>
              </SectionCard>

              <form id="produto-form" className={styles.formCard} onSubmit={salvarProduto}>
                <div className={styles.formHeader}><div><h2>{produtoEdicaoId ? 'Editar produto' : 'Cadastrar produto'}</h2><span>Passo {produtoEtapa} de 3</span></div>{produtoEdicaoId && <button type="button" onClick={limparProduto}>Cancelar edição</button>}</div>
                <div className={styles.stepBar}><i className={produtoEtapa >= 1 ? styles.stepDone : ''} /><i className={produtoEtapa >= 2 ? styles.stepDone : ''} /><i className={produtoEtapa >= 3 ? styles.stepDone : ''} /></div>

                {produtoEtapa === 1 && <div className={styles.formGrid}><div className={styles.stepIntro}><span>1</span><div><strong>O que você vende?</strong><small>Comece pelo nome e por como o produto é vendido.</small></div></div><label className={styles.fieldFull}><span>Nome do produto *</span><input value={produtoNome} onChange={(event) => setProdutoNome(event.target.value)} placeholder="Exemplo: Ovo caipira" autoFocus /><Ajuda>Use um nome simples, igual ao que seus clientes conhecem.</Ajuda></label><label><span>Categoria</span><select value={produtoCategoria} onChange={(event) => setProdutoCategoria(event.target.value)}>{categorias.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Como você vende?</span><select value={produtoUnidade} onChange={(event) => setProdutoUnidade(event.target.value)}>{unidades.map((item) => <option key={item}>{item}</option>)}</select><Ajuda>Exemplo: ovos por dúzia, leite por litro e hortaliças por maço.</Ajuda></label></div>}

                {produtoEtapa === 2 && <div className={styles.formGrid}><div className={styles.stepIntro}><span>2</span><div><strong>Quanto você tem?</strong><small>Informe a quantidade atual e quando deseja receber um aviso.</small></div></div>{!produtoEdicaoId ? <label><span>Estoque inicial</span><input inputMode="decimal" value={produtoEstoqueInicial} onChange={(event) => setProdutoEstoqueInicial(event.target.value)} placeholder="Exemplo: 30" /><Ajuda>Quantidade disponível agora. Aceita vírgula, por exemplo: 2,5.</Ajuda></label> : <div className={styles.readOnlyField}><span>Estoque atual</span><strong>{quantidade(produtosAtivos.find((produto) => produto.id === produtoEdicaoId)?.estoque_atual || 0)} {produtoUnidade}</strong><small>Para corrigir esta quantidade, use a tela Estoque.</small></div>}<label><span>Estoque mínimo</span><input inputMode="decimal" value={produtoMinimo} onChange={(event) => setProdutoMinimo(event.target.value)} placeholder="Exemplo: 5" /><Ajuda>Quando chegar nessa quantidade, o sistema avisará que é hora de produzir ou comprar.</Ajuda></label></div>}

                {produtoEtapa === 3 && <div className={styles.formGrid}><div className={styles.stepIntro}><span>3</span><div><strong>Quais são os valores?</strong><small>Isso ajuda a entender quanto entra e quanto sobra.</small></div></div><label><span>Quanto custa por {produtoUnidade}</span><input inputMode="decimal" value={produtoCusto} onChange={(event) => setProdutoCusto(event.target.value)} placeholder="Exemplo: 9,50" /><Ajuda>Some os gastos aproximados para produzir ou comprar uma unidade de venda.</Ajuda></label><label><span>Preço de venda por {produtoUnidade}</span><input inputMode="decimal" value={produtoPreco} onChange={(event) => setProdutoPreco(event.target.value)} placeholder="Exemplo: 18,00" /><Ajuda>Digite com vírgula ou ponto. Os dois formatos funcionam.</Ajuda></label><div className={`${styles.profitPreview} ${lucroProduto < 0 ? styles.profitNegative : ''}`}><span>Sobra aproximada por {produtoUnidade}</span><strong>{moeda(lucroProduto)}</strong><small>Preço de venda menos o custo informado.</small></div></div>}

                <div className={styles.formNavigation}>{produtoEtapa > 1 ? <button type="button" className={styles.backButton} onClick={() => setProdutoEtapa((etapa) => etapa - 1)}><ChevronLeft size={20} /> Voltar</button> : <span />}{produtoEtapa < 3 ? <button type="button" className={styles.nextButton} onClick={() => { if (produtoEtapa === 1 && !produtoNome.trim()) return setMensagem('Informe o nome do produto antes de continuar.'); setProdutoEtapa((etapa) => etapa + 1); }}>Continuar <ChevronRight size={20} /></button> : <button className={styles.primaryActionInline} disabled={salvando} type="submit"><CheckCircle2 size={20} />{salvando ? 'Salvando...' : produtoEdicaoId ? 'Atualizar produto' : 'Cadastrar produto com estoque'}</button>}</div>
              </form>

              <button className={styles.floatingAction} type="button" onClick={() => { limparProduto(); rolarPara('produto-form'); }}><Plus size={21} /> Novo produto</button>
            </div>
          )}

          {aba === 'estoque' && (
            <div className={styles.screenStack}>
              <div className={styles.kpiGrid}><KpiCard label="VALOR DO ESTOQUE" value={moeda(valorEstoque)} /><KpiCard label="PRODUTOS" value={produtosAtivos.length} detail="cadastrados" /><KpiCard label="PRECISAM DE REPOSIÇÃO" value={produtosBaixos.length} detail="abaixo do mínimo" tone="warning" /><KpiCard label="ALTERAÇÕES EM 7 DIAS" value={movimentosSeteDias.length} detail="entradas e saídas" /></div>

              <div className={styles.twoColumnsWide}>
                <SectionCard title="Quanto tenho de cada produto" aside={<span className={styles.countLabel}>{produtosAtivos.length} item(ns)</span>}><div className={styles.balanceList}>{produtosAtivos.map((produto) => { const baixo = produto.estoque_atual <= produto.estoque_minimo; return <div key={produto.id}><div><strong>{produto.nome}</strong><small>Vendido por {produto.unidade}</small></div><span className={baixo ? styles.balanceLow : styles.balanceOk}>{quantidade(produto.estoque_atual)} · {baixo ? 'repor' : 'disponível'}</span></div>; })}{!produtosAtivos.length && <div className={styles.emptyState}>Cadastre um produto para começar.</div>}</div></SectionCard>
                <SectionCard title="Últimas entradas e saídas" aside={<span className={styles.countLabel}>{movimentosExibidos.length} registro(s)</span>}><div className={styles.movementList}>{movimentosExibidos.slice(0, 8).map((movimento) => { const entrada = ['producao', 'compra', 'devolucao', 'ajuste_entrada'].includes(movimento.tipo); return <div key={movimento.id}><span>{dataBR(movimento.created_at)}</span><div><strong>{movimento.agro_produtos?.nome || 'Produto'}</strong><small>{rotuloMovimento(movimento.tipo)}</small></div><b className={entrada ? styles.valueIn : styles.valueOut}>{entrada ? '+' : '-'}{quantidade(movimento.quantidade)}</b></div>; })}{!movimentosExibidos.length && <div className={styles.emptyState}>Nenhuma entrada ou saída registrada.</div>}</div></SectionCard>
              </div>

              <form id="estoque-form" className={styles.formCard} onSubmit={registrarMovimento}>
                <div className={styles.formHeader}><div><h2>O que aconteceu com o estoque?</h2><span>Escolha uma opção com palavras do dia a dia</span></div></div>
                {!produtosAtivos.length && <div className={styles.inlineAlert}>Primeiro cadastre pelo menos um produto.</div>}
                <div className={styles.formBody}>
                  <div className={styles.choiceGroup}><strong>Entrou produto</strong><div className={styles.choiceGrid}>{tiposMovimento.filter((item) => item.entrada).map((item) => <button key={item.value} type="button" className={movimentoTipo === item.value ? styles.choiceActive : ''} onClick={() => setMovimentoTipo(item.value)}><span>{item.emoji}</span><div><b>{item.label}</b><small>{item.ajuda}</small></div></button>)}</div></div>
                  <div className={styles.choiceGroup}><strong>Saiu produto</strong><div className={styles.choiceGrid}>{tiposMovimento.filter((item) => !item.entrada).map((item) => <button key={item.value} type="button" className={movimentoTipo === item.value ? styles.choiceActiveDanger : ''} onClick={() => setMovimentoTipo(item.value)}><span>{item.emoji}</span><div><b>{item.label}</b><small>{item.ajuda}</small></div></button>)}</div></div>
                  <div className={styles.formGrid}><label><span>Qual produto? *</span><select value={movimentoProdutoId} onChange={(event) => setMovimentoProdutoId(event.target.value)}><option value="">Escolha o produto</option>{produtosAtivos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} — tem {quantidade(produto.estoque_atual)} {produto.unidade}</option>)}</select></label><label><span>Qual quantidade? *</span><input inputMode="decimal" value={movimentoQuantidade} onChange={(event) => setMovimentoQuantidade(event.target.value)} placeholder="Exemplo: 10 ou 2,5" /><Ajuda>Use a mesma unidade do produto: dúzia, kg, litro, maço etc.</Ajuda></label><label className={styles.fieldFull}><span>Quer deixar uma observação?</span><input value={movimentoObservacao} onChange={(event) => setMovimentoObservacao(event.target.value)} placeholder="Exemplo: coleta da manhã" /></label></div>
                  {movimentoProduto && numero(movimentoQuantidade) > 0 && <div className={`${styles.stockPreview} ${movimentoInvalido ? styles.stockPreviewError : ''}`}><div><span>Você tem agora</span><strong>{quantidade(movimentoProduto.estoque_atual)} {movimentoProduto.unidade}</strong></div><div><span>{movimentoInfo.entrada ? 'Vai entrar' : 'Vai sair'}</span><strong>{quantidade(numero(movimentoQuantidade))} {movimentoProduto.unidade}</strong></div><div><span>Ficará no estoque</span><strong>{quantidade(Math.max(movimentoNovoSaldo, 0))} {movimentoProduto.unidade}</strong></div>{movimentoInvalido && <p>Não é possível retirar mais do que existe no estoque.</p>}</div>}
                </div>
                <button className={styles.primaryAction} disabled={salvando || !produtosAtivos.length || movimentoInvalido} type="submit">{salvando ? 'Registrando...' : `${movimentoInfo.entrada ? 'Adicionar' : 'Retirar'} do estoque`}</button>
              </form>
            </div>
          )}

          {aba === 'vendas' && (
            <div className={styles.screenStack}>
              <div className={styles.kpiGrid}><KpiCard label="VENDAS NO MÊS" value={moeda(faturamentoMes)} detail={`${vendasMes.length} registro(s)`} /><KpiCard label="RECEBIDO" value={moeda(recebidoMes)} tone="success" /><KpiCard label="FALTA RECEBER" value={moeda(aReceber)} tone="warning" /><KpiCard label="VALOR MÉDIO DA VENDA" value={moeda(ticketMedio)} /></div>

              <SectionCard title="Vendas recentes" aside={<span className={styles.countLabel}>{vendasExibidas.length} registro(s)</span>}>
                <div className={styles.salesList}>{vendasExibidas.slice(0, 12).map((venda, index) => <article className={venda.cancelada_em ? styles.saleCanceled : ''} key={venda.id}><span className={styles.saleCode}>V-{String(vendasExibidas.length - index).padStart(4, '0')}</span><span>{dataBR(venda.data_venda)}</span><div><strong>{venda.agro_clientes?.nome || 'Venda rápida'}</strong><small>{venda.agro_produtos?.nome || 'Produto'} · {quantidade(venda.quantidade)} {venda.agro_produtos?.unidade || ''}</small></div><div className={styles.saleValue}><strong>{moeda(venda.total)}</strong><span className={venda.cancelada_em ? styles.statusCanceled : venda.status_pagamento === 'pago' ? styles.statusPaid : styles.statusPending}>{venda.cancelada_em ? 'Cancelada' : venda.status_pagamento === 'pago' ? 'Recebido' : `Falta ${moeda(venda.total - venda.valor_pago)}`}</span></div>{!venda.cancelada_em && <div className={styles.saleActions}>{venda.status_pagamento !== 'pago' && <button type="button" onClick={() => quitarVenda(venda)}>Recebi tudo</button>}<button type="button" onClick={() => corrigirVenda(venda)}>Corrigir</button><button type="button" onClick={() => cancelarVenda(venda)}>Cancelar</button></div>}</article>)}{!vendasExibidas.length && <div className={styles.emptyState}>Nenhuma venda registrada.</div>}</div>
              </SectionCard>

              <form id="venda-form" className={styles.formCard} onSubmit={registrarVenda}>
                <div className={styles.formHeader}><div><h2>Registrar uma venda</h2><span>Siga os passos de cima para baixo</span></div></div>
                {!produtosAtivos.length && <div className={styles.inlineAlert}>Cadastre um produto e informe o estoque antes da primeira venda.</div>}
                <div className={styles.formBody}>
                  <div className={styles.saleStep}><span>1</span><div><strong>O que foi vendido?</strong><small>Escolha o produto.</small></div></div>
                  <div className={styles.formGrid}><label className={styles.fieldFull}><span>Produto *</span><select value={vendaProdutoId} onChange={(event) => selecionarProdutoVenda(event.target.value)}><option value="">Escolha o produto</option>{produtosAtivos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} — disponível: {quantidade(produto.estoque_atual)} {produto.unidade}</option>)}</select></label></div>
                  <div className={styles.saleStep}><span>2</span><div><strong>Qual quantidade e preço?</strong><small>O sistema mostrará quanto ficará no estoque.</small></div></div>
                  <div className={styles.formGrid}><label><span>Quantidade *</span><input inputMode="decimal" value={vendaQuantidade} onChange={(event) => setVendaQuantidade(event.target.value)} placeholder="Exemplo: 5 ou 2,5" /></label><label><span>Preço por {vendaProduto?.unidade || 'unidade'}</span><input inputMode="decimal" value={vendaPreco} onChange={(event) => setVendaPreco(event.target.value)} placeholder="Exemplo: 18,00" /></label><label><span>Desconto, se houver</span><input inputMode="decimal" value={vendaDesconto} onChange={(event) => setVendaDesconto(event.target.value)} placeholder="0,00" /></label><label><span>Taxa de entrega</span><input inputMode="decimal" value={vendaEntrega} onChange={(event) => setVendaEntrega(event.target.value)} placeholder="0,00" /></label></div>
                  {vendaProduto && numero(vendaQuantidade) > 0 && <div className={`${styles.stockPreview} ${vendaInvalida ? styles.stockPreviewError : ''}`}><div><span>Disponível</span><strong>{quantidade(vendaProduto.estoque_atual)} {vendaProduto.unidade}</strong></div><div><span>Vendido</span><strong>{quantidade(numero(vendaQuantidade))} {vendaProduto.unidade}</strong></div><div><span>Vai restar</span><strong>{quantidade(Math.max(vendaSaldoDepois, 0))} {vendaProduto.unidade}</strong></div>{vendaInvalida && <p>Você está tentando vender mais do que possui.</p>}</div>}
                  <div className={styles.saleStep}><span>3</span><div><strong>Quem comprou?</strong><small>O cliente é opcional para venda rápida.</small></div></div>
                  <div className={styles.formGrid}><label className={styles.fieldFull}><span>Cliente</span><select value={vendaClienteId} onChange={(event) => setVendaClienteId(event.target.value)}><option value="">Venda rápida, sem cadastrar cliente</option>{clientesAtivos.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select><Ajuda>Cadastre o cliente quando ele for pagar depois ou comprar com frequência.</Ajuda></label></div>
                  <div className={styles.saleStep}><span>4</span><div><strong>O cliente pagou?</strong><small>Escolha a situação que aconteceu.</small></div></div>
                  <div className={styles.paymentChoices}><button type="button" className={vendaStatus === 'pago' ? styles.paymentActive : ''} onClick={() => { setVendaStatus('pago'); setVendaValorPago(''); }}><CheckCircle2 size={23} /><strong>Sim, pagou tudo</strong><small>O valor entra como recebido.</small></button><button type="button" className={vendaStatus === 'parcial' ? styles.paymentActive : ''} onClick={() => setVendaStatus('parcial')}><CircleDollarSign size={23} /><strong>Pagou uma parte</strong><small>Informe quanto recebeu.</small></button><button type="button" className={vendaStatus === 'pendente' ? styles.paymentActiveWarning : ''} onClick={() => { setVendaStatus('pendente'); setVendaValorPago(''); }}><HandCoins size={23} /><strong>Vai pagar depois</strong><small>Ficará na lista de quem deve.</small></button></div>
                  <div className={styles.formGrid}><label><span>Como será o pagamento?</span><select value={vendaForma} onChange={(event) => setVendaForma(event.target.value)}>{formasPagamento.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{vendaStatus === 'parcial' && <label><span>Quanto recebeu agora?</span><input inputMode="decimal" value={vendaValorPago} onChange={(event) => setVendaValorPago(event.target.value)} placeholder="Exemplo: 50,00" /></label>}<label><span>Data da venda</span><input type="date" value={vendaData} onChange={(event) => setVendaData(event.target.value)} /></label><label className={styles.fieldFull}><span>Observação</span><input value={vendaObservacao} onChange={(event) => setVendaObservacao(event.target.value)} placeholder="Exemplo: entregar na sexta-feira" /></label></div>
                  <div className={styles.totalBox}><span>Valor total da venda</span><strong>{moeda(totalVendaPrevisto)}</strong></div>
                </div>
                <button className={styles.primaryAction} disabled={salvando || !produtosAtivos.length || vendaInvalida} type="submit">{salvando ? 'Registrando...' : 'Confirmar venda'}</button>
              </form>
            </div>
          )}

          {aba === 'clientes' && (
            <div className={styles.screenStack}>
              <div className={styles.kpiGrid}><KpiCard label="CLIENTES" value={clientesAtivos.length} /><KpiCard label="ESTÃO DEVENDO" value={devedores.length} tone="warning" /><KpiCard label="TOTAL A RECEBER" value={moeda(aReceber)} tone="warning" /><KpiCard label="MAIOR DÍVIDA" value={moeda(maiorSaldo)} /></div>

              <SectionCard title="Quem está devendo" aside={<span className={styles.countLabel}>{devedores.length} cliente(s)</span>}>
                <div className={styles.debtorList}>{devedores.map(({ cliente, saldo }) => <article key={cliente.id}><span className={styles.clientAvatar}>{iniciais(cliente.nome)}</span><div><strong>{cliente.nome}</strong><small>Última compra: {dataBR(ultimaCompraPorCliente.get(cliente.id))}</small></div><div className={styles.debtValue}><span>Falta pagar</span><strong>{moeda(saldo)}</strong></div><div className={styles.debtActions}><button type="button" onClick={() => setRecebimentoAberto({ clienteId: cliente.id, nome: cliente.nome, saldo, valor: String(saldo).replace('.', ',') })}><CircleDollarSign size={17} /> Recebi pagamento</button>{cliente.whatsapp && <a href={`https://wa.me/55${somenteNumeros(cliente.whatsapp)}?text=${encodeURIComponent(`Olá, ${cliente.nome}. Passando para lembrar que ficou um valor de ${moeda(saldo)} em aberto. Obrigado!`)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Chamar no WhatsApp</a>}</div></article>)}{!devedores.length && <div className={styles.emptyState}><CheckCircle2 size={28} /> Nenhum cliente está devendo.</div>}</div>
              </SectionCard>

              {recebimentoAberto && <form className={styles.receiptCard} onSubmit={registrarRecebimento}><div><strong>Recebimento de {recebimentoAberto.nome}</strong><small>Saldo atual: {moeda(recebimentoAberto.saldo)}</small></div><label><span>Quanto você recebeu?</span><input inputMode="decimal" value={recebimentoAberto.valor} onChange={(event) => setRecebimentoAberto({ ...recebimentoAberto, valor: event.target.value })} /></label><div><button type="button" onClick={() => setRecebimentoAberto(null)}>Cancelar</button><button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Confirmar recebimento'}</button></div></form>}

              <label className={styles.searchBoxWide}><Search size={19} /><input value={buscaCliente} onChange={(event) => setBuscaCliente(event.target.value)} placeholder="Buscar cliente pelo nome ou telefone" /></label>
              <SectionCard title="Todos os clientes" aside={<span className={styles.countLabel}>{clientesFiltrados.length} registro(s)</span>}><div className={styles.clientList}>{clientesFiltrados.map((cliente) => { const pendente = saldoPorCliente.get(cliente.id) || 0; return <article className={!cliente.ativo ? styles.rowInactive : ''} key={cliente.id}><span className={styles.clientAvatar}>{iniciais(cliente.nome)}</span><div><strong>{cliente.nome}</strong><small>{cliente.endereco || 'Local não informado'} · {cliente.whatsapp || 'Sem telefone'}</small></div><div className={styles.clientBalance}><strong>{moeda(pendente)}</strong><small>{pendente > 0 ? 'em aberto' : 'sem dívida'}</small></div><div className={styles.rowActions}><button type="button" onClick={() => editarCliente(cliente)}><Pencil size={17} /> Editar</button><button type="button" onClick={() => alterarClienteAtivo(cliente)}>{cliente.ativo ? 'Desativar' : 'Reativar'}</button></div></article>; })}{!clientesFiltrados.length && <div className={styles.emptyState}>Nenhum cliente encontrado.</div>}</div></SectionCard>

              <form id="cliente-form" className={styles.formCard} onSubmit={salvarCliente}>
                <div className={styles.formHeader}><div><h2>{clienteEdicaoId ? 'Editar cliente' : 'Cadastrar cliente'}</h2><span>Use apenas as informações que você souber</span></div>{clienteEdicaoId && <button type="button" onClick={limparCliente}>Cancelar edição</button>}</div>
                <div className={styles.formGrid}><label><span>Nome *</span><input value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} placeholder="Exemplo: João da Feira" /></label><label><span>Telefone ou WhatsApp</span><input inputMode="tel" value={clienteWhatsapp} onChange={(event) => setClienteWhatsapp(event.target.value)} placeholder="(63) 99999-9999" /></label><label><span>Cidade ou endereço</span><input value={clienteEndereco} onChange={(event) => setClienteEndereco(event.target.value)} placeholder="Exemplo: Palmas" /></label><label><span>Limite para comprar fiado</span><input inputMode="decimal" value={clienteLimite} onChange={(event) => setClienteLimite(event.target.value)} placeholder="Exemplo: 200,00" /><Ajuda>É apenas uma referência para você. Pode deixar em branco.</Ajuda></label><label className={styles.fieldFull}><span>Observação</span><textarea value={clienteObservacoes} onChange={(event) => setClienteObservacoes(event.target.value)} placeholder="Exemplo: recebe mercadoria às quartas-feiras" /></label></div>
                <button className={styles.primaryAction} disabled={salvando} type="submit">{salvando ? 'Salvando...' : clienteEdicaoId ? 'Atualizar cliente' : 'Cadastrar cliente'}</button>
              </form>

              <button className={styles.floatingAction} type="button" onClick={() => { limparCliente(); rolarPara('cliente-form'); }}><Plus size={21} /> Novo cliente</button>
            </div>
          )}
        </main>

        <nav className={styles.bottomNav} aria-label="Navegação do AgroGestão">{botoesAbas.map(({ id, label, icon: Icon }) => <button key={id} className={aba === id ? styles.bottomActive : ''} type="button" onClick={() => navegar(id)}><Icon size={22} /><span>{label}</span></button>)}</nav>
      </div>

      {mostrarBoasVindas && <div className={styles.onboardingBackdrop}><section className={styles.onboardingCard}><button className={styles.onboardingClose} type="button" onClick={() => concluirBoasVindas(false)} aria-label="Fechar"><X size={22} /></button><span className={styles.onboardingEmoji}>🌾</span><h2>Bem-vindo ao AgroGestão</h2><p>Você não precisa entender de contabilidade. Basta contar o que aconteceu na sua produção.</p><div className={styles.onboardingSteps}><div><span>1</span><strong>Cadastre o produto</strong><small>Informe o que vende e quanto tem agora.</small></div><div><span>2</span><strong>Registre o que entrou ou saiu</strong><small>Produziu, perdeu, usou ou comprou.</small></div><div><span>3</span><strong>Registre a venda</strong><small>O estoque e o valor a receber são calculados.</small></div></div><button className={styles.onboardingPrimary} type="button" onClick={() => concluirBoasVindas(false)}>Começar com meus dados</button><button className={styles.onboardingSecondary} type="button" onClick={() => concluirBoasVindas(true)}><BookOpen size={19} /> Aprender usando um exemplo</button></section></div>}
    </div>
  );
}

export default function AgroGestaoApp() {
  return <AuthGuard><AgroGestaoContent /></AuthGuard>;
}
