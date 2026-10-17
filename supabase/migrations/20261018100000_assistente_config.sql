-- Assistente virtual: liberação (só admin master) + ajustes de voz (admins).
--
-- * super_admins: quem pode LIGAR/DESLIGAR o assistente no site. Só se altera
--   pelo SQL Editor (sem policies = ninguém do app escreve/lê).
-- * assistente_config (linha única):
--     - chat_modo / voz_liberada / codigo_teste → SOMENTE admin master (trigger);
--     - voz_modelo, voz_nome, voz_max_minutos, saudação, instruções → admins.
-- * assistente_status(): o que o site público precisa saber (sem segredos).

create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.super_admins enable row level security;
revoke all on public.super_admins from anon, authenticated;
grant all on public.super_admins to service_role;

insert into public.super_admins (user_id)
select id from auth.users where lower(email) = 'willy@aikortex.com'
on conflict do nothing;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.super_admins where user_id = auth.uid());
$$;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

create table if not exists public.assistente_config (
  id int primary key default 1 check (id = 1),
  chat_modo text not null default 'desligado' check (chat_modo in ('desligado', 'teste', 'ligado')),
  voz_liberada boolean not null default false,
  codigo_teste text not null default replace(gen_random_uuid()::text, '-', ''),
  voz_modelo text not null default 'gpt-realtime',
  voz_nome text not null default 'marin',
  voz_max_minutos int not null default 8 check (voz_max_minutos between 1 and 30),
  voz_saudacao text,
  instrucoes_extras text,
  atualizado_por uuid,
  atualizado_em timestamptz not null default now()
);
insert into public.assistente_config (id) values (1) on conflict do nothing;

create or replace function public.assistente_config_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = SQL Editor / service role (permitido).
  if auth.uid() is not null and not public.is_super_admin() and (
       new.chat_modo is distinct from old.chat_modo
    or new.voz_liberada is distinct from old.voz_liberada
    or new.codigo_teste is distinct from old.codigo_teste
  ) then
    raise exception 'Somente o administrador master pode liberar ou desligar o assistente.' using errcode = '42501';
  end if;
  new.id := 1;
  new.atualizado_por := auth.uid();
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists assistente_config_guard on public.assistente_config;
create trigger assistente_config_guard before update on public.assistente_config
  for each row execute function public.assistente_config_guard();

alter table public.assistente_config enable row level security;
drop policy if exists assistente_config_admin_sel on public.assistente_config;
create policy assistente_config_admin_sel on public.assistente_config for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));
drop policy if exists assistente_config_admin_upd on public.assistente_config;
create policy assistente_config_admin_upd on public.assistente_config for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- O código do link de teste NÃO é legível pelos admins comuns.
revoke all on public.assistente_config from anon, authenticated;
grant select (id, chat_modo, voz_liberada, voz_modelo, voz_nome, voz_max_minutos, voz_saudacao,
              instrucoes_extras, atualizado_por, atualizado_em)
  on public.assistente_config to authenticated;
grant update (chat_modo, voz_liberada, codigo_teste, voz_modelo, voz_nome, voz_max_minutos,
              voz_saudacao, instrucoes_extras)
  on public.assistente_config to authenticated;
grant all on public.assistente_config to service_role;

-- Site público: só o modo do chat e se a voz está liberada.
create or replace function public.assistente_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('chat', chat_modo, 'voz', voz_liberada) from public.assistente_config where id = 1;
$$;
grant execute on function public.assistente_status() to anon, authenticated;

-- Link de teste: só o admin master vê / gera um novo código.
create or replace function public.assistente_codigo_teste(_renovar boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_super_admin() then
    raise exception 'Somente o administrador master.' using errcode = '42501';
  end if;
  if _renovar then
    update public.assistente_config set codigo_teste = replace(gen_random_uuid()::text, '-', '') where id = 1;
  end if;
  select codigo_teste into v from public.assistente_config where id = 1;
  return v;
end $$;
revoke all on function public.assistente_codigo_teste(boolean) from public, anon;
grant execute on function public.assistente_codigo_teste(boolean) to authenticated;
