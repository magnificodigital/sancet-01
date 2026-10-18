-- Chat: fila com prazo, distribuição automática (rodízio entre atendentes
-- online da unidade), status Online/Ausente e resumo da IA para a equipe.

create extension if not exists pg_cron;

alter table public.chat_conversas
  add column if not exists fila_desde timestamptz,
  add column if not exists fila_aviso_em timestamptz,
  add column if not exists atribuida_em timestamptz,
  add column if not exists resumo text,
  add column if not exists resumo_em timestamptz;

alter table public.assistente_config
  add column if not exists fila_distribuir boolean not null default true,
  add column if not exists fila_prazo_min int not null default 5 check (fila_prazo_min between 1 and 240),
  add column if not exists fila_sem_resposta_min int not null default 15 check (fila_sem_resposta_min between 1 and 1440),
  add column if not exists fila_sem_resposta_acao text not null default 'avisar' check (fila_sem_resposta_acao in ('avisar', 'ia', 'nada')),
  add column if not exists fila_max_por_atendente int not null default 6 check (fila_max_por_atendente between 1 and 50),
  add column if not exists fila_incluir_admins boolean not null default false,
  add column if not exists msg_fila_demora text;
grant select (fila_distribuir, fila_prazo_min, fila_sem_resposta_min, fila_sem_resposta_acao, fila_max_por_atendente, fila_incluir_admins, msg_fila_demora)
  on public.assistente_config to authenticated;
grant update (fila_distribuir, fila_prazo_min, fila_sem_resposta_min, fila_sem_resposta_acao, fila_max_por_atendente, fila_incluir_admins, msg_fila_demora)
  on public.assistente_config to authenticated;

-- Prazos da fila para a tela (equipe comum não lê a tabela de config).
create or replace function public.chat_fila_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.chat_eh_equipe() then jsonb_build_object(
    'prazo_min', fila_prazo_min, 'sem_resposta_min', fila_sem_resposta_min, 'distribuir', fila_distribuir
  ) else null end from public.assistente_config where id = 1;
$$;
revoke all on function public.chat_fila_config() from public, anon;
grant execute on function public.chat_fila_config() to authenticated;

-- Entrou na fila: marca o início da espera.
create or replace function public.chat_conversa_fila()
returns trigger language plpgsql as $$
begin
  if new.status = 'aguardando' and (tg_op = 'INSERT' or old.status is distinct from 'aguardando') then
    new.fila_desde := now();
    new.fila_aviso_em := null;
  end if;
  return new;
end $$;
drop trigger if exists chat_conversa_fila on public.chat_conversas;
create trigger chat_conversa_fila before insert or update of status on public.chat_conversas
  for each row execute function public.chat_conversa_fila();

-- ---------- Status dos atendentes ----------
create table if not exists public.atendentes_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'online' check (status in ('online', 'ausente')),
  ultimo_ping timestamptz not null default now(),
  ultima_atribuicao timestamptz
);
alter table public.atendentes_status enable row level security;
revoke all on public.atendentes_status from anon, authenticated;
grant select on public.atendentes_status to authenticated;
grant all on public.atendentes_status to service_role;
drop policy if exists atendentes_status_equipe on public.atendentes_status;
create policy atendentes_status_equipe on public.atendentes_status for select to authenticated
  using (public.chat_eh_equipe());

-- ---------- Distribuição (rodízio) ----------
create or replace function public.chat_distribuir(_conversa uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; cfg public.assistente_config; v uuid; v_nome text;
begin
  select * into cfg from public.assistente_config where id = 1;
  if not coalesce(cfg.fila_distribuir, true) then return null; end if;
  select * into c from public.chat_conversas where id = _conversa for update skip locked;
  if not found or c.status <> 'aguardando' or c.responsavel_id is not null then return null; end if;

  select a.user_id into v
  from public.atendentes_status a
  join public.user_roles r on r.user_id = a.user_id
  where a.status = 'online'
    and a.ultimo_ping > now() - interval '3 minutes'
    and coalesce(r.ativo, true)
    and (r.role = 'staff' or (r.role = 'admin' and coalesce(cfg.fila_incluir_admins, false)))
    and (
      c.unidade_codigo_shift is null or r.role = 'admin' or exists (
        select 1 from public.user_unidades uu join public.unidades_cache uc on uc.id = uu.unidade_id
        where uu.user_id = a.user_id and uc.codigo_shift = c.unidade_codigo_shift
      )
    )
    and (select count(*) from public.chat_conversas x where x.responsavel_id = a.user_id and x.status = 'humano')
        < coalesce(cfg.fila_max_por_atendente, 6)
  order by (r.role = 'admin'),
           (select count(*) from public.chat_conversas x where x.responsavel_id = a.user_id and x.status = 'humano'),
           a.ultima_atribuicao nulls first
  limit 1;
  if v is null then return null; end if;

  v_nome := public.chat_nome_equipe(v);
  update public.chat_conversas set responsavel_id = v, status = 'humano', ia_ativa = false, atribuida_em = now() where id = _conversa;
  update public.atendentes_status set ultima_atribuicao = now() where user_id = v;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema', v_nome || ' (equipe Sancet) vai te atender. 🙂',
          jsonb_build_object('publico', true, 'evento', 'atribuida', 'para', v));
  return v;
end $$;
revoke all on function public.chat_distribuir(uuid) from public, anon, authenticated;
grant execute on function public.chat_distribuir(uuid) to service_role;

-- Atendente avisa que está com o painel aberto (a cada minuto) e o status.
create or replace function public.chat_ping(_status text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_status text; r record;
begin
  if not public.chat_eh_equipe() then return null; end if;
  insert into public.atendentes_status (user_id, status, ultimo_ping)
  values (auth.uid(), coalesce(_status, 'online'), now())
  on conflict (user_id) do update
    set status = coalesce(_status, public.atendentes_status.status), ultimo_ping = now()
  returning status into v_status;
  -- Chegou online: puxa conversas paradas na fila.
  if v_status = 'online' then
    for r in
      select id from public.chat_conversas
      where status = 'aguardando' and responsavel_id is null
      order by fila_desde nulls last limit 5
    loop
      perform public.chat_distribuir(r.id);
    end loop;
  end if;
  return v_status;
end $$;
revoke all on function public.chat_ping(text) from public, anon;
grant execute on function public.chat_ping(text) to authenticated;

-- ---------- Verificação da fila (a cada minuto) ----------
create or replace function public.chat_verificar_fila()
returns void language plpgsql security definer set search_path = public as $$
declare cfg public.assistente_config; r record; v_msg text;
begin
  select * into cfg from public.assistente_config where id = 1;
  for r in select id from public.chat_conversas where status = 'aguardando' and responsavel_id is null order by fila_desde loop
    perform public.chat_distribuir(r.id);
  end loop;

  if coalesce(cfg.fila_sem_resposta_acao, 'avisar') = 'nada' then return; end if;
  for r in
    select id from public.chat_conversas
    where status = 'aguardando' and responsavel_id is null and fila_aviso_em is null
      and fila_desde < now() - make_interval(mins => coalesce(cfg.fila_sem_resposta_min, 15))
  loop
    if cfg.fila_sem_resposta_acao = 'ia' then
      update public.chat_conversas set status = 'ia', ia_ativa = true, fila_aviso_em = now() where id = r.id;
      v_msg := 'Nossa equipe está com bastante movimento agora. Enquanto isso, a assistente virtual continua te ajudando por aqui. 🙂';
    else
      update public.chat_conversas set fila_aviso_em = now() where id = r.id;
      v_msg := coalesce(nullif(trim(cfg.msg_fila_demora), ''),
        'Nossa equipe está com bastante movimento agora, mas sua conversa está na fila e será respondida assim que possível. Obrigado pela paciência! 🙏');
    end if;
    insert into public.chat_mensagens (conversa_id, autor, texto, meta)
    values (r.id, 'sistema', v_msg, jsonb_build_object('publico', true, 'evento', 'fila_demora'));
  end loop;
end $$;
revoke all on function public.chat_verificar_fila() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('chat-verificar-fila') where exists (select 1 from cron.job where jobname = 'chat-verificar-fila');
  perform cron.schedule('chat-verificar-fila', '* * * * *', 'select public.chat_verificar_fila()');
end $$;
