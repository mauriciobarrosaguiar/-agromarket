'use client';

import { useEffect, useState } from 'react';
import { Copy, CreditCard, ExternalLink, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { VitrinePagamento } from '@/types';

type Props = {
  pagamento: VitrinePagamento;
  onAtualizado?: () => Promise<void> | void;
};

function formatMoney(value?: number | string | null) {
  const numero = typeof value === 'number' ? value : Number(value || 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataBR(value?: string | null) {
  if (!value) return '';
  const data = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);
  return data.toLocaleDateString('pt-BR');
}

export default function VitrinePagamentoPix({ pagamento, onAtualizado }: Props) {
  const [pagamentoAtual, setPagamentoAtual] = useState<VitrinePagamento>(pagamento);
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPagamentoAtual(pagamento);
  }, [pagamento]);

  const temPix = Boolean(pagamentoAtual.pix_qr_code_payload || pagamentoAtual.invoice_url || pagamentoAtual.checkout_url);
  const qrCodeSrc = pagamentoAtual.pix_qr_code_image ? `data:image/png;base64,${pagamentoAtual.pix_qr_code_image}` : '';
  const linkPagamento = pagamentoAtual.invoice_url || pagamentoAtual.checkout_url || '';

  async function gerarPix() {
    setLoading(true);
    setMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão expirada. Entre novamente para gerar o Pix.');

      const response = await fetch('/api/pagamentos/vitrine/asaas', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pagamento_id: pagamentoAtual.id, forma_pagamento: 'PIX' })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Erro ao gerar Pix.');

      setPagamentoAtual(data.pagamento as VitrinePagamento);
      setMessage('Pix gerado. Pague pelo QR Code ou Pix Copia e Cola.');
      await onAtualizado?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao gerar Pix.');
    }

    setLoading(false);
  }

  async function copiarPix() {
    if (!pagamentoAtual.pix_qr_code_payload) return;
    await navigator.clipboard.writeText(pagamentoAtual.pix_qr_code_payload);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2500);
  }

  async function atualizar() {
    setMessage('Atualizando status do pagamento...');
    await onAtualizado?.();
    setMessage('Status atualizado. Se o banco ainda não confirmou o Pix, aguarde alguns instantes.');
  }

  return (
    <div className="card" style={{ background: '#fff', marginTop: 12 }}>
      <span className="badge"><QrCode size={14} /> Pagamento Pix</span>
      <h3 style={{ marginBottom: 6 }}>Mensalidade pendente: {formatMoney(pagamentoAtual.valor)}</h3>
      <p className="muted">A lojinha só fica pública depois que o Asaas confirmar o pagamento no sistema.</p>

      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}

      {!temPix ? (
        <button className="btn btn-primary btn-full" type="button" onClick={gerarPix} disabled={loading}>
          <CreditCard size={18} /> {loading ? 'Gerando Pix...' : 'Gerar Pix agora'}
        </button>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {qrCodeSrc && (
            <div style={{ display: 'grid', placeItems: 'center', background: '#f8faf4', borderRadius: 18, padding: 12 }}>
              <img src={qrCodeSrc} alt="QR Code Pix" style={{ width: 220, maxWidth: '100%', borderRadius: 12 }} />
            </div>
          )}

          {pagamentoAtual.pix_qr_code_payload && (
            <label className="field">
              <span className="label">Pix Copia e Cola</span>
              <textarea className="textarea" value={pagamentoAtual.pix_qr_code_payload} readOnly style={{ minHeight: 96, fontSize: 13 }} />
              <button className="btn btn-primary btn-full" type="button" onClick={copiarPix}>
                <Copy size={18} /> {copiado ? 'Copiado' : 'Copiar Pix'}
              </button>
            </label>
          )}

          {pagamentoAtual.pix_expiration_date && <p className="muted">Validade do Pix: {dataBR(pagamentoAtual.pix_expiration_date)}</p>}

          {linkPagamento && (
            <a className="btn btn-secondary btn-full" href={linkPagamento} target="_blank" rel="noreferrer">
              <ExternalLink size={18} /> Abrir cobrança no Asaas
            </a>
          )}

          <button className="btn btn-secondary btn-full" type="button" onClick={atualizar}>Já paguei, atualizar status</button>
        </div>
      )}
    </div>
  );
}
