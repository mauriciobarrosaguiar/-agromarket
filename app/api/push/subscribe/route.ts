import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
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

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Push não configurado no servidor.' }, { status: 500 });
  }

  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ ok: false, error: 'Sessão ausente.' }, { status: 401 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('usuarios')
    .select('tipo_usuario')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (perfil?.tipo_usuario !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Apenas administradores podem ativar push.' }, { status: 403 });
  }

  const body = (await request.json()) as PushSubscriptionBody;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ ok: false, error: 'Inscrição push inválida.' }, { status: 400 });
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userData.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: request.headers.get('user-agent') || null,
      ativo: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'endpoint' }
  );

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
