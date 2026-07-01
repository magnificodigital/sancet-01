
-- 1) Coluna de vínculo com auth.users
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

CREATE INDEX IF NOT EXISTS pacientes_auth_user_id_idx ON public.pacientes(auth_user_id);

-- 2) Trigger em auth.users: cria/vincula paciente pelo user_metadata (cpf, nome, data_nascimento)
CREATE OR REPLACE FUNCTION public.handle_new_paciente_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cpf text := NEW.raw_user_meta_data->>'cpf';
  v_nome text := NEW.raw_user_meta_data->>'nome';
  v_nasc date := CASE WHEN NEW.raw_user_meta_data->>'data_nascimento' IS NOT NULL
                      THEN (NEW.raw_user_meta_data->>'data_nascimento')::date END;
  v_existing_id uuid;
BEGIN
  -- Ignora criações de staff (marcadas com role no metadata)
  IF (NEW.raw_user_meta_data->>'is_staff')::boolean IS TRUE THEN
    RETURN NEW;
  END IF;

  IF v_cpf IS NULL THEN
    RETURN NEW;
  END IF;

  -- Se já existe paciente com esse CPF, apenas vincula
  SELECT id INTO v_existing_id FROM public.pacientes WHERE cpf = v_cpf LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.pacientes
       SET auth_user_id = NEW.id,
           email = COALESCE(NEW.email, email),
           updated_at = now()
     WHERE id = v_existing_id
       AND auth_user_id IS NULL;
    RETURN NEW;
  END IF;

  -- Caso contrário cria
  INSERT INTO public.pacientes (cpf, data_nascimento, nome, email, auth_user_id)
  VALUES (v_cpf, v_nasc, COALESCE(v_nome, NEW.email), NEW.email, NEW.id)
  ON CONFLICT (cpf) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_paciente ON auth.users;
CREATE TRIGGER on_auth_user_created_paciente
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_paciente_user();

-- 3) RPCs _auth (baseadas em auth.uid())
CREATE OR REPLACE FUNCTION public.meu_perfil_auth()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT to_jsonb(t) FROM (
    SELECT id, nome, cpf, email, celular, sexo,
           cep, logradouro, numero, complemento, bairro, cidade, uf,
           data_nascimento
    FROM pacientes WHERE auth_user_id = auth.uid() LIMIT 1
  ) t
$$;

CREATE OR REPLACE FUNCTION public.atualizar_meu_perfil_auth(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM pacientes WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;
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
  RETURN public.meu_perfil_auth();
END;
$$;

CREATE OR REPLACE FUNCTION public.pedidos_do_paciente_auth()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY (t.created_at) DESC), '[]'::jsonb)
  FROM (
    SELECT p.id, p.protocolo, p.status, p.created_at, p.itens, p.modalidade_coleta,
           p.unidade_nome, p.tipo_solicitacao, p.valor_total_centavos,
           p.endereco_coleta, p.convenio_nome, p.numero_carteirinha, p.url_carteirinha,
           p.data_agendamento, p.periodo_agendamento
    FROM pedidos p
    JOIN pacientes pa ON pa.id = p.paciente_id
    WHERE pa.auth_user_id = auth.uid()
  ) t
$$;

CREATE OR REPLACE FUNCTION public.resultados_do_paciente_auth()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY (t.created_at) DESC), '[]'::jsonb)
  FROM (
    SELECT r.id, r.pedido_protocolo, r.nome_arquivo, r.arquivo_url, r.created_at
    FROM resultados r
    JOIN pacientes pa ON pa.cpf = r.paciente_cpf
    WHERE pa.auth_user_id = auth.uid()
  ) t
$$;

CREATE OR REPLACE FUNCTION public.pedido_por_protocolo_auth(p_protocolo text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT to_jsonb(t) FROM (
    SELECT
      p.id, p.protocolo, p.paciente_nome, p.tipo_solicitacao, p.modalidade_coleta,
      p.unidade_codigo_shift, p.unidade_nome, p.endereco_coleta, p.itens,
      p.convenio_nome, p.numero_carteirinha, p.url_carteirinha,
      p.url_rg_frente, p.url_rg_verso, p.url_certidao_nascimento,
      p.url_relatorio_medico, p.url_pedido_medico, p.url_receita, p.url_identidade,
      p.tipo_documento_identidade,
      p.status, p.status_pagamento, p.valor_total_centavos,
      p.data_agendamento, p.periodo_agendamento, p.deficiencias, p.created_at
    FROM pedidos p
    JOIN pacientes pa ON pa.id = p.paciente_id
    WHERE p.protocolo = p_protocolo AND pa.auth_user_id = auth.uid()
    LIMIT 1
  ) t
$$;

CREATE OR REPLACE FUNCTION public.cancelar_meu_pedido_auth(p_protocolo text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  UPDATE pedidos p SET status = 'cancelado', updated_at = now()
   FROM pacientes pa
   WHERE p.paciente_id = pa.id
     AND pa.auth_user_id = auth.uid()
     AND p.protocolo = p_protocolo
     AND p.status IN ('novo', 'em_analise');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_manual_auth(p_protocolo text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  UPDATE pedidos p
     SET status_pagamento = 'aguardando_confirmacao', updated_at = now()
   FROM pacientes pa
   WHERE p.paciente_id = pa.id
     AND pa.auth_user_id = auth.uid()
     AND p.protocolo = p_protocolo
     AND p.status_pagamento <> 'pago';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_pedido_paciente_auth(p_pedido jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_paciente_id uuid;
  v_cpf text;
  v_pedido_id uuid;
  v_protocolo text;
BEGIN
  SELECT id, cpf INTO v_paciente_id, v_cpf
  FROM pacientes WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_paciente_id IS NULL THEN RAISE EXCEPTION 'Paciente não encontrado'; END IF;

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
    v_protocolo, v_paciente_id, v_cpf, p_pedido->>'paciente_nome',
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
$$;

-- 4) Grants: só authenticated pode chamar as _auth
REVOKE ALL ON FUNCTION public.meu_perfil_auth() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.atualizar_meu_perfil_auth(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pedidos_do_paciente_auth() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resultados_do_paciente_auth() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pedido_por_protocolo_auth(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_meu_pedido_auth(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirmar_pagamento_manual_auth(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.criar_pedido_paciente_auth(jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.meu_perfil_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_meu_perfil_auth(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pedidos_do_paciente_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resultados_do_paciente_auth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pedido_por_protocolo_auth(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_meu_pedido_auth(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_pagamento_manual_auth(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_pedido_paciente_auth(jsonb) TO authenticated;

-- 5) RLS: paciente autenticado pode ler os próprios pedidos e resultados
DROP POLICY IF EXISTS paciente_read_own_pedidos ON public.pedidos;
CREATE POLICY paciente_read_own_pedidos ON public.pedidos
  FOR SELECT TO authenticated
  USING (paciente_id IN (SELECT id FROM public.pacientes WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS paciente_read_own_resultados ON public.resultados;
CREATE POLICY paciente_read_own_resultados ON public.resultados
  FOR SELECT TO authenticated
  USING (paciente_cpf IN (SELECT cpf FROM public.pacientes WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS paciente_read_own ON public.pacientes;
CREATE POLICY paciente_read_own ON public.pacientes
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());
