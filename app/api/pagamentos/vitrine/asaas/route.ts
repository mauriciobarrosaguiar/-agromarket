import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { asaasRequest, type AsaasCustomer, type AsaasPayment, type AsaasPixQrCode } from '@/lib/asaas';

export const dynamic = 'force-dynamic';

type VitrinePagamentoRow = {
  id: string;
  usuario_id: string;
  vitrine_id: string;
  plano_id: string | null;
  valor: number;
  meses: number;
  status: string;
  referencia_externa?: string | null;
  checkout_url?: string | null;
  invoice_url?: string | null;
  pix_qr_code_payload?: string | null;
  pix_qr_code_image?: string | null;
  pix_expiration_date?: string | null;
};

type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  whatsapp?: string | null;
  cpf?: string | null;
  asaas_customer_id?: string | null;
};

function onlyNumbers(value?: string | null) {
  return String(value || '').replace(/\D/g, '');
}

function dataVencimento(dias = 2) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

function statusCode(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error || '');
  if (msg.includes('ASAAS_ACCESS_TOKEN')) return 500;
  return 400;
}

async function obterOuCriarClienteAsaas(perfil: UsuarioRow) {
  if (perfil.asaas_customer_id) return perfil.asaas_customer_id;

  const cpfCnpj = onlyNumbers(perfil.cpf);
  if (!cpfCnpj) throw new Error('CPF/CNPJ obrigatório para gerar cobrança no Asaas.');

  const busca = await asaasRequest<{ data?: AsaasCustomer[] }>(`/customers?cpfCnpj=${cpfCnpj}`);
  const existente = busca.data?.[0]?.id;
  if (existente) return existente;

  const cliente = await asaasRequest<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: perfil.nome,
      cpfCnpj,
      email: perfil.email,
      mobilePhone: onlyNumbers(perfil.whatsapp),
      externalReference: `agromarket_usuario_${perfil.id}`,
      notificationDisabled: false,
      groupName: 'AgroMarket'
    })
  });

  return cliente.id;
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authorization = request.headers.get('authorization') || '';

    if (!supabaseUrl || !supabaseAnon) throw new Error('Supabase não configurado na Vercel.');
    if (!authorization) throw new Error('Sessão expirada. Entre novamente para gerar o Pix.');

    const body = await request.json();
    const pagamentoId = String(body?.pagamento_id || '');
    const formaPagamento = body?.forma_pagamento === 'UNDEFINED' ? 'UNDEFINED' : 'PIX';

    if (!pagamentoId) throw new Error('Pagamento não informado.');

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Sessão inválida. Entre novamente.');

    const { data: pagamento, error: pagamentoError } = await supabase
      .from('vitrine_pagamentos')
      .select('*')
      .eq('id', pagamentoId)
      .eq('usuario_id', userData.user.id)
      .maybeSingle();

    if (pagamentoError) throw pagamentoError;
    if (!pagamento) throw new Error('Pagamento não encontrado.');

    const pagamentoAtual = pagamento as VitrinePagamentoRow;
    if (pagamentoAtual.status === 'pago') throw new Error('Este pagamento já foi confirmado.');

    if (pagamentoAtual.referencia_externa && (pagamentoAtual.pix_qr_code_payload || pagamentoAtual.invoice_url || pagamentoAtual.checkout_url)) {
      return NextResponse.json({ ok: true, pagamento: pagamentoAtual, reutilizado: true });
    }

    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios')
      .select('id,nome,email,whatsapp,cpf,asaas_customer_id')
      .eq('id', userData.user.id)
      .single();

    if (perfilError) throw perfilError;
    if (!perfil) throw new Error('Perfil não encontrado.');

    const clienteId = await obterOuCriarClienteAsaas(perfil as UsuarioRow);
    const vencimento = dataVencimento(2);
    const valor = Number(pagamentoAtual.valor || 0);

    if (!valor || valor <= 0) throw new Error('Valor inválido para gerar cobrança.');

    const cobranca = await asaasRequest<AsaasPayment>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: clienteId,
        billingType: formaPagamento,
        value: valor,
        dueDate: vencimento,
        description: 'Mensalidade da vitrine AgroMarket',
        externalReference: pagamentoAtual.id
      })
    });

    let pix: AsaasPixQrCode | null = null;
    if (formaPagamento === 'PIX' || formaPagamento === 'UNDEFINED') {
      pix = await asaasRequest<AsaasPixQrCode>(`/payments/${cobranca.id}/pixQrCode`, { method: 'GET' });
    }

    const { error: rpcError } = await supabase.rpc('registrar_cobranca_vitrine_asaas', {
      p_pagamento_id: pagamentoAtual.id,
      p_asaas_customer_id: clienteId,
      p_referencia_externa: cobranca.id,
      p_forma_pagamento: formaPagamento,
      p_checkout_url: cobranca.invoiceUrl || cobranca.bankSlipUrl || null,
      p_invoice_url: cobranca.invoiceUrl || null,
      p_pix_payload: pix?.payload || null,
      p_pix_image: pix?.encodedImage || null,
      p_pix_expiration_date: pix?.expirationDate || null,
      p_vencimento: vencimento,
      p_asaas_status: cobranca.status || null,
      p_asaas_payload: cobranca as Record<string, unknown>
    });

    if (rpcError) throw rpcError;

    return NextResponse.json({
      ok: true,
      pagamento: {
        ...pagamentoAtual,
        provedor: 'asaas',
        forma_pagamento: formaPagamento,
        referencia_externa: cobranca.id,
        checkout_url: cobranca.invoiceUrl || cobranca.bankSlipUrl || null,
        invoice_url: cobranca.invoiceUrl || null,
        pix_qr_code_payload: pix?.payload || null,
        pix_qr_code_image: pix?.encodedImage || null,
        pix_expiration_date: pix?.expirationDate || null,
        vencimento_gerado: vencimento,
        asaas_status: cobranca.status || null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar Pix.';
    return NextResponse.json({ ok: false, error: message }, { status: statusCode(error) });
  }
}
