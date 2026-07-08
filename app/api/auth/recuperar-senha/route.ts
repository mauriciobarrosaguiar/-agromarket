import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function onlyNumbers(value: string) {
  return value.replace(/\D/g, '');
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://agromarket-two.vercel.app').replace(/\/$/, '');
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function getSupabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identificador = String(body?.identificador || '').trim();

    if (!identificador) {
      return NextResponse.json({ ok: false, message: 'Informe seu e-mail ou CPF.' }, { status: 400 });
    }

    const isEmail = identificador.includes('@');
    const tipo = isEmail ? 'email' : 'cpf';
    const cpf = onlyNumbers(identificador);
    const admin = getSupabaseAdmin();
    const publicClient = getSupabasePublic();
    let emailParaReset = isEmail ? identificador.toLowerCase() : '';
    let observacao = 'Solicitação recebida.';

    if (!isEmail) {
      if (cpf.length !== 11) {
        return NextResponse.json({ ok: false, message: 'Informe um CPF válido com 11 números.' }, { status: 400 });
      }

      if (!admin) {
        return NextResponse.json({ ok: true, message: 'Se o CPF estiver cadastrado, enviaremos as instruções de recuperação. Caso não receba, tente recuperar pelo e-mail cadastrado.' });
      }

      const { data: usuario } = await admin
        .from('usuarios')
        .select('email')
        .eq('cpf', cpf)
        .maybeSingle();

      emailParaReset = usuario?.email || '';
    }

    const client = admin || publicClient;

    if (emailParaReset && client) {
      const { error } = await client.auth.resetPasswordForEmail(emailParaReset, {
        redirectTo: `${getSiteUrl()}/redefinir-senha`
      });
      observacao = error ? `Falha ao solicitar reset: ${error.message}` : 'E-mail de recuperação solicitado.';
    }

    if (admin) {
      await admin.from('solicitacoes_recuperacao_senha').insert({
        identificador: isEmail ? identificador.toLowerCase() : cpf,
        tipo,
        status: emailParaReset ? 'enviado' : 'solicitado',
        observacao,
        ip: request.headers.get('x-forwarded-for') || null,
        user_agent: request.headers.get('user-agent') || null
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'Se os dados estiverem cadastrados, enviaremos um e-mail com o link para trocar a senha. Confira também o spam.'
    });
  } catch {
    return NextResponse.json({ ok: false, message: 'Não foi possível solicitar recuperação agora.' }, { status: 500 });
  }
}
