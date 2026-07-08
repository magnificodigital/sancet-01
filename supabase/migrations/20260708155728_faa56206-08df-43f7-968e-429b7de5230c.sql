
CREATE OR REPLACE FUNCTION public.staff_pode_ver_paciente(p_paciente_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN true;
  END IF;

  IF public.has_role(auth.uid(), 'staff'::app_role) THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.pedidos p
      JOIN public.unidades_cache uc ON uc.codigo_shift = p.unidade_codigo_shift
      JOIN public.user_unidades uu ON uu.unidade_id = uc.id
      WHERE p.paciente_id = p_paciente_id
        AND uu.user_id = auth.uid()
    );
  END IF;

  RETURN false;
END;
$$;

DROP POLICY IF EXISTS staff_select_pacientes ON public.pacientes;
DROP POLICY IF EXISTS staff_update_pacientes ON public.pacientes;
DROP POLICY IF EXISTS staff_delete_pacientes ON public.pacientes;
DROP POLICY IF EXISTS staff_insert_pacientes ON public.pacientes;

CREATE POLICY staff_select_pacientes ON public.pacientes
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'staff'::app_role)
    AND public.staff_pode_ver_paciente(id)
  )
);

CREATE POLICY staff_insert_pacientes ON public.pacientes
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'staff'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY staff_update_pacientes ON public.pacientes
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'staff'::app_role)
    AND public.staff_pode_ver_paciente(id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'staff'::app_role)
    AND public.staff_pode_ver_paciente(id)
  )
);

CREATE POLICY staff_delete_pacientes ON public.pacientes
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'staff'::app_role)
    AND public.staff_pode_ver_paciente(id)
  )
);
