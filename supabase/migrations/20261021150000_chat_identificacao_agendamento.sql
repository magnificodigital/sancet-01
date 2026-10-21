-- Chat: identificação do paciente para a atendente e agendamento completo pelo chat.

-- Cadastro sugerido pelo celular (visitante não logado). A atendente confirma o vínculo.
alter table public.chat_conversas
  add column if not exists paciente_sugerido_id uuid references public.pacientes(id) on delete set null;

-- Resumo por conversa: situação do cadastro e pedidos em aberto (para a lista e os alertas).
create or replace function public.chat_resumo_pacientes(_conversas uuid[])
returns table (conversa_id uuid, situacao text, paciente_nome text, pedidos_abertos int, ultimo_protocolo text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.chat_eh_equipe() then return; end if;
  return query
  select c.id,
         case when c.paciente_id is not null then 'cadastrado'
              when c.paciente_sugerido_id is not null then 'possivel'
              else 'novo' end,
         coalesce(p.nome_social, p.nome),
         coalesce((select count(*)::int from public.pedidos x
                   where x.paciente_id = coalesce(c.paciente_id, c.paciente_sugerido_id)
                     and x.status in ('novo', 'em_analise', 'aguardando_pagamento', 'confirmado')), 0),
         (select x.protocolo from public.pedidos x
           where x.paciente_id = coalesce(c.paciente_id, c.paciente_sugerido_id)
           order by x.created_at desc limit 1)
  from public.chat_conversas c
  left join public.pacientes p on p.id = coalesce(c.paciente_id, c.paciente_sugerido_id)
  where c.id = any(_conversas)
    and public.chat_pode_ver(c.unidade_codigo_shift, c.responsavel_id);
end $$;
revoke all on function public.chat_resumo_pacientes(uuid[]) from public, anon;
grant execute on function public.chat_resumo_pacientes(uuid[]) to authenticated;

-- A atendente confirma que o visitante é aquele paciente (vínculo manual, seguro).
create or replace function public.chat_vincular_paciente(_conversa uuid, _paciente uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; v_nome text;
begin
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.chat_pode_mexer(c) then raise exception 'Sem permissão para alterar esta conversa.' using errcode = '42501'; end if;
  if c.paciente_id is not null then raise exception 'Esta conversa já está ligada a um cadastro.'; end if;
  select coalesce(nome_social, nome) into v_nome from public.pacientes where id = _paciente;
  if v_nome is null then raise exception 'Paciente não encontrado.'; end if;
  update public.chat_conversas set paciente_id = _paciente, paciente_sugerido_id = null where id = _conversa;
  insert into public.chat_mensagens (conversa_id, autor, autor_id, autor_nome, texto)
  values (_conversa, 'nota', auth.uid(), public.chat_nome_equipe(auth.uid()), '🔗 Conversa vinculada ao cadastro de ' || v_nome || ' (confirmado pela equipe).');
end $$;
revoke all on function public.chat_vincular_paciente(uuid, uuid) from public, anon;
grant execute on function public.chat_vincular_paciente(uuid, uuid) to authenticated;
