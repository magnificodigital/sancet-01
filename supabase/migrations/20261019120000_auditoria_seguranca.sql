-- Auditoria de segurança (out/2026).

-- ---------- Limitador de uso (anti-abuso das funções públicas) ----------
create table if not exists public.rate_limits (
  chave text not null,
  janela timestamptz not null,
  contagem int not null default 0,
  primary key (chave, janela)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant all on public.rate_limits to service_role;

create or replace function public.rate_limit_consumir(_chave text, _limite int, _janela_seg int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_janela timestamptz; v_cont int;
begin
  v_janela := to_timestamp(floor(extract(epoch from now()) / greatest(_janela_seg, 1)) * greatest(_janela_seg, 1));
  insert into public.rate_limits (chave, janela, contagem) values (left(_chave, 200), v_janela, 1)
  on conflict (chave, janela) do update set contagem = public.rate_limits.contagem + 1
  returning contagem into v_cont;
  return v_cont <= _limite;
end $$;
revoke all on function public.rate_limit_consumir(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_consumir(text, int, int) to service_role;

do $$
begin
  perform cron.unschedule('limpar-rate-limits') where exists (select 1 from cron.job where jobname = 'limpar-rate-limits');
  perform cron.schedule('limpar-rate-limits', '17 * * * *', $c$delete from public.rate_limits where janela < now() - interval '1 day'$c$);
end $$;

-- ---------- Funções de gatilho não devem ser chamáveis pela API ----------
do $$
declare f text;
begin
  foreach f in array array['assistente_config_guard()', 'chat_mensagem_inserida()', 'pedidos_atribuir_responsavel()',
                           'pedidos_guard_permissao()', 'user_roles_guard()', 'chat_conversa_fila()'] loop
    begin
      execute format('revoke all on function public.%s from public, anon, authenticated', f);
    exception when undefined_function then null;
    end;
  end loop;
end $$;

-- ---------- search_path fixo ----------
alter function public.integracoes_chaves_validas() set search_path = public;
alter function public.config_chave_restrita(text) set search_path = public;
alter function public.chat_conversa_fila() set search_path = public;
alter function public.permissoes_padrao(text) set search_path = public;

-- ---------- Nome/e-mail da equipe: só para a equipe (ou o sistema) ----------
create or replace function public.nome_staff(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null or public.chat_eh_equipe()
    then (select coalesce(nullif(btrim(nome), ''), email) from public.user_roles where user_id = p_user limit 1) end;
$$;
create or replace function public.chat_nome_equipe(_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null or public.chat_eh_equipe()
    then (select coalesce(nullif(trim(r.nome), ''), split_part(r.email, '@', 1), 'Atendente')
          from public.user_roles r where r.user_id = _uid limit 1) end;
$$;

-- ---------- Recall: lista de pacientes só com permissão de Recall ----------
do $$
declare d text;
begin
  select pg_get_functiondef('public.recall_candidatos()'::regprocedure) into d;
  d := replace(d,
    'and not exists (select 1 from user_roles where user_id = auth.uid()) then',
    'and not public.tem_permissao(''recall'', ''ver'') then');
  execute d;
end $$;

-- ---------- Índices de chaves estrangeiras ----------
create index if not exists chat_conversas_paciente_idx on public.chat_conversas(paciente_id);
create index if not exists chat_conversas_pedido_idx on public.chat_conversas(pedido_id);
create index if not exists ia_lacunas_conversa_idx on public.ia_lacunas(conversa_id);
create index if not exists ia_lacunas_norm_idx on public.ia_lacunas(pergunta_norm) where status = 'aberta';

-- ---------- Ações que dependem de super admin (servidor confere) ----------
create or replace function public.eh_super_admin_uid(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.super_admins where user_id = _uid);
$$;
revoke all on function public.eh_super_admin_uid(uuid) from public, anon, authenticated;
grant execute on function public.eh_super_admin_uid(uuid) to service_role;

-- Permissão de um usuário qualquer (para as edge functions conferirem com service role).
create or replace function public.tem_permissao_uid(_uid uuid, _modulo text, _acao text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((public.permissoes_de(_uid) -> _modulo ->> _acao)::boolean, false);
$$;
revoke all on function public.tem_permissao_uid(uuid, text, text) from public, anon, authenticated;
grant execute on function public.tem_permissao_uid(uuid, text, text) to service_role;

-- Busca de usuário de login por e-mail (sem o limite de 200 do listUsers).
create or replace function public.auth_user_por_email(_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(trim(_email)) limit 1;
$$;
revoke all on function public.auth_user_por_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_por_email(text) to service_role;
