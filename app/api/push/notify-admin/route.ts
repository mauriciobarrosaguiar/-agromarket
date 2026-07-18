import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

type NotifyBody = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  kind?: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

function webhookAutorizado(request: Request) {
  const secret = process.env.ADMIN_PUSH_WEBHOOK_SECRET;
  if (!secret) return false;
  return request.headers.get('x-agromarket-secret') === secret;
}

async function validarChamada(request: Request, supabase: ReturnType<typeof createClient>) {
  if (webhookAutorizado(request)) return true;

  const token = getBearerToken(request);
  if (!token) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  return Boolean(!userError && userData.user);
}

function configurarWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto = process.env.VAPID_SUBJECT || 'mailto:suporte@meuagromarket.com.br';

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(mailto, publicKey, privateKey);
  return true;
}

function tituloPadrao(kind?: string) {
  if (kind === 'vitrine_pendente') return 'Nova lojinha solicitada';
  if (kind === 'pagamento_vitrine') return 'Nova mensalidade de lojinha';
  if (kind === 'patrocinado_pendente') return 'Novo patrocinado para aprovar';
  if (kind === 'documento_pendente') return 'Novo documento para conferir';
  return 'Novo anúncio para aprovar';
}

function urlPadrao(kind?: string) {
  if (kind === 'vitrine_pendente' || kind === 'pagamento_vitrine') return '/admin/vitrines';
  if (kind === 'patrocinado_pendente') return '/admin/patrocinados';
  if (kind === 'documento_pendente') return '/admin/usuarios';
  return '/admin/pendentes';
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase service role não configurado.' }, { status: 500 });
  }

  const autorizado = await validarChamada(request, supabase);
  if (!autorizado) return NextResponse.json({ ok: false, error: 'Chamada não autorizada.' }, { status: 401 });

  if (!configurarWebPush()) {
    return NextResponse.json({ ok: true, disabled: true, message: 'VAPID não configurado.' });
  }

  const body = (await request.json().catch(() => ({}))) as NotifyBody;
  const payload = JSON.stringify({
    title: body.title || 'AgroMarket',
    body: body.body || tituloPadrao(body.kind),
    url: body.url || urlPadrao(body.kind),
    tag: body.tag || body.kind || 'agromarket-admin-pending'
  });

  const { data: admins } = await supabase
    .from('usuarios')
    .select('id')
    .eq('tipo_usuario', 'admin')
    .eq('status', 'ativo');

  const adminIds = (admins || []).map((item: { id: string }) => item.id);
  if (!adminIds.length) return NextResponse.json({ ok: true, sent: 0 });

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth')
    .eq('ativo', true)
    .in('user_id', adminIds);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (subscriptions || []) as PushSubscriptionRow[];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          payload
        );
        sent += 1;
      } catch (err: any) {
        failed += 1;
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .update({ ativo: false, updated_at: new Date().toISOString() })
            .eq('id', sub.id);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, sent, failed });
}
