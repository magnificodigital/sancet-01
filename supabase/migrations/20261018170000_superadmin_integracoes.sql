-- Super Admin da plataforma: integrações (chaves de API em cofre), modelos de
-- IA por função, gestão de super admins e proteção das senhas de integração.

-- ---------- Cofre de chaves (ninguém do app lê; só o servidor) ----------
create table if not exists public.integracoes_segredos (
  chave text primary key,
  valor text not null,
  atualizado_por uuid,
  atualizado_em timestamptz not null default now()
);
alter table public.integracoes_segredos enable row level security;
revoke all on public.integracoes_segredos from anon, authenticated;
grant all on public.integracoes_segredos to service_role;

-- Chaves aceitas no cofre.
create or replace function public.integracoes_chaves_validas()
returns text[] language sql immutable as $$
  select array['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY'];
$$;

-- Status para a tela (nunca devolve a chave; só os 4 últimos caracteres).
create or replace function public.integracoes_status()
returns table (chave text, configurada boolean, final text, atualizado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Somente o super admin.' using errcode = '42501'; end if;
  return query
  select k, s.valor is not null, case when s.valor is null then null else right(s.valor, 4) end, s.atualizado_em
  from unnest(public.integracoes_chaves_validas()) k
  left join public.integracoes_segredos s on s.chave = k;
end $$;

create or replace function public.integracao_salvar(_chave text, _valor text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Somente o super admin.' using errcode = '42501'; end if;
  if not (_chave = any(public.integracoes_chaves_validas())) then raise exception 'Chave inválida.'; end if;
  _valor := nullif(trim(coalesce(_valor, '')), '');
  if _valor is null then
    delete from public.integracoes_segredos where chave = _chave;
  else
    if length(_valor) > 500 then raise exception 'Chave muito longa.'; end if;
    insert into public.integracoes_segredos (chave, valor, atualizado_por, atualizado_em)
    values (_chave, _valor, auth.uid(), now())
    on conflict (chave) do update set valor = excluded.valor, atualizado_por = auth.uid(), atualizado_em = now();
  end if;
end $$;

-- ---------- Modelos de IA por função ----------
create table if not exists public.plataforma_config (
  id int primary key default 1 check (id = 1),
  modelo_chat text not null default 'google/gemini-2.5-flash',
  modelo_receita text not null default 'google/gemini-2.5-flash',
  modelo_voz text not null default 'gpt-realtime',
  modelo_transcricao text not null default 'gpt-4o-mini-transcribe',
  atualizado_por uuid,
  atualizado_em timestamptz not null default now()
);
insert into public.plataforma_config (id, modelo_chat, modelo_voz)
select 1, coalesce(nullif(a.chat_modelo, ''), 'google/gemini-2.5-flash'), coalesce(nullif(a.voz_modelo, ''), 'gpt-realtime')
from public.assistente_config a where a.id = 1
on conflict (id) do nothing;
insert into public.plataforma_config (id) values (1) on conflict (id) do nothing;
-- Leitura de pedido médico: aproveita o modelo que já estava nas configurações.
update public.plataforma_config p set modelo_receita = c.valor
from public.configuracoes c
where p.id = 1 and c.chave = 'OPENROUTER_MODELO' and coalesce(trim(c.valor), '') <> ''
  and c.valor not ilike '%preview%';

alter table public.plataforma_config enable row level security;
revoke all on public.plataforma_config from anon, authenticated;
grant all on public.plataforma_config to service_role;
grant select, update on public.plataforma_config to authenticated;
drop policy if exists plataforma_config_super on public.plataforma_config;
create policy plataforma_config_super on public.plataforma_config for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------- Super admins ----------
create or replace function public.super_admins_listar()
returns table (user_id uuid, email text, nome text, desde timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Somente o super admin.' using errcode = '42501'; end if;
  return query
  select s.user_id, u.email::text, r.nome, s.created_at
  from public.super_admins s
  join auth.users u on u.id = s.user_id
  left join public.user_roles r on r.user_id = s.user_id
  order by s.created_at;
end $$;

create or replace function public.super_admin_adicionar(_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not public.is_super_admin() then raise exception 'Somente o super admin.' using errcode = '42501'; end if;
  select r.user_id into v from public.user_roles r
  where lower(r.email) = lower(trim(_email)) and r.role = 'admin' and coalesce(r.ativo, true) limit 1;
  if v is null then raise exception 'Esse e-mail precisa ser de um ADMIN ativo da equipe (cadastre em Equipe primeiro).'; end if;
  insert into public.super_admins (user_id) values (v) on conflict do nothing;
end $$;

create or replace function public.super_admin_remover(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Somente o super admin.' using errcode = '42501'; end if;
  if (select count(*) from public.super_admins) <= 1 then raise exception 'Precisa existir pelo menos um super admin.'; end if;
  delete from public.super_admins where user_id = _user_id;
end $$;

do $$
declare f text;
begin
  foreach f in array array['integracoes_status()', 'integracao_salvar(text,text)', 'super_admins_listar()',
                           'super_admin_adicionar(text)', 'super_admin_remover(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- Senhas de integração em "configuracoes": só o super admin ----------
create or replace function public.config_chave_restrita(_chave text)
returns boolean language sql immutable as $$
  select _chave = any(array['SHIFT_SENHA', 'SHIFT_USER_ID', 'SHIFT_ENDPOINT', 'SHIFT_ENDPOINT_MOBILE',
    'OPENROUTER_API_KEY', 'OPENROUTER_MODELO', 'ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN', 'MERCADOPAGO_ACCESS_TOKEN',
    'PAGHIPER_API_KEY', 'PAGHIPER_TOKEN', 'RESEND_API_KEY', 'GATEWAY_ATIVO']);
$$;

drop policy if exists staff_select_configuracoes on public.configuracoes;
create policy staff_select_configuracoes on public.configuracoes for select to authenticated
  using ((has_role(auth.uid(), 'staff'::app_role) or has_role(auth.uid(), 'admin'::app_role))
         and (not public.config_chave_restrita(chave) or public.is_super_admin()));
drop policy if exists staff_insert_configuracoes on public.configuracoes;
create policy staff_insert_configuracoes on public.configuracoes for insert to authenticated
  with check ((has_role(auth.uid(), 'staff'::app_role) or has_role(auth.uid(), 'admin'::app_role))
              and (not public.config_chave_restrita(chave) or public.is_super_admin()));
drop policy if exists staff_update_configuracoes on public.configuracoes;
create policy staff_update_configuracoes on public.configuracoes for update to authenticated
  using ((has_role(auth.uid(), 'staff'::app_role) or has_role(auth.uid(), 'admin'::app_role))
         and (not public.config_chave_restrita(chave) or public.is_super_admin()))
  with check ((has_role(auth.uid(), 'staff'::app_role) or has_role(auth.uid(), 'admin'::app_role))
              and (not public.config_chave_restrita(chave) or public.is_super_admin()));
drop policy if exists staff_delete_configuracoes on public.configuracoes;
create policy staff_delete_configuracoes on public.configuracoes for delete to authenticated
  using ((has_role(auth.uid(), 'staff'::app_role) or has_role(auth.uid(), 'admin'::app_role))
         and (not public.config_chave_restrita(chave) or public.is_super_admin()));

-- A chave da OpenRouter guardada aqui nunca foi usada (as funções liam só os
-- secrets do Supabase) e ficava visível para toda a equipe: sai da tabela aberta.
-- Para trocar a chave, use Super Admin > Integrações (cofre).
delete from public.configuracoes where chave in ('OPENROUTER_API_KEY', 'OPENROUTER_MODELO');
