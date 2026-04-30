-- 1. Enum de papéis
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (SECURITY DEFINER, sem recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Policies da user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Restringir escrita das tabelas de domínio a staff/admin
-- pedidos
DROP POLICY IF EXISTS "authenticated_all_pedidos" ON public.pedidos;
CREATE POLICY "staff_select_pedidos"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "staff_update_pedidos"
  ON public.pedidos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "staff_delete_pedidos"
  ON public.pedidos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "staff_insert_pedidos"
  ON public.pedidos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- pacientes (mantém anon insert/select; restringe update/delete a staff)
DROP POLICY IF EXISTS "authenticated_all_pacientes" ON public.pacientes;
CREATE POLICY "staff_select_pacientes"
  ON public.pacientes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "staff_update_pacientes"
  ON public.pacientes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "staff_delete_pacientes"
  ON public.pacientes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "staff_insert_pacientes"
  ON public.pacientes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- exames_cache
DROP POLICY IF EXISTS "authenticated_write_exames" ON public.exames_cache;
CREATE POLICY "staff_write_exames"
  ON public.exames_cache FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- vacinas_cache
DROP POLICY IF EXISTS "authenticated_write_vacinas" ON public.vacinas_cache;
CREATE POLICY "staff_write_vacinas"
  ON public.vacinas_cache FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- unidades_cache
DROP POLICY IF EXISTS "authenticated_write_unidades" ON public.unidades_cache;
CREATE POLICY "staff_write_unidades"
  ON public.unidades_cache FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- convenios_cache
DROP POLICY IF EXISTS "authenticated_write_convenios" ON public.convenios_cache;
CREATE POLICY "staff_write_convenios"
  ON public.convenios_cache FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- 6. Storage: staff lê documentos do bucket privado
DROP POLICY IF EXISTS "Staff read documentos-pedidos" ON storage.objects;
CREATE POLICY "Staff read documentos-pedidos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos-pedidos'
    AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  );
