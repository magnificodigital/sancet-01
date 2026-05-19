ALTER TABLE public.shift_sync_logs 
ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'completo',
ADD COLUMN IF NOT EXISTS exames_processados integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS exames_falhados integer NOT NULL DEFAULT 0;