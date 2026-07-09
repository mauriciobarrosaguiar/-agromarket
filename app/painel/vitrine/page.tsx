'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BadgeDollarSign, CalendarClock, CheckCircle2, FileText, ImagePlus, Megaphone, Send, Store } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import VitrinePagamentoPix from '@/components/VitrinePagamentoPix';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slug';
import { uploadVitrineImagem } from '@/lib/upload';
import { CIDADES_POR_ESTADO, ESTADOS } from '@/lib/constants';
import type { MonetizacaoPlano, Usuario, Vitrine, VitrinePagamento } from '@/types';

const POSICOES = [
  { value: 'center', label: 'Centro' },
  { value: 'top', label: 'Topo' },
  { value: 'bottom', label: 'Baixo' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' }
];

const MAX_ACCURACY_METERS = 150;

function onlyNumbers(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function formatMoney(value?: number | string | null) {
  const numero = typeof value === 'number' ? value : Number(value || 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBR(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function statusLabel(status?: string | null) {
  if (status === 'ativa') return 'Ativa';
  if (status === 'vencida') return 'Vencida';
  if (status === 'cancelada') return 'Cancelada';
  if (status === 'gratis_lancamento') return 'Grátis/liberada pelo admin';
  return 'Aguardando confirmação';
}

function vitrineLiberada(vitrine: Vitrine | null) {
  if (!vitrine?.vitrine_ativa) return false;
  const hoje = new Date().toISOString().slice(0, 10);

  if (vitrine.assinatura_status === 'ativa') return !vitrine.assinatura_vencimento || vitrine.assinatura_vencimento >= hoje;
  if (vitrine.assinatura_status === 'gratis_lancamento') {
    const vencimento = vitrine.gratis_ate || vitrine.assinatura_vencimento;
    return !vencimento || vencimento >= hoje;
  }

  return false;
}

function requisitosPerfil(perfil: Usuario | null) {
  if (!perfil) return [];
  const cpfOk = onlyNumbers(perfil.cpf).length === 11;
  const docDadosOk = Boolean(perfil.documento_numero && perfil.documento_orgao_emissor && perfil.documento_uf);
  const docArquivoOk = Boolean(perfil.documento_url);
  const docAprovadoOk = Boolean(perfil.documento_url && perfil.documento_status === 'aprovado');
  const selfieOk = Boolean(perfil.selfie_url || perfil.foto_url);
  const gpsOk = Boolean(perfil.localizacao_validada && perfil.latitude && perfil.longitude && (perfil.localizacao_accuracy || 999999) <= MAX_ACCURACY_METERS);

  return [
    { label: 'Selfie/foto do responsável', ok: selfieOk },
    { label: 'CPF válido no perfil', ok: cpfOk },
    { label: 'Dados do documento preenchidos', ok: docDadosOk },
    { label: 'Arquivo do documento enviado', ok: docArquivoOk },
    { label: 'Documento aprovado pelo administrador', ok: docAprovadoOk },
    { label: 'Localização real validada por GPS preciso', ok: gpsOk }
  ];
}

function documentoStatusTexto(status?: string | null) {
  if (status === 'aprovado') return 'Documento aprovado';
  if (status === 'pendente') return 'Documento em análise';
  if (status === 'recusado') return 'Documento recusado';
  return 'Documento não enviado';
}

function erroTexto(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message?: unknown }).message || '');
    if (msg) return msg;
  }
  return fallback;
}

function MinhaVitrineContent() {
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [planos, setPlanos] = useState<MonetizacaoPlano[]>([]);
  const [pagamentos, setPagamentos] = useState<VitrinePagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const planoMensal = planos.find((plano) => plano.codigo === 'vitrine_mensal') || planos[0];
  const pagamentoPendente = pagamentos.find((pagamento) => pagamento.status === 'pendente');
  const pagamentoPago = pagamentos.find((pagamento) => pagamento.status === 'pago');
  const requisitos = requisitosPerfil(perfil);
  const perfilVerificadoParaVitrine = requisitos.length > 0 && requisitos.every((item) => item.ok);
  const liberada = vitrineLiberada(vitrine);

  const cidades = useMemo(() => {
    const uf = vitrine?.estado || perfil?.estado || 'TO';
    const lista = CIDADES_POR_ESTADO[uf] || [];
    if (vitrine?.cidade && !lista.includes(vitrine.cidade)) return [vitrine.cidade, ...lista];
    return lista;
  }, [vitrine?.estado, vitrine?.cidade, perfil?.estado]);

  async function carregarPagamentos(vitrineId: string) {
    const { data } = await supabase
      .from('vitrine_pagamentos')
      .select('*')
      .eq('vitrine_id', vitrineId)
      .order('created_at', { ascending: false });
    setPagamentos((data || []) as VitrinePagamento[]);
  }

  async function carregarVitrine(vitrineId?: string) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const query = supabase.from('vitrines').select('*');
    const { data } = vitrineId ? await query.eq('id', vitrineId).maybeSingle() : await query.eq('usuario_id', userId).maybeSingle();
    const vitrineAtual = (data || null) as Vitrine | null;
    setVitrine(vitrineAtual);
    if (vitrineAtual) await carregarPagamentos(vitrineAtual.id);
    return vitrineAtual;
  }

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const [{ data: perfilData }, { data: planosData }] = await Promise.all([
      supabase.from('usuarios').select('*').eq('id', userData.user.id).single(),
      supabase.from('monetizacao_planos').select('*').eq('tipo', 'vitrine').eq('ativo', true).order('ordem')
    ]);

    setPerfil(perfilData as Usuario);
    setPlanos((planosData || []) as MonetizacaoPlano[]);
    await carregarVitrine();
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function update<K extends keyof Vitrine>(key: K, value: Vitrine[K]) {
    setVitrine((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function trocarEstado(uf: string) {
    setVitrine((prev) => prev ? { ...prev, estado: uf, cidade: '' } : prev);
  }

  async function criarPagamento(vitrineAtual: Vitrine, plano: MonetizacaoPlano) {
    const { error } = await supabase.from('vitrine_pagamentos').insert({
      vitrine_id: vitrineAtual.id,
      usuario_id: vitrineAtual.usuario_id,
      plano_id: plano.id,
      valor: Number(plano.preco) || 0,
      meses: 1,
      status: 'pendente',
      observacao: 'Solicitação de mensalidade da vitrine'
    });

    if (error) throw error;
    await carregarPagamentos(vitrineAtual.id);
  }

  async function solicitarVitrine() {
    if (!perfil || !planoMensal) return;
    if (!perfilVerificadoParaVitrine) {
      setMessage('Para criar lojinha, o documento precisa estar aprovado pelo administrador e a localização precisa estar validada por GPS preciso.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { data: vitrineId, error } = await supabase.rpc('criar_vitrine_usuario', { plano_uuid: planoMensal.id });
      if (error) throw error;
      const vitrineCriada = await carregarVitrine(String(vitrineId || ''));
      if (!vitrineCriada) throw new Error('A lojinha foi criada, mas não consegui carregá-la. Atualize a página.');
      setMessage('Lojinha criada. Agora gere o Pix para liberar a vitrine automaticamente após confirmação.');
    } catch (err) {
      setMessage(erroTexto(err, 'Erro ao solicitar vitrine.'));
    }

    setSaving(false);
  }

  async function solicitarPagamentoMensal() {
    if (!vitrine || !planoMensal) return;
    if (!perfilVerificadoParaVitrine) {
      setMessage('Antes de solicitar mensalidade, o documento precisa estar aprovado pelo administrador e o GPS precisa estar validado.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      if (pagamentoPendente) {
        setMessage('Já existe uma mensalidade pendente. Gere o Pix abaixo para pagar.');
      } else {
        await criarPagamento(vitrine, planoMensal);
        await supabase.from('vitrines').update({ assinatura_status: 'pendente_pagamento', updated_at: new Date().toISOString() }).eq('id', vitrine.id);
        setVitrine({ ...vitrine, assinatura_status: 'pendente_pagamento' });
        setMessage('Mensalidade criada. Gere o Pix abaixo para pagar.');
      }
    } catch (err) {
      setMessage(erroTexto(err, 'Erro ao solicitar mensalidade.'));
    }

    setSaving(false);
  }

  async function selecionarImagem(e: ChangeEvent<HTMLInputElement>, tipo: 'logo' | 'banner') {
    const file = e.target.files?.[0];
    if (!file || !vitrine) return;
    setUploading(tipo);
    setMessage(null);

    try {
      const url = await uploadVitrineImagem(file, vitrine.usuario_id, tipo);
      const campo = tipo === 'logo' ? 'foto_url' : 'banner_url';
      const { data, error } = await supabase.from('vitrines').update({ [campo]: url, updated_at: new Date().toISOString() }).eq('id', vitrine.id).select('*').single();
      if (error) throw error;
      setVitrine(data as Vitrine);
      setMessage(tipo === 'logo' ? 'Logo atualizada.' : 'Banner atualizado.');
    } catch (err) {
      setMessage(erroTexto(err, 'Erro ao enviar imagem.'));
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!vitrine) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      nome_vitrine: vitrine.nome_vitrine,
      slug: slugify(vitrine.slug || vitrine.nome_vitrine),
      descricao: vitrine.descricao,
      foto_url: vitrine.foto_url || null,
      banner_url: vitrine.banner_url || null,
      logo_object_fit: vitrine.logo_object_fit || 'cover',
      logo_object_position: vitrine.logo_object_position || 'center',
      banner_object_position: vitrine.banner_object_position || 'center',
      cidade: vitrine.cidade,
      estado: vitrine.estado,
      whatsapp: vitrine.whatsapp,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('vitrines').update(payload).eq('id', vitrine.id).select('*').single();
    if (error) setMessage(error.message);
    else {
      setVitrine(data as Vitrine);
      setMessage(vitrineLiberada(data as Vitrine) ? 'Vitrine salva.' : 'Vitrine salva. Ela continua aguardando pagamento/liberação para ficar pública.');
    }

    setSaving(false);
  }

  if (loading) return <div className="card">Carregando sua vitrine...</div>;

  const checklist = (
    <div className="card" style={{ background: perfilVerificadoParaVitrine ? '#f0fdf4' : '#fff7ed', border: perfilVerificadoParaVitrine ? '1px solid #bbf7d0' : '1px solid #fed7aa' }}>
      <span className="badge">{perfilVerificadoParaVitrine ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} Verificação obrigatória</span>
      <h3 style={{ marginBottom: 8 }}>Documento aprovado e localização da lojinha</h3>
      <p className="muted">Enviar uma foto qualquer não libera a lojinha. O documento fica em análise e precisa ser aprovado manualmente pelo administrador.</p>
      <p className="muted">Status atual: <strong>{documentoStatusTexto(perfil?.documento_status)}</strong></p>
      <div style={{ display: 'grid', gap: 8 }}>
        {requisitos.map((item) => (
          <div key={item.label} style={{ display: 'flex', gap: 8, alignItems: 'center', color: item.ok ? '#166534' : '#9a3412', fontWeight: 800 }}>
            {item.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {item.label}
          </div>
        ))}
      </div>
      {!perfilVerificadoParaVitrine && <Link className="btn btn-primary btn-full" href="/painel/perfil" style={{ marginTop: 14 }}><FileText size={18} /> Completar verificação do perfil</Link>}
    </div>
  );

  if (!vitrine) {
    return (
      <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
        {message && <div className="notice">{message}</div>}
        <span className="badge"><BadgeDollarSign size={14} /> Vitrine mensal</span>
        <h2>Ter uma lojinha no AgroMarket</h2>
        <p className="muted">Você pode anunciar normalmente sem lojinha. A vitrine é opcional e funciona como uma página própria do produtor, com banner, logo, produtos, avaliações e link para compartilhar.</p>
        {checklist}
        <div className="card" style={{ background: '#f8faf4' }}>
          <h3 style={{ marginTop: 0 }}>{planoMensal?.nome || 'Vitrine mensal'}</h3>
          <div className="price" style={{ fontSize: 32 }}>{formatMoney(planoMensal?.preco || 0)}<span className="muted" style={{ fontSize: 18 }}> / mês</span></div>
          <p>{planoMensal?.descricao || 'Lojinha pública mensal para divulgar seus produtos agro.'}</p>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Nome da loja diferente do nome do usuário.</li>
            <li>Banner, logo, descrição, cidade e WhatsApp.</li>
            <li>Produtos organizados dentro da lojinha.</li>
            <li>Avaliações com estrelas.</li>
            <li>Link público para compartilhar.</li>
          </ul>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="btn btn-primary btn-full" type="button" onClick={solicitarVitrine} disabled={saving || !planoMensal || !perfilVerificadoParaVitrine}>
            <Send size={18} /> {saving ? 'Criando lojinha...' : 'Criar lojinha e solicitar mensalidade'}
          </button>
          <Link className="btn btn-secondary btn-full" href="/anunciar">Anunciar sem vitrine</Link>
          <Link className="btn btn-secondary btn-full" href="/painel/perfil">Voltar ao perfil</Link>
        </div>
      </div>
    );
  }

  const linkPublico = `/vendedor/${vitrine.slug}`;
  const logoFit = vitrine.logo_object_fit || 'cover';
  const logoPosition = vitrine.logo_object_position || 'center';
  const bannerPosition = vitrine.banner_object_position || 'center';
  const aguardandoPagamento = !liberada;

  return (
    <div className="grid grid-2">
      <form className="form card" onSubmit={salvar}>
        {message && <div className="notice">{message}</div>}
        {checklist}

        <div className="card" style={{ background: aguardandoPagamento ? '#fff7ed' : '#f0fdf4', border: aguardandoPagamento ? '1px solid #fed7aa' : '1px solid #bbf7d0' }}>
          <span className="badge"><CalendarClock size={14} /> Mensalidade da vitrine</span>
          <h2 style={{ marginBottom: 6 }}>{statusLabel(vitrine.assinatura_status)}</h2>
          <p className="muted">Plano: {planoMensal?.nome || 'Vitrine mensal'} — {formatMoney(planoMensal?.preco || 0)} / mês</p>
          <p className="muted">Vencimento atual: <strong>{dataBR(vitrine.gratis_ate || vitrine.assinatura_vencimento)}</strong></p>

          {pagamentoPendente ? (
            <>
              <div className="notice">Mensalidade pendente de {formatMoney(pagamentoPendente.valor)}. Gere o Pix e, após o Asaas confirmar, a lojinha será liberada automaticamente.</div>
              <VitrinePagamentoPix pagamento={pagamentoPendente} onAtualizado={() => vitrine && carregarPagamentos(vitrine.id)} />
            </>
          ) : (
            <button className="btn btn-primary btn-full" type="button" onClick={solicitarPagamentoMensal} disabled={saving || !perfilVerificadoParaVitrine}>
              <BadgeDollarSign size={18} /> Gerar mensalidade
            </button>
          )}

          {pagamentoPago && <p className="muted">Último pagamento confirmado: {pagamentoPago.pago_em ? new Date(pagamentoPago.pago_em).toLocaleDateString('pt-BR') : '—'}</p>}
        </div>

        {aguardandoPagamento && <div className="notice">Você pode preparar a lojinha, mas ela só fica pública depois da confirmação automática do pagamento ou liberação do administrador.</div>}

        {liberada && (
          <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span className="badge"><Megaphone size={14} /> Patrocinado</span>
            <h3 style={{ marginBottom: 6 }}>Quer aparecer no topo da página inicial?</h3>
            <p className="muted">Assinantes de vitrine podem solicitar banner patrocinado. O banner fica em aprovação antes de aparecer no app.</p>
            <Link className="btn btn-primary btn-full" href="/painel/patrocinado"><Megaphone size={18} /> Contratar banner patrocinado</Link>
          </div>
        )}

        <div className="card" style={{ background: '#f8faf4' }}>
          <h3 style={{ marginTop: 0 }}>Imagens da vitrine</h3>
          <p className="muted">Logo recomendada: quadrada, 600 x 600 px. Banner recomendado: horizontal, 1200 x 500 px.</p>
          <div className="form-row">
            <div className="field">
              <span className="label">Logo da vitrine</span>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => selecionarImagem(e, 'logo')} />
              <button className="btn btn-secondary btn-full" type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading !== null}><ImagePlus size={18} /> {uploading === 'logo' ? 'Enviando logo...' : 'Selecionar logo'}</button>
              <div style={{ width: 118, height: 118, borderRadius: 28, background: '#eaf3e3', display: 'grid', placeItems: 'center', overflow: 'hidden', color: '#14532d', border: '1px solid #dfe8d9' }}>
                {vitrine.foto_url ? <img src={vitrine.foto_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: logoFit as any, objectPosition: logoPosition }} /> : <Store size={32} />}
              </div>
            </div>
            <div className="field">
              <span className="label">Banner da vitrine</span>
              <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => selecionarImagem(e, 'banner')} />
              <button className="btn btn-secondary btn-full" type="button" onClick={() => bannerInputRef.current?.click()} disabled={uploading !== null}><ImagePlus size={18} /> {uploading === 'banner' ? 'Enviando banner...' : 'Selecionar banner'}</button>
              <div style={{ height: 118, borderRadius: 22, background: vitrine.banner_url ? `url(${vitrine.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', border: '1px solid #dfe8d9' }} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 14 }}>
            <label className="field"><span className="label">Ajuste da logo</span><select className="select" value={logoFit} onChange={(e) => update('logo_object_fit', e.target.value as Vitrine['logo_object_fit'])}><option value="cover">Preencher espaço</option><option value="contain">Mostrar inteira</option></select></label>
            <label className="field"><span className="label">Parte da logo</span><select className="select" value={logoPosition} onChange={(e) => update('logo_object_position', e.target.value)}>{POSICOES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          </div>
          <label className="field" style={{ marginTop: 14 }}><span className="label">Parte do banner</span><select className="select" value={bannerPosition} onChange={(e) => update('banner_object_position', e.target.value)}>{POSICOES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
        </div>

        <label className="field"><span className="label">Nome da vitrine *</span><input className="input" value={vitrine.nome_vitrine} onChange={(e) => update('nome_vitrine', e.target.value)} placeholder="Ex: Chácara Flor da Dona Mariquinha" /></label>
        <label className="field"><span className="label">Link personalizado *</span><input className="input" value={vitrine.slug} onChange={(e) => update('slug', slugify(e.target.value))} placeholder="chacara-flor-da-dona-mariquinha" /><span className="muted">Seu link ficará assim: /vendedor/{vitrine.slug}</span></label>
        <label className="field"><span className="label">Descrição</span><textarea className="textarea" value={vitrine.descricao || ''} onChange={(e) => update('descricao', e.target.value)} placeholder="Conte o que você vende, onde atende e seus diferenciais." /></label>

        <div className="form-row">
          <label className="field"><span className="label">Estado</span><select className="select" value={vitrine.estado || ''} onChange={(e) => trocarEstado(e.target.value)}><option value="">Selecione o estado</option>{ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></label>
          <label className="field"><span className="label">Cidade</span><select className="select" value={vitrine.cidade || ''} onChange={(e) => update('cidade', e.target.value)} disabled={!vitrine.estado}><option value="">{vitrine.estado ? 'Selecione a cidade' : 'Escolha o estado primeiro'}</option>{cidades.map((nomeCidade) => <option key={nomeCidade} value={nomeCidade}>{nomeCidade}</option>)}</select></label>
        </div>

        <label className="field"><span className="label">WhatsApp da vitrine</span><input className="input" value={vitrine.whatsapp || ''} onChange={(e) => update('whatsapp', e.target.value)} placeholder={perfil?.whatsapp || '5563999999999'} /></label>

        <details className="card" style={{ background: '#f8faf4' }}>
          <summary style={{ fontWeight: 900, cursor: 'pointer' }}>Avançado: usar imagem por URL</summary>
          <div className="form" style={{ marginTop: 12 }}>
            <label className="field"><span className="label">URL da logo</span><input className="input" value={vitrine.foto_url || ''} onChange={(e) => update('foto_url', e.target.value)} placeholder="Opcional: cole o link de uma imagem" /></label>
            <label className="field"><span className="label">URL do banner</span><input className="input" value={vitrine.banner_url || ''} onChange={(e) => update('banner_url', e.target.value)} placeholder="Opcional: cole o link de um banner" /></label>
          </div>
        </details>

        <button className="btn btn-primary btn-full" disabled={saving || uploading !== null}>{saving ? 'Salvando...' : 'Salvar vitrine'}</button>
      </form>

      <aside className="card">
        <h2>Prévia da lojinha</h2>
        <p className="muted">A vitrine é uma lojinha pública mensal. Ela aparece para compradores quando estiver ativa.</p>
        <div style={{ display: 'grid', gap: 8, margin: '14px 0' }}>
          <span className="badge">Plano: Vitrine mensal</span>
          <span className="badge">Status: {statusLabel(vitrine.assinatura_status)}</span>
          <span className="badge">Vencimento: {dataBR(vitrine.gratis_ate || vitrine.assinatura_vencimento)}</span>
          <span className="badge">Documento: {documentoStatusTexto(perfil?.documento_status)}</span>
          <span className="badge">Verificação: {perfilVerificadoParaVitrine ? 'Perfil verificado' : 'Pendente'}</span>
        </div>
        <div className="card" style={{ background: '#f8faf4', padding: 0, overflow: 'hidden' }}>
          <div style={{ minHeight: 120, background: vitrine.banner_url ? `url(${vitrine.banner_url}) ${bannerPosition}/cover` : 'linear-gradient(135deg, #052e16, #166534)', padding: 14, display: 'flex', alignItems: 'end' }}>
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, color: '#14532d' }}>
              {vitrine.foto_url ? <img src={vitrine.foto_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: logoPosition, borderRadius: '50%' }} /> : <Store size={26} />}
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <strong>{vitrine.nome_vitrine}</strong>
            <p className="muted">{vitrine.cidade || 'Cidade'} - {vitrine.estado || 'UF'}</p>
            <p>{vitrine.descricao}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {liberada ? <Link className="btn btn-primary btn-full" href={linkPublico}>Abrir lojinha pública</Link> : <button className="btn btn-secondary btn-full" type="button" disabled>Disponível após confirmação do Pix</button>}
          {liberada && <Link className="btn btn-secondary btn-full" href="/painel/patrocinado"><Megaphone size={18} /> Contratar patrocinado</Link>}
          <Link className="btn btn-secondary btn-full" href="/anunciar">Anunciar sem vitrine</Link>
          <Link className="btn btn-secondary btn-full" href="/painel/perfil">Voltar ao perfil</Link>
        </div>
      </aside>
    </div>
  );
}

export default function MinhaVitrinePage() {
  return (
    <AuthGuard>
      <main className="page">
        <div className="container">
          <div className="section-head">
            <div>
              <h1>Minha vitrine</h1>
              <p>Configure sua lojinha pública. Para aparecer para compradores, a mensalidade precisa estar ativa ou liberada pelo administrador.</p>
            </div>
          </div>
          <MinhaVitrineContent />
        </div>
      </main>
    </AuthGuard>
  );
}
