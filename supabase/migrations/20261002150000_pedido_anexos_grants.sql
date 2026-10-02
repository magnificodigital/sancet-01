-- A equipe lê os anexos do paciente direto da tabela (aba Documentos). Neste
-- projeto tabelas novas não recebem GRANT automático para os papéis do app,
-- então a leitura falhava ("permission denied") e a lista ficava vazia.
-- O acesso continua controlado pela RLS (policy pedido_anexos_staff).
grant select, insert, update, delete on public.pedido_anexos to authenticated;
