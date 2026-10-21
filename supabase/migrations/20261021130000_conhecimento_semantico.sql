-- Busca por significado (embeddings) na base de conhecimento, combinada com a
-- busca por palavras. Só é usada quando há chave da OpenAI (Integrações).
create extension if not exists vector with schema extensions;

alter table public.ia_trechos add column if not exists embedding extensions.vector(1536);

create or replace function public.ia_buscar_conhecimento(_pergunta text, _unidade text default null, _limite int default 4, _embedding text default null)
returns table (documento_id uuid, titulo text, categoria text, texto text, relevancia real)
language plpgsql stable security definer set search_path = public, extensions as $$
declare termos text[]; q tsquery; qv extensions.vector(1536);
begin
  if auth.uid() is not null and not public.tem_permissao('agente', 'ver') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select array_agg(case when length(lexeme) >= 5 then quote_literal(lexeme) || ':*' else quote_literal(lexeme) end)
    into termos
  from unnest(to_tsvector('portuguese', public.f_unaccent(coalesce(_pergunta, ''))))
  where length(lexeme) >= 3;
  if termos is not null then q := to_tsquery('portuguese', array_to_string(termos, ' | ')); end if;
  if _embedding is not null then qv := _embedding::extensions.vector(1536); end if;
  if q is null and qv is null then return; end if;

  return query
  select d.id, d.titulo, d.categoria, t.texto,
    (coalesce(case when q is not null and t.fts @@ q then
        (select count(*) from unnest(termos) x where t.fts @@ to_tsquery('portuguese', x))::real + ts_rank_cd(t.fts, q, 1)
      end, 0)
     + coalesce(case when qv is not null and t.embedding is not null then (1 - (t.embedding <=> qv)) * 4 end, 0))::real as rel
  from public.ia_trechos t
  join public.ia_documentos d on d.id = t.documento_id
  where d.ativo and d.status = 'pronto'
    and (d.unidades is null or cardinality(d.unidades) = 0 or _unidade is null or _unidade = any(d.unidades))
    and ((q is not null and t.fts @@ q) or (qv is not null and t.embedding is not null and (t.embedding <=> qv) < 0.6))
  order by rel desc
  limit greatest(1, least(coalesce(_limite, 4), 10));
end $$;
drop function if exists public.ia_buscar_conhecimento(text, text, int);
revoke all on function public.ia_buscar_conhecimento(text, text, int, text) from public, anon;
grant execute on function public.ia_buscar_conhecimento(text, text, int, text) to authenticated, service_role;
