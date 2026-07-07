-- AgroMarket - schema inicial Supabase
-- Rode este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  whatsapp text,
  cidade text,
  estado text default 'TO',
  tipo_usuario text not null default 'anunciante' check (tipo_usuario in ('admin', 'anunciante', 'comprador')),
  status text not null default 'ativo' check (status in ('ativo', 'pendente', 'bloqueado')),
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  tipo text not null default 'produto',
  icone text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id),
  tipo_anuncio text not null check (tipo_anuncio in ('produto','animal','servico','emprego','maquina','equipamento')),
  titulo text not null,
  slug text not null unique,
  descricao text not null,
  preco numeric(12,2),
  preco_a_combinar boolean not null default false,
  quantidade numeric(12,2),
  unidade text,
  cidade text not null,
  estado text not null default 'TO',
  bairro text,
  whatsapp text not null,
  nome_contato text not null,
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado','pausado','vendido','expirado','bloqueado')),
  destaque boolean not null default false,
  visualizacoes int not null default 0,
  cliques_whatsapp int not null default 0,
  data_publicacao timestamptz,
  data_expiracao timestamptz,
  motivo_recusa text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fotos_anuncios (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  url_foto text not null,
  ordem int not null default 0,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.denuncias (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  motivo text not null,
  descricao text,
  status text not null default 'aberta' check (status in ('aberta','em_analise','resolvida','ignorada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cidades (
  id uuid primary key default gen_random_uuid(),
  cidade text not null,
  estado text not null default 'TO',
  slug text not null unique,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.destaques (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  tipo_destaque text not null check (tipo_destaque in ('home','categoria','cidade','topo','premium')),
  data_inicio timestamptz not null default now(),
  data_fim timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  valor numeric(12,2) not null default 0,
  limite_anuncios int not null default 3,
  limite_fotos int not null default 5,
  permite_destaque boolean not null default false,
  duracao_dias int not null default 30,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  plano_id uuid not null references public.planos(id),
  status text not null default 'ativa' check (status in ('ativa','vencida','cancelada','bloqueada')),
  data_inicio timestamptz not null default now(),
  data_fim timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id) on delete set null,
  acao text not null,
  entidade text,
  entidade_id uuid,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.usuarios
    where id = auth.uid()
    and tipo_usuario = 'admin'
    and status = 'ativo'
  );
$$;

create or replace function public.incrementar_visualizacao(anuncio_uuid uuid)
returns void
language sql
security definer
as $$
  update public.anuncios
  set visualizacoes = visualizacoes + 1
  where id = anuncio_uuid and status = 'aprovado';
$$;

create or replace function public.incrementar_clique_whatsapp(anuncio_uuid uuid)
returns void
language sql
security definer
as $$
  update public.anuncios
  set cliques_whatsapp = cliques_whatsapp + 1
  where id = anuncio_uuid and status = 'aprovado';
$$;

alter table public.usuarios enable row level security;
alter table public.categorias enable row level security;
alter table public.anuncios enable row level security;
alter table public.fotos_anuncios enable row level security;
alter table public.denuncias enable row level security;
alter table public.cidades enable row level security;
alter table public.destaques enable row level security;
alter table public.planos enable row level security;
alter table public.assinaturas enable row level security;
alter table public.logs enable row level security;

-- Leitura pública
create policy "categorias leitura publica" on public.categorias for select using (ativo = true or public.is_admin());
create policy "anuncios aprovados leitura publica" on public.anuncios for select using (status = 'aprovado' or usuario_id = auth.uid() or public.is_admin());
create policy "fotos leitura publica" on public.fotos_anuncios for select using (true);
create policy "cidades leitura publica" on public.cidades for select using (ativo = true or public.is_admin());
create policy "planos leitura publica" on public.planos for select using (ativo = true or public.is_admin());

-- Usuarios
create policy "usuario ve proprio perfil" on public.usuarios for select using (id = auth.uid() or public.is_admin());
create policy "usuario cria proprio perfil" on public.usuarios for insert with check (id = auth.uid());
create policy "usuario atualiza proprio perfil" on public.usuarios for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Anuncios
create policy "usuario cria anuncio" on public.anuncios for insert with check (usuario_id = auth.uid());
create policy "usuario atualiza proprio anuncio" on public.anuncios for update using (usuario_id = auth.uid() or public.is_admin()) with check (usuario_id = auth.uid() or public.is_admin());
create policy "admin deleta anuncio" on public.anuncios for delete using (public.is_admin());

-- Fotos
create policy "usuario cria foto anuncio" on public.fotos_anuncios for insert with check (
  exists(select 1 from public.anuncios a where a.id = anuncio_id and a.usuario_id = auth.uid()) or public.is_admin()
);
create policy "usuario atualiza foto anuncio" on public.fotos_anuncios for update using (
  exists(select 1 from public.anuncios a where a.id = anuncio_id and a.usuario_id = auth.uid()) or public.is_admin()
);
create policy "usuario deleta foto anuncio" on public.fotos_anuncios for delete using (
  exists(select 1 from public.anuncios a where a.id = anuncio_id and a.usuario_id = auth.uid()) or public.is_admin()
);

-- Admin gerencia estruturas
create policy "admin gerencia categorias" on public.categorias for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gerencia cidades" on public.cidades for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gerencia planos" on public.planos for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gerencia destaques" on public.destaques for all using (public.is_admin()) with check (public.is_admin());

-- Denuncias
create policy "usuario cria denuncia" on public.denuncias for insert with check (auth.uid() is not null);
create policy "admin ve denuncias" on public.denuncias for select using (public.is_admin());
create policy "admin atualiza denuncias" on public.denuncias for update using (public.is_admin()) with check (public.is_admin());

-- Storage
insert into storage.buckets (id, name, public)
values ('agromarket', 'agromarket', true)
on conflict (id) do nothing;

create policy "upload fotos autenticado" on storage.objects for insert to authenticated with check (bucket_id = 'agromarket');
create policy "ver fotos publico" on storage.objects for select using (bucket_id = 'agromarket');
create policy "atualizar fotos dono" on storage.objects for update to authenticated using (bucket_id = 'agromarket');
create policy "deletar fotos dono" on storage.objects for delete to authenticated using (bucket_id = 'agromarket');

-- Seeds
insert into public.categorias (nome, slug, tipo, icone, ordem, ativo) values
('Animais', 'animais', 'animal', '🐄', 1, true),
('Ovos férteis', 'ovos-ferteis', 'animal', '🥚', 2, true),
('Produtos Agro', 'produtos-agro', 'produto', '🌽', 3, true),
('Serviços Rurais', 'servicos-rurais', 'servico', '🚜', 4, true),
('Empregos', 'empregos', 'emprego', '👨‍🌾', 5, true),
('Máquinas', 'maquinas', 'maquina', '⚙️', 6, true),
('Equipamentos', 'equipamentos', 'equipamento', '🧰', 7, true),
('Mudas e Sementes', 'mudas-e-sementes', 'produto', '🌱', 8, true)
on conflict (slug) do nothing;

insert into public.cidades (cidade, estado, slug, ordem, ativo) values
('Palmas', 'TO', 'palmas-to', 1, true),
('Gurupi', 'TO', 'gurupi-to', 2, true),
('Porto Nacional', 'TO', 'porto-nacional-to', 3, true),
('Miranorte', 'TO', 'miranorte-to', 4, true),
('Miracema', 'TO', 'miracema-to', 5, true),
('Araguaína', 'TO', 'araguaina-to', 6, true)
on conflict (slug) do nothing;

insert into public.planos (nome, descricao, valor, limite_anuncios, limite_fotos, permite_destaque, duracao_dias, ativo) values
('Grátis', 'Plano inicial para validar anúncios.', 0, 3, 5, false, 30, true),
('Profissional', 'Plano futuro para anunciantes frequentes.', 49.90, 30, 10, true, 30, true)
on conflict do nothing;
