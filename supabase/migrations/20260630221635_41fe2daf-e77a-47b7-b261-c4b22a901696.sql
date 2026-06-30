
-- Drop overly-permissive storage policies
DROP POLICY IF EXISTS "anon_all_documentos_pedidos_teste" ON storage.objects;
DROP POLICY IF EXISTS "anon_insert_documentos_pedidos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload_imagens" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_imagens" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem ver imagens de exames" ON storage.objects;
DROP POLICY IF EXISTS "public_read_imagens" ON storage.objects;

-- Drop broad anon/authenticated INSERT policies on pacientes
-- Public sign-up is handled by SECURITY DEFINER cadastrar_paciente()
DROP POLICY IF EXISTS "anon_inserir_paciente" ON public.pacientes;
DROP POLICY IF EXISTS "anon_insert_pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "authenticated_insert_pacientes" ON public.pacientes;

-- Drop broad anon INSERT policies on pedidos
-- Public order creation handled by SECURITY DEFINER criar_pedido_paciente()
DROP POLICY IF EXISTS "anon_inserir_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "anon_insert_pedidos" ON public.pedidos;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Revoke EXECUTE on internal helper / trigger functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.gerar_protocolo_sancet() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validar_slug_pagina() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pode_ver_pedido_unidade(text) FROM anon, PUBLIC;
