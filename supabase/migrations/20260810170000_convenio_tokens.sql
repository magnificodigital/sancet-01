-- Token(s) do convênio: recepção solicita → paciente preenche no painel → alerta ao vivo na recepção.
alter table public.pedidos
  add column if not exists convenio_tokens jsonb not null default '[]'::jsonb,
  add column if not exists convenio_token_solicitado_em timestamptz,
  add column if not exists convenio_token_preenchido_em timestamptz;

-- Paciente salva seus tokens (autenticado; só o dono do pedido). Aceita múltiplos tokens.
create or replace function public.salvar_tokens_convenio_auth(p_protocolo text, p_tokens jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'nao autenticado'; end if;
  update public.pedidos ped
     set convenio_tokens = coalesce(p_tokens, '[]'::jsonb),
         convenio_token_preenchido_em = now()
   where ped.protocolo = p_protocolo
     and exists (
       select 1 from public.pacientes pac
       where pac.id = ped.paciente_id and pac.auth_user_id = v_uid
     );
  if not found then raise exception 'pedido nao encontrado ou sem permissao'; end if;
end;
$$;
revoke all on function public.salvar_tokens_convenio_auth(text, jsonb) from public, anon;
grant execute on function public.salvar_tokens_convenio_auth(text, jsonb) to authenticated;

-- pedidos_do_paciente_auth: incluir os campos de token para o painel do paciente enxergar o estado.
create or replace function public.pedidos_do_paciente_auth()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by (t.created_at) desc), '[]'::jsonb)
  from (
    select p.id, p.protocolo, p.status, p.created_at, p.itens, p.modalidade_coleta,
           p.unidade_nome, p.tipo_solicitacao, p.valor_total_centavos,
           p.endereco_coleta, p.convenio_nome, p.numero_carteirinha, p.url_carteirinha,
           p.data_agendamento, p.periodo_agendamento,
           p.convenio_tokens, p.convenio_token_solicitado_em, p.convenio_token_preenchido_em
    from pedidos p
    join pacientes pa on pa.id = p.paciente_id
    where pa.auth_user_id = auth.uid()
  ) t
$$;
grant execute on function public.pedidos_do_paciente_auth() to authenticated;

-- Realtime: garantir que 'pedidos' publica mudanças (alerta ao vivo na recepção quando o token é preenchido).
do $$ begin
  alter publication supabase_realtime add table public.pedidos;
exception when others then null;
end $$;
