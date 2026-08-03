'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Droplets,
  Egg,
  Gauge,
  History,
  Home,
  Menu,
  Plus,
  RotateCw,
  Save,
  Settings2,
  Share2,
  Thermometer,
  Trash2,
  X
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import {
  SPECIES_PRESETS,
  addDaysISO,
  formatDate,
  formatDateTime,
  incubationDay,
  localDateISO,
  numberValue,
  percent,
  presetByKey
} from './incubacaoPresets';
import styles from './incubacao.module.css';

type View = 'inicio' | 'nova' | 'chocadeiras' | 'historico' | 'estatisticas' | 'detalhe';
type Modal = 'medicao' | 'ovoscopia' | 'nascimento' | 'chocadeira' | null;
type Status = 'planejada' | 'em_incubacao' | 'bloqueio' | 'em_eclosao' | 'concluida' | 'cancelada';

type Chocadeira = {
  id: string;
  usuario_id: string;
  nome: string;
  modelo?: string | null;
  capacidade: number;
  tipo_viragem: 'automatica' | 'manual';
  temperatura_padrao: number;
  umidade_padrao: number;
  ultima_calibracao?: string | null;
  observacoes?: string | null;
  ativo: boolean;
};

type Incubacao = {
  id: string;
  usuario_id: string;
  chocadeira_id?: string | null;
  especie: string;
  especie_chave: string;
  raca?: string | null;
  lote?: string | null;
  origem_ovos?: string | null;
  fornecedor?: string | null;
  quantidade_inicial: number;
  ovos_ativos: number;
  ovos_ferteis: number;
  ovos_nao_ferteis: number;
  ovos_retirados: number;
  nascidos_vivos: number;
  dias_previstos: number;
  dia_ovoscopia_1: number;
  dia_ovoscopia_2?: number | null;
  dia_parar_viragem: number;
  temperatura_alvo: number;
  umidade_incubacao: number;
  umidade_eclosao: number;
  data_inicio: string;
  data_prevista_eclosao: string;
  status: Status;
  observacoes?: string | null;
  finalizada_em?: string | null;
  created_at: string;
  agro_chocadeiras?: { nome: string; capacidade: number } | null;
};

type Medicao = {
  id: string;
  incubacao_id: string;
  registrado_em: string;
  temperatura?: number | null;
  umidade?: number | null;
  virou_ovos: boolean;
  falta_energia: boolean;
  ocorrencia?: string | null;
  observacoes?: string | null;
};

type Ovoscopia = {
  id: string;
  incubacao_id: string;
  realizado_em: string;
  ovos_analisados: number;
  ovos_ferteis: number;
  ovos_nao_ferteis: number;
  embrioes_mortos: number;
  ovos_trincados: number;
  ovos_contaminados: number;
  observacoes?: string | null;
};

type Nascimento = {
  id: string;
  incubacao_id: string;
  registrado_em: string;
  nascidos_vivos: number;
  nascidos_fracos: number;
  mortos_apos_nascer: number;
  mortos_no_ovo: number;
  bicaram_nao_nasceram: number;
  nascimentos_auxiliados: number;
  observacoes?: string | null;
};

type AlertItem = {
  incubacaoId: string;
  title: string;
  detail: string;
  tone: 'warning' | 'danger' | 'success';
};

const STATUS_LABELS: Record<Status, string> = {
  planejada: 'Planejada',
  em_incubacao: 'Em incubação',
  bloqueio: 'Parar viragem',
  em_eclosao: 'Em nascimento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};

const EMPTY_NEW = () => {
  const preset = SPECIES_PRESETS[0];
  const inicio = localDateISO();
  return {
    especie_chave: preset.key,
    especie: preset.nome,
    raca: '',
    chocadeira_id: '',
    quantidade: '',
    data_inicio: inicio,
    dias_previstos: String(preset.dias),
    temperatura: String(preset.temperatura),
    umidade: String(preset.umidade),
    umidade_eclosao: String(preset.umidadeEclosao),
    ovoscopia1: String(preset.ovoscopia1),
    ovoscopia2: preset.ovoscopia2 ? String(preset.ovoscopia2) : '',
    parar_viragem: String(preset.pararViragem),
    origem: '',
    fornecedor: '',
    lote: '',
    observacoes: ''
  };
};

function normalizeIncubacao(item: Incubacao): Incubacao {
  return {
    ...item,
    quantidade_inicial: numberValue(item.quantidade_inicial),
    ovos_ativos: numberValue(item.ovos_ativos),
    ovos_ferteis: numberValue(item.ovos_ferteis),
    ovos_nao_ferteis: numberValue(item.ovos_nao_ferteis),
    ovos_retirados: numberValue(item.ovos_retirados),
    nascidos_vivos: numberValue(item.nascidos_vivos),
    dias_previstos: numberValue(item.dias_previstos),
    dia_ovoscopia_1: numberValue(item.dia_ovoscopia_1),
    dia_ovoscopia_2: item.dia_ovoscopia_2 == null ? null : numberValue(item.dia_ovoscopia_2),
    dia_parar_viragem: numberValue(item.dia_parar_viragem),
    temperatura_alvo: numberValue(item.temperatura_alvo),
    umidade_incubacao: numberValue(item.umidade_incubacao),
    umidade_eclosao: numberValue(item.umidade_eclosao)
  };
}

function statusFromDay(item: Incubacao) {
  if (item.status === 'concluida' || item.status === 'cancelada') return item.status;
  const day = incubationDay(item.data_inicio, item.dias_previstos);
  if (day >= item.dias_previstos) return 'em_eclosao' as Status;
  if (day >= item.dia_parar_viragem) return 'bloqueio' as Status;
  return 'em_incubacao' as Status;
}

function toNoonIso(date: string) {
  return new Date(`${date}T12:00:00`).toISOString();
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function IncubacaoContent() {
  const [view, setView] = useState<View>('inicio');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [userId, setUserId] = useState('');
  const [incubacoes, setIncubacoes] = useState<Incubacao[]>([]);
  const [chocadeiras, setChocadeiras] = useState<Chocadeira[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [ovoscopias, setOvoscopias] = useState<Ovoscopia[]>([]);
  const [nascimentos, setNascimentos] = useState<Nascimento[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nova, setNova] = useState(EMPTY_NEW);
  const [chocadeiraForm, setChocadeiraForm] = useState({ nome: '', modelo: '', capacidade: '', tipo_viragem: 'automatica', temperatura: '37.7', umidade: '52', calibracao: '', observacoes: '' });
  const [medicaoForm, setMedicaoForm] = useState({ temperatura: '37.7', umidade: '52', virou_ovos: false, falta_energia: false, ocorrencia: '', observacoes: '' });
  const [ovoscopiaForm, setOvoscopiaForm] = useState({ analisados: '', ferteis: '', nao_ferteis: '', mortos: '', trincados: '', contaminados: '', observacoes: '' });
  const [nascimentoForm, setNascimentoForm] = useState({ vivos: '', fracos: '', mortos_apos: '', mortos_ovo: '', bicaram: '', auxiliados: '', observacoes: '' });

  async function loadData() {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [incResult, chocResult, medResult, ovoResult, nascResult] = await Promise.all([
      supabase.from('agro_incubacoes').select('*, agro_chocadeiras(nome,capacidade)').eq('usuario_id', user.id).order('data_inicio', { ascending: false }),
      supabase.from('agro_chocadeiras').select('*').eq('usuario_id', user.id).eq('ativo', true).order('nome'),
      supabase.from('agro_incubacao_medicoes').select('*').eq('usuario_id', user.id).order('registrado_em', { ascending: false }).limit(1000),
      supabase.from('agro_incubacao_ovoscopias').select('*').eq('usuario_id', user.id).order('realizado_em', { ascending: false }).limit(500),
      supabase.from('agro_incubacao_nascimentos').select('*').eq('usuario_id', user.id).order('registrado_em', { ascending: false }).limit(500)
    ]);

    const firstError = incResult.error || chocResult.error || medResult.error || ovoResult.error || nascResult.error;
    if (firstError) {
      setMessage(firstError.message.includes('agro_incub') ? 'O banco do módulo de incubação ainda precisa ser atualizado.' : firstError.message);
    }

    setIncubacoes(((incResult.data || []) as Incubacao[]).map(normalizeIncubacao));
    setChocadeiras(((chocResult.data || []) as Chocadeira[]).map((item) => ({
      ...item,
      capacidade: numberValue(item.capacidade),
      temperatura_padrao: numberValue(item.temperatura_padrao),
      umidade_padrao: numberValue(item.umidade_padrao)
    })));
    setMedicoes((medResult.data || []) as Medicao[]);
    setOvoscopias((ovoResult.data || []) as Ovoscopia[]);
    setNascimentos((nascResult.data || []) as Nascimento[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selected = useMemo(() => incubacoes.find((item) => item.id === selectedId) || null, [incubacoes, selectedId]);
  const activeIncubations = useMemo(() => incubacoes.filter((item) => !['concluida', 'cancelada'].includes(item.status)), [incubacoes]);
  const completedIncubations = useMemo(() => incubacoes.filter((item) => item.status === 'concluida'), [incubacoes]);

  const alerts = useMemo<AlertItem[]>(() => {
    const today = localDateISO();
    const items: AlertItem[] = [];
    activeIncubations.forEach((item) => {
      const day = incubationDay(item.data_inicio, item.dias_previstos);
      const measuredToday = medicoes.some((med) => med.incubacao_id === item.id && med.registrado_em.slice(0, 10) === today);
      const ovoscopyDays = [item.dia_ovoscopia_1, item.dia_ovoscopia_2].filter(Boolean) as number[];

      if (!measuredToday) items.push({ incubacaoId: item.id, title: `${item.especie}: registrar medição`, detail: 'Ainda não há temperatura e umidade registradas hoje.', tone: 'warning' });
      if (ovoscopyDays.includes(day)) items.push({ incubacaoId: item.id, title: `${item.especie}: ovoscopia hoje`, detail: `A incubação chegou ao dia ${day}.`, tone: 'warning' });
      if (day === item.dia_parar_viragem) items.push({ incubacaoId: item.id, title: `${item.especie}: parar a viragem`, detail: `Inicie o período de bloqueio e aumente a umidade para ${item.umidade_eclosao}%.`, tone: 'danger' });
      if (day >= item.dias_previstos) items.push({ incubacaoId: item.id, title: `${item.especie}: nascimento esperado`, detail: `A previsão era ${formatDate(item.data_prevista_eclosao)}.`, tone: 'success' });
    });
    return items;
  }, [activeIncubations, medicoes]);

  useEffect(() => {
    if (!alerts.length || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const key = `agro-incubacao-alert-${localDateISO()}`;
    if (localStorage.getItem(key)) return;
    const first = alerts[0];
    new Notification('AgroGestão • Incubação', { body: `${first.title}. ${first.detail}`, icon: '/icon-192.png' });
    localStorage.setItem(key, '1');
  }, [alerts]);

  const stats = useMemo(() => {
    const totalEggs = completedIncubations.reduce((sum, item) => sum + item.quantidade_inicial, 0);
    const live = completedIncubations.reduce((sum, item) => sum + item.nascidos_vivos, 0);
    const fertile = completedIncubations.reduce((sum, item) => sum + Math.max(item.ovos_ferteis, item.nascidos_vivos), 0);
    const grouped = completedIncubations.reduce<Record<string, { eggs: number; live: number }>>((acc, item) => {
      acc[item.especie] ||= { eggs: 0, live: 0 };
      acc[item.especie].eggs += item.quantidade_inicial;
      acc[item.especie].live += item.nascidos_vivos;
      return acc;
    }, {});
    const best = Object.entries(grouped).sort((a, b) => percent(b[1].live, b[1].eggs) - percent(a[1].live, a[1].eggs))[0];
    return {
      totalEggs,
      live,
      fertile,
      hatchRate: percent(live, totalEggs),
      fertilityRate: percent(fertile, totalEggs),
      bestSpecies: best ? `${best[0]} (${percent(best[1].live, best[1].eggs).toFixed(1)}%)` : 'Sem dados'
    };
  }, [completedIncubations]);

  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    if (next !== 'detalhe') setSelectedId(null);
  }

  function openDetail(id: string) {
    setSelectedId(id);
    setView('detalhe');
    setMobileMenu(false);
  }

  function updateSpecies(key: string) {
    const preset = presetByKey(key);
    setNova((current) => ({
      ...current,
      especie_chave: preset.key,
      especie: preset.nome,
      dias_previstos: String(preset.dias),
      temperatura: String(preset.temperatura),
      umidade: String(preset.umidade),
      umidade_eclosao: String(preset.umidadeEclosao),
      ovoscopia1: String(preset.ovoscopia1),
      ovoscopia2: preset.ovoscopia2 ? String(preset.ovoscopia2) : '',
      parar_viragem: String(preset.pararViragem)
    }));
  }

  async function createIncubation(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const quantity = Math.floor(numberValue(nova.quantidade));
    const days = Math.floor(numberValue(nova.dias_previstos));
    if (!userId || quantity <= 0 || days <= 0 || !nova.especie.trim()) {
      setMessage('Informe a espécie, a quantidade de ovos e os dias previstos.');
      return;
    }
    const selectedIncubator = chocadeiras.find((item) => item.id === nova.chocadeira_id);
    if (selectedIncubator && quantity > selectedIncubator.capacidade) {
      setMessage(`Essa chocadeira suporta até ${selectedIncubator.capacidade} ovos.`);
      return;
    }

    setSaving(true);
    const expected = addDaysISO(nova.data_inicio, days);
    const { data, error } = await supabase.from('agro_incubacoes').insert({
      usuario_id: userId,
      chocadeira_id: nova.chocadeira_id || null,
      especie: nova.especie.trim(),
      especie_chave: nova.especie_chave,
      raca: nova.raca.trim() || null,
      lote: nova.lote.trim() || null,
      origem_ovos: nova.origem.trim() || null,
      fornecedor: nova.fornecedor.trim() || null,
      quantidade_inicial: quantity,
      ovos_ativos: quantity,
      dias_previstos: days,
      dia_ovoscopia_1: Math.max(1, Math.floor(numberValue(nova.ovoscopia1))),
      dia_ovoscopia_2: nova.ovoscopia2 ? Math.floor(numberValue(nova.ovoscopia2)) : null,
      dia_parar_viragem: Math.max(1, Math.floor(numberValue(nova.parar_viragem))),
      temperatura_alvo: numberValue(nova.temperatura),
      umidade_incubacao: Math.floor(numberValue(nova.umidade)),
      umidade_eclosao: Math.floor(numberValue(nova.umidade_eclosao)),
      data_inicio: toNoonIso(nova.data_inicio),
      data_prevista_eclosao: expected,
      status: 'em_incubacao',
      observacoes: nova.observacoes.trim() || null
    }).select('id').single();
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setNova(EMPTY_NEW());
    await loadData();
    if (data?.id) openDetail(data.id);
  }

  async function createIncubator(event: FormEvent) {
    event.preventDefault();
    const capacity = Math.floor(numberValue(chocadeiraForm.capacidade));
    if (!userId || !chocadeiraForm.nome.trim() || capacity <= 0) {
      setMessage('Informe o nome e a capacidade da chocadeira.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('agro_chocadeiras').insert({
      usuario_id: userId,
      nome: chocadeiraForm.nome.trim(),
      modelo: chocadeiraForm.modelo.trim() || null,
      capacidade: capacity,
      tipo_viragem: chocadeiraForm.tipo_viragem,
      temperatura_padrao: numberValue(chocadeiraForm.temperatura),
      umidade_padrao: Math.floor(numberValue(chocadeiraForm.umidade)),
      ultima_calibracao: chocadeiraForm.calibracao || null,
      observacoes: chocadeiraForm.observacoes.trim() || null
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setChocadeiraForm({ nome: '', modelo: '', capacidade: '', tipo_viragem: 'automatica', temperatura: '37.7', umidade: '52', calibracao: '', observacoes: '' });
    setModal(null);
    setMessage('Chocadeira cadastrada.');
    await loadData();
  }

  async function saveMeasurement(event: FormEvent) {
    event.preventDefault();
    if (!selected || !userId) return;
    setSaving(true);
    const { error } = await supabase.from('agro_incubacao_medicoes').insert({
      usuario_id: userId,
      incubacao_id: selected.id,
      temperatura: medicaoForm.temperatura ? numberValue(medicaoForm.temperatura) : null,
      umidade: medicaoForm.umidade ? Math.floor(numberValue(medicaoForm.umidade)) : null,
      virou_ovos: medicaoForm.virou_ovos,
      falta_energia: medicaoForm.falta_energia,
      ocorrencia: medicaoForm.ocorrencia.trim() || null,
      observacoes: medicaoForm.observacoes.trim() || null
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMedicaoForm({ temperatura: String(selected.temperatura_alvo), umidade: String(statusFromDay(selected) === 'em_incubacao' ? selected.umidade_incubacao : selected.umidade_eclosao), virou_ovos: false, falta_energia: false, ocorrencia: '', observacoes: '' });
    setModal(null);
    setMessage('Medição registrada.');
    await loadData();
  }

  async function saveOvoscopy(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.rpc('agro_incubacao_registrar_ovoscopia', {
      p_incubacao_id: selected.id,
      p_ovos_analisados: Math.floor(numberValue(ovoscopiaForm.analisados)),
      p_ovos_ferteis: Math.floor(numberValue(ovoscopiaForm.ferteis)),
      p_ovos_nao_ferteis: Math.floor(numberValue(ovoscopiaForm.nao_ferteis)),
      p_embrioes_mortos: Math.floor(numberValue(ovoscopiaForm.mortos)),
      p_ovos_trincados: Math.floor(numberValue(ovoscopiaForm.trincados)),
      p_ovos_contaminados: Math.floor(numberValue(ovoscopiaForm.contaminados)),
      p_observacoes: ovoscopiaForm.observacoes.trim() || null
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setOvoscopiaForm({ analisados: '', ferteis: '', nao_ferteis: '', mortos: '', trincados: '', contaminados: '', observacoes: '' });
    setModal(null);
    setMessage('Ovoscopia registrada e quantidade de ovos atualizada.');
    await loadData();
  }

  async function saveBirth(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.rpc('agro_incubacao_registrar_nascimento', {
      p_incubacao_id: selected.id,
      p_nascidos_vivos: Math.floor(numberValue(nascimentoForm.vivos)),
      p_nascidos_fracos: Math.floor(numberValue(nascimentoForm.fracos)),
      p_mortos_apos_nascer: Math.floor(numberValue(nascimentoForm.mortos_apos)),
      p_mortos_no_ovo: Math.floor(numberValue(nascimentoForm.mortos_ovo)),
      p_bicaram_nao_nasceram: Math.floor(numberValue(nascimentoForm.bicaram)),
      p_nascimentos_auxiliados: Math.floor(numberValue(nascimentoForm.auxiliados)),
      p_observacoes: nascimentoForm.observacoes.trim() || null
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setNascimentoForm({ vivos: '', fracos: '', mortos_apos: '', mortos_ovo: '', bicaram: '', auxiliados: '', observacoes: '' });
    setModal(null);
    setMessage('Nascimento registrado.');
    await loadData();
  }

  async function finishIncubation(status: 'concluida' | 'cancelada') {
    if (!selected) return;
    const confirmed = window.confirm(status === 'concluida' ? 'Finalizar esta incubação?' : 'Cancelar esta incubação?');
    if (!confirmed) return;
    const { error } = await supabase.from('agro_incubacoes').update({ status, finalizada_em: new Date().toISOString() }).eq('id', selected.id).eq('usuario_id', userId);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadData();
    navigate('historico');
  }

  async function archiveIncubator(id: string) {
    const inUse = activeIncubations.some((item) => item.chocadeira_id === id);
    if (inUse) {
      setMessage('Essa chocadeira está sendo usada em uma incubação ativa.');
      return;
    }
    if (!window.confirm('Remover essa chocadeira da lista?')) return;
    const { error } = await supabase.from('agro_chocadeiras').update({ ativo: false }).eq('id', id).eq('usuario_id', userId);
    if (error) setMessage(error.message);
    else await loadData();
  }

  async function requestNotifications() {
    if (typeof Notification === 'undefined') {
      setMessage('Este navegador não oferece notificações. Os alertas continuarão aparecendo no painel.');
      return;
    }
    const permission = await Notification.requestPermission();
    setMessage(permission === 'granted' ? 'Lembretes ativados neste aparelho.' : 'Permissão de notificações não concedida.');
  }

  function exportCsv() {
    const header = ['Espécie', 'Raça', 'Chocadeira', 'Início', 'Previsão', 'Ovos', 'Férteis', 'Nascidos', 'Status'];
    const rows = incubacoes.map((item) => [
      item.especie,
      item.raca || '',
      item.agro_chocadeiras?.nome || '',
      formatDate(item.data_inicio),
      formatDate(item.data_prevista_eclosao),
      item.quantidade_inicial,
      item.ovos_ferteis,
      item.nascidos_vivos,
      STATUS_LABELS[item.status]
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    downloadText(`incubacoes-${localDateISO()}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
  }

  async function shareSelected() {
    if (!selected) return;
    const text = [
      `🥚 ${selected.especie}${selected.raca ? ` — ${selected.raca}` : ''}`,
      `Início: ${formatDate(selected.data_inicio)}`,
      `Previsão: ${formatDate(selected.data_prevista_eclosao)}`,
      `Ovos colocados: ${selected.quantidade_inicial}`,
      `Ovos ativos: ${selected.ovos_ativos}`,
      `Nascidos: ${selected.nascidos_vivos}`,
      `Taxa atual: ${percent(selected.nascidos_vivos, selected.quantidade_inicial).toFixed(1)}%`
    ].join('\n');
    if (navigator.share) await navigator.share({ title: 'Resumo da incubação', text });
    else {
      await navigator.clipboard.writeText(text);
      setMessage('Resumo copiado para compartilhar.');
    }
  }

  function openMeasurement() {
    if (!selected) return;
    const hatchPhase = incubationDay(selected.data_inicio, selected.dias_previstos) >= selected.dia_parar_viragem;
    setMedicaoForm({ temperatura: String(selected.temperatura_alvo), umidade: String(hatchPhase ? selected.umidade_eclosao : selected.umidade_incubacao), virou_ovos: false, falta_energia: false, ocorrencia: '', observacoes: '' });
    setModal('medicao');
  }

  function openOvoscopy() {
    if (!selected) return;
    setOvoscopiaForm((current) => ({ ...current, analisados: String(selected.ovos_ativos), ferteis: String(selected.ovos_ativos) }));
    setModal('ovoscopia');
  }

  const detailTimeline = useMemo(() => {
    if (!selected) return [];
    return [
      ...medicoes.filter((item) => item.incubacao_id === selected.id).map((item) => ({ date: item.registrado_em, type: 'Medição', title: `${item.temperatura ?? '—'}°C • ${item.umidade ?? '—'}%`, detail: item.observacoes || item.ocorrencia || (item.virou_ovos ? 'Ovos virados' : 'Acompanhamento registrado') })),
      ...ovoscopias.filter((item) => item.incubacao_id === selected.id).map((item) => ({ date: item.realizado_em, type: 'Ovoscopia', title: `${item.ovos_ferteis} férteis • ${item.ovos_nao_ferteis} claros`, detail: item.observacoes || `${item.ovos_analisados} ovos analisados` })),
      ...nascimentos.filter((item) => item.incubacao_id === selected.id).map((item) => ({ date: item.registrado_em, type: 'Nascimento', title: `${item.nascidos_vivos + item.nascidos_fracos} nascidos`, detail: item.observacoes || `${item.mortos_no_ovo + item.bicaram_nao_nasceram} perdas registradas` }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selected, medicoes, ovoscopias, nascimentos]);

  const viewTitle: Record<View, { eyebrow: string; title: string; description: string }> = {
    inicio: { eyebrow: 'INCUBAÇÃO DE OVOS', title: 'Acompanhe suas chocagens', description: 'Datas, ovoscopia, temperatura, umidade, nascimentos e resultados em um só lugar.' },
    nova: { eyebrow: 'NOVO LOTE', title: 'Iniciar incubação', description: 'Cadastre os ovos e o sistema calculará todas as etapas.' },
    chocadeiras: { eyebrow: 'EQUIPAMENTOS', title: 'Minhas chocadeiras', description: 'Capacidade, viragem, calibração e uso atual.' },
    historico: { eyebrow: 'RESULTADOS', title: 'Histórico de eclosões', description: 'Consulte chocagens concluídas e compare os resultados.' },
    estatisticas: { eyebrow: 'ANÁLISE', title: 'Desempenho da incubação', description: 'Veja fertilidade, eclosão e quais espécies apresentam melhor resultado.' },
    detalhe: { eyebrow: selected?.especie || 'INCUBAÇÃO', title: selected?.raca || selected?.especie || 'Detalhes', description: selected ? `${selected.agro_chocadeiras?.nome || 'Sem chocadeira vinculada'} • início em ${formatDate(selected.data_inicio)}` : '' }
  };

  const navItems: { view: View; label: string; icon: typeof Home }[] = [
    { view: 'inicio', label: 'Visão geral', icon: Home },
    { view: 'nova', label: 'Nova incubação', icon: Plus },
    { view: 'chocadeiras', label: 'Chocadeiras', icon: Settings2 },
    { view: 'historico', label: 'Histórico', icon: History },
    { view: 'estatisticas', label: 'Estatísticas', icon: BarChart3 }
  ];

  return (
    <div className={styles.viewport}>
      <aside className={`${styles.sidebar} ${mobileMenu ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <span><Egg size={27} /></span>
          <div><strong>Incubação</strong><small>AgroGestão</small></div>
          <button type="button" className={styles.closeMenu} onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.view || (item.view === 'inicio' && view === 'detalhe');
            return <button type="button" key={item.view} className={active ? styles.navActive : ''} onClick={() => navigate(item.view)}><Icon size={19} /><span>{item.label}</span>{active && <i />}</button>;
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <button type="button" onClick={requestNotifications}><Bell size={17} /> Ativar lembretes</button>
          <Link href="/painel/gestao"><ArrowLeft size={17} /> Voltar ao AgroGestão</Link>
        </div>
      </aside>

      {mobileMenu && <button type="button" className={styles.mobileBackdrop} onClick={() => setMobileMenu(false)} aria-label="Fechar menu" />}

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <button type="button" className={styles.iconButton} onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu /></button>
          <div className={styles.topbarTitle}><Egg size={20} /><strong>Incubação de ovos</strong></div>
          <div className={styles.topbarSpacer} />
          <button type="button" className={styles.iconButton} onClick={requestNotifications} aria-label="Ativar lembretes"><Bell /></button>
          <Link href="/painel/gestao" className={styles.backLink}><ArrowLeft size={17} /> AgroGestão</Link>
        </header>

        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <span>{viewTitle[view].eyebrow}</span>
              <h1>{viewTitle[view].title}</h1>
              <p>{viewTitle[view].description}</p>
            </div>
            {view === 'inicio' && <button type="button" className={styles.primaryButton} onClick={() => navigate('nova')}><Plus size={18} /> Nova incubação</button>}
            {view === 'chocadeiras' && <button type="button" className={styles.primaryButton} onClick={() => setModal('chocadeira')}><Plus size={18} /> Nova chocadeira</button>}
            {view === 'detalhe' && selected && <div className={styles.headerActions}><button type="button" className={styles.secondaryButton} onClick={shareSelected}><Share2 size={17} /> Compartilhar</button><button type="button" className={styles.secondaryButton} onClick={() => window.print()}><Download size={17} /> Imprimir</button></div>}
          </div>

          {message && <div className={styles.notice}><span>{message}</span><button type="button" onClick={() => setMessage(null)}><X size={16} /></button></div>}

          {loading ? <div className={styles.loading}><Egg size={42} /><strong>Carregando incubação...</strong></div> : (
            <>
              {view === 'inicio' && (
                <div className={styles.stack}>
                  <section className={styles.kpiGrid}>
                    <article><span>EM ANDAMENTO</span><strong>{activeIncubations.length}</strong><small>lotes sendo acompanhados</small></article>
                    <article><span>OVOS ATIVOS</span><strong>{activeIncubations.reduce((sum, item) => sum + item.ovos_ativos, 0)}</strong><small>ainda dentro das chocadeiras</small></article>
                    <article><span>NASCIMENTOS</span><strong>{incubacoes.reduce((sum, item) => sum + item.nascidos_vivos, 0)}</strong><small>registrados no sistema</small></article>
                    <article className={alerts.length ? styles.kpiWarning : styles.kpiSuccess}><span>ALERTAS DE HOJE</span><strong>{alerts.length}</strong><small>{alerts.length ? 'ações precisam de atenção' : 'tudo acompanhado'}</small></article>
                  </section>

                  {alerts.length > 0 && <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><Bell size={19} /><h2>O que fazer hoje</h2></div><span>{alerts.length} lembrete(s)</span></div><div className={styles.alertList}>{alerts.slice(0, 6).map((alert, index) => <button type="button" key={`${alert.incubacaoId}-${index}`} onClick={() => openDetail(alert.incubacaoId)} className={styles[`alert_${alert.tone}`]}><AlertTriangle size={20} /><div><strong>{alert.title}</strong><span>{alert.detail}</span></div><ChevronRight /></button>)}</div></section>}

                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHeader}><div><RotateCw size={19} /><h2>Incubações em andamento</h2></div><button type="button" onClick={() => navigate('nova')}>Adicionar lote</button></div>
                    {activeIncubations.length ? <div className={styles.incubationGrid}>{activeIncubations.map((item) => {
                      const day = incubationDay(item.data_inicio, item.dias_previstos);
                      const progress = percent(Math.min(day, item.dias_previstos), item.dias_previstos);
                      const preset = presetByKey(item.especie_chave);
                      const effectiveStatus = statusFromDay(item);
                      return <button type="button" className={styles.incubationCard} key={item.id} onClick={() => openDetail(item.id)}>
                        <div className={styles.cardTop}><span className={styles.speciesEmoji}>{preset.emoji}</span><div><strong>{item.especie}</strong><small>{item.raca || item.agro_chocadeiras?.nome || 'Lote de incubação'}</small></div><em className={styles[`status_${effectiveStatus}`]}>{STATUS_LABELS[effectiveStatus]}</em></div>
                        <div className={styles.progressTrack}><i style={{ width: `${progress}%` }} /></div>
                        <div className={styles.cardMetrics}><div><span>DIA</span><strong>{Math.min(day, item.dias_previstos)} de {item.dias_previstos}</strong></div><div><span>RESTANTES</span><strong>{Math.max(item.dias_previstos - day, 0)}</strong></div><div><span>OVOS ATIVOS</span><strong>{item.ovos_ativos}</strong></div></div>
                        <footer><span><CalendarDays size={15} /> Nascimento: {formatDate(item.data_prevista_eclosao)}</span><ChevronRight size={18} /></footer>
                      </button>;
                    })}</div> : <div className={styles.emptyState}><Egg size={42} /><strong>Nenhuma incubação em andamento</strong><p>Cadastre o primeiro lote de ovos para começar o acompanhamento.</p><button type="button" className={styles.primaryButton} onClick={() => navigate('nova')}><Plus size={18} /> Iniciar agora</button></div>}
                  </section>
                </div>
              )}

              {view === 'nova' && (
                <form className={styles.formCard} onSubmit={createIncubation}>
                  <div className={styles.formSection}><div className={styles.formSectionTitle}><Egg /><div><h2>Espécie e ovos</h2><p>Escolha a ave e informe o lote.</p></div></div><div className={styles.speciesGrid}>{SPECIES_PRESETS.map((preset) => <button type="button" key={preset.key} className={nova.especie_chave === preset.key ? styles.speciesSelected : ''} onClick={() => updateSpecies(preset.key)}><span>{preset.emoji}</span><strong>{preset.nome}</strong><small>{preset.dias} dias</small></button>)}</div><div className={styles.formGrid}>
                    {nova.especie_chave === 'personalizada' && <label><span>Nome da espécie</span><input value={nova.especie} onChange={(event) => setNova({ ...nova, especie: event.target.value })} required /></label>}
                    <label><span>Raça ou linhagem</span><input value={nova.raca} onChange={(event) => setNova({ ...nova, raca: event.target.value })} placeholder="Ex.: GSB, caipira, gigante" /></label>
                    <label><span>Quantidade de ovos *</span><input type="number" min="1" value={nova.quantidade} onChange={(event) => setNova({ ...nova, quantidade: event.target.value })} required /></label>
                    <label><span>Chocadeira</span><select value={nova.chocadeira_id} onChange={(event) => setNova({ ...nova, chocadeira_id: event.target.value })}><option value="">Não informar</option>{chocadeiras.map((item) => <option key={item.id} value={item.id}>{item.nome} — {item.capacidade} ovos</option>)}</select></label>
                    <label><span>Data de início *</span><input type="date" value={nova.data_inicio} onChange={(event) => setNova({ ...nova, data_inicio: event.target.value })} required /></label>
                  </div></div>

                  <div className={styles.formSection}><div className={styles.formSectionTitle}><Gauge /><div><h2>Parâmetros da chocagem</h2><p>Os valores foram preenchidos automaticamente e podem ser ajustados.</p></div></div><div className={styles.formGrid}>
                    <label><span>Total de dias</span><input type="number" min="1" value={nova.dias_previstos} onChange={(event) => setNova({ ...nova, dias_previstos: event.target.value })} /></label>
                    <label><span>Temperatura alvo (°C)</span><input type="number" step="0.1" value={nova.temperatura} onChange={(event) => setNova({ ...nova, temperatura: event.target.value })} /></label>
                    <label><span>Umidade na incubação (%)</span><input type="number" value={nova.umidade} onChange={(event) => setNova({ ...nova, umidade: event.target.value })} /></label>
                    <label><span>Umidade na eclosão (%)</span><input type="number" value={nova.umidade_eclosao} onChange={(event) => setNova({ ...nova, umidade_eclosao: event.target.value })} /></label>
                    <label><span>1ª ovoscopia — dia</span><input type="number" min="1" value={nova.ovoscopia1} onChange={(event) => setNova({ ...nova, ovoscopia1: event.target.value })} /></label>
                    <label><span>2ª ovoscopia — dia</span><input type="number" min="1" value={nova.ovoscopia2} onChange={(event) => setNova({ ...nova, ovoscopia2: event.target.value })} /></label>
                    <label><span>Parar viragem — dia</span><input type="number" min="1" value={nova.parar_viragem} onChange={(event) => setNova({ ...nova, parar_viragem: event.target.value })} /></label>
                    <div className={styles.expectedDate}><CalendarDays /><span>Previsão de nascimento</span><strong>{formatDate(addDaysISO(nova.data_inicio, numberValue(nova.dias_previstos)))}</strong></div>
                  </div></div>

                  <div className={styles.formSection}><div className={styles.formSectionTitle}><ClipboardCheck /><div><h2>Origem e observações</h2><p>Essas informações ajudam a descobrir quais ovos dão melhor resultado.</p></div></div><div className={styles.formGrid}>
                    <label><span>Origem dos ovos</span><input value={nova.origem} onChange={(event) => setNova({ ...nova, origem: event.target.value })} placeholder="Produção própria ou comprados" /></label>
                    <label><span>Fornecedor</span><input value={nova.fornecedor} onChange={(event) => setNova({ ...nova, fornecedor: event.target.value })} /></label>
                    <label><span>Número do lote</span><input value={nova.lote} onChange={(event) => setNova({ ...nova, lote: event.target.value })} /></label>
                    <label className={styles.fullField}><span>Observações</span><textarea rows={4} value={nova.observacoes} onChange={(event) => setNova({ ...nova, observacoes: event.target.value })} placeholder="Armazenamento, idade dos ovos, transporte e outras informações" /></label>
                  </div></div>
                  <div className={styles.formFooter}><button type="button" className={styles.secondaryButton} onClick={() => navigate('inicio')}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={saving}><Save size={18} /> {saving ? 'Salvando...' : 'Iniciar incubação'}</button></div>
                </form>
              )}

              {view === 'chocadeiras' && (
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}><div><Settings2 size={19} /><h2>Chocadeiras cadastradas</h2></div><span>{chocadeiras.length} equipamento(s)</span></div>
                  {chocadeiras.length ? <div className={styles.incubatorGrid}>{chocadeiras.map((item) => {
                    const active = activeIncubations.find((inc) => inc.chocadeira_id === item.id);
                    return <article className={styles.incubatorCard} key={item.id}><div className={styles.incubatorIcon}><Gauge /></div><div className={styles.incubatorInfo}><strong>{item.nome}</strong><span>{item.modelo || 'Modelo não informado'}</span><div><small>Capacidade</small><b>{item.capacidade} ovos</b></div><div><small>Viragem</small><b>{item.tipo_viragem === 'automatica' ? 'Automática' : 'Manual'}</b></div><div><small>Calibração</small><b>{formatDate(item.ultima_calibracao)}</b></div></div><footer>{active ? <button type="button" onClick={() => openDetail(active.id)} className={styles.inUse}><RotateCw size={15} /> Em uso: {active.especie}</button> : <span className={styles.available}><CheckCircle2 size={15} /> Disponível</span>}<button type="button" className={styles.deleteButton} onClick={() => archiveIncubator(item.id)} aria-label="Remover chocadeira"><Trash2 size={17} /></button></footer></article>;
                  })}</div> : <div className={styles.emptyState}><Gauge size={42} /><strong>Nenhuma chocadeira cadastrada</strong><p>Cadastre a capacidade e o tipo de viragem de cada equipamento.</p><button type="button" className={styles.primaryButton} onClick={() => setModal('chocadeira')}><Plus size={18} /> Cadastrar chocadeira</button></div>}
                </section>
              )}

              {view === 'historico' && (
                <section className={styles.sectionCard}>
                  <div className={styles.sectionHeader}><div><History size={19} /><h2>Incubações finalizadas</h2></div><button type="button" onClick={exportCsv}><Download size={16} /> Exportar CSV</button></div>
                  {incubacoes.filter((item) => ['concluida', 'cancelada'].includes(item.status)).length ? <div className={styles.historyList}>{incubacoes.filter((item) => ['concluida', 'cancelada'].includes(item.status)).map((item) => <button type="button" key={item.id} onClick={() => openDetail(item.id)}><span className={styles.historyEmoji}>{presetByKey(item.especie_chave).emoji}</span><div><strong>{item.especie}{item.raca ? ` — ${item.raca}` : ''}</strong><small>{formatDate(item.data_inicio)} até {formatDate(item.finalizada_em || item.data_prevista_eclosao)}</small></div><div className={styles.historyNumbers}><span>{item.nascidos_vivos}/{item.quantidade_inicial}</span><strong>{percent(item.nascidos_vivos, item.quantidade_inicial).toFixed(1)}%</strong></div><em className={styles[`status_${item.status}`]}>{STATUS_LABELS[item.status]}</em><ChevronRight /></button>)}</div> : <div className={styles.emptyState}><History size={42} /><strong>O histórico ainda está vazio</strong><p>As chocagens aparecerão aqui depois de concluídas.</p></div>}
                </section>
              )}

              {view === 'estatisticas' && (
                <div className={styles.stack}>
                  <section className={styles.kpiGrid}><article><span>OVOS INCUBADOS</span><strong>{stats.totalEggs}</strong><small>em lotes concluídos</small></article><article><span>NASCIDOS</span><strong>{stats.live}</strong><small>filhotes vivos</small></article><article><span>TAXA DE ECLOSÃO</span><strong>{stats.hatchRate.toFixed(1)}%</strong><small>nascidos sobre ovos colocados</small></article><article><span>FERTILIDADE ESTIMADA</span><strong>{stats.fertilityRate.toFixed(1)}%</strong><small>ovos em desenvolvimento</small></article></section>
                  <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><BarChart3 size={19} /><h2>Resultado por espécie</h2></div><button type="button" onClick={exportCsv}><Download size={16} /> Exportar</button></div><div className={styles.chartList}>{Object.entries(completedIncubations.reduce<Record<string, { eggs: number; live: number; cycles: number }>>((acc, item) => { acc[item.especie] ||= { eggs: 0, live: 0, cycles: 0 }; acc[item.especie].eggs += item.quantidade_inicial; acc[item.especie].live += item.nascidos_vivos; acc[item.especie].cycles += 1; return acc; }, {})).map(([species, data]) => { const rate = percent(data.live, data.eggs); return <div key={species}><span>{species}</span><div className={styles.chartTrack}><i style={{ width: `${rate}%` }} /></div><strong>{rate.toFixed(1)}%</strong><small>{data.cycles} ciclo(s)</small></div>; })}{!completedIncubations.length && <div className={styles.emptyState}><BarChart3 size={42} /><strong>Sem dados suficientes</strong><p>Finalize uma incubação para visualizar os gráficos.</p></div>}</div></section>
                  <section className={styles.bestCard}><span>🏆</span><div><small>MELHOR RESULTADO</small><strong>{stats.bestSpecies}</strong><p>Comparação feita entre as incubações concluídas.</p></div></section>
                </div>
              )}

              {view === 'detalhe' && selected && (() => {
                const day = incubationDay(selected.data_inicio, selected.dias_previstos);
                const progress = percent(Math.min(day, selected.dias_previstos), selected.dias_previstos);
                const phase = statusFromDay(selected);
                const selectedMeasurements = medicoes.filter((item) => item.incubacao_id === selected.id);
                const latestMeasurement = selectedMeasurements[0];
                const fertility = percent(Math.max(selected.ovos_ferteis, selected.nascidos_vivos), selected.quantidade_inicial);
                const hatch = percent(selected.nascidos_vivos, selected.quantidade_inicial);
                return <div className={styles.stack}>
                  <button type="button" className={styles.inlineBack} onClick={() => navigate(selected.status === 'concluida' || selected.status === 'cancelada' ? 'historico' : 'inicio')}><ArrowLeft size={17} /> Voltar</button>
                  <section className={styles.detailHero}>
                    <div className={styles.progressRing} style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.min(day, selected.dias_previstos)}</strong><span>de {selected.dias_previstos} dias</span></div></div>
                    <div className={styles.heroInfo}><div><span className={styles.speciesEmoji}>{presetByKey(selected.especie_chave).emoji}</span><div><h2>{selected.especie}</h2><p>{selected.raca || selected.lote || 'Lote sem identificação'}</p></div><em className={styles[`status_${phase}`]}>{STATUS_LABELS[phase]}</em></div><div className={styles.progressTrack}><i style={{ width: `${progress}%` }} /></div><footer><span><CalendarDays /> Previsão: <strong>{formatDate(selected.data_prevista_eclosao)}</strong></span><span><Gauge /> {selected.agro_chocadeiras?.nome || 'Sem chocadeira vinculada'}</span></footer></div>
                  </section>

                  <section className={styles.detailMetrics}><article><Egg /><span>Ovos colocados</span><strong>{selected.quantidade_inicial}</strong></article><article><CheckCircle2 /><span>Ovos ativos</span><strong>{selected.ovos_ativos}</strong></article><article><ClipboardCheck /><span>Fertilidade</span><strong>{fertility.toFixed(1)}%</strong></article><article><span className={styles.chickIcon}>🐣</span><span>Nascidos</span><strong>{selected.nascidos_vivos}</strong></article></section>

                  <section className={styles.quickActionGrid}><button type="button" onClick={openMeasurement}><Thermometer /><strong>Registrar medição</strong><span>Temperatura, umidade e viragem</span></button><button type="button" onClick={openOvoscopy}><Egg /><strong>Registrar ovoscopia</strong><span>Férteis, claros e perdas</span></button><button type="button" onClick={() => setModal('nascimento')}><span className={styles.actionEmoji}>🐣</span><strong>Registrar nascimento</strong><span>Adicione os nascimentos aos poucos</span></button></section>

                  <div className={styles.twoColumns}>
                    <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><Gauge size={19} /><h2>Parâmetros atuais</h2></div><span>Dia {day}</span></div><div className={styles.parameterGrid}><div><Thermometer /><span>Temperatura alvo</span><strong>{selected.temperatura_alvo.toFixed(1)}°C</strong><small>Última: {latestMeasurement?.temperatura ?? '—'}°C</small></div><div><Droplets /><span>Umidade indicada</span><strong>{day >= selected.dia_parar_viragem ? selected.umidade_eclosao : selected.umidade_incubacao}%</strong><small>Última: {latestMeasurement?.umidade ?? '—'}%</small></div><div><RotateCw /><span>Viragem</span><strong>{day >= selected.dia_parar_viragem ? 'PARAR' : 'CONTINUAR'}</strong><small>Bloqueio no dia {selected.dia_parar_viragem}</small></div><div><CalendarDays /><span>Próxima etapa</span><strong>{day < selected.dia_ovoscopia_1 ? `Ovoscopia dia ${selected.dia_ovoscopia_1}` : day < selected.dia_parar_viragem ? `Bloqueio dia ${selected.dia_parar_viragem}` : 'Aguardar nascimento'}</strong><small>{Math.max(selected.dias_previstos - day, 0)} dia(s) restantes</small></div></div></section>
                    <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><BarChart3 size={19} /><h2>Resultado atual</h2></div><span>{selected.status === 'concluida' ? 'Final' : 'Parcial'}</span></div><div className={styles.resultBody}><div><span>Taxa de eclosão</span><strong>{hatch.toFixed(1)}%</strong><div className={styles.resultTrack}><i style={{ width: `${hatch}%` }} /></div></div><ul><li><span>Não férteis</span><strong>{selected.ovos_nao_ferteis}</strong></li><li><span>Retirados/perdas</span><strong>{selected.ovos_retirados}</strong></li><li><span>Ainda na chocadeira</span><strong>{selected.ovos_ativos}</strong></li></ul></div></section>
                  </div>

                  <section className={styles.sectionCard}><div className={styles.sectionHeader}><div><History size={19} /><h2>Linha do tempo</h2></div><span>{detailTimeline.length} registro(s)</span></div>{detailTimeline.length ? <div className={styles.timeline}>{detailTimeline.map((item, index) => <article key={`${item.date}-${index}`}><span className={styles.timelineDot} /><div><small>{item.type} • {formatDateTime(item.date)}</small><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div> : <div className={styles.emptyState}><History size={38} /><strong>Nenhum acompanhamento registrado</strong><p>Comece registrando a temperatura e a umidade.</p></div>}</section>

                  {!['concluida', 'cancelada'].includes(selected.status) && <section className={styles.finishBar}><div><strong>Encerrar esta incubação</strong><span>Finalize depois que todos os nascimentos e perdas forem registrados.</span></div><button type="button" className={styles.cancelButton} onClick={() => finishIncubation('cancelada')}>Cancelar lote</button><button type="button" className={styles.primaryButton} onClick={() => finishIncubation('concluida')}><CheckCircle2 size={18} /> Finalizar</button></section>}
                </div>;
              })()}
            </>
          )}
        </main>
      </div>

      {modal && <div className={styles.modalLayer} role="dialog" aria-modal="true"><button type="button" className={styles.modalBackdrop} onClick={() => setModal(null)} aria-label="Fechar" /><div className={styles.modalCard}><div className={styles.modalHeader}><div><strong>{modal === 'chocadeira' ? 'Nova chocadeira' : modal === 'medicao' ? 'Registrar medição' : modal === 'ovoscopia' ? 'Registrar ovoscopia' : 'Registrar nascimento'}</strong><span>{selected?.especie || 'Equipamento de incubação'}</span></div><button type="button" onClick={() => setModal(null)}><X /></button></div>
        {modal === 'chocadeira' && <form onSubmit={createIncubator} className={styles.modalForm}><div className={styles.formGrid}><label><span>Nome *</span><input value={chocadeiraForm.nome} onChange={(event) => setChocadeiraForm({ ...chocadeiraForm, nome: event.target.value })} placeholder="Ex.: Chocadeira grande" required /></label><label><span>Modelo</span><input value={chocadeiraForm.modelo} onChange={(event) => setChocadeiraForm({ ...chocadeiraForm, modelo: event.target.value })} /></label><label><span>Capacidade de ovos *</span><input type="number" min="1" value={chocadeiraForm.capacidade} onChange={(event) => setChocadeiraForm({ ...chocadeiraForm, capacidade: event.target.value })} required /></label><label><span>Tipo de viragem</span><select value={chocadeiraForm.tipo_viragem} onChange={(event) => setChocadeiraForm({ ...chocadeiraForm, tipo_viragem: event.target.value })}><option value="automatica">Automática</option><option value="manual">Manual</option></select></label><label><span>Temperatura padrão</span><input type="number" step="0.1" value={chocadeiraForm.temperatura} onChange={(event) => setChocadeiraForm({ ...chocadeiraForm, temperatura: event.target.value })} /></label><label><span>Umidade padrão</span><input type="number" value={chocadeiraForm.umidade} onChange={(event) => setChocadeiraForm({ ...chocadeiraForm, umidade: event.target.value })} /></label><label><span>Última calibração</span><input type="date" value={chocadeiraForm.calibracao} onChange={(event) => setChocadeiraForm({ ...chocadeiraForm, calibracao: event.target.value })} /></label><label className={styles.fullField}><span>Observações</span><textarea rows={3} value={chocadeiraForm.observacoes} onChange={(event) => setChocadeiraForm({ ...chocadeiraForm, observacoes: event.target.value })} /></label></div><div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setModal(null)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={saving}><Save size={17} /> Salvar</button></div></form>}
        {modal === 'medicao' && <form onSubmit={saveMeasurement} className={styles.modalForm}><div className={styles.formGrid}><label><span>Temperatura (°C)</span><input type="number" step="0.1" value={medicaoForm.temperatura} onChange={(event) => setMedicaoForm({ ...medicaoForm, temperatura: event.target.value })} /></label><label><span>Umidade (%)</span><input type="number" value={medicaoForm.umidade} onChange={(event) => setMedicaoForm({ ...medicaoForm, umidade: event.target.value })} /></label></div><div className={styles.checkGrid}><label><input type="checkbox" checked={medicaoForm.virou_ovos} onChange={(event) => setMedicaoForm({ ...medicaoForm, virou_ovos: event.target.checked })} /><span>Realizei a viragem dos ovos</span></label><label><input type="checkbox" checked={medicaoForm.falta_energia} onChange={(event) => setMedicaoForm({ ...medicaoForm, falta_energia: event.target.checked })} /><span>Houve falta de energia</span></label></div><label><span>Ocorrência</span><input value={medicaoForm.ocorrencia} onChange={(event) => setMedicaoForm({ ...medicaoForm, ocorrencia: event.target.value })} placeholder="Ex.: temperatura subiu, motor parou" /></label><label><span>Observações</span><textarea rows={3} value={medicaoForm.observacoes} onChange={(event) => setMedicaoForm({ ...medicaoForm, observacoes: event.target.value })} /></label><div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setModal(null)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={saving}><Save size={17} /> Registrar</button></div></form>}
        {modal === 'ovoscopia' && <form onSubmit={saveOvoscopy} className={styles.modalForm}><div className={styles.formHint}>Os ovos retirados serão descontados automaticamente da chocadeira.</div><div className={styles.formGrid}><label><span>Ovos analisados</span><input type="number" min="1" value={ovoscopiaForm.analisados} onChange={(event) => setOvoscopiaForm({ ...ovoscopiaForm, analisados: event.target.value })} required /></label><label><span>Ovos férteis</span><input type="number" min="0" value={ovoscopiaForm.ferteis} onChange={(event) => setOvoscopiaForm({ ...ovoscopiaForm, ferteis: event.target.value })} /></label><label><span>Claros/não férteis</span><input type="number" min="0" value={ovoscopiaForm.nao_ferteis} onChange={(event) => setOvoscopiaForm({ ...ovoscopiaForm, nao_ferteis: event.target.value })} /></label><label><span>Embriões mortos</span><input type="number" min="0" value={ovoscopiaForm.mortos} onChange={(event) => setOvoscopiaForm({ ...ovoscopiaForm, mortos: event.target.value })} /></label><label><span>Trincados</span><input type="number" min="0" value={ovoscopiaForm.trincados} onChange={(event) => setOvoscopiaForm({ ...ovoscopiaForm, trincados: event.target.value })} /></label><label><span>Contaminados</span><input type="number" min="0" value={ovoscopiaForm.contaminados} onChange={(event) => setOvoscopiaForm({ ...ovoscopiaForm, contaminados: event.target.value })} /></label><label className={styles.fullField}><span>Observações</span><textarea rows={3} value={ovoscopiaForm.observacoes} onChange={(event) => setOvoscopiaForm({ ...ovoscopiaForm, observacoes: event.target.value })} /></label></div><div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setModal(null)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={saving}><Save size={17} /> Registrar ovoscopia</button></div></form>}
        {modal === 'nascimento' && <form onSubmit={saveBirth} className={styles.modalForm}><div className={styles.formHint}>Você pode registrar os nascimentos em várias etapas, sem finalizar a incubação.</div><div className={styles.formGrid}><label><span>Nascidos vivos</span><input type="number" min="0" value={nascimentoForm.vivos} onChange={(event) => setNascimentoForm({ ...nascimentoForm, vivos: event.target.value })} /></label><label><span>Nascidos fracos</span><input type="number" min="0" value={nascimentoForm.fracos} onChange={(event) => setNascimentoForm({ ...nascimentoForm, fracos: event.target.value })} /></label><label><span>Mortos após nascer</span><input type="number" min="0" value={nascimentoForm.mortos_apos} onChange={(event) => setNascimentoForm({ ...nascimentoForm, mortos_apos: event.target.value })} /></label><label><span>Mortos dentro do ovo</span><input type="number" min="0" value={nascimentoForm.mortos_ovo} onChange={(event) => setNascimentoForm({ ...nascimentoForm, mortos_ovo: event.target.value })} /></label><label><span>Bicaram e não nasceram</span><input type="number" min="0" value={nascimentoForm.bicaram} onChange={(event) => setNascimentoForm({ ...nascimentoForm, bicaram: event.target.value })} /></label><label><span>Nascimento auxiliado</span><input type="number" min="0" value={nascimentoForm.auxiliados} onChange={(event) => setNascimentoForm({ ...nascimentoForm, auxiliados: event.target.value })} /></label><label className={styles.fullField}><span>Observações</span><textarea rows={3} value={nascimentoForm.observacoes} onChange={(event) => setNascimentoForm({ ...nascimentoForm, observacoes: event.target.value })} /></label></div><div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setModal(null)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={saving}><Save size={17} /> Registrar nascimento</button></div></form>}
      </div></div>}
    </div>
  );
}

export default function IncubacaoApp() {
  return <AuthGuard><IncubacaoContent /></AuthGuard>;
}
