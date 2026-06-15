ALTER TABLE pedidos 
  ADD COLUMN IF NOT EXISTS url_rg_frente text,
  ADD COLUMN IF NOT EXISTS url_rg_verso text,
  ADD COLUMN IF NOT EXISTS url_certidao_nascimento text,
  ADD COLUMN IF NOT EXISTS url_relatorio_medico text,
  ADD COLUMN IF NOT EXISTS tipo_documento_identidade text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_tipo_documento_identidade_check'
  ) THEN
    ALTER TABLE pedidos
      ADD CONSTRAINT pedidos_tipo_documento_identidade_check
      CHECK (tipo_documento_identidade IS NULL OR tipo_documento_identidade IN ('rg','certidao'));
  END IF;
END $$;

COMMENT ON COLUMN pedidos.url_identidade IS 'LEGACY — usar url_rg_frente/url_rg_verso/url_certidao_nascimento';

CREATE OR REPLACE FUNCTION public.criar_pedido_paciente(p_cpf text, p_data_nasc date, p_pedido jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_paciente_id uuid;
  v_pedido_id uuid;
  v_protocolo text;
BEGIN
  SELECT id INTO v_paciente_id
  FROM pacientes
  WHERE cpf = p_cpf
    AND data_nascimento = p_data_nasc;

  IF v_paciente_id IS NULL THEN
    RAISE EXCEPTION 'Paciente não encontrado';
  END IF;

  v_protocolo := gerar_protocolo_sancet();

  INSERT INTO pedidos (
    protocolo, paciente_id, paciente_cpf, paciente_nome,
    tipo_solicitacao, modalidade_coleta,
    unidade_codigo_shift, unidade_nome, endereco_coleta,
    itens, valor_total_centavos,
    convenio_codigo_shift, convenio_nome,
    plano_codigo, plano_descricao, numero_carteirinha,
    url_receita, url_pedido_medico, url_carteirinha, url_identidade,
    url_rg_frente, url_rg_verso, url_certidao_nascimento,
    url_relatorio_medico, tipo_documento_identidade,
    data_agendamento, periodo_agendamento,
    observacoes, deficiencias, status, status_pagamento,
    termos_aceitos, termos_aceitos_em
  ) VALUES (
    v_protocolo, v_paciente_id, p_cpf, p_pedido->>'paciente_nome',
    coalesce(p_pedido->>'tipo_solicitacao','particular'),
    coalesce(p_pedido->>'modalidade_coleta','unidade'),
    p_pedido->>'unidade_codigo_shift', p_pedido->>'unidade_nome',
    p_pedido->'endereco_coleta',
    coalesce(p_pedido->'itens','[]'::jsonb),
    coalesce((p_pedido->>'valor_total_centavos')::int, 0),
    p_pedido->>'convenio_codigo_shift', p_pedido->>'convenio_nome',
    p_pedido->>'plano_codigo', p_pedido->>'plano_descricao',
    p_pedido->>'numero_carteirinha',
    p_pedido->>'url_receita', p_pedido->>'url_pedido_medico',
    p_pedido->>'url_carteirinha', p_pedido->>'url_identidade',
    p_pedido->>'url_rg_frente', p_pedido->>'url_rg_verso',
    p_pedido->>'url_certidao_nascimento',
    p_pedido->>'url_relatorio_medico', p_pedido->>'tipo_documento_identidade',
    CASE WHEN p_pedido->>'data_agendamento' IS NOT NULL
         THEN (p_pedido->>'data_agendamento')::date END,
    p_pedido->>'periodo_agendamento',
    p_pedido->>'observacoes',
    p_pedido->>'deficiencias',
    'novo', 'pendente',
    coalesce((p_pedido->>'termos_aceitos')::boolean, false),
    CASE WHEN (p_pedido->>'termos_aceitos')::boolean THEN now() END
  )
  RETURNING id INTO v_pedido_id;

  RETURN jsonb_build_object('id', v_pedido_id, 'protocolo', v_protocolo);
END;
$function$;

CREATE OR REPLACE FUNCTION public.pedido_por_protocolo(p_protocolo text, p_cpf text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(t) FROM (
    SELECT
      id, protocolo, paciente_nome, tipo_solicitacao, modalidade_coleta,
      unidade_codigo_shift, unidade_nome, endereco_coleta, itens,
      convenio_nome, numero_carteirinha, url_carteirinha,
      url_rg_frente, url_rg_verso, url_certidao_nascimento,
      url_relatorio_medico, url_pedido_medico, url_receita, url_identidade,
      tipo_documento_identidade,
      status, status_pagamento, valor_total_centavos,
      data_agendamento, periodo_agendamento, deficiencias, created_at
    FROM pedidos
    WHERE protocolo = p_protocolo
      AND paciente_cpf = p_cpf
    LIMIT 1
  ) t
$function$;