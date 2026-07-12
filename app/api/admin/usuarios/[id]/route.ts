import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return jsonError('Configuração do servidor incompleta para exclusão de usuário.', 500);
  }

  if (!id) {
    return jsonError('Usuário não informado.', 400);
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return jsonError('Acesso não autenticado.', 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: sessionUser, error: sessionError } = await userClient.auth.getUser(token);

  if (sessionError || !sessionUser.user) {
    return jsonError('Sessão inválida. Entre novamente.', 401);
  }

  if (sessionUser.user.id === id) {
    return jsonError('Por segurança, você não pode excluir seu próprio usuário logado.', 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: adminProfile, error: adminError } = await adminClient
    .from('usuarios')
    .select('id, tipo_usuario, status')
    .eq('id', sessionUser.user.id)
    .maybeSingle();

  if (adminError || adminProfile?.tipo_usuario !== 'admin') {
    return jsonError('Acesso permitido somente para administrador.', 403);
  }

  const { data: targetUser, error: targetError } = await adminClient
    .from('usuarios')
    .select('id, nome, email, tipo_usuario')
    .eq('id', id)
    .maybeSingle();

  if (targetError) {
    return jsonError(targetError.message, 500);
  }

  if (!targetUser) {
    const { error: authDeleteMissingProfileError } = await adminClient.auth.admin.deleteUser(id);
    if (authDeleteMissingProfileError && !authDeleteMissingProfileError.message.toLowerCase().includes('not found')) {
      return jsonError(authDeleteMissingProfileError.message, 500);
    }
    return NextResponse.json({ ok: true, message: 'Usuário removido do Auth. Perfil já não existia.' });
  }

  const referenciasParaLimpar = [
    adminClient.from('backup_logs').update({ admin_id: null }).eq('admin_id', id),
    adminClient.from('destaque_solicitacoes').update({ admin_id: null }).eq('admin_id', id),
    adminClient.from('patrocinados_home').update({ admin_id: null }).eq('admin_id', id),
    adminClient.from('vitrine_pagamentos').update({ admin_id: null }).eq('admin_id', id)
  ];

  const resultadosLimpeza = await Promise.all(referenciasParaLimpar);
  const erroLimpeza = resultadosLimpeza.find((resultado) => resultado.error)?.error;

  if (erroLimpeza) {
    return jsonError(`Não foi possível limpar referências do usuário: ${erroLimpeza.message}`, 500);
  }

  const { error: profileDeleteError } = await adminClient
    .from('usuarios')
    .delete()
    .eq('id', id);

  if (profileDeleteError) {
    return jsonError(profileDeleteError.message, 500);
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(id);

  if (authDeleteError && !authDeleteError.message.toLowerCase().includes('not found')) {
    return NextResponse.json({
      ok: true,
      warning: `Perfil excluído, mas o usuário no Auth não foi removido automaticamente: ${authDeleteError.message}`
    });
  }

  return NextResponse.json({ ok: true, message: `Usuário ${targetUser.email || targetUser.nome || id} excluído.` });
}
