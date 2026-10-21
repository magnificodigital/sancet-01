-- Recall e histórico do Shift: as tabelas tinham regras (RLS) mas nenhuma
-- permissão de leitura/escrita para usuários logados → tela vazia e
-- "Erro ao adicionar" até para o super admin.

grant select, insert, update, delete on public.recall_regras to authenticated;
grant select on public.recall_envios to authenticated;
grant select on public.shift_sync_logs to authenticated;
grant all on public.recall_regras, public.recall_envios, public.shift_sync_logs to service_role;

-- Recall segue a permissão por usuário (Super Admin > Permissões).
drop policy if exists recall_regras_sel on public.recall_regras;
create policy recall_regras_sel on public.recall_regras for select to authenticated
  using (public.tem_permissao('recall', 'ver'));
drop policy if exists recall_regras_wr on public.recall_regras;
create policy recall_regras_wr on public.recall_regras for all to authenticated
  using (public.tem_permissao('recall', 'editar')) with check (public.tem_permissao('recall', 'editar'));
drop policy if exists recall_envios_sel on public.recall_envios;
create policy recall_envios_sel on public.recall_envios for select to authenticated
  using (public.tem_permissao('recall', 'ver'));

-- Ligar/desligar o recall: quem pode editar o Recall (não exige editar Configurações).
create or replace function public.recall_definir_ativo(_ativo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tem_permissao('recall', 'editar') then
    raise exception 'Sem permissão para alterar o Recall.' using errcode = '42501';
  end if;
  insert into public.configuracoes (chave, valor, atualizado_em)
  values ('RECALL_ATIVO', case when _ativo then 'true' else 'false' end, now())
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
end $$;
revoke all on function public.recall_definir_ativo(boolean) from public, anon;
grant execute on function public.recall_definir_ativo(boolean) to authenticated;

-- Status do recall legível por quem vê o Recall.
create or replace function public.recall_ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select case when public.tem_permissao('recall', 'ver')
    then coalesce((select valor = 'true' from public.configuracoes where chave = 'RECALL_ATIVO'), false) end;
$$;
revoke all on function public.recall_ativo() from public, anon;
grant execute on function public.recall_ativo() to authenticated;
