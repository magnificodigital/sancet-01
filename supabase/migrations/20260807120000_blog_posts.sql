-- Blog: tabela de posts.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  wp_id integer,
  slug text not null unique,
  titulo text not null,
  categoria text,
  capa_url text,
  resumo text,
  conteudo_html text not null default '',
  autor text,
  publicado boolean not null default true,
  publicado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
-- Índice UNIQUE simples (não parcial) para o ON CONFLICT (wp_id) do importador.
-- Múltiplos NULL são permitidos (posts criados manualmente sem wp_id).
create unique index if not exists idx_posts_wp_id on public.posts (wp_id);
create index if not exists idx_posts_publicado_em on public.posts (publicado_em desc);
create index if not exists idx_posts_categoria on public.posts (categoria);

alter table public.posts enable row level security;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

-- Público lê publicados; staff/admin lê tudo.
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select
  using (
    publicado = true
    or public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  );

-- Escrita só staff/admin.
drop policy if exists "posts_write" on public.posts;
create policy "posts_write" on public.posts for all to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  )
  with check (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  );
