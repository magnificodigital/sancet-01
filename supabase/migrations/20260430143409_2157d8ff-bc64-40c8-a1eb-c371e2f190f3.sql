CREATE TABLE IF NOT EXISTS public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text UNIQUE NOT NULL,
  valor text NOT NULL DEFAULT '',
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_configuracoes"
ON public.configuracoes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_insert_configuracoes"
ON public.configuracoes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_update_configuracoes"
ON public.configuracoes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_delete_configuracoes"
ON public.configuracoes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'staff'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));