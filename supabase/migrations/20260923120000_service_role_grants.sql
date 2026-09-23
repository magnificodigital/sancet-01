-- As edge functions usam o papel service_role. Tabelas criadas pelas nossas
-- migrations (exame_preparo, exames_convenio, recall_*, nps_respostas...) ficaram
-- sem GRANT para esse papel -> "permission denied" dentro das funções
-- (ex.: e-mail de preparativos saía "sem preparo" em todos os exames).
-- Restaura o padrão do Supabase: service_role com acesso total ao schema public.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Tabelas/funções criadas no futuro já nascem com o acesso.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
