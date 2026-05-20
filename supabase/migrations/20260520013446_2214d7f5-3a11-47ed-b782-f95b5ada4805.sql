ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS plano_codigo text,
  ADD COLUMN IF NOT EXISTS plano_descricao text;