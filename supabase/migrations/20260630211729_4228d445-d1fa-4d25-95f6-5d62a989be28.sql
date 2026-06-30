
CREATE TABLE IF NOT EXISTS public.paginas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  conteudo_html text NOT NULL DEFAULT '',
  meta_title text,
  meta_description text,
  no_menu boolean NOT NULL DEFAULT false,
  ordem_menu integer DEFAULT 0,
  ativa boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.paginas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paginas TO authenticated;
GRANT ALL ON public.paginas TO service_role;

ALTER TABLE public.paginas ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_paginas_slug ON public.paginas(slug) WHERE ativa = true;
CREATE INDEX IF NOT EXISTS idx_paginas_menu ON public.paginas(ordem_menu) WHERE no_menu = true AND ativa = true;

CREATE POLICY public_read_paginas ON public.paginas
  FOR SELECT TO anon, authenticated
  USING (ativa = true);

CREATE POLICY admin_write_paginas ON public.paginas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.validar_slug_pagina() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.slug := regexp_replace(lower(coalesce(NEW.slug,'')), '[^a-z0-9-]+', '-', 'g');
  NEW.slug := regexp_replace(NEW.slug, '-+', '-', 'g');
  NEW.slug := trim(both '-' from NEW.slug);

  IF NEW.slug = '' THEN
    RAISE EXCEPTION 'Slug inválido';
  END IF;

  IF NEW.slug IN ('exames', 'vacinas', 'sacola', 'checkout', 'pronto',
                  'staff', 'agendamentos', 'entrar', 'cadastro', 'pagamento',
                  'enviar-pedido', 'receita', 'unidades', 'exames-legacy', 'p')
     OR NEW.slug LIKE 'staff/%'
     OR NEW.slug LIKE 'exames/%'
     OR NEW.slug LIKE 'checkout/%' THEN
    RAISE EXCEPTION 'Slug reservado pelo sistema: %', NEW.slug;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_slug_pagina_trigger ON public.paginas;
CREATE TRIGGER validar_slug_pagina_trigger
  BEFORE INSERT OR UPDATE ON public.paginas
  FOR EACH ROW EXECUTE FUNCTION public.validar_slug_pagina();

INSERT INTO public.paginas (slug, titulo, conteudo_html, no_menu, ordem_menu) VALUES
  ('como-se-preparar', 'Como se preparar', '<p>Instruções de preparo para os exames mais comuns.</p>', true, 1),
  ('quem-somos', 'Quem somos', '<p>O Laboratório Sancet atua há...</p>', true, 2),
  ('politica-de-privacidade', 'Política de Privacidade', '<p>Texto LGPD...</p>', false, 0),
  ('termos-de-uso', 'Termos de Uso', '<p>Termos...</p>', false, 0)
ON CONFLICT (slug) DO NOTHING;
