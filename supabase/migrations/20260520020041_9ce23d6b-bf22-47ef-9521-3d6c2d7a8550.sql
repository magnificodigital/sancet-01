
CREATE OR REPLACE FUNCTION public.pedidos_do_paciente(p_cpf text, p_data_nasc date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH ok AS (
    SELECT 1 FROM pacientes WHERE cpf = p_cpf AND data_nascimento = p_data_nasc LIMIT 1
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY (t.created_at) DESC), '[]'::jsonb)
  FROM (
    SELECT id, protocolo, status, created_at, itens, modalidade_coleta,
           unidade_nome, tipo_solicitacao, valor_total_centavos,
           endereco_coleta, convenio_nome, numero_carteirinha, url_carteirinha,
           data_agendamento, periodo_agendamento
    FROM pedidos
    WHERE paciente_cpf = p_cpf AND EXISTS (SELECT 1 FROM ok)
  ) t
$$;

REVOKE ALL ON FUNCTION public.pedidos_do_paciente(text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.pedidos_do_paciente(text, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.resultados_do_paciente(p_cpf text, p_data_nasc date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH ok AS (
    SELECT 1 FROM pacientes WHERE cpf = p_cpf AND data_nascimento = p_data_nasc LIMIT 1
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY (t.created_at) DESC), '[]'::jsonb)
  FROM (
    SELECT id, pedido_protocolo, nome_arquivo, arquivo_url, created_at
    FROM resultados
    WHERE paciente_cpf = p_cpf AND EXISTS (SELECT 1 FROM ok)
  ) t
$$;

REVOKE ALL ON FUNCTION public.resultados_do_paciente(text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.resultados_do_paciente(text, date) TO anon, authenticated;

-- Remove anon SELECT policies (passa a usar as funções acima)
DROP POLICY IF EXISTS anon_ler_proprio_paciente ON public.pacientes;
DROP POLICY IF EXISTS anon_select_paciente ON public.pacientes;
DROP POLICY IF EXISTS anon_select_pacientes ON public.pacientes;

DROP POLICY IF EXISTS anon_ler_pedido_protocolo ON public.pedidos;
DROP POLICY IF EXISTS anon_select_pedidos ON public.pedidos;

DROP POLICY IF EXISTS anon_select_resultados ON public.resultados;
