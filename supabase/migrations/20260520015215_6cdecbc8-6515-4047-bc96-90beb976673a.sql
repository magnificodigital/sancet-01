
-- 1. configuracoes: re-enable RLS + drop permissive policy
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_access ON public.configuracoes;

-- 2. Drop overbroad staff_rw policies on catalog + sensitive tables
DROP POLICY IF EXISTS staff_rw ON public.convenios_cache;
DROP POLICY IF EXISTS staff_rw ON public.exames_cache;
DROP POLICY IF EXISTS staff_rw ON public.vacinas_cache;
DROP POLICY IF EXISTS staff_rw ON public.unidades_cache;
DROP POLICY IF EXISTS staff_rw_pacientes ON public.pacientes;
DROP POLICY IF EXISTS staff_rw_pedidos ON public.pedidos;
DROP POLICY IF EXISTS staff_rw_resultados ON public.resultados;

-- Ensure staff/admin can still read+write resultados
CREATE POLICY staff_select_resultados ON public.resultados
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY staff_insert_resultados ON public.resultados
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY staff_update_resultados ON public.resultados
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY staff_delete_resultados ON public.resultados
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. has_role: respect ativo flag
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1 from user_roles
    where user_id = _user_id
      and role = _role
      and coalesce(ativo, true) = true
  )
$$;

-- 4. gerar_protocolo_sancet: pin search_path
CREATE OR REPLACE FUNCTION public.gerar_protocolo_sancet()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_ano       text;
  v_seq       text;
  v_protocolo text;
  v_tentativas int := 0;
BEGIN
  v_ano := to_char(NOW(), 'YYYY');
  LOOP
    v_seq       := lpad((floor(random() * 999999 + 1))::int::text, 6, '0');
    v_protocolo := 'SAN-' || v_ano || '-' || v_seq;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM pedidos WHERE protocolo = v_protocolo);
    v_tentativas := v_tentativas + 1;
    IF v_tentativas > 100 THEN
      RAISE EXCEPTION 'Falha ao gerar protocolo único após 100 tentativas';
    END IF;
  END LOOP;
  RETURN v_protocolo;
END;
$$;

-- 5. Storage: drop bucket_id-only policies on documentos-pedidos
DROP POLICY IF EXISTS "Staff atualiza documentos de pedidos" ON storage.objects;
DROP POLICY IF EXISTS "Staff lê documentos de pedidos" ON storage.objects;
DROP POLICY IF EXISTS "Staff remove documentos de pedidos" ON storage.objects;

CREATE POLICY "Staff update documentos-pedidos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos-pedidos' AND (has_role(auth.uid(),'staff'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

CREATE POLICY "Staff delete documentos-pedidos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-pedidos' AND (has_role(auth.uid(),'staff'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
