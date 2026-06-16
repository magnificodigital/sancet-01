CREATE OR REPLACE FUNCTION public.cadastrar_paciente(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_nome text;
  v_cpf text;
BEGIN
  INSERT INTO public.pacientes (
    cpf, data_nascimento, nome, sexo, email, celular,
    cep, logradouro, numero, complemento, bairro, cidade, uf
  ) VALUES (
    p->>'cpf',
    (p->>'data_nascimento')::date,
    p->>'nome',
    p->>'sexo',
    p->>'email',
    p->>'celular',
    p->>'cep',
    p->>'logradouro',
    p->>'numero',
    p->>'complemento',
    p->>'bairro',
    p->>'cidade',
    p->>'uf'
  )
  RETURNING id, nome, cpf INTO v_id, v_nome, v_cpf;

  RETURN jsonb_build_object('id', v_id, 'nome', v_nome, 'cpf', v_cpf);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cadastrar_paciente(jsonb) TO anon, authenticated;