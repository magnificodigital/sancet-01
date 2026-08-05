-- Amplia a RPC pública tema_publico() para também expor as URLs de logo
-- (LOGO_CLARO / LOGO_ESCURO), além das cores. Continua sem expor segredos.
create or replace function public.tema_publico()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_object_agg(chave, valor), '{}'::jsonb)
  from public.configuracoes
  where chave in (
      'TEMA_PRIMARIA', 'TEMA_SECUNDARIA', 'TEMA_SIDEBAR',
      'LOGO_CLARO', 'LOGO_ESCURO'
    )
    and valor is not null
    and valor <> '';
$$;

grant execute on function public.tema_publico() to anon, authenticated;
