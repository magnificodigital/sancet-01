-- Exames que a IA identificou no pedido médico (para a recepção conferir).
alter table public.pedidos
  add column if not exists exames_identificados_ia jsonb not null default '[]'::jsonb;

-- O paciente anexa os exames identificados pela IA ao seu próprio pedido (após criá-lo).
create or replace function public.registrar_exames_ia_auth(p_protocolo text, p_exames jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  update public.pedidos ped
     set exames_identificados_ia = coalesce(p_exames, '[]'::jsonb)
   where ped.protocolo = p_protocolo
     and exists (
       select 1 from public.pacientes pac
       where pac.id = ped.paciente_id and pac.auth_user_id = v_uid
     );
end;
$$;
revoke all on function public.registrar_exames_ia_auth(text, jsonb) from public, anon;
grant execute on function public.registrar_exames_ia_auth(text, jsonb) to authenticated;
