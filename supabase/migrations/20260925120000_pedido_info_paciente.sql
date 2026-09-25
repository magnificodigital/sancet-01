-- Informações extras do operador para o paciente (ex.: "trazer carteirinha física").
alter table pedidos add column if not exists info_paciente text;
alter table pedidos add column if not exists info_paciente_em timestamptz;

-- O paciente passa a receber esses campos na lista dos pedidos dele.
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
           p.convenio_tokens, p.convenio_token_solicitado_em, p.convenio_token_preenchido_em,
           p.info_paciente, p.info_paciente_em
    from pedidos p
    join pacientes pa on pa.id = p.paciente_id
    where pa.auth_user_id = auth.uid()
  ) t
$$;
grant execute on function public.pedidos_do_paciente_auth() to authenticated;
