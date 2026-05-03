
CREATE TABLE public.landing_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  meta_descricao text,
  blocos jsonb NOT NULL DEFAULT '[]'::jsonb,
  publicado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_landing_pages"
ON public.landing_pages
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "anon_select_published_landing_pages"
ON public.landing_pages
FOR SELECT
TO anon
USING (publicado = true);

CREATE POLICY "auth_select_published_landing_pages"
ON public.landing_pages
FOR SELECT
TO authenticated
USING (publicado = true OR has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.landing_pages TO anon;
GRANT ALL ON public.landing_pages TO authenticated, service_role;

CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualiza default de permissoes em user_roles para incluir "paginas"
ALTER TABLE public.user_roles
ALTER COLUMN permissoes SET DEFAULT '{"sync": {"ver": false}, "config": {"ver": false, "editar": false}, "pedidos": {"ver": true, "editar": false, "excluir": false}, "catalogo": {"ver": true, "editar": false, "excluir": false}, "unidades": {"ver": true, "editar": false, "excluir": false}, "pacientes": {"ver": true, "editar": false, "excluir": false}, "paginas": {"ver": false, "editar": false, "excluir": false}}'::jsonb;
