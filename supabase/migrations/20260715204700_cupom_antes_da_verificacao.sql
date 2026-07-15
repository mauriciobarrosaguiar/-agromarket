alter table public.vitrine_cupom_usos
  add column if not exists status text not null default 'reservado',
  add column if not exists reservado_em timestamptz not null default now(),
  add column if not exists ativado_em timestamptz,
  add column if not exists cancelado_em timestamptz,
  add column if not exists expira_em timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.vitrine_cupom_usos'::regclass
      and conname = 'vitrine_cupom_usos_status_check'
  ) then
    alter table public.vitrine_cupom_usos
      add constraint vitrine_cupom_usos_status_check
      check (status in ('reservado', 'ativado', 'cancelado', 'expirado'));
  end if;
end $$;

update public.vitrine_cupom_usos u
set status = case
      when exists (
        select 1 from public.vitrines v
        where v.id = u.vitrine_id
          and v.vitrine_ativa = true
          and v.assinatura_status in ('ativa', 'gratis_lancamento')
      ) then 'ativado'
      else 'reservado'
    end,
    reservado_em = coalesce(u.reservado_em, u.usado_em),
    ativado_em = case
      when exists (
        select 1 from public.vitrines v
        where v.id = u.vitrine_id
          and v.vitrine_ativa = true
          and v.assinatura_status in ('ativa', 'gratis_lancamento')
      ) then coalesce(u.ativado_em, u.usado_em)
      else u.ativado_em
    end,
    updated_at = now();

create or replace function public.perfil_pronto_para_vitrine(usuario_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = usuario_uuid
      and length(regexp_replace(coalesce(u.cpf, ''), '\D', '', 'g')) = 11
      and nullif(trim(coalesce(u.documento_numero, '')), '') is not null
      and nullif(trim(coalesce(u.documento_orgao_emissor, '')), '') is not null
      and nullif(trim(coalesce(u.documento_uf, '')), '') is not null
      and u.documento_url is not null
      and u.documento_status = 'aprovado'
      and coalesce(u.selfie_url, u.foto_url) is not null
      and u.localizacao_validada = true
      and u.latitude is not null
      and u.longitude is not null
      and coalesce(u.localizacao_accuracy, 999999) <= 150
  );
$$;

revoke all on function public.perfil_pronto_para_vitrine(uuid) from public;
grant execute on function public.perfil_pronto_para_vitrine(uuid) to authenticated;

create or replace function public.proteger_campos_vitrine()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cupom_interno boolean := coalesce(current_setting('app.cupom_activation', true), '') = '1';
begin
  if auth.uid() is not null and not public.is_admin() and not cupom_interno then
    if tg_op = 'INSERT' then
      if new.usuario_id is distinct from auth.uid()
         or coalesce(new.vitrine_ativa, false) <> false
         or coalesce(new.destaque, false) <> false
         or coalesce(new.verificado, false) <> false
         or new.gratis_ate is not null
         or new.assinatura_inicio is not null
         or new.assinatura_vencimento is not null
         or new.ultimo_pagamento_em is not null
         or (new.assinatura_status is not null and new.assinatura_status <> 'pendente_pagamento') then
        raise exception 'Vitrine de vendedor precisa iniciar pendente de pagamento/liberação.' using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.usuario_id is distinct from old.usuario_id
         or new.vitrine_ativa is distinct from old.vitrine_ativa
         or new.plano is distinct from old.plano
         or new.gratis_ate is distinct from old.gratis_ate
         or new.destaque is distinct from old.destaque
         or new.verificado is distinct from old.verificado
         or new.total_visualizacoes is distinct from old.total_visualizacoes
         or new.assinatura_inicio is distinct from old.assinatura_inicio
         or new.assinatura_vencimento is distinct from old.assinatura_vencimento
         or new.plano_id is distinct from old.plano_id
         or new.ultimo_pagamento_em is distinct from old.ultimo_pagamento_em then
        raise exception 'Apenas o administrador ou o webhook pode liberar ou alterar campos protegidos da vitrine.' using errcode = '42501';
      end if;

      if new.assinatura_status is distinct from old.assinatura_status then
        if old.assinatura_status in ('ativa', 'gratis_lancamento') or new.assinatura_status <> 'pendente_pagamento' then
          raise exception 'Apenas o administrador ou o webhook pode alterar o status da assinatura da vitrine.' using errcode = '42501';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.bloquear_vitrine_sem_verificacao_aprovada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_ok boolean;
  exige_verificacao boolean;
begin
  admin_ok := public.usuario_e_admin(auth.uid());
  exige_verificacao := coalesce(new.vitrine_ativa, false)
    or coalesce(new.assinatura_status, '') in ('ativa', 'gratis_lancamento');

  if not admin_ok
     and new.usuario_id = auth.uid()
     and exige_verificacao
     and not public.perfil_pronto_para_vitrine(new.usuario_id) then
    raise exception 'Para liberar a lojinha, o documento precisa estar aprovado, a selfie/foto precisa estar enviada e a localização precisa estar validada.';
  end if;

  return new;
end;
$$;

create or replace function public.aplicar_cupom_vitrine(codigo_text text, vitrine_uuid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario_uuid uuid := auth.uid();
  cupom_rec public.vitrine_cupons%rowtype;
  vitrine_rec public.vitrines%rowtype;
  uso_rec public.vitrine_cupom_usos%rowtype;
  vencimento date;
  perfil_ok boolean;
begin
  if usuario_uuid is null then
    raise exception 'Entre na sua conta para usar o cupom.';
  end if;

  if trim(coalesce(codigo_text, '')) = '' then
    raise exception 'Informe o código do cupom.';
  end if;

  select * into vitrine_rec
  from public.vitrines
  where id = vitrine_uuid and usuario_id = usuario_uuid
  limit 1;

  if not found then
    raise exception 'Vitrine não encontrada para sua conta.';
  end if;

  select * into cupom_rec
  from public.vitrine_cupons
  where upper(codigo) = upper(trim(codigo_text))
    and ativo = true
  limit 1
  for update;

  if not found then
    raise exception 'Cupom inválido ou inativo.';
  end if;

  select * into uso_rec
  from public.vitrine_cupom_usos
  where cupom_id = cupom_rec.id
    and usuario_id = usuario_uuid
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'ja_aplicado', true,
      'vitrine_id', uso_rec.vitrine_id,
      'codigo', cupom_rec.codigo,
      'status', uso_rec.status,
      'ilimitado', cupom_rec.ilimitado,
      'gratis_ate', vitrine_rec.gratis_ate,
      'reservado_em', uso_rec.reservado_em,
      'ativado_em', uso_rec.ativado_em
    );
  end if;

  if cupom_rec.valido_de is not null and current_date < cupom_rec.valido_de then
    raise exception 'Este cupom ainda não está disponível.';
  end if;

  if cupom_rec.valido_ate is not null and current_date > cupom_rec.valido_ate then
    raise exception 'Este cupom venceu.';
  end if;

  if cupom_rec.uso_maximo is not null and cupom_rec.uso_atual >= cupom_rec.uso_maximo then
    raise exception 'Este cupom atingiu o limite de usos.';
  end if;

  perfil_ok := public.perfil_pronto_para_vitrine(usuario_uuid);

  if cupom_rec.ilimitado then
    vencimento := null;
  else
    vencimento := current_date + make_interval(days => coalesce(cupom_rec.dias_gratis, 30));
  end if;

  insert into public.vitrine_cupom_usos (
    cupom_id,
    vitrine_id,
    usuario_id,
    status,
    reservado_em,
    ativado_em,
    updated_at
  ) values (
    cupom_rec.id,
    vitrine_uuid,
    usuario_uuid,
    case when perfil_ok then 'ativado' else 'reservado' end,
    now(),
    case when perfil_ok then now() else null end,
    now()
  )
  returning * into uso_rec;

  update public.vitrine_cupons
  set uso_atual = uso_atual + 1,
      updated_at = now()
  where id = cupom_rec.id;

  perform set_config('app.cupom_activation', '1', true);

  if perfil_ok then
    update public.vitrines
    set vitrine_ativa = true,
        assinatura_status = 'gratis_lancamento',
        assinatura_inicio = coalesce(assinatura_inicio, current_date),
        assinatura_vencimento = vencimento,
        gratis_ate = vencimento,
        plano = case when cupom_rec.ilimitado then 'vitrine_gratis_ilimitada' else 'vitrine_cupom' end,
        updated_at = now()
    where id = vitrine_uuid and usuario_id = usuario_uuid;
  else
    update public.vitrines
    set vitrine_ativa = false,
        assinatura_status = 'pendente_pagamento',
        assinatura_inicio = null,
        assinatura_vencimento = null,
        gratis_ate = null,
        plano = 'vitrine_cupom_reservado',
        updated_at = now()
    where id = vitrine_uuid and usuario_id = usuario_uuid;
  end if;

  perform set_config('app.cupom_activation', '0', true);

  update public.vitrine_pagamentos
  set status = 'cancelado',
      observacao = trim(both ' ' from coalesce(observacao, '') || ' | Cancelado por cupom: ' || cupom_rec.codigo),
      updated_at = now()
  where vitrine_id = vitrine_uuid
    and usuario_id = usuario_uuid
    and status = 'pendente';

  return jsonb_build_object(
    'ok', true,
    'ja_aplicado', false,
    'vitrine_id', vitrine_uuid,
    'codigo', cupom_rec.codigo,
    'status', uso_rec.status,
    'ilimitado', cupom_rec.ilimitado,
    'gratis_ate', case when perfil_ok then vencimento else null end,
    'reservado_em', uso_rec.reservado_em,
    'ativado_em', uso_rec.ativado_em
  );
end;
$$;

create or replace function public.criar_vitrine_com_cupom(codigo_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  usuario_uuid uuid := auth.uid();
  perfil public.usuarios%rowtype;
  vitrine_uuid uuid;
  base_slug text;
  slug_final text;
  tentativas int := 0;
  resultado jsonb;
begin
  if usuario_uuid is null then
    raise exception 'Entre na sua conta para usar o cupom.';
  end if;

  if trim(coalesce(codigo_text, '')) = '' then
    raise exception 'Informe o código do cupom.';
  end if;

  select * into perfil
  from public.usuarios
  where id = usuario_uuid;

  if not found then
    raise exception 'Perfil não encontrado.';
  end if;

  select id into vitrine_uuid
  from public.vitrines
  where usuario_id = usuario_uuid
  limit 1;

  if vitrine_uuid is null then
    base_slug := lower(trim(regexp_replace(unaccent(coalesce(nullif(perfil.nome, ''), 'vendedor')), '[^a-zA-Z0-9]+', '-', 'g')));
    base_slug := regexp_replace(base_slug, '(^-|-$)', '', 'g');

    if base_slug = '' then
      base_slug := 'vendedor';
    end if;

    loop
      slug_final := base_slug || '-' || left(replace(usuario_uuid::text, '-', ''), 8);
      if tentativas > 0 then
        slug_final := slug_final || '-' || tentativas::text;
      end if;

      exit when not exists (select 1 from public.vitrines where slug = slug_final);
      tentativas := tentativas + 1;

      if tentativas > 20 then
        raise exception 'Não consegui gerar o link da lojinha. Tente novamente.';
      end if;
    end loop;

    insert into public.vitrines (
      usuario_id,
      nome_vitrine,
      slug,
      descricao,
      cidade,
      estado,
      whatsapp,
      vitrine_ativa,
      plano,
      assinatura_status,
      assinatura_inicio,
      assinatura_vencimento,
      gratis_ate,
      logo_object_fit,
      logo_object_position,
      banner_object_position
    ) values (
      usuario_uuid,
      coalesce(nullif(perfil.nome, ''), 'Minha vitrine'),
      slug_final,
      'Vitrine de produtos e serviços no AgroMarket.',
      coalesce(perfil.cidade, ''),
      coalesce(perfil.estado, 'TO'),
      coalesce(perfil.whatsapp, ''),
      false,
      'vitrine_cupom_reservado',
      'pendente_pagamento',
      null,
      null,
      null,
      'cover',
      'center',
      'center'
    ) returning id into vitrine_uuid;
  end if;

  resultado := public.aplicar_cupom_vitrine(codigo_text, vitrine_uuid);
  return resultado || jsonb_build_object('vitrine_id', vitrine_uuid);
end;
$$;

create or replace function public.ativar_cupom_reservado_apos_verificacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  vencimento date;
begin
  if not public.perfil_pronto_para_vitrine(new.id) then
    return new;
  end if;

  for rec in
    select
      u.id as uso_id,
      u.vitrine_id,
      c.codigo,
      c.dias_gratis,
      c.ilimitado
    from public.vitrine_cupom_usos u
    join public.vitrine_cupons c on c.id = u.cupom_id
    where u.usuario_id = new.id
      and u.status = 'reservado'
  loop
    if rec.ilimitado then
      vencimento := null;
    else
      vencimento := current_date + make_interval(days => coalesce(rec.dias_gratis, 30));
    end if;

    perform set_config('app.cupom_activation', '1', true);

    update public.vitrines
    set vitrine_ativa = true,
        assinatura_status = 'gratis_lancamento',
        assinatura_inicio = coalesce(assinatura_inicio, current_date),
        assinatura_vencimento = vencimento,
        gratis_ate = vencimento,
        plano = case when rec.ilimitado then 'vitrine_gratis_ilimitada' else 'vitrine_cupom' end,
        updated_at = now()
    where id = rec.vitrine_id
      and usuario_id = new.id;

    update public.vitrine_cupom_usos
    set status = 'ativado',
        ativado_em = now(),
        updated_at = now()
    where id = rec.uso_id
      and status = 'reservado';

    update public.vitrine_pagamentos
    set status = 'cancelado',
        observacao = trim(both ' ' from coalesce(observacao, '') || ' | Cancelado por cupom: ' || rec.codigo),
        updated_at = now()
    where vitrine_id = rec.vitrine_id
      and usuario_id = new.id
      and status = 'pendente';
  end loop;

  perform set_config('app.cupom_activation', '0', true);
  return new;
end;
$$;

drop trigger if exists trg_ativar_cupom_reservado_apos_verificacao on public.usuarios;
create trigger trg_ativar_cupom_reservado_apos_verificacao
after update of cpf, documento_numero, documento_orgao_emissor, documento_uf, documento_url, documento_status, selfie_url, foto_url, localizacao_validada, localizacao_accuracy, latitude, longitude
on public.usuarios
for each row
execute function public.ativar_cupom_reservado_apos_verificacao();

revoke all on function public.aplicar_cupom_vitrine(text, uuid) from public;
revoke all on function public.criar_vitrine_com_cupom(text) from public;
grant execute on function public.aplicar_cupom_vitrine(text, uuid) to authenticated;
grant execute on function public.criar_vitrine_com_cupom(text) to authenticated;

grant select on public.vitrine_cupom_usos to authenticated;
