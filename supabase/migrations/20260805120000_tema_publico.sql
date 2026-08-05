-- RPC pública que expõe SOMENTE as cores do tema (não expõe segredos da tabela configuracoes).
-- Usada pelo site/painel para aplicar o tema em runtime, inclusive para visitantes anônimos.
create or replace function public.tema_publico()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_object_agg(chave, valor), '{}'::jsonb)
  from public.configuracoes
  where chave in ('TEMA_PRIMARIA', 'TEMA_SECUNDARIA', 'TEMA_SIDEBAR')
    and valor is not null
    and valor <> '';
$$;

grant execute on function public.tema_publico() to anon, authenticated;
