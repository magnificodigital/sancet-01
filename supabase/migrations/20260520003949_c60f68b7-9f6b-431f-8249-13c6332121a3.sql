ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS data_agendamento date,
  ADD COLUMN IF NOT EXISTS periodo_agendamento text 
    CHECK (periodo_agendamento IN ('manha', 'tarde'));

CREATE INDEX IF NOT EXISTS idx_pedidos_agendamento 
  ON public.pedidos (data_agendamento, unidade_codigo_shift) 
  WHERE data_agendamento IS NOT NULL;