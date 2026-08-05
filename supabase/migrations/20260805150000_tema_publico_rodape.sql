-- Amplia a RPC pública tema_publico() para também expor as cores do rodapé
-- (TEMA_RODAPE / TEMA_RODAPE_TEXTO). Continua sem expor segredos.
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
      'TEMA_RODAPE', 'TEMA_RODAPE_TEXTO',
      'LOGO_CLARO', 'LOGO_ESCURO', 'FAVICON'
    )
    and valor is not null
    and valor <> '';
$$;

grant execute on function public.tema_publico() to anon, authenticated;
