
CREATE OR REPLACE FUNCTION public.meu_perfil(p_cpf text, p_data_nasc date)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT to_jsonb(t) FROM (
    SELECT id, nome, cpf, email, celular, sexo,
           cep, logradouro, numero, complemento, bairro, cidade, uf,
           data_nascimento
    FROM pacientes
    WHERE cpf = p_cpf AND data_nascimento = p_data_nasc
    LIMIT 1
  ) t
$$;
REVOKE ALL ON FUNCTION public.meu_perfil(text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.meu_perfil(text, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.atualizar_meu_perfil(
  p_cpf text, p_data_nasc date, p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM pacientes
   WHERE cpf = p_cpf AND data_nascimento = p_data_nasc LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Credenciais inválidas'; END IF;

  UPDATE pacientes SET
    nome        = COALESCE(p_patch->>'nome', nome),
    email       = COALESCE(p_patch->>'email', email),
    celular     = COALESCE(p_patch->>'celular', celular),
    cep         = COALESCE(p_patch->>'cep', cep),
    logradouro  = COALESCE(p_patch->>'logradouro', logradouro),
    numero      = COALESCE(p_patch->>'numero', numero),
    complemento = COALESCE(p_patch->>'complemento', complemento),
    bairro      = COALESCE(p_patch->>'bairro', bairro),
    cidade      = COALESCE(p_patch->>'cidade', cidade),
    uf          = COALESCE(p_patch->>'uf', uf),
    updated_at  = now()
  WHERE id = v_id;

  RETURN public.meu_perfil(p_cpf, p_data_nasc);
END;
$$;
REVOKE ALL ON FUNCTION public.atualizar_meu_perfil(text, date, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.atualizar_meu_perfil(text, date, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancelar_meu_pedido(p_protocolo text, p_cpf text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count int;
BEGIN
  UPDATE pedidos SET status = 'cancelado', updated_at = now()
   WHERE protocolo = p_protocolo
     AND paciente_cpf = p_cpf
     AND status IN ('novo', 'em_analise');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.cancelar_meu_pedido(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancelar_meu_pedido(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_manual(p_protocolo text, p_cpf text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count int;
BEGIN
  UPDATE pedidos
     SET status_pagamento = 'aguardando_confirmacao', updated_at = now()
   WHERE protocolo = p_protocolo
     AND paciente_cpf = p_cpf
     AND status_pagamento <> 'pago';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.confirmar_pagamento_manual(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_manual(text, text) TO anon, authenticated;
