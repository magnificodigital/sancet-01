-- Avisos: lightboxes/popups configuráveis que aparecem em áreas escolhidas do site.
create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default '',
  conteudo_html text not null default '',
  imagem_url text,
  link_url text,
  link_texto text,
  ativo boolean not null default true,
  alvo jsonb not null default '["*"]'::jsonb,   -- caminhos; "*" = todas as páginas
  frequencia text not null default 'dia',        -- 'sempre' | 'sessao' | 'dia'
  ordem integer not null default 0,
  inicio timestamptz,
  fim timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists idx_avisos_ativo on public.avisos (ativo, ordem);

alter table public.avisos enable row level security;
grant select on public.avisos to anon, authenticated;
grant insert, update, delete on public.avisos to authenticated;

-- Público lê só avisos ativos; staff/admin lê tudo.
drop policy if exists "avisos_select" on public.avisos;
create policy "avisos_select" on public.avisos for select
  using (
    ativo = true
    or public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  );

-- Escrita só staff/admin.
drop policy if exists "avisos_write" on public.avisos;
create policy "avisos_write" on public.avisos for all to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  )
  with check (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'staff'::app_role)
  );
