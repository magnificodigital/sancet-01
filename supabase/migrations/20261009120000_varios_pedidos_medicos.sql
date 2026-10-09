-- Vários pedidos médicos no envio (paciente traz pedidos de médicos diferentes).
-- O 1º continua em url_pedido_medico; os demais (até 4) em urls_pedido_medico_extra.

alter table pedidos add column if not exists urls_pedido_medico_extra text[] not null default '{}';

create or replace function public.criar_pedido_paciente_auth(p_pedido jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_paciente_id uuid;
  v_cpf text;
  v_nome text;
  v_pedido_id uuid;
  v_protocolo text;
  v_tipo text;
  v_itens jsonb;
  v_total int;
  v_extras text[];
begin
  select id, cpf, nome into v_paciente_id, v_cpf, v_nome
  from pacientes where auth_user_id = auth.uid() limit 1;
  if v_paciente_id is null then raise exception 'Paciente não encontrado'; end if;

  v_tipo := coalesce(p_pedido->>'tipo_solicitacao', 'particular');
  v_itens := coalesce(p_pedido->'itens', '[]'::jsonb);
  if jsonb_typeof(v_itens) <> 'array' then v_itens := '[]'::jsonb; end if;

  -- Reescreve o preço de cada item com o valor do catálogo.
  select coalesce(jsonb_agg(
           case
             when it->>'tipo' = 'vacina' then
               it || jsonb_build_object(
                 'precoParticular', null,
                 'precoCentavos', (select v.preco_centavos from vacinas_cache v
                                    where v.codigo_shift::text = it->>'codigoShift' limit 1))
             else
               it || jsonb_build_object(
                 'precoCentavos', null,
                 'precoParticular', (select e.preco_particular from exames_cache e
                                      where e.codigo_shift::text = it->>'codigoShift' limit 1))
           end order by ord), '[]'::jsonb)
    into v_itens
  from jsonb_array_elements(v_itens) with ordinality as x(it, ord);

  if v_tipo = 'convenio' then
    v_total := 0;
  else
    select coalesce(sum(
             case when it->>'tipo' = 'vacina'
                  then coalesce((it->>'precoCentavos')::numeric, 0)
                  else round(coalesce((it->>'precoParticular')::numeric, 0) * 100)
             end), 0)::int
      into v_total
    from jsonb_array_elements(v_itens) as it;
  end if;

  -- Pedidos médicos adicionais: só arquivos da pasta do próprio paciente (CPF).
  select coalesce(array_agg(x), '{}') into v_extras
  from (
    select value as x
    from jsonb_array_elements_text(
      case when jsonb_typeof(p_pedido->'urls_pedido_medico_extra') = 'array'
           then p_pedido->'urls_pedido_medico_extra' else '[]'::jsonb end)
    limit 4
  ) e
  where split_part(x, '/', 1) in (v_cpf, regexp_replace(v_cpf, '\D', '', 'g'));

  v_protocolo := gerar_protocolo_sancet();

  insert into pedidos (
    protocolo, paciente_id, paciente_cpf, paciente_nome,
    tipo_solicitacao, modalidade_coleta,
    unidade_codigo_shift, unidade_nome, endereco_coleta,
    itens, valor_total_centavos,
    convenio_codigo_shift, convenio_nome,
    plano_codigo, plano_descricao, numero_carteirinha,
    url_receita, url_pedido_medico, url_carteirinha, url_identidade,
    url_rg_frente, url_rg_verso, url_certidao_nascimento,
    url_relatorio_medico, tipo_documento_identidade, urls_pedido_medico_extra,
    data_agendamento, periodo_agendamento,
    observacoes, deficiencias, status, status_pagamento,
    termos_aceitos, termos_aceitos_em
  ) values (
    v_protocolo, v_paciente_id, v_cpf,
    coalesce(nullif(btrim(p_pedido->>'paciente_nome'), ''), v_nome),
    v_tipo,
    coalesce(p_pedido->>'modalidade_coleta', 'unidade'),
    p_pedido->>'unidade_codigo_shift', p_pedido->>'unidade_nome',
    p_pedido->'endereco_coleta',
    v_itens,
    v_total,
    p_pedido->>'convenio_codigo_shift', p_pedido->>'convenio_nome',
    p_pedido->>'plano_codigo', p_pedido->>'plano_descricao',
    p_pedido->>'numero_carteirinha',
    p_pedido->>'url_receita', p_pedido->>'url_pedido_medico',
    p_pedido->>'url_carteirinha', p_pedido->>'url_identidade',
    p_pedido->>'url_rg_frente', p_pedido->>'url_rg_verso',
    p_pedido->>'url_certidao_nascimento',
    p_pedido->>'url_relatorio_medico', p_pedido->>'tipo_documento_identidade', v_extras,
    case when p_pedido->>'data_agendamento' is not null
         then (p_pedido->>'data_agendamento')::date end,
    p_pedido->>'periodo_agendamento',
    left(p_pedido->>'observacoes', 5000),
    left(p_pedido->>'deficiencias', 2000),
    'novo', 'pendente',
    coalesce((p_pedido->>'termos_aceitos')::boolean, false),
    case when (p_pedido->>'termos_aceitos')::boolean then now() end
  )
  returning id into v_pedido_id;

  return jsonb_build_object('id', v_pedido_id, 'protocolo', v_protocolo, 'valor_total_centavos', v_total);
end;
$$;
revoke all on function public.criar_pedido_paciente_auth(jsonb) from public, anon;
grant execute on function public.criar_pedido_paciente_auth(jsonb) to authenticated;
