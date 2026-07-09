import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type AsaasWebhookPayload = {
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    externalReference?: string;
  };
};

function tokenRecebido(request: Request) {
  return request.headers.get('asaas-access-token')
    || request.headers.get('x-asaas-webhook-token')
    || request.headers.get('access_token')
    || '';
}

export async function POST(request: Request) {
  try {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    const recebido = tokenRecebido(request);

    if (webhookToken && recebido !== webhookToken) {
      return NextResponse.json({ ok: false, error: 'Token inválido.' }, { status: 401 });
    }

    const payload = (await request.json()) as AsaasWebhookPayload;
    const payment = payload.payment || {};
    const referencia = payment.id || '';
    const status = payment.status || '';
    const evento = payload.event || '';

    if (!referencia) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'Sem payment.id.' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnon) {
      throw new Error('Supabase não configurado na Vercel.');
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error } = await supabase.rpc('processar_webhook_asaas_vitrine', {
      p_referencia_externa: referencia,
      p_asaas_status: status,
      p_evento: evento,
      p_payload: payload as Record<string, unknown>
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro no webhook Asaas.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'asaas-webhook-agromarket' });
}
