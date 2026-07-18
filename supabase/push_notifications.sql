-- Execute este SQL no Supabase antes de ativar push em produção.
-- Ele cria a tabela que guarda os celulares/navegadores dos administradores que aceitaram notificações.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  ativo boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_ativo_idx on public.push_subscriptions(ativo);

alter table public.push_subscriptions enable row level security;

-- O app usa a SUPABASE_SERVICE_ROLE_KEY nas rotas /api/push/* para inserir e disparar.
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions
  for delete
  using (auth.uid() = user_id);

-- ============================================================
-- WEBHOOKS AUTOMÁTICOS PELO BANCO
-- ============================================================
-- 1) Ative a extensão pg_net no Supabase:
create extension if not exists pg_net with schema extensions;

-- 2) Antes de rodar, troque estes dois valores:
--    https://www.meuagromarket.com.br/api/push/notify-admin
--    TROQUE_ESTE_SEGREDO_PELO_MESMO_ADMIN_PUSH_WEBHOOK_SECRET_DA_VERCEL
--
-- 3) Na Vercel, crie a variável ADMIN_PUSH_WEBHOOK_SECRET com o mesmo segredo.

create or replace function public.notificar_admin_push(payload jsonb)
returns void
language plpgsql
security definer
as $$
begin
  perform extensions.net.http_post(
    url := 'https://www.meuagromarket.com.br/api/push/notify-admin',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agromarket-secret', 'TROQUE_ESTE_SEGREDO_PELO_MESMO_ADMIN_PUSH_WEBHOOK_SECRET_DA_VERCEL'
    ),
    body := payload,
    timeout_milliseconds := 5000
  );
exception when others then
  -- Não bloqueia criação de anúncio/lojinha se o push falhar.
  null;
end;
$$;

create or replace function public.trg_push_anuncio_pendente()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'pendente' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.notificar_admin_push(jsonb_build_object(
      'kind', 'anuncio_pendente',
      'title', 'Novo anúncio para aprovar',
      'body', coalesce(new.titulo, 'Um novo anúncio foi enviado para aprovação.'),
      'url', '/admin/pendentes',
      'tag', 'agromarket-anuncio-pendente'
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_push_anuncio_pendente on public.anuncios;
create trigger trg_push_anuncio_pendente
after insert or update of status on public.anuncios
for each row execute function public.trg_push_anuncio_pendente();

create or replace function public.trg_push_vitrine_pendente()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.assinatura_status in ('pendente_pagamento', 'gratis_lancamento') and (tg_op = 'INSERT' or old.assinatura_status is distinct from new.assinatura_status) then
    perform public.notificar_admin_push(jsonb_build_object(
      'kind', 'vitrine_pendente',
      'title', 'Nova lojinha para conferir',
      'body', coalesce(new.nome_vitrine, 'Uma lojinha foi criada/alterada.'),
      'url', '/admin/vitrines',
      'tag', 'agromarket-vitrine-pendente'
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_push_vitrine_pendente on public.vitrines;
create trigger trg_push_vitrine_pendente
after insert or update of assinatura_status on public.vitrines
for each row execute function public.trg_push_vitrine_pendente();

create or replace function public.trg_push_patrocinado_pendente()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status in ('pendente_pagamento', 'pendente') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.notificar_admin_push(jsonb_build_object(
      'kind', 'patrocinado_pendente',
      'title', 'Novo patrocinado para aprovar',
      'body', coalesce(new.titulo, 'Um banner patrocinado precisa de atenção.'),
      'url', '/admin/patrocinados',
      'tag', 'agromarket-patrocinado-pendente'
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_push_patrocinado_pendente on public.patrocinados_home;
create trigger trg_push_patrocinado_pendente
after insert or update of status on public.patrocinados_home
for each row execute function public.trg_push_patrocinado_pendente();

create or replace function public.trg_push_documento_pendente()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.documento_status = 'pendente' and (tg_op = 'UPDATE' and old.documento_status is distinct from new.documento_status) then
    perform public.notificar_admin_push(jsonb_build_object(
      'kind', 'documento_pendente',
      'title', 'Novo documento para conferir',
      'body', coalesce(new.nome, 'Um usuário enviou documento para aprovação.'),
      'url', '/admin/usuarios',
      'tag', 'agromarket-documento-pendente'
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_push_documento_pendente on public.usuarios;
create trigger trg_push_documento_pendente
after update of documento_status on public.usuarios
for each row execute function public.trg_push_documento_pendente();
