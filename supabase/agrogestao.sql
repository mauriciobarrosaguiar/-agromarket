-- AgroGestão v1
-- Módulo isolado de estoque, produção, clientes e vendas do pequeno produtor.
-- Pode ser executado mais de uma vez no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.agro_produtos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  vitrine_id uuid references public.vitrines(id) on delete set null,
  nome text not null,
  categoria text not null default 'Outros',
  unidade text not null default 'unidade',
  custo_unitario numeric(12,2) not null default 0 check (custo_unitario >= 0),
  preco_venda numeric(12,2) not null default 0 check (preco_venda >= 0),
  estoque_atual numeric(12,3) not null default 0 check (estoque_atual >= 0),
  estoque_minimo numeric(12,3) not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agro_clientes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nome text not null,
  whatsapp text,
  endereco text,
  limite_credito numeric(12,2) not null default 0 check (limite_credito >= 0),
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agro_vendas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  cliente_id uuid references public.agro_clientes(id) on delete set null,
  produto_id uuid not null references public.agro_produtos(id) on delete restrict,
  quantidade numeric(12,3) not null check (quantidade > 0),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  taxa_entrega numeric(12,2) not null default 0 check (taxa_entrega >= 0),
  total numeric(12,2) not null check (total >= 0),
  forma_pagamento text not null default 'pix'
    check (forma_pagamento in ('dinheiro','pix','cartao','fiado','boleto','outro')),
  status_pagamento text not null default 'pago'
    check (status_pagamento in ('pago','parcial','pendente')),
  valor_pago numeric(12,2) not null default 0 check (valor_pago >= 0),
  data_venda date not null default current_date,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agro_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  produto_id uuid not null references public.agro_produtos(id) on delete cascade,
  venda_id uuid references public.agro_vendas(id) on delete set null,
  tipo text not null check (
    tipo in (
      'producao','compra','devolucao','ajuste_entrada',
      'venda','perda','consumo','doacao','ajuste_saida'
    )
  ),
  quantidade numeric(12,3) not null check (quantidade > 0),
  saldo_anterior numeric(12,3) not null,
  saldo_posterior numeric(12,3) not null,
  custo_unitario numeric(12,2),
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists agro_produtos_usuario_idx
  on public.agro_produtos(usuario_id, ativo, nome);
create index if not exists agro_clientes_usuario_idx
  on public.agro_clientes(usuario_id, ativo, nome);
create index if not exists agro_vendas_usuario_data_idx
  on public.agro_vendas(usuario_id, data_venda desc);
create index if not exists agro_movimentacoes_usuario_data_idx
  on public.agro_movimentacoes(usuario_id, created_at desc);
create index if not exists agro_movimentacoes_produto_idx
  on public.agro_movimentacoes(produto_id, created_at desc);

create or replace function public.agro_atualizar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agro_produtos_updated_at on public.agro_produtos;
create trigger agro_produtos_updated_at
before update on public.agro_produtos
for each row execute function public.agro_atualizar_updated_at();

drop trigger if exists agro_clientes_updated_at on public.agro_clientes;
create trigger agro_clientes_updated_at
before update on public.agro_clientes
for each row execute function public.agro_atualizar_updated_at();

drop trigger if exists agro_vendas_updated_at on public.agro_vendas;
create trigger agro_vendas_updated_at
before update on public.agro_vendas
for each row execute function public.agro_atualizar_updated_at();

alter table public.agro_produtos enable row level security;
alter table public.agro_clientes enable row level security;
alter table public.agro_vendas enable row level security;
alter table public.agro_movimentacoes enable row level security;

drop policy if exists "agro produtos do usuario" on public.agro_produtos;
create policy "agro produtos do usuario"
on public.agro_produtos for all
using (usuario_id = auth.uid() or public.is_admin())
with check (usuario_id = auth.uid() or public.is_admin());

drop policy if exists "agro clientes do usuario" on public.agro_clientes;
create policy "agro clientes do usuario"
on public.agro_clientes for all
using (usuario_id = auth.uid() or public.is_admin())
with check (usuario_id = auth.uid() or public.is_admin());

drop policy if exists "agro vendas do usuario" on public.agro_vendas;
create policy "agro vendas do usuario"
on public.agro_vendas for all
using (usuario_id = auth.uid() or public.is_admin())
with check (usuario_id = auth.uid() or public.is_admin());

drop policy if exists "agro movimentacoes do usuario" on public.agro_movimentacoes;
create policy "agro movimentacoes do usuario"
on public.agro_movimentacoes for all
using (usuario_id = auth.uid() or public.is_admin())
with check (usuario_id = auth.uid() or public.is_admin());

create or replace function public.agro_registrar_movimentacao(
  produto_uuid uuid,
  tipo_text text,
  quantidade_numeric numeric,
  observacao_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  produto_row public.agro_produtos%rowtype;
  novo_saldo numeric(12,3);
  movimento_id uuid;
  entrada boolean;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if quantidade_numeric is null or quantidade_numeric <= 0 then
    raise exception 'Informe uma quantidade maior que zero.';
  end if;

  if tipo_text not in (
    'producao','compra','devolucao','ajuste_entrada',
    'perda','consumo','doacao','ajuste_saida'
  ) then
    raise exception 'Tipo de movimentação inválido.';
  end if;

  select *
  into produto_row
  from public.agro_produtos
  where id = produto_uuid
    and usuario_id = auth.uid()
    and ativo = true
  for update;

  if not found then
    raise exception 'Produto não encontrado ou sem acesso.';
  end if;

  entrada := tipo_text in ('producao','compra','devolucao','ajuste_entrada');

  if entrada then
    novo_saldo := produto_row.estoque_atual + quantidade_numeric;
  else
    if produto_row.estoque_atual < quantidade_numeric then
      raise exception 'Estoque insuficiente. Disponível: % %.',
        produto_row.estoque_atual, produto_row.unidade;
    end if;
    novo_saldo := produto_row.estoque_atual - quantidade_numeric;
  end if;

  update public.agro_produtos
  set estoque_atual = novo_saldo
  where id = produto_row.id;

  insert into public.agro_movimentacoes (
    usuario_id, produto_id, tipo, quantidade,
    saldo_anterior, saldo_posterior, custo_unitario, observacao
  )
  values (
    auth.uid(), produto_row.id, tipo_text, quantidade_numeric,
    produto_row.estoque_atual, novo_saldo, produto_row.custo_unitario,
    nullif(trim(observacao_text), '')
  )
  returning id into movimento_id;

  return movimento_id;
end;
$$;

create or replace function public.agro_registrar_venda(
  produto_uuid uuid,
  cliente_uuid uuid,
  quantidade_numeric numeric,
  preco_unitario_numeric numeric,
  desconto_numeric numeric default 0,
  taxa_entrega_numeric numeric default 0,
  forma_pagamento_text text default 'pix',
  status_pagamento_text text default 'pago',
  valor_pago_numeric numeric default 0,
  data_venda_date date default current_date,
  observacao_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  produto_row public.agro_produtos%rowtype;
  total_calculado numeric(12,2);
  valor_pago_calculado numeric(12,2);
  novo_saldo numeric(12,3);
  venda_uuid uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if quantidade_numeric is null or quantidade_numeric <= 0 then
    raise exception 'Informe uma quantidade maior que zero.';
  end if;

  if preco_unitario_numeric is null or preco_unitario_numeric < 0 then
    raise exception 'Preço unitário inválido.';
  end if;

  desconto_numeric := greatest(coalesce(desconto_numeric, 0), 0);
  taxa_entrega_numeric := greatest(coalesce(taxa_entrega_numeric, 0), 0);

  if forma_pagamento_text not in ('dinheiro','pix','cartao','fiado','boleto','outro') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if status_pagamento_text not in ('pago','parcial','pendente') then
    raise exception 'Status de pagamento inválido.';
  end if;

  select *
  into produto_row
  from public.agro_produtos
  where id = produto_uuid
    and usuario_id = auth.uid()
    and ativo = true
  for update;

  if not found then
    raise exception 'Produto não encontrado ou sem acesso.';
  end if;

  if produto_row.estoque_atual < quantidade_numeric then
    raise exception 'Estoque insuficiente. Disponível: % %.',
      produto_row.estoque_atual, produto_row.unidade;
  end if;

  if cliente_uuid is not null and not exists (
    select 1
    from public.agro_clientes
    where id = cliente_uuid
      and usuario_id = auth.uid()
      and ativo = true
  ) then
    raise exception 'Cliente não encontrado ou sem acesso.';
  end if;

  total_calculado := greatest(
    round((quantidade_numeric * preco_unitario_numeric - desconto_numeric + taxa_entrega_numeric)::numeric, 2),
    0
  );

  if status_pagamento_text = 'pago' then
    valor_pago_calculado := total_calculado;
  elsif status_pagamento_text = 'pendente' then
    valor_pago_calculado := 0;
  else
    valor_pago_calculado := round(greatest(coalesce(valor_pago_numeric, 0), 0)::numeric, 2);
    if valor_pago_calculado <= 0 or valor_pago_calculado >= total_calculado then
      raise exception 'No pagamento parcial, informe um valor maior que zero e menor que o total.';
    end if;
  end if;

  novo_saldo := produto_row.estoque_atual - quantidade_numeric;

  insert into public.agro_vendas (
    usuario_id, cliente_id, produto_id, quantidade, preco_unitario,
    desconto, taxa_entrega, total, forma_pagamento, status_pagamento,
    valor_pago, data_venda, observacao
  )
  values (
    auth.uid(), cliente_uuid, produto_row.id, quantidade_numeric, preco_unitario_numeric,
    desconto_numeric, taxa_entrega_numeric, total_calculado, forma_pagamento_text,
    status_pagamento_text, valor_pago_calculado, coalesce(data_venda_date, current_date),
    nullif(trim(observacao_text), '')
  )
  returning id into venda_uuid;

  update public.agro_produtos
  set estoque_atual = novo_saldo
  where id = produto_row.id;

  insert into public.agro_movimentacoes (
    usuario_id, produto_id, venda_id, tipo, quantidade,
    saldo_anterior, saldo_posterior, custo_unitario, observacao
  )
  values (
    auth.uid(), produto_row.id, venda_uuid, 'venda', quantidade_numeric,
    produto_row.estoque_atual, novo_saldo, produto_row.custo_unitario,
    'Venda registrada no AgroGestão'
  );

  return venda_uuid;
end;
$$;

grant execute on function public.agro_registrar_movimentacao(uuid, text, numeric, text) to authenticated;
grant execute on function public.agro_registrar_venda(
  uuid, uuid, numeric, numeric, numeric, numeric, text, text, numeric, date, text
) to authenticated;
