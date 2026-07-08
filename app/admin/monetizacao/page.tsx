'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, DollarSign, Save, Settings2, ShieldCheck } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import type { AmbientePagamento, MonetizacaoPlano, PagamentoConfiguracao, TipoPlanoMonetizacao } from '@/types';

function moneyInput(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2).replace('.', ',');
}

function parseMoney(value: string) {
  const n = Number(value.replace(/[^\d,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function AdminMonetizacaoContent() {
  const [planos, setPlanos] = useState<MonetizacaoPlano[]>([]);
  const [configs, setConfigs] = useState<PagamentoConfiguracao[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: planosData }, { data: configsData }] = await Promise.all([
      supabase.from('monetizacao_planos').select('*').order('ordem'),
      supabase.from('pagamento_configuracoes').select('*').order('provedor')
    ]);
    setPlanos((planosData || []) as MonetizacaoPlano[]);
    setConfigs((configsData || []) as PagamentoConfiguracao[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function atualizarPlano(id: string, patch: Partial<MonetizacaoPlano>) {
    setPlanos((prev) => prev.map((plano) => plano.id === id ? { ...plano, ...patch } : plano));
  }

  function atualizarConfig(id: string, patch: Partial<PagamentoConfiguracao>) {
    setConfigs((prev) => prev.map((config) => config.id === id ? { ...config, ...patch } : config));
  }

  async function salvarPlano(plano: MonetizacaoPlano) {
    setSaving(plano.id);
    setMessage(null);

    const { error } = await supabase.from('monetizacao_planos').update({
      nome: plano.nome,
      tipo: plano.tipo,
      dias: plano.dias || null,
      preco: Number(plano.preco) || 0,
      descricao: plano.descricao || null,
      ativo: plano.ativo,
      ordem: plano.ordem || 0,
      updated_at: new Date().toISOString()
    }).eq('id', plano.id);

    if (error) setMessage(error.message);
    else setMessage('Plano salvo com sucesso.');

    setSaving(null);
    await load();
  }

  async function criarPlano() {
    setMessage(null);
    const ordem = planos.length + 1;
    const { error } = await supabase.from('monetizacao_planos').insert({
      codigo: `plano_${Date.now()}`,
      nome: 'Novo plano',
      tipo: 'destaque',
      dias: 7,
      preco: 0,
      descricao: 'Descreva o benefício do plano.',
      ativo: true,
      ordem
    });

    if (error) setMessage(error.message);
    else setMessage('Novo plano criado.');

    await load();
  }

  async function salvarConfig(config: PagamentoConfiguracao) {
    setSaving(config.id);
    setMessage(null);

    const { error } = await supabase.from('pagamento_configuracoes').update({
      ativo: config.ativo,
      ambiente: config.ambiente,
      pix_chave: config.pix_chave || null,
      webhook_url: config.webhook_url || null,
      credenciais_configuradas: config.credenciais_configuradas,
      observacao: config.observacao || null,
      updated_at: new Date().toISOString()
    }).eq('id', config.id);

    if (error) setMessage(error.message);
    else setMessage(`${config.nome_exibicao} salvo com sucesso.`);

    setSaving(null);
    await load();
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <span className="badge"><DollarSign size={14} /> Admin comercial</span>
          <h1>Planos, preços e pagamentos</h1>
          <p>Edite valores de destaque, vitrine e deixe Asaas/Efí preparados para cobrança.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Voltar admin</Link>
      </div>

      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}

      {loading ? <div className="card">Carregando monetização...</div> : (
        <>
          <section className="card" style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ marginTop: 0 }}>Planos e preços</h2>
                <p className="muted" style={{ marginBottom: 0 }}>Esses valores aparecem na página de planos e servem para cobrança manual/automática.</p>
              </div>
              <button className="btn btn-primary" type="button" onClick={criarPlano}>Criar plano</button>
            </div>
          </section>

          <div className="grid grid-2">
            {planos.map((plano) => (
              <article className="card" key={plano.id}>
                <span className="badge">{plano.tipo}</span>
                <label className="field">
                  <span className="label">Nome do plano</span>
                  <input className="input" value={plano.nome} onChange={(e) => atualizarPlano(plano.id, { nome: e.target.value })} />
                </label>

                <div className="form-row">
                  <label className="field">
                    <span className="label">Tipo</span>
                    <select className="select" value={plano.tipo} onChange={(e) => atualizarPlano(plano.id, { tipo: e.target.value as TipoPlanoMonetizacao })}>
                      <option value="destaque">Destaque</option>
                      <option value="vitrine">Vitrine</option>
                      <option value="assinatura">Assinatura</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="label">Dias</span>
                    <input className="input" inputMode="numeric" value={plano.dias || ''} onChange={(e) => atualizarPlano(plano.id, { dias: Number(e.target.value) || null })} placeholder="Ex: 7" />
                  </label>
                </div>

                <div className="form-row">
                  <label className="field">
                    <span className="label">Preço</span>
                    <input className="input" inputMode="decimal" value={moneyInput(plano.preco)} onChange={(e) => atualizarPlano(plano.id, { preco: parseMoney(e.target.value) })} placeholder="Ex: 9,90" />
                  </label>
                  <label className="field">
                    <span className="label">Ordem</span>
                    <input className="input" inputMode="numeric" value={plano.ordem || 0} onChange={(e) => atualizarPlano(plano.id, { ordem: Number(e.target.value) || 0 })} />
                  </label>
                </div>

                <label className="field">
                  <span className="label">Descrição</span>
                  <textarea className="textarea" value={plano.descricao || ''} onChange={(e) => atualizarPlano(plano.id, { descricao: e.target.value })} />
                </label>

                <label className="checkbox-row"><input type="checkbox" checked={plano.ativo} onChange={(e) => atualizarPlano(plano.id, { ativo: e.target.checked })} /> Plano ativo</label>
                <button className="btn btn-primary btn-full" type="button" disabled={saving === plano.id} onClick={() => salvarPlano(plano)}><Save size={18} /> Salvar plano</button>
              </article>
            ))}
          </div>

          <section className="section">
            <div className="section-head">
              <div>
                <h2>Recebimento e gateways</h2>
                <p>Deixe Asaas/Efí prontos. As credenciais sensíveis devem ficar no ambiente seguro da Vercel.</p>
              </div>
            </div>

            <div className="grid grid-2">
              {configs.map((config) => (
                <article className="card" key={config.id}>
                  <span className="badge"><CreditCard size={14} /> {config.nome_exibicao}</span>
                  <h3>{config.nome_exibicao}</h3>

                  <div className="notice">
                    <strong>Segurança:</strong> não digite token secreto em tela pública do app. Configure as chaves sensíveis nas variáveis da Vercel. Aqui controlamos status, PIX e webhook.
                  </div>

                  <div className="form-row">
                    <label className="field">
                      <span className="label">Ambiente</span>
                      <select className="select" value={config.ambiente} onChange={(e) => atualizarConfig(config.id, { ambiente: e.target.value as AmbientePagamento })}>
                        <option value="sandbox">Sandbox/teste</option>
                        <option value="producao">Produção</option>
                      </select>
                    </label>
                    <label className="field" style={{ justifyContent: 'end' }}>
                      <span className="checkbox-row"><input type="checkbox" checked={config.ativo} onChange={(e) => atualizarConfig(config.id, { ativo: e.target.checked })} /> Gateway ativo</span>
                    </label>
                  </div>

                  <label className="field">
                    <span className="label">Chave PIX para recebimento</span>
                    <input className="input" value={config.pix_chave || ''} onChange={(e) => atualizarConfig(config.id, { pix_chave: e.target.value })} placeholder="CPF/CNPJ/e-mail/telefone/chave aleatória" />
                  </label>

                  <label className="field">
                    <span className="label">Webhook URL</span>
                    <input className="input" value={config.webhook_url || ''} onChange={(e) => atualizarConfig(config.id, { webhook_url: e.target.value })} placeholder="https://seu-dominio.com/api/webhooks/..." />
                  </label>

                  <label className="checkbox-row"><input type="checkbox" checked={config.credenciais_configuradas} onChange={(e) => atualizarConfig(config.id, { credenciais_configuradas: e.target.checked })} /> Credenciais já configuradas na Vercel</label>

                  <label className="field">
                    <span className="label">Observação interna</span>
                    <textarea className="textarea" value={config.observacao || ''} onChange={(e) => atualizarConfig(config.id, { observacao: e.target.value })} />
                  </label>

                  <div className="card" style={{ background: '#f8faf4' }}>
                    <strong><Settings2 size={16} /> Variáveis sugeridas</strong>
                    <p className="muted" style={{ marginBottom: 0 }}>
                      {config.provedor === 'asaas'
                        ? 'ASAAS_ACCESS_TOKEN, ASAAS_ENVIRONMENT, ASAAS_WEBHOOK_TOKEN'
                        : 'EFI_CLIENT_ID, EFI_CLIENT_SECRET, EFI_CERTIFICATE_BASE64, EFI_PIX_KEY'}
                    </p>
                  </div>

                  <button className="btn btn-primary btn-full" type="button" disabled={saving === config.id} onClick={() => salvarConfig(config)}><ShieldCheck size={18} /> Salvar configuração</button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function AdminMonetizacaoPage() {
  return <AuthGuard adminOnly><main className="page"><div className="container"><AdminMonetizacaoContent /></div></main></AuthGuard>;
}
