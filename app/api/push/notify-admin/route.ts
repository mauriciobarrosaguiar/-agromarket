import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';
import type { PushSubscription } from 'web-push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:suporte@meuagromarket.com.br';
const webhookSecret = process.env.ADMIN_PUSH_WEBHOOK_SECRET;

type NotifyPayload = {
  tipo?: string;
  kind?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  table?: string;
  record_id?: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status });
}

function bearerToken(request: NextRequest) {
  return (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
}

function webhookAutorizado(request: NextRequest) {
  if (!webhookSecret) return false;
  const secretHeader = request.headers.get('x-agromarket-push-secret') || request.headers.get('x-agromarket-secret') || '';
  return secretHeader === webhookSecret || bearerToken(request) === webhookSecret;
}

async function adminAutorizadoPorToken(request: NextRequest, adminClient: SupabaseClient) {
  const token = bearerToken(request);
  if (!token) return false;

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userData.user) return false;

  const { data: perfil } = await adminClient
    .from('usuarios')
    .select('tipo_usuario, status')
    .eq('id', userData.user.id)
    .maybeSingle();

  return perfil?.tipo_usuario === 'admin' && perfil.status === 'ativo';
}

function texto(value: unknown, fallback: string, max = 180) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return fallback;
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function tipoEvento(payload: NotifyPayload) {
  return payload.tipo || payload.kind || 'pendencia';
}

function tituloPadrao(tipo: string) {
  if (tipo === 'vitrine_pendente') return 'Nova lojinha aguardando liberação';
  if (tipo === 'pagamento_vitrine_pendente' || tipo === 'pagamento_vitrine') return 'Pagamento de vitrine pendente';
  if (tipo === 'patrocinado_pendente') return 'Patrocinado aguardando análise';
  if (tipo === 'documento_pendente') return 'Documento aguardando conferência';
  if (tipo === 'denuncia_aberta') return 'Nova denúncia aberta';
  if (tipo === 'destaque_pendente') return 'Destaque aguardando aprovação';
  return 'Novo anúncio para aprovar';
}

function urlPadrao(tipo: string) {
  if (tipo === 'vitrine_pendente' || tipo === 'pagamento_vitrine_pendente' || tipo === 'pagamento_vitrine') return '/admin/vitrines';
  if (tipo === 'patrocinado_pendente') return '/admin/patrocinados';
  if (tipo === 'documento_pendente') return '/admin/documentos';
  if (tipo === 'denuncia_aberta') return '/admin/denuncias';
  if (tipo === 'destaque_pendente') return '/admin/destaques';
  return '/admin/pendentes';
}

function destinoSeguro(url: string) {
  try {
    const parsed = new URL(url, 'https://www.meuagromarket.com.br');
    if (!['www.meuagromarket.com.br', 'meuagromarket.com.br', 'agromarket-two.vercel.app'].includes(parsed.hostname)) {
      return '/painel';
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/painel';
  } catch {
    return '/painel';
  }
}

function toPushSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth
    }
  };
}

function statusCodeFromError(error: unknown) {
  if (typeof error === 'object' && error && 'statusCode' in error) {
    const value = Number((error as { statusCode?: unknown }).statusCode);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ ok: false, skipped: true, reason: 'missing_supabase_config', sent: 0, failed: 0 });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const autorizado = webhookAutorizado(request) || await adminAutorizadoPorToken(request, adminClient);
  if (!autorizado) {
    return json({ ok: false, error: 'Chamada não autorizada.' }, 401);
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return json({ ok: false, skipped: true, reason: 'missing_vapid_config', sent: 0, failed: 0 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const payload = (await request.json().catch(() => ({}))) as NotifyPayload;
  const tipo = tipoEvento(payload);
  const title = texto(payload.title, tituloPadrao(tipo), 90);
  const body = texto(payload.body, 'Existe uma nova solicitação aguardando análise do administrador.', 180);
  const url = destinoSeguro(payload.url || urlPadrao(tipo));
  const tag = texto(payload.tag, `agromarket-admin-${tipo}`, 64);

  const { data: admins, error: adminsError } = await adminClient
    .from('usuarios')
    .select('id')
    .eq('tipo_usuario', 'admin')
    .eq('status', 'ativo');

  if (adminsError) {
    return json({ ok: false, error: adminsError.message, sent: 0, failed: 0 }, 500);
  }

  const adminIds = (admins || []).map((admin) => admin.id).filter(Boolean);
  if (!adminIds.length) {
    return json({ ok: true, sent: 0, failed: 0, disabled: 0, reason: 'no_active_admins' });
  }

  const { data: subscriptions, error: subscriptionsError } = await adminClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('ativo', true)
    .in('user_id', adminIds);

  if (subscriptionsError) {
    return json({ ok: false, error: subscriptionsError.message, sent: 0, failed: 0 }, 500);
  }

  const rows = (subscriptions || []) as PushSubscriptionRow[];
  if (!rows.length) {
    return json({ ok: true, sent: 0, failed: 0, disabled: 0, reason: 'no_active_subscriptions' });
  }

  const notificationPayload = JSON.stringify({
    title,
    body,
    url,
    tag,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      tipo,
      table: payload.table || null,
      record_id: payload.record_id || null
    }
  });

  let sent = 0;
  let failed = 0;
  let disabled = 0;

  await Promise.all(rows.map(async (row) => {
    try {
      await webpush.sendNotification(toPushSubscription(row), notificationPayload);
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = statusCodeFromError(error);
      if (statusCode === 404 || statusCode === 410) {
        disabled += 1;
        await adminClient
          .from('push_subscriptions')
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq('id', row.id);
      }
    }
  }));

  return json({ ok: true, sent, failed, disabled, total: rows.length });
}
