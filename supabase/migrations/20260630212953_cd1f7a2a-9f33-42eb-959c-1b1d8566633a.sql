CREATE OR REPLACE FUNCTION public.validar_slug_pagina()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.slug := regexp_replace(lower(coalesce(NEW.slug,'')), '[^a-z0-9-]+', '-', 'g');
  NEW.slug := regexp_replace(NEW.slug, '-+', '-', 'g');
  NEW.slug := trim(both '-' from NEW.slug);

  IF NEW.slug = '' THEN
    RAISE EXCEPTION 'Slug inválido';
  END IF;

  IF NEW.slug IN ('exames', 'vacinas', 'sacola', 'checkout', 'pronto',
                  'staff', 'agendamentos', 'entrar', 'cadastro', 'pagamento',
                  'enviar-pedido', 'receita', 'unidades', 'exames-legacy', 'p',
                  'preparos')
     OR NEW.slug LIKE 'staff/%'
     OR NEW.slug LIKE 'exames/%'
     OR NEW.slug LIKE 'checkout/%' THEN
    RAISE EXCEPTION 'Slug reservado pelo sistema: %', NEW.slug;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$function$;