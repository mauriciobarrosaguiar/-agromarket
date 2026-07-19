-- AgroMarket - notificacoes push para administradores.
-- Este arquivo nao contem segredos. Grave ADMIN_PUSH_WEBHOOK_SECRET fora do Git.

create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

create table if not exists private.agromarket_app_secrets (
  chave text primary key,
  valor text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on table private.agromarket_app_secrets from anon, authenticated;

create or replace function private.get_agromarket_secret(secret_key text)
returns text
language sql
security definer
set search_path = private
as $$
  select valor
  from private.agromarket_app_secrets
  where chave = secret_key
    and ativo = true
  limit 1
$$;

revoke all on function private.get_agromarket_secret(text) from anon, authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.usuarios(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  ativo boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions add column if not exists user_id uuid references public.usuarios(id) on delete cascade;
alter table public.push_subscriptions add column if not exists endpoint text;
alter table public.push_subscriptions add column if not exists p256dh text;
alter table public.push_subscriptions add column if not exists auth text;
alter table public.push_subscriptions add column if not exists user_agent text;
alter table public.push_subscriptions add column if not exists ativo boolean not null default true;
alter table public.push_subscriptions add column if not exists last_seen_at timestamptz;
alter table public.push_subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.push_subscriptions add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_endpoint_key'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_endpoint_key unique (endpoint);
  end if;
end $$;

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_ativo_idx on public.push_subscriptions (ativo);

alter table public.push_subscriptions enable row level security;

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

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_push_subscriptions_updated_at();

-- Remove gatilhos/funcoes de uma primeira versao com placeholder de segredo.
drop trigger if exists trg_push_anuncio_pendente on public.anuncios;
drop trigger if exists trg_push_vitrine_pendente on public.vitrines;
drop trigger if exists trg_push_patrocinado_pendente on public.patrocinados_home;
drop trigger if exists trg_push_documento_pendente on public.usuarios;
drop function if exists public.trg_push_anuncio_pendente();
drop function if exists public.trg_push_vitrine_pendente();
drop function if exists public.trg_push_patrocinado_pendente();
drop function if exists public.trg_push_documento_pendente();
drop function if exists public.notificar_admin_push(jsonb);

create or replace function public.disparar_push_admin_pendencia()
returns trigger
language plpgsql
security definer
set search_path = public, private, net, extensions
as $$
declare
  webhook_secret text;
  event_type text := coalesce(tg_argv[0], 'pendencia');
  notification_title text := coalesce(tg_argv[1], 'Nova pendencia no AgroMarket');
  notification_body text := coalesce(tg_argv[2], 'Existe uma nova solicitacao aguardando analise:');
  notification_url text := coalesce(tg_argv[3], '/painel');
  row_data jsonb := to_jsonb(new);
  record_title text;
begin
  webhook_secret := private.get_agromarket_secret('admin_push_webhook_secret');

  if nullif(webhook_secret, '') is null then
    return new;
  end if;

  record_title := coalesce(
    nullif(row_data ->> 'titulo', ''),
    nullif(row_data ->> 'nome_vitrine', ''),
    nullif(row_data ->> 'nome', ''),
    nullif(row_data ->> 'motivo', ''),
    nullif(row_data ->> 'id', '')
  );

  if record_title is not null then
    notification_body := notification_body || ' ' || left(record_title, 90);
  end if;

  perform net.http_post(
    url := 'https://www.meuagromarket.com.br/api/push/notify-admin',
    body := jsonb_build_object(
      'tipo', event_type,
      'title', notification_title,
      'body', notification_body,
      'url', notification_url,
      'tag', 'agromarket-' || event_type || '-' || coalesce(row_data ->> 'id', 'novo'),
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record_id', row_data ->> 'id'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agromarket-push-secret', webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists push_admin_anuncios_pendente_insert on public.anuncios;
create trigger push_admin_anuncios_pendente_insert
after insert on public.anuncios
for each row
when (new.status = 'pendente')
execute function public.disparar_push_admin_pendencia('anuncio_pendente', 'Novo anuncio para aprovar', 'Um anuncio entrou na fila de aprovacao:', '/admin/pendentes');

drop trigger if exists push_admin_anuncios_pendente_update on public.anuncios;
create trigger push_admin_anuncios_pendente_update
after update of status on public.anuncios
for each row
when (new.status = 'pendente' and old.status is distinct from new.status)
execute function public.disparar_push_admin_pendencia('anuncio_pendente', 'Novo anuncio para aprovar', 'Um anuncio voltou para aprovacao:', '/admin/pendentes');

drop trigger if exists push_admin_vitrines_pendente_insert on public.vitrines;
create trigger push_admin_vitrines_pendente_insert
after insert on public.vitrines
for each row
when (new.assinatura_status = 'pendente_pagamento')
execute function public.disparar_push_admin_pendencia('vitrine_pendente', 'Nova lojinha aguardando liberacao', 'Uma lojinha esta aguardando pagamento ou liberacao:', '/admin/vitrines');

drop trigger if exists push_admin_vitrines_pendente_update on public.vitrines;
create trigger push_admin_vitrines_pendente_update
after update of assinatura_status on public.vitrines
for each row
when (new.assinatura_status = 'pendente_pagamento' and old.assinatura_status is distinct from new.assinatura_status)
execute function public.disparar_push_admin_pendencia('vitrine_pendente', 'Nova lojinha aguardando liberacao', 'Uma lojinha esta aguardando pagamento ou liberacao:', '/admin/vitrines');

drop trigger if exists push_admin_vitrine_pagamentos_pendente_insert on public.vitrine_pagamentos;
create trigger push_admin_vitrine_pagamentos_pendente_insert
after insert on public.vitrine_pagamentos
for each row
when (new.status = 'pendente')
execute function public.disparar_push_admin_pendencia('pagamento_vitrine_pendente', 'Pagamento de vitrine pendente', 'Um pagamento de vitrine precisa de conferencia:', '/admin/vitrines');

drop trigger if exists push_admin_vitrine_pagamentos_pendente_update on public.vitrine_pagamentos;
create trigger push_admin_vitrine_pagamentos_pendente_update
after update of status on public.vitrine_pagamentos
for each row
when (new.status = 'pendente' and old.status is distinct from new.status)
execute function public.disparar_push_admin_pendencia('pagamento_vitrine_pendente', 'Pagamento de vitrine pendente', 'Um pagamento de vitrine voltou para conferencia:', '/admin/vitrines');

drop trigger if exists push_admin_patrocinados_pendente_insert on public.patrocinados_home;
create trigger push_admin_patrocinados_pendente_insert
after insert on public.patrocinados_home
for each row
when (new.status in ('pendente_pagamento', 'pendente'))
execute function public.disparar_push_admin_pendencia('patrocinado_pendente', 'Patrocinado aguardando analise', 'Um banner patrocinado precisa de acompanhamento:', '/admin/patrocinados');

drop trigger if exists push_admin_patrocinados_pendente_update on public.patrocinados_home;
create trigger push_admin_patrocinados_pendente_update
after update of status on public.patrocinados_home
for each row
when (new.status in ('pendente_pagamento', 'pendente') and old.status is distinct from new.status)
execute function public.disparar_push_admin_pendencia('patrocinado_pendente', 'Patrocinado aguardando analise', 'Um banner patrocinado precisa de acompanhamento:', '/admin/patrocinados');

drop trigger if exists push_admin_documentos_pendente_update on public.usuarios;
create trigger push_admin_documentos_pendente_update
after update of documento_status, selfie_status on public.usuarios
for each row
when (
  (new.documento_status = 'pendente' and old.documento_status is distinct from new.documento_status)
  or
  (new.selfie_status = 'pendente' and old.selfie_status is distinct from new.selfie_status)
)
execute function public.disparar_push_admin_pendencia('documento_pendente', 'Documento aguardando conferencia', 'Um usuario enviou documento/selfie para conferencia:', '/admin/documentos');

drop trigger if exists push_admin_denuncias_aberta_insert on public.denuncias;
create trigger push_admin_denuncias_aberta_insert
after insert on public.denuncias
for each row
when (new.status = 'aberta')
execute function public.disparar_push_admin_pendencia('denuncia_aberta', 'Nova denuncia aberta', 'Uma denuncia precisa de analise:', '/admin/denuncias');

drop trigger if exists push_admin_denuncias_aberta_update on public.denuncias;
create trigger push_admin_denuncias_aberta_update
after update of status on public.denuncias
for each row
when (new.status = 'aberta' and old.status is distinct from new.status)
execute function public.disparar_push_admin_pendencia('denuncia_aberta', 'Nova denuncia aberta', 'Uma denuncia voltou para analise:', '/admin/denuncias');

drop trigger if exists push_admin_destaques_pendente_insert on public.destaque_solicitacoes;
create trigger push_admin_destaques_pendente_insert
after insert on public.destaque_solicitacoes
for each row
when (new.status = 'pendente')
execute function public.disparar_push_admin_pendencia('destaque_pendente', 'Destaque aguardando aprovacao', 'Uma solicitacao de destaque precisa de analise:', '/admin/destaques');

drop trigger if exists push_admin_destaques_pendente_update on public.destaque_solicitacoes;
create trigger push_admin_destaques_pendente_update
after update of status on public.destaque_solicitacoes
for each row
when (new.status = 'pendente' and old.status is distinct from new.status)
execute function public.disparar_push_admin_pendencia('destaque_pendente', 'Destaque aguardando aprovacao', 'Uma solicitacao de destaque voltou para analise:', '/admin/destaques');
