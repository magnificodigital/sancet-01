-- Permissões por usuário (ver / editar / excluir por área), definidas SÓ pelo
-- super admin, valendo no painel E no banco.
--
-- Padrão: admin = tudo; staff = perfil de recepção. O que estiver gravado em
-- user_roles.permissoes sobrescreve o padrão, área por área. Super admin = tudo.

create or replace function public.permissoes_padrao(_role text)
returns jsonb language sql immutable as $$
  select case when _role = 'admin' then '{
    "visao": {"ver": true}, "pedidos": {"ver": true, "editar": true, "excluir": true},
    "conversas": {"ver": true, "editar": true}, "checkin": {"ver": true},
    "pacientes": {"ver": true, "editar": true, "excluir": true}, "catalogo": {"ver": true, "editar": true, "excluir": true},
    "unidades": {"ver": true, "editar": true, "excluir": true}, "convenios": {"ver": true, "editar": true},
    "paginas": {"ver": true, "editar": true, "excluir": true}, "recall": {"ver": true, "editar": true},
    "equipe": {"ver": true, "editar": true, "excluir": true}, "config": {"ver": true, "editar": true}, "sync": {"ver": true}
  }'::jsonb else '{
    "visao": {"ver": true}, "pedidos": {"ver": true, "editar": true, "excluir": false},
    "conversas": {"ver": true, "editar": true}, "checkin": {"ver": true},
    "pacientes": {"ver": true, "editar": false, "excluir": false}, "catalogo": {"ver": true, "editar": false, "excluir": false},
    "unidades": {"ver": true, "editar": false, "excluir": false}, "convenios": {"ver": true, "editar": false},
    "paginas": {"ver": false, "editar": false, "excluir": false}, "recall": {"ver": false, "editar": false},
    "equipe": {"ver": false, "editar": false, "excluir": false}, "config": {"ver": false, "editar": false}, "sync": {"ver": false}
  }'::jsonb end;
$$;

-- Permissões efetivas de um usuário (padrão do papel + o que foi personalizado).
create or replace function public.permissoes_de(_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_perm jsonb; v_base jsonb;
begin
  if exists (select 1 from public.super_admins where user_id = _uid) then
    return public.permissoes_padrao('admin');
  end if;
  select role::text, permissoes into v_role, v_perm from public.user_roles
  where user_id = _uid and coalesce(ativo, true) limit 1;
  if v_role is null then return '{}'::jsonb; end if;
  v_base := public.permissoes_padrao(v_role);
  if v_perm is null or jsonb_typeof(v_perm) <> 'object' then return v_base; end if;
  return (
    select jsonb_object_agg(k, (v_base -> k) || coalesce(case when jsonb_typeof(v_perm -> k) = 'object' then v_perm -> k end, '{}'::jsonb))
    from jsonb_object_keys(v_base) k
  );
end $$;

create or replace function public.minhas_permissoes()
returns jsonb language sql stable security definer set search_path = public as $$
  select public.permissoes_de(auth.uid());
$$;

create or replace function public.tem_permissao(_modulo text, _acao text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((public.permissoes_de(auth.uid()) -> _modulo ->> _acao)::boolean, false);
$$;

revoke all on function public.permissoes_de(uuid) from public, anon, authenticated;
revoke all on function public.minhas_permissoes() from public, anon;
grant execute on function public.minhas_permissoes() to authenticated;
revoke all on function public.tem_permissao(text, text) from public, anon;
grant execute on function public.tem_permissao(text, text) to authenticated;

-- Admins tinham permissões gravadas que eram ignoradas: zera para não restringir ninguém de repente.
update public.user_roles set permissoes = null where role = 'admin';

-- ---------- Super admin: lista e define permissões ----------
create or replace function public.equipe_permissoes()
returns table (user_id uuid, email text, nome text, role text, ativo boolean, super_admin boolean, permissoes jsonb, personalizadas jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Somente o super admin.' using errcode = '42501'; end if;
  return query
  select r.user_id, r.email, r.nome, r.role::text, coalesce(r.ativo, true),
         exists (select 1 from public.super_admins s where s.user_id = r.user_id),
         public.permissoes_de(r.user_id), r.permissoes
  from public.user_roles r
  where r.role in ('admin', 'staff')
  order by r.role, coalesce(r.nome, r.email);
end $$;

create or replace function public.definir_permissoes(_user_id uuid, _permissoes jsonb, _role text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Somente o super admin.' using errcode = '42501'; end if;
  if _permissoes is not null and jsonb_typeof(_permissoes) <> 'object' then raise exception 'Permissões inválidas.'; end if;
  if _role is not null and _role not in ('admin', 'staff') then raise exception 'Papel inválido.'; end if;
  if _user_id = auth.uid() and _role is not null and _role <> 'admin' then raise exception 'Você não pode tirar o próprio acesso de admin.'; end if;
  update public.user_roles
  set permissoes = _permissoes, role = coalesce(_role::app_role, role)
  where user_id = _user_id;
end $$;

do $$
declare f text;
begin
  foreach f in array array['equipe_permissoes()', 'definir_permissoes(uuid,jsonb,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Papel e permissões só mudam pelo super admin (ou pelo servidor).
create or replace function public.user_roles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_super_admin() and (
       new.permissoes is distinct from old.permissoes or new.role is distinct from old.role
  ) then
    raise exception 'Somente o super admin altera papel e permissões.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists user_roles_guard on public.user_roles;
create trigger user_roles_guard before update on public.user_roles
  for each row execute function public.user_roles_guard();

-- ---------- Aplicação no banco ----------
-- Pedidos: sem "editar", a equipe só consegue marcar como visto.
create or replace function public.pedidos_guard_permissao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.chat_eh_equipe()
     and not public.tem_permissao('pedidos', 'editar')
     and not public.tem_permissao('checkin', 'ver')
     and (to_jsonb(new) - 'staff_visto_em' - 'updated_at') is distinct from (to_jsonb(old) - 'staff_visto_em' - 'updated_at')
  then
    raise exception 'Sem permissão para editar pedidos.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists pedidos_guard_permissao on public.pedidos;
create trigger pedidos_guard_permissao before update on public.pedidos
  for each row execute function public.pedidos_guard_permissao();

drop policy if exists staff_delete_pedidos on public.pedidos;
create policy staff_delete_pedidos on public.pedidos for delete to authenticated
  using (public.chat_eh_equipe() and public.tem_permissao('pedidos', 'excluir'));

-- Pacientes
drop policy if exists staff_update_pacientes on public.pacientes;
create policy staff_update_pacientes on public.pacientes for update to authenticated
  using ((has_role(auth.uid(), 'admin'::app_role) or (has_role(auth.uid(), 'staff'::app_role) and staff_pode_ver_paciente(id)))
         and public.tem_permissao('pacientes', 'editar'))
  with check ((has_role(auth.uid(), 'admin'::app_role) or (has_role(auth.uid(), 'staff'::app_role) and staff_pode_ver_paciente(id)))
         and public.tem_permissao('pacientes', 'editar'));
drop policy if exists staff_delete_pacientes on public.pacientes;
create policy staff_delete_pacientes on public.pacientes for delete to authenticated
  using ((has_role(auth.uid(), 'admin'::app_role) or (has_role(auth.uid(), 'staff'::app_role) and staff_pode_ver_paciente(id)))
         and public.tem_permissao('pacientes', 'excluir'));

-- Catálogo, convênios e unidades: leitura da equipe continua; escrita conforme permissão.
do $$
declare t record;
begin
  for t in select * from (values
    ('exames_cache', 'staff_write_exames', 'catalogo'),
    ('vacinas_cache', 'staff_write_vacinas', 'catalogo'),
    ('exames_convenio', 'conv_wr', 'catalogo'),
    ('exame_preparo', 'prep_wr', 'catalogo'),
    ('convenios_cache', 'staff_write_convenios', 'convenios'),
    ('convenios_planos', 'staff_write_planos', 'convenios'),
    ('unidades_cache', 'staff_write_unidades', 'unidades')
  ) as x(tabela, politica, modulo)
  loop
    execute format('drop policy if exists %I on public.%I', t.politica, t.tabela);
    execute format('drop policy if exists %I on public.%I', t.tabela || '_equipe_ler', t.tabela);
    execute format('drop policy if exists %I on public.%I', t.tabela || '_equipe_inserir', t.tabela);
    execute format('drop policy if exists %I on public.%I', t.tabela || '_equipe_editar', t.tabela);
    execute format('drop policy if exists %I on public.%I', t.tabela || '_equipe_excluir', t.tabela);
    execute format('create policy %I on public.%I for select to authenticated using (public.chat_eh_equipe())', t.tabela || '_equipe_ler', t.tabela);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.chat_eh_equipe() and public.tem_permissao(%L, ''editar''))', t.tabela || '_equipe_inserir', t.tabela, t.modulo);
    execute format('create policy %I on public.%I for update to authenticated using (public.chat_eh_equipe() and public.tem_permissao(%L, ''editar'')) with check (public.chat_eh_equipe() and public.tem_permissao(%L, ''editar''))', t.tabela || '_equipe_editar', t.tabela, t.modulo, t.modulo);
    execute format('create policy %I on public.%I for delete to authenticated using (public.chat_eh_equipe() and public.tem_permissao(%L, %L))', t.tabela || '_equipe_excluir', t.tabela, t.modulo,
      case when t.modulo = 'convenios' then 'editar' else 'excluir' end);
  end loop;
end $$;
drop policy if exists admin_write_convenios_planos on public.convenios_planos;
drop policy if exists admin_delete_unidades on public.unidades_cache;

-- Configurações: escrever exige config.editar (senhas de integração continuam só super admin).
drop policy if exists staff_insert_configuracoes on public.configuracoes;
create policy staff_insert_configuracoes on public.configuracoes for insert to authenticated
  with check (public.chat_eh_equipe() and public.tem_permissao('config', 'editar')
              and (not public.config_chave_restrita(chave) or public.is_super_admin()));
drop policy if exists staff_update_configuracoes on public.configuracoes;
create policy staff_update_configuracoes on public.configuracoes for update to authenticated
  using (public.chat_eh_equipe() and public.tem_permissao('config', 'editar')
         and (not public.config_chave_restrita(chave) or public.is_super_admin()))
  with check (public.chat_eh_equipe() and public.tem_permissao('config', 'editar')
              and (not public.config_chave_restrita(chave) or public.is_super_admin()));
drop policy if exists staff_delete_configuracoes on public.configuracoes;
create policy staff_delete_configuracoes on public.configuracoes for delete to authenticated
  using (public.chat_eh_equipe() and public.tem_permissao('config', 'editar')
         and (not public.config_chave_restrita(chave) or public.is_super_admin()));

-- Equipe (usuários e unidades de cada um).
drop policy if exists "Admins manage roles" on public.user_roles;
drop policy if exists user_roles_admin_ler on public.user_roles;
drop policy if exists user_roles_equipe_editar on public.user_roles;
drop policy if exists user_roles_equipe_excluir on public.user_roles;
create policy user_roles_admin_ler on public.user_roles for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role) or public.is_super_admin());
create policy user_roles_equipe_editar on public.user_roles for update to authenticated
  using (public.tem_permissao('equipe', 'editar')) with check (public.tem_permissao('equipe', 'editar'));
create policy user_roles_equipe_excluir on public.user_roles for delete to authenticated
  using (public.tem_permissao('equipe', 'excluir'));
drop policy if exists admin_all_user_unidades on public.user_unidades;
drop policy if exists user_unidades_admin_ler on public.user_unidades;
drop policy if exists user_unidades_equipe_escrever on public.user_unidades;
create policy user_unidades_admin_ler on public.user_unidades for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
create policy user_unidades_equipe_escrever on public.user_unidades for all to authenticated
  using (public.tem_permissao('equipe', 'editar')) with check (public.tem_permissao('equipe', 'editar'));

-- Conversas: ver / responder.
create or replace function public.chat_pode_ver(_unidade text, _responsavel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.tem_permissao('conversas', 'ver') and (
    public.has_role(auth.uid(), 'admin'::app_role)
    or (public.has_role(auth.uid(), 'staff'::app_role) and (
      _unidade is null or _responsavel = auth.uid() or public.pode_ver_pedido_unidade(_unidade)
    )));
$$;
create or replace function public.chat_pode_mexer(_c public.chat_conversas)
returns boolean language sql stable security definer set search_path = public as $$
  select public.chat_eh_equipe()
    and public.tem_permissao('conversas', 'editar')
    and public.chat_pode_ver(_c.unidade_codigo_shift, _c.responsavel_id)
    and (_c.responsavel_id is null or _c.responsavel_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));
$$;
