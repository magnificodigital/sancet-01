-- Segurança (auditoria de produção 01/10/2026):
-- 1) recall_candidatos devolvia nome/CPF/e-mail de pacientes para QUALQUER visitante.
-- 2) cadastrar_paciente (legado, sem uso) deixava visitante criar pacientes.
-- 3) storage: policy antiga deixava visitante enviar arquivo em qualquer pasta.
-- 4) funções internas deixam de ser executáveis por visitante (anon).

create or replace function public.recall_candidatos()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_ativo boolean;
begin
  -- Só a equipe (aba Recall) ou o servidor (função sancet-recall) podem listar.
  if coalesce(auth.role(), '') <> 'service_role'
     and not exists (select 1 from user_roles where user_id = auth.uid()) then
    return '[]'::jsonb;
  end if;
  select (valor = 'true') into v_ativo from configuracoes where chave = 'RECALL_ATIVO';
  if not coalesce(v_ativo, false) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(c))
    from (
      select pac.id as paciente_id, pac.cpf, pac.email,
             pac.nome as paciente_nome, pac.recall_optout_token as optout_token,
             r.codigo_shift, r.nome as exame_nome, r.meses, ult.ultima_data
      from recall_regras r
      join lateral (
        select p.paciente_id, max(coalesce(p.data_agendamento, p.created_at::date)) as ultima_data
        from pedidos p, jsonb_array_elements(p.itens) it
        where p.status in ('atendido', 'concluido')
          and it->>'codigoShift' = r.codigo_shift
          and p.paciente_id is not null
        group by p.paciente_id
      ) ult on true
      join pacientes pac on pac.id = ult.paciente_id
      where r.ativo
        and ult.ultima_data <= (now()::date - (r.meses || ' months')::interval)
        and coalesce(pac.recall_optout, false) = false
        and pac.email is not null and btrim(pac.email) <> ''
        and not exists (
          select 1 from recall_envios e
          where e.paciente_id = pac.id and e.codigo_shift = r.codigo_shift
            and e.enviado_em > now() - (r.meses || ' months')::interval
        )
    ) c
  ), '[]'::jsonb);
end $$;
revoke all on function public.recall_candidatos() from public, anon;
grant execute on function public.recall_candidatos() to authenticated, service_role;

revoke all on function public.cadastrar_paciente(jsonb) from public, anon, authenticated;
grant execute on function public.cadastrar_paciente(jsonb) to service_role;

drop policy if exists "Anon pode enviar documentos de pedidos" on storage.objects;

revoke execute on function public.anexos_do_pedido_auth(text) from public, anon;
revoke execute on function public.registrar_anexo_paciente_auth(text, text, text, text) from public, anon;
revoke execute on function public.dashboard_metricas(int) from public, anon;
revoke execute on function public.nps_resumo() from public, anon;
revoke execute on function public.registrar_acesso(uuid, text, text) from public, anon;
revoke execute on function public.handle_new_paciente_user() from public, anon, authenticated;
