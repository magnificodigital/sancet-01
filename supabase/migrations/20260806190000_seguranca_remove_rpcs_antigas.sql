-- HARDENING LGPD/segurança:
-- Remove as RPCs antigas (cpf + data_nascimento / protocolo) que estavam
-- concedidas ao papel ANON. Elas retornavam dados de paciente (perfil, pedidos,
-- RESULTADOS de exame) recebendo apenas CPF + data de nascimento como parâmetros
-- — que não são segredos. Isso permitia acesso a dado de saúde de terceiros.
--
-- O app usa exclusivamente as versões *_auth (SECURITY DEFINER que validam via
-- auth.uid()), então estas versões antigas são órfãs e podem ser removidas.

drop function if exists public.login_paciente(text, date);
drop function if exists public.meu_perfil(text, date);
drop function if exists public.atualizar_meu_perfil(text, date, jsonb);
drop function if exists public.pedidos_do_paciente(text, date);
drop function if exists public.resultados_do_paciente(text, date);
drop function if exists public.criar_pedido_paciente(text, date, jsonb);
drop function if exists public.cancelar_meu_pedido(text, text);
drop function if exists public.confirmar_pagamento_manual(text, text);
drop function if exists public.pedido_por_protocolo(text, text);
