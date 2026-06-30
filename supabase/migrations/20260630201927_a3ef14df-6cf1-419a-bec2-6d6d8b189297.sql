
-- PARTE 1: tabela de vínculo user ↔ unidade
CREATE TABLE IF NOT EXISTS public.user_unidades (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES public.unidades_cache(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, unidade_id)
);

CREATE INDEX IF NOT EXISTS idx_user_unidades_user ON public.user_unidades(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unidades_unidade ON public.user_unidades(unidade_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_unidades TO authenticated;
GRANT ALL ON public.user_unidades TO service_role;

ALTER TABLE public.user_unidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_user_unidades ON public.user_unidades;
CREATE POLICY admin_all_user_unidades ON public.user_unidades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS staff_read_own_unidades ON public.user_unidades;
CREATE POLICY staff_read_own_unidades ON public.user_unidades
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- PARTE 2: função helper
CREATE OR REPLACE FUNCTION public.pode_ver_pedido_unidade(p_codigo_shift text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN true;
  END IF;

  IF public.has_role(auth.uid(), 'staff'::app_role) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_unidades uu
      JOIN public.unidades_cache uc ON uc.id = uu.unidade_id
      WHERE uu.user_id = auth.uid()
        AND uc.codigo_shift = p_codigo_shift
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pode_ver_pedido_unidade(text) TO authenticated;

-- PARTE 3: RLS de SELECT em pedidos passa a filtrar por unidade do staff
DROP POLICY IF EXISTS staff_select_pedidos ON public.pedidos;
DROP POLICY IF EXISTS staff_read_pedidos ON public.pedidos;
CREATE POLICY staff_read_pedidos ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'staff'::app_role)
      AND public.pode_ver_pedido_unidade(unidade_codigo_shift)
    )
  );
