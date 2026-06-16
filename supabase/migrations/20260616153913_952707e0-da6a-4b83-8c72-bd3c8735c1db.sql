DROP POLICY IF EXISTS authenticated_insert_pacientes ON public.pacientes;

CREATE POLICY authenticated_insert_pacientes
ON public.pacientes
FOR INSERT
TO authenticated
WITH CHECK (true);