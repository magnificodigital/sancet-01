-- LGPD: log de auditoria de acesso a dados de paciente pela equipe.
-- Registra quem (staff/admin) abriu qual paciente/pedido/resultado e quando.
create table if not exists public.auditoria_acesso (
  id uuid primary key default gen_random_uuid(),
  ator_user_id uuid,
  ator_email text,
  paciente_id uuid,
  paciente_nome text,
  acao text not null,
  detalhe text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_auditoria_acesso_criado on public.auditoria_acesso (criado_em desc);

alter table public.auditoria_acesso enable row level security;
grant select on public.auditoria_acesso to authenticated;

-- Só admin pode LER o log. Ninguém insere direto (apenas via RPC).
drop policy if exists "auditoria_admin_select" on public.auditoria_acesso;
create policy "auditoria_admin_select" on public.auditoria_acesso
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- Registra um acesso. SECURITY DEFINER; só grava se o chamador for staff/admin.
create or replace function public.registrar_acesso(
  p_paciente_id uuid,
  p_acao text,
  p_detalhe text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_nome text;
begin
  if not (public.has_role(auth.uid(), 'admin'::app_role)
          or public.has_role(auth.uid(), 'staff'::app_role)) then
    return;
  end if;
  select email into v_email from auth.users where id = auth.uid();
  if p_paciente_id is not null then
    select nome into v_nome from public.pacientes where id = p_paciente_id;
  end if;
  insert into public.auditoria_acesso
    (ator_user_id, ator_email, paciente_id, paciente_nome, acao, detalhe)
  values (auth.uid(), v_email, p_paciente_id, v_nome, p_acao, p_detalhe);
end;
$$;

grant execute on function public.registrar_acesso(uuid, text, text) to authenticated;
