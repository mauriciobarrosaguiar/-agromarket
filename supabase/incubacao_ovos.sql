-- AgroGestão — Incubação de Ovos
-- Estrutura isolada para chocadeiras, lotes, medições, ovoscopias e nascimentos.
-- Pode ser executada novamente com segurança no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.agro_chocadeiras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  modelo text,
  capacidade integer not null check (capacidade > 0),
  tipo_viragem text not null default 'automatica' check (tipo_viragem in ('automatica', 'manual')),
  temperatura_padrao numeric(4,1) not null default 37.7,
  umidade_padrao integer not null default 52 check (umidade_padrao between 0 and 100),
  ultima_calibracao date,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agro_incubacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  chocadeira_id uuid references public.agro_chocadeiras(id) on delete set null,
  especie text not null,
  especie_chave text not null default 'personalizada',
  raca text,
  lote text,
  origem_ovos text,
  fornecedor text,
  quantidade_inicial integer not null check (quantidade_inicial > 0),
  ovos_ativos integer not null check (ovos_ativos >= 0),
  ovos_ferteis integer not null default 0 check (ovos_ferteis >= 0),
  ovos_nao_ferteis integer not null default 0 check (ovos_nao_ferteis >= 0),
  ovos_retirados integer not null default 0 check (ovos_retirados >= 0),
  nascidos_vivos integer not null default 0 check (nascidos_vivos >= 0),
  dias_previstos integer not null check (dias_previstos > 0),
  dia_ovoscopia_1 integer not null default 7 check (dia_ovoscopia_1 > 0),
  dia_ovoscopia_2 integer check (dia_ovoscopia_2 is null or dia_ovoscopia_2 > 0),
  dia_parar_viragem integer not null check (dia_parar_viragem > 0),
  temperatura_alvo numeric(4,1) not null default 37.7,
  umidade_incubacao integer not null default 52 check (umidade_incubacao between 0 and 100),
  umidade_eclosao integer not null default 68 check (umidade_eclosao between 0 and 100),
  data_inicio timestamptz not null,
  data_prevista_eclosao date not null,
  status text not null default 'em_incubacao' check (status in ('planejada', 'em_incubacao', 'bloqueio', 'em_eclosao', 'concluida', 'cancelada')),
  observacoes text,
  finalizada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ovos_ativos <= quantidade_inicial),
  check (nascidos_vivos <= quantidade_inicial)
);

create table if not exists public.agro_incubacao_medicoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  incubacao_id uuid not null references public.agro_incubacoes(id) on delete cascade,
  registrado_em timestamptz not null default now(),
  temperatura numeric(4,1),
  umidade integer check (umidade is null or umidade between 0 and 100),
  virou_ovos boolean not null default false,
  falta_energia boolean not null default false,
  ocorrencia text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.agro_incubacao_ovoscopias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  incubacao_id uuid not null references public.agro_incubacoes(id) on delete cascade,
  realizado_em timestamptz not null default now(),
  ovos_analisados integer not null check (ovos_analisados > 0),
  ovos_ferteis integer not null default 0 check (ovos_ferteis >= 0),
  ovos_nao_ferteis integer not null default 0 check (ovos_nao_ferteis >= 0),
  embrioes_mortos integer not null default 0 check (embrioes_mortos >= 0),
  ovos_trincados integer not null default 0 check (ovos_trincados >= 0),
  ovos_contaminados integer not null default 0 check (ovos_contaminados >= 0),
  observacoes text,
  created_at timestamptz not null default now(),
  check (ovos_ferteis + ovos_nao_ferteis + embrioes_mortos + ovos_trincados + ovos_contaminados <= ovos_analisados)
);

create table if not exists public.agro_incubacao_nascimentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  incubacao_id uuid not null references public.agro_incubacoes(id) on delete cascade,
  registrado_em timestamptz not null default now(),
  nascidos_vivos integer not null default 0 check (nascidos_vivos >= 0),
  nascidos_fracos integer not null default 0 check (nascidos_fracos >= 0),
  mortos_apos_nascer integer not null default 0 check (mortos_apos_nascer >= 0),
  mortos_no_ovo integer not null default 0 check (mortos_no_ovo >= 0),
  bicaram_nao_nasceram integer not null default 0 check (bicaram_nao_nasceram >= 0),
  nascimentos_auxiliados integer not null default 0 check (nascimentos_auxiliados >= 0),
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists agro_chocadeiras_usuario_idx on public.agro_chocadeiras(usuario_id, ativo, nome);
create index if not exists agro_incubacoes_usuario_status_idx on public.agro_incubacoes(usuario_id, status, data_inicio desc);
create index if not exists agro_incubacoes_chocadeira_idx on public.agro_incubacoes(chocadeira_id);
create index if not exists agro_incubacao_medicoes_lote_idx on public.agro_incubacao_medicoes(incubacao_id, registrado_em desc);
create index if not exists agro_incubacao_ovoscopias_lote_idx on public.agro_incubacao_ovoscopias(incubacao_id, realizado_em desc);
create index if not exists agro_incubacao_nascimentos_lote_idx on public.agro_incubacao_nascimentos(incubacao_id, registrado_em desc);

alter table public.agro_chocadeiras enable row level security;
alter table public.agro_incubacoes enable row level security;
alter table public.agro_incubacao_medicoes enable row level security;
alter table public.agro_incubacao_ovoscopias enable row level security;
alter table public.agro_incubacao_nascimentos enable row level security;

drop policy if exists "agro chocadeiras do usuario" on public.agro_chocadeiras;
create policy "agro chocadeiras do usuario" on public.agro_chocadeiras
for all using ((usuario_id = auth.uid()) or public.is_admin())
with check ((usuario_id = auth.uid()) or public.is_admin());

drop policy if exists "agro incubacoes do usuario" on public.agro_incubacoes;
create policy "agro incubacoes do usuario" on public.agro_incubacoes
for all using ((usuario_id = auth.uid()) or public.is_admin())
with check ((usuario_id = auth.uid()) or public.is_admin());

drop policy if exists "agro medicoes do usuario" on public.agro_incubacao_medicoes;
create policy "agro medicoes do usuario" on public.agro_incubacao_medicoes
for all using ((usuario_id = auth.uid()) or public.is_admin())
with check ((usuario_id = auth.uid()) or public.is_admin());

drop policy if exists "agro ovoscopias do usuario" on public.agro_incubacao_ovoscopias;
create policy "agro ovoscopias do usuario" on public.agro_incubacao_ovoscopias
for all using ((usuario_id = auth.uid()) or public.is_admin())
with check ((usuario_id = auth.uid()) or public.is_admin());

drop policy if exists "agro nascimentos do usuario" on public.agro_incubacao_nascimentos;
create policy "agro nascimentos do usuario" on public.agro_incubacao_nascimentos
for all using ((usuario_id = auth.uid()) or public.is_admin())
with check ((usuario_id = auth.uid()) or public.is_admin());

drop trigger if exists agro_chocadeiras_updated_at on public.agro_chocadeiras;
create trigger agro_chocadeiras_updated_at before update on public.agro_chocadeiras
for each row execute function public.agro_atualizar_updated_at();

drop trigger if exists agro_incubacoes_updated_at on public.agro_incubacoes;
create trigger agro_incubacoes_updated_at before update on public.agro_incubacoes
for each row execute function public.agro_atualizar_updated_at();

create or replace function public.agro_incubacao_registrar_ovoscopia(
  p_incubacao_id uuid,
  p_ovos_analisados integer,
  p_ovos_ferteis integer,
  p_ovos_nao_ferteis integer,
  p_embrioes_mortos integer,
  p_ovos_trincados integer,
  p_ovos_contaminados integer,
  p_observacoes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incubacao public.agro_incubacoes%rowtype;
  v_registro_id uuid;
  v_retirados integer;
begin
  select * into v_incubacao
  from public.agro_incubacoes
  where id = p_incubacao_id
  for update;

  if not found or (v_incubacao.usuario_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Incubação não encontrada ou acesso negado.';
  end if;

  if v_incubacao.status in ('concluida', 'cancelada') then
    raise exception 'Não é possível alterar uma incubação encerrada.';
  end if;

  if p_ovos_analisados <= 0 or p_ovos_analisados > v_incubacao.ovos_ativos then
    raise exception 'A quantidade analisada deve estar entre 1 e %.', v_incubacao.ovos_ativos;
  end if;

  if least(p_ovos_ferteis, p_ovos_nao_ferteis, p_embrioes_mortos, p_ovos_trincados, p_ovos_contaminados) < 0 then
    raise exception 'As quantidades não podem ser negativas.';
  end if;

  if p_ovos_ferteis + p_ovos_nao_ferteis + p_embrioes_mortos + p_ovos_trincados + p_ovos_contaminados > p_ovos_analisados then
    raise exception 'A soma dos resultados ultrapassa os ovos analisados.';
  end if;

  v_retirados := p_ovos_nao_ferteis + p_embrioes_mortos + p_ovos_trincados + p_ovos_contaminados;

  insert into public.agro_incubacao_ovoscopias (
    usuario_id, incubacao_id, ovos_analisados, ovos_ferteis, ovos_nao_ferteis,
    embrioes_mortos, ovos_trincados, ovos_contaminados, observacoes
  ) values (
    v_incubacao.usuario_id, p_incubacao_id, p_ovos_analisados, p_ovos_ferteis,
    p_ovos_nao_ferteis, p_embrioes_mortos, p_ovos_trincados, p_ovos_contaminados, p_observacoes
  ) returning id into v_registro_id;

  update public.agro_incubacoes
  set ovos_ativos = greatest(ovos_ativos - v_retirados, 0),
      ovos_ferteis = greatest(ovos_ativos - v_retirados, 0),
      ovos_nao_ferteis = ovos_nao_ferteis + p_ovos_nao_ferteis,
      ovos_retirados = ovos_retirados + v_retirados
  where id = p_incubacao_id;

  return v_registro_id;
end;
$$;

create or replace function public.agro_incubacao_registrar_nascimento(
  p_incubacao_id uuid,
  p_nascidos_vivos integer,
  p_nascidos_fracos integer,
  p_mortos_apos_nascer integer,
  p_mortos_no_ovo integer,
  p_bicaram_nao_nasceram integer,
  p_nascimentos_auxiliados integer,
  p_observacoes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incubacao public.agro_incubacoes%rowtype;
  v_registro_id uuid;
  v_total_saida integer;
  v_total_vivos integer;
begin
  select * into v_incubacao
  from public.agro_incubacoes
  where id = p_incubacao_id
  for update;

  if not found or (v_incubacao.usuario_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Incubação não encontrada ou acesso negado.';
  end if;

  if v_incubacao.status in ('concluida', 'cancelada') then
    raise exception 'Não é possível alterar uma incubação encerrada.';
  end if;

  if least(p_nascidos_vivos, p_nascidos_fracos, p_mortos_apos_nascer, p_mortos_no_ovo, p_bicaram_nao_nasceram, p_nascimentos_auxiliados) < 0 then
    raise exception 'As quantidades não podem ser negativas.';
  end if;

  v_total_vivos := p_nascidos_vivos + p_nascidos_fracos;
  v_total_saida := v_total_vivos + p_mortos_apos_nascer + p_mortos_no_ovo + p_bicaram_nao_nasceram;

  if v_total_saida <= 0 then
    raise exception 'Informe ao menos um nascimento ou uma perda.';
  end if;

  if v_total_saida > v_incubacao.ovos_ativos then
    raise exception 'O registro ultrapassa os % ovos ativos.', v_incubacao.ovos_ativos;
  end if;

  if p_nascimentos_auxiliados > v_total_vivos then
    raise exception 'Nascimentos auxiliados não podem superar os nascidos vivos.';
  end if;

  insert into public.agro_incubacao_nascimentos (
    usuario_id, incubacao_id, nascidos_vivos, nascidos_fracos, mortos_apos_nascer,
    mortos_no_ovo, bicaram_nao_nasceram, nascimentos_auxiliados, observacoes
  ) values (
    v_incubacao.usuario_id, p_incubacao_id, p_nascidos_vivos, p_nascidos_fracos,
    p_mortos_apos_nascer, p_mortos_no_ovo, p_bicaram_nao_nasceram,
    p_nascimentos_auxiliados, p_observacoes
  ) returning id into v_registro_id;

  update public.agro_incubacoes
  set ovos_ativos = greatest(ovos_ativos - v_total_saida, 0),
      nascidos_vivos = nascidos_vivos + v_total_vivos,
      ovos_retirados = ovos_retirados + p_mortos_no_ovo + p_bicaram_nao_nasceram,
      status = 'em_eclosao'
  where id = p_incubacao_id;

  return v_registro_id;
end;
$$;

revoke all on function public.agro_incubacao_registrar_ovoscopia(uuid, integer, integer, integer, integer, integer, integer, text) from public, anon;
revoke all on function public.agro_incubacao_registrar_nascimento(uuid, integer, integer, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.agro_incubacao_registrar_ovoscopia(uuid, integer, integer, integer, integer, integer, integer, text) to authenticated;
grant execute on function public.agro_incubacao_registrar_nascimento(uuid, integer, integer, integer, integer, integer, integer, text) to authenticated;

grant select, insert, update, delete on public.agro_chocadeiras to authenticated;
grant select, insert, update, delete on public.agro_incubacoes to authenticated;
grant select, insert, update, delete on public.agro_incubacao_medicoes to authenticated;
grant select, insert, update, delete on public.agro_incubacao_ovoscopias to authenticated;
grant select, insert, update, delete on public.agro_incubacao_nascimentos to authenticated;
