-- "Paciente respondeu" fica em destaque até a equipe clicar em "Marcar como visto".
alter table pedidos add column if not exists staff_visto_em timestamptz;
