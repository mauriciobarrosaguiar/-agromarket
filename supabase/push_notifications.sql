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
-- Estas policies permitem que o admin visualize/remova suas inscrições futuramente, se necessário.
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
