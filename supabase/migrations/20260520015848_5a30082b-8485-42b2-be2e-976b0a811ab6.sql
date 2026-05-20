
-- Login do paciente (CPF + data de nascimento)
CREATE OR REPLACE FUNCTION public.login_paciente(p_cpf text, p_data_nasc date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT to_jsonb(t) FROM (
    SELECT id, nome, cpf, email, celular AS telefone
    FROM pacientes
    WHERE cpf = p_cpf
      AND data_nascimento = p_data_nasc
    LIMIT 1
  ) t
$$;

REVOKE ALL ON FUNCTION public.login_paciente(text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.login_paciente(text, date) TO anon, authenticated;

-- Pedido por protocolo + CPF
CREATE OR REPLACE FUNCTION public.pedido_por_protocolo(p_protocolo text, p_cpf text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT to_jsonb(t) FROM (
    SELECT
      id, protocolo, paciente_nome, tipo_solicitacao, modalidade_coleta,
      unidade_codigo_shift, unidade_nome, endereco_coleta, itens,
      convenio_nome, numero_carteirinha, url_carteirinha,
      status, status_pagamento, valor_total_centavos,
      data_agendamento, periodo_agendamento, created_at
    FROM pedidos
    WHERE protocolo = p_protocolo
      AND paciente_cpf = p_cpf
    LIMIT 1
  ) t
$$;

REVOKE ALL ON FUNCTION public.pedido_por_protocolo(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.pedido_por_protocolo(text, text) TO anon, authenticated;
