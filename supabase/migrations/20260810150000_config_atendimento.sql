-- Modo de atendimento configurável pelo admin (substitui as flags hardcoded de testeConvenio.ts).
-- Valores em texto "true"/"false". Defaults abaixo = comportamento atual (fase de teste do convênio).
insert into public.configuracoes (chave, valor, atualizado_em) values
  ('ATEND_PARTICULAR', 'false', now()),
  ('ATEND_CONVENIO', 'true', now()),
  ('ATEND_SANCET_CASA', 'false', now()),
  ('ATEND_SOMENTE_MATRIZ', 'true', now()),
  ('ATEND_CONVENIO_PULAR_CATALOGO', 'true', now())
on conflict (chave) do nothing;

-- Expor essas flags no RPC público (o checkout do paciente lê por aqui, sem expor segredos).
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
      'LOGO_CLARO', 'LOGO_ESCURO', 'FAVICON',
      'FOOTER_TEXTO', 'FOOTER_LINKS',
      'ATEND_PARTICULAR', 'ATEND_CONVENIO', 'ATEND_SANCET_CASA',
      'ATEND_SOMENTE_MATRIZ', 'ATEND_CONVENIO_PULAR_CATALOGO'
    )
    and valor is not null
    and valor <> '';
$$;

grant execute on function public.tema_publico() to anon, authenticated;
