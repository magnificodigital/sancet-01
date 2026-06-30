ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS no_menu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ordem_menu integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_landing_pages_menu
  ON public.landing_pages(ordem_menu)
  WHERE no_menu = true AND publicado = true;