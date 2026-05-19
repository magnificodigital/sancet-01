
ALTER TABLE public.exames_cache ADD COLUMN IF NOT EXISTS preco_particular numeric(10,2);

ALTER TABLE public.convenios_cache ADD COLUMN IF NOT EXISTS arquivo_cruzado_id integer;

DELETE FROM public.convenios_cache WHERE arquivo_cruzado_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_convenios_cache_arquivo_cruzado_id ON public.convenios_cache(arquivo_cruzado_id) WHERE arquivo_cruzado_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.convenios_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convenio_id uuid NOT NULL REFERENCES public.convenios_cache(id) ON DELETE CASCADE,
  codigo_item text NOT NULL,
  descricao text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (convenio_id, codigo_item)
);

CREATE INDEX IF NOT EXISTS idx_convenios_planos_convenio ON public.convenios_planos(convenio_id);

ALTER TABLE public.convenios_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_convenios_planos" ON public.convenios_planos FOR SELECT USING (true);
CREATE POLICY "admin_write_convenios_planos" ON public.convenios_planos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
