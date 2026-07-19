import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SubscriptionPayload = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function bearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

function subscriptionValida(payload: SubscriptionPayload) {
  return (
    typeof payload.endpoint === 'string' &&
    payload.endpoint.length > 20 &&
    typeof payload.keys?.p256dh === 'string' &&
    payload.keys.p256dh.length > 10 &&
    typeof payload.keys?.auth === 'string' &&
    payload.keys.auth.length > 5
  );
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonError('Configuração do servidor incompleta para salvar alertas push.', 503);
  }

  const token = bearerToken(request);
  if (!token) {
    return jsonError('Acesso não autenticado.', 401);
  }

  const payload = (await request.json().catch(() => null)) as SubscriptionPayload | null;
  if (!payload || !subscriptionValida(payload)) {
    return jsonError('Inscrição push inválida.', 400);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonError('Sessão inválida. Entre novamente.', 401);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: perfil, error: perfilError } = await adminClient
    .from('usuarios')
    .select('id, tipo_usuario, status')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (perfilError) {
    return jsonError(perfilError.message, 500);
  }

  if (perfil?.tipo_usuario !== 'admin' || perfil.status !== 'ativo') {
    return jsonError('Somente administradores ativos podem registrar alertas push de admin.', 403);
  }

  const agora = new Date().toISOString();
  const { error } = await adminClient
    .from('push_subscriptions')
    .upsert({
      user_id: userData.user.id,
      endpoint: payload.endpoint,
      p256dh: payload.keys?.p256dh,
      auth: payload.keys?.auth,
      user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
      ativo: true,
      last_seen_at: agora,
      updated_at: agora
    }, { onConflict: 'endpoint' });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
