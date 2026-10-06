-- Responsável pelo pedido (pedido do cliente, out/2026):
-- * "Novo" (sem responsável) aparece para toda a equipe da unidade.
-- * Quem tira o pedido de "Novo" (ex.: puxa para "Em análise") vira o
--   responsável, e os outros colaboradores deixam de ver o pedido na tratativa.
-- * Depois de confirmado, o pedido volta a ser encontrável por todos (check-in na
--   recepção: o paciente passa por todos os canais), mas segue com o responsável.
-- * Admin vê tudo. Responsável (ou admin) pode transferir ou devolver à fila.

alter table pedidos add column if not exists responsavel_id uuid;
alter table pedidos add column if not exists responsavel_nome text;
alter table pedidos add column if not exists responsavel_em timestamptz;
create index if not exists pedidos_responsavel_idx on pedidos(responsavel_id);

-- Histórico de quem pegou / transferiu.
create table if not exists public.pedido_responsavel_log (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  acao text not null,               -- assumiu | transferiu | devolveu
  de_nome text,
  para_nome text,
  por_nome text,
  created_at timestamptz not null default now()
);
create index if not exists pedido_responsavel_log_idx on pedido_responsavel_log(pedido_id, created_at desc);
alter table public.pedido_responsavel_log enable row level security;
drop policy if exists pedido_responsavel_log_staff on public.pedido_responsavel_log;
create policy pedido_responsavel_log_staff on public.pedido_responsavel_log for select to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid()));
grant select on public.pedido_responsavel_log to authenticated;
grant all on public.pedido_responsavel_log to service_role;

create or replace function public.nome_staff(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(nome), ''), email) from user_roles where user_id = p_user limit 1
$$;
revoke all on function public.nome_staff(uuid) from public, anon;
grant execute on function public.nome_staff(uuid) to authenticated, service_role;

-- 1) Quem tira o pedido de "Novo" vira o responsável; voltar para "Novo" devolve à fila.
create or replace function public.pedidos_atribuir_responsavel()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from user_roles where user_id = v_uid) then
    return new; -- paciente, webhook, servidor: não atribui
  end if;
  if new.status = 'novo' and old.status <> 'novo' and new.responsavel_id is not null
     and new.responsavel_id is not distinct from old.responsavel_id then
    insert into pedido_responsavel_log (pedido_id, acao, de_nome, por_nome)
    values (new.id, 'devolveu', old.responsavel_nome, nome_staff(v_uid));
    new.responsavel_id := null;
    new.responsavel_nome := null;
    new.responsavel_em := null;
  elsif old.status = 'novo' and new.status not in ('novo', 'cancelado') and new.responsavel_id is null then
    new.responsavel_id := v_uid;
    new.responsavel_nome := nome_staff(v_uid);
    new.responsavel_em := now();
    insert into pedido_responsavel_log (pedido_id, acao, para_nome, por_nome)
    values (new.id, 'assumiu', new.responsavel_nome, new.responsavel_nome);
  end if;
  return new;
end $$;
drop trigger if exists trg_pedidos_responsavel on pedidos;
create trigger trg_pedidos_responsavel before update on pedidos
  for each row execute function public.pedidos_atribuir_responsavel();

-- 2) Visibilidade para a equipe (admin continua vendo tudo).
drop policy if exists staff_read_pedidos on public.pedidos;
create policy staff_read_pedidos on public.pedidos
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or (
      public.has_role(auth.uid(), 'staff'::app_role)
      and public.pode_ver_pedido_unidade(unidade_codigo_shift)
      and (
        responsavel_id is null
        or responsavel_id = auth.uid()
        or status in ('confirmado', 'atendido', 'concluido', 'cancelado')
      )
    )
  );

-- 3) Colegas que podem receber um pedido (ativos; staff precisa ter a unidade).
create or replace function public.colegas_para_transferir(p_pedido_id uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', c.user_id, 'nome', c.nome) order by c.nome), '[]'::jsonb)
  from (
    select ur.user_id, coalesce(nullif(btrim(ur.nome), ''), ur.email) as nome
    from user_roles ur
    where exists (select 1 from user_roles me where me.user_id = auth.uid())
      and coalesce(ur.ativo, true)
      and ur.user_id <> auth.uid()
      and (
        p_pedido_id is null
        or ur.role = 'admin'
        or exists (
          select 1 from pedidos p
          join unidades_cache uc on uc.codigo_shift = p.unidade_codigo_shift
          join user_unidades uu on uu.unidade_id = uc.id
          where p.id = p_pedido_id and uu.user_id = ur.user_id
        )
      )
  ) c
$$;
revoke all on function public.colegas_para_transferir(uuid) from public, anon;
grant execute on function public.colegas_para_transferir(uuid) to authenticated;

-- 4) Transferir (p_para) ou devolver à fila (p_para nulo) um pedido.
create or replace function public.transferir_pedido(p_pedido_id uuid, p_para uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
  v_ped pedidos%rowtype;
  v_para_nome text;
begin
  select * into v_ped from pedidos where id = p_pedido_id;
  if v_ped.id is null then return jsonb_build_object('error', 'Pedido não encontrado.'); end if;
  if not v_admin and v_ped.responsavel_id is distinct from v_uid then
    return jsonb_build_object('error', 'Só o responsável ou um administrador pode transferir este pedido.');
  end if;

  if p_para is null then
    update pedidos set
      responsavel_id = null, responsavel_nome = null, responsavel_em = null,
      status = case when status = 'em_analise' then 'novo' else status end
    where id = p_pedido_id;
    insert into pedido_responsavel_log (pedido_id, acao, de_nome, por_nome)
    values (p_pedido_id, 'devolveu', v_ped.responsavel_nome, nome_staff(v_uid));
    return jsonb_build_object('ok', true);
  end if;

  if not exists (
    select 1 from jsonb_array_elements(public.colegas_para_transferir(p_pedido_id)) c
    where (c->>'user_id')::uuid = p_para
  ) and p_para <> v_uid then
    return jsonb_build_object('error', 'Este colaborador não atende a unidade do pedido ou está inativo.');
  end if;

  v_para_nome := nome_staff(p_para);
  update pedidos set responsavel_id = p_para, responsavel_nome = v_para_nome, responsavel_em = now()
  where id = p_pedido_id;
  insert into pedido_responsavel_log (pedido_id, acao, de_nome, para_nome, por_nome)
  values (p_pedido_id, 'transferiu', v_ped.responsavel_nome, v_para_nome, nome_staff(v_uid));
  return jsonb_build_object('ok', true, 'para', v_para_nome);
end $$;
revoke all on function public.transferir_pedido(uuid, uuid) from public, anon;
grant execute on function public.transferir_pedido(uuid, uuid) to authenticated;

-- 5) Troca de turno: passa TODOS os meus pedidos em andamento para um colega.
create or replace function public.transferir_meus_pedidos(p_para uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_ok int := 0;
  v_pulados int := 0;
  v_res jsonb;
begin
  if p_para is null or p_para = v_uid then return jsonb_build_object('error', 'Escolha um colega.'); end if;
  for r in
    select id from pedidos
    where responsavel_id = v_uid and status not in ('atendido', 'concluido', 'cancelado')
  loop
    v_res := public.transferir_pedido(r.id, p_para);
    if v_res ? 'ok' then v_ok := v_ok + 1; else v_pulados := v_pulados + 1; end if;
  end loop;
  return jsonb_build_object('ok', true, 'transferidos', v_ok, 'pulados', v_pulados, 'para', nome_staff(p_para));
end $$;
revoke all on function public.transferir_meus_pedidos(uuid) from public, anon;
grant execute on function public.transferir_meus_pedidos(uuid) to authenticated;
