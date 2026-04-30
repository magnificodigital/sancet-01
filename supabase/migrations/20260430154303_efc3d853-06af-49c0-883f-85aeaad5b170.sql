ALTER TABLE public.pacientes DROP CONSTRAINT pacientes_sexo_check;

ALTER TABLE public.pacientes
ADD CONSTRAINT pacientes_sexo_check
CHECK (sexo IS NULL OR sexo IN ('M', 'F', 'O', 'masculino', 'feminino', 'outro'));