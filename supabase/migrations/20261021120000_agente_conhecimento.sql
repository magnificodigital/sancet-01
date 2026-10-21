-- Agente de IA: base de conhecimento (arquivos, textos e páginas), regras do
-- agente e permissão própria ("agente": ver / editar).

-- ---------- Permissão "agente" ----------
create or replace function public.permissoes_padrao(_role text)
returns jsonb language sql immutable set search_path = public as $$
  select case when _role = 'admin' then '{
    "visao": {"ver": true}, "pedidos": {"ver": true, "editar": true, "excluir": true},
    "conversas": {"ver": true, "editar": true}, "checkin": {"ver": true},
    "pacientes": {"ver": true, "editar": true, "excluir": true}, "catalogo": {"ver": true, "editar": true, "excluir": true},
    "unidades": {"ver": true, "editar": true, "excluir": true}, "convenios": {"ver": true, "editar": true},
    "paginas": {"ver": true, "editar": true, "excluir": true}, "recall": {"ver": true, "editar": true},
    "agente": {"ver": true, "editar": true},
    "equipe": {"ver": true, "editar": true, "excluir": true}, "config": {"ver": true, "editar": true}, "sync": {"ver": true}
  }'::jsonb else '{
    "visao": {"ver": true}, "pedidos": {"ver": true, "editar": true, "excluir": false},
    "conversas": {"ver": true, "editar": true}, "checkin": {"ver": true},
    "pacientes": {"ver": true, "editar": false, "excluir": false}, "catalogo": {"ver": true, "editar": false, "excluir": false},
    "unidades": {"ver": true, "editar": false, "excluir": false}, "convenios": {"ver": true, "editar": false},
    "paginas": {"ver": false, "editar": false, "excluir": false}, "recall": {"ver": false, "editar": false},
    "agente": {"ver": false, "editar": false},
    "equipe": {"ver": false, "editar": false, "excluir": false}, "config": {"ver": false, "editar": false}, "sync": {"ver": false}
  }'::jsonb end;
$$;

-- Configuração do assistente passa a seguir a permissão "agente".
drop policy if exists assistente_config_admin_sel on public.assistente_config;
create policy assistente_config_admin_sel on public.assistente_config for select to authenticated
  using (public.tem_permissao('agente', 'ver'));
drop policy if exists assistente_config_admin_upd on public.assistente_config;
create policy assistente_config_admin_upd on public.assistente_config for update to authenticated
  using (public.tem_permissao('agente', 'editar')) with check (public.tem_permissao('agente', 'editar'));

create or replace function public.ia_lacuna_resolver(_id uuid, _resposta text default null, _pergunta text default null, _ignorar boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare l public.ia_lacunas;
begin
  if not public.tem_permissao('agente', 'editar') then
    raise exception 'Sem permissão para editar o Agente de IA.' using errcode = '42501';
  end if;
  select * into l from public.ia_lacunas where id = _id;
  if not found then raise exception 'Pergunta não encontrada.'; end if;
  if not _ignorar then
    if nullif(trim(coalesce(_resposta, '')), '') is null then raise exception 'Escreva a resposta.'; end if;
    update public.assistente_config
      set faq = coalesce(faq, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'pergunta', left(coalesce(nullif(trim(_pergunta), ''), l.pergunta), 300),
        'resposta', left(trim(_resposta), 1500)))
      where id = 1;
  end if;
  update public.ia_lacunas
    set status = case when _ignorar then 'ignorada' else 'resolvida' end, resolvida_por = auth.uid(), resolvida_em = now()
    where pergunta_norm = l.pergunta_norm and status = 'aberta';
end $$;

-- ---------- Regras do agente ----------
alter table public.assistente_config
  add column if not exists regras_sempre jsonb not null default '[]'::jsonb,
  add column if not exists regras_nunca jsonb not null default '[]'::jsonb,
  add column if not exists assuntos_bloqueados jsonb not null default '[]'::jsonb,
  add column if not exists gatilhos_humano jsonb not null default '[]'::jsonb,
  add column if not exists ia_horario text not null default 'sempre' check (ia_horario in ('sempre', 'fora_horario', 'nunca')),
  add column if not exists conhecimento_max_trechos int not null default 4 check (conhecimento_max_trechos between 1 and 10);
grant select (regras_sempre, regras_nunca, assuntos_bloqueados, gatilhos_humano, ia_horario, conhecimento_max_trechos)
  on public.assistente_config to authenticated;
grant update (regras_sempre, regras_nunca, assuntos_bloqueados, gatilhos_humano, ia_horario, conhecimento_max_trechos)
  on public.assistente_config to authenticated;

-- ---------- Base de conhecimento ----------
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe strict set search_path = public as $$
  select public.unaccent('public.unaccent'::regdictionary, $1);
$$;

create table if not exists public.ia_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null default 'Geral',
  tipo text not null check (tipo in ('arquivo', 'texto', 'url')),
  arquivo_path text,
  arquivo_nome text,
  arquivo_mime text,
  url text,
  texto_original text,
  status text not null default 'processando' check (status in ('processando', 'pronto', 'erro')),
  erro text,
  ativo boolean not null default true,
  unidades text[],                   -- null = vale para todas as unidades
  caracteres int not null default 0,
  trechos int not null default 0,
  criado_por uuid,
  criado_em timestamptz not null default now(),
  atualizado_por uuid,
  atualizado_em timestamptz not null default now()
);
create index if not exists ia_documentos_cat_idx on public.ia_documentos(categoria);

create table if not exists public.ia_trechos (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.ia_documentos(id) on delete cascade,
  ordem int not null,
  texto text not null,
  fts tsvector generated always as (to_tsvector('portuguese', public.f_unaccent(texto))) stored
);
create index if not exists ia_trechos_fts_idx on public.ia_trechos using gin (fts);
create index if not exists ia_trechos_doc_idx on public.ia_trechos(documento_id, ordem);

alter table public.ia_documentos enable row level security;
alter table public.ia_trechos enable row level security;
revoke all on public.ia_documentos, public.ia_trechos from anon, authenticated;
grant select, insert, update, delete on public.ia_documentos to authenticated;
grant select on public.ia_trechos to authenticated;
grant all on public.ia_documentos, public.ia_trechos to service_role;

drop policy if exists ia_documentos_ler on public.ia_documentos;
create policy ia_documentos_ler on public.ia_documentos for select to authenticated using (public.tem_permissao('agente', 'ver'));
drop policy if exists ia_documentos_inserir on public.ia_documentos;
create policy ia_documentos_inserir on public.ia_documentos for insert to authenticated with check (public.tem_permissao('agente', 'editar'));
drop policy if exists ia_documentos_editar on public.ia_documentos;
create policy ia_documentos_editar on public.ia_documentos for update to authenticated
  using (public.tem_permissao('agente', 'editar')) with check (public.tem_permissao('agente', 'editar'));
drop policy if exists ia_documentos_excluir on public.ia_documentos;
create policy ia_documentos_excluir on public.ia_documentos for delete to authenticated using (public.tem_permissao('agente', 'editar'));
drop policy if exists ia_trechos_ler on public.ia_trechos;
create policy ia_trechos_ler on public.ia_trechos for select to authenticated using (public.tem_permissao('agente', 'ver'));

create or replace function public.ia_documentos_auditoria()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(new.criado_por, auth.uid());
  end if;
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists ia_documentos_auditoria on public.ia_documentos;
create trigger ia_documentos_auditoria before insert or update on public.ia_documentos
  for each row execute function public.ia_documentos_auditoria();
revoke all on function public.ia_documentos_auditoria() from public, anon, authenticated;

-- Busca dos trechos mais relevantes (qualquer palavra da pergunta, sem acento).
create or replace function public.ia_buscar_conhecimento(_pergunta text, _unidade text default null, _limite int default 4)
returns table (documento_id uuid, titulo text, categoria text, texto text, relevancia real)
language plpgsql stable security definer set search_path = public as $$
declare q tsquery;
begin
  if auth.uid() is not null and not public.tem_permissao('agente', 'ver') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select to_tsquery('portuguese', string_agg(quote_literal(lexeme) || ':*', ' | '))
    into q
  from unnest(to_tsvector('portuguese', public.f_unaccent(coalesce(_pergunta, ''))))
  where length(lexeme) >= 3;
  if q is null then return; end if;
  return query
  select d.id, d.titulo, d.categoria, t.texto, ts_rank_cd(t.fts, q)::real
  from public.ia_trechos t
  join public.ia_documentos d on d.id = t.documento_id
  where t.fts @@ q
    and d.ativo and d.status = 'pronto'
    and (d.unidades is null or cardinality(d.unidades) = 0 or _unidade is null or _unidade = any(d.unidades))
  order by ts_rank_cd(t.fts, q) desc
  limit greatest(1, least(coalesce(_limite, 4), 10));
end $$;
revoke all on function public.ia_buscar_conhecimento(text, text, int) from public, anon;
grant execute on function public.ia_buscar_conhecimento(text, text, int) to authenticated, service_role;

-- Arquivos da base de conhecimento (privados).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ia-conhecimento', 'ia-conhecimento', false, 20971520, array[
  'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ia_conhecimento_ler on storage.objects;
create policy ia_conhecimento_ler on storage.objects for select to authenticated
  using (bucket_id = 'ia-conhecimento' and public.tem_permissao('agente', 'ver'));
drop policy if exists ia_conhecimento_enviar on storage.objects;
create policy ia_conhecimento_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'ia-conhecimento' and public.tem_permissao('agente', 'editar'));
drop policy if exists ia_conhecimento_apagar on storage.objects;
create policy ia_conhecimento_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'ia-conhecimento' and public.tem_permissao('agente', 'editar'));

-- Conversas de teste do painel (sandbox) somem depois de 1 dia.
do $$
begin
  perform cron.unschedule('limpar-chat-teste') where exists (select 1 from cron.job where jobname = 'limpar-chat-teste');
  perform cron.schedule('limpar-chat-teste', '41 3 * * *', $c$delete from public.chat_conversas where canal = 'teste' and created_at < now() - interval '1 day'$c$);
end $$;

-- Busca v2: palavras curtas só inteiras; ordena por quantas palavras da pergunta o trecho cobre.
create or replace function public.ia_buscar_conhecimento(_pergunta text, _unidade text default null, _limite int default 4)
returns table (documento_id uuid, titulo text, categoria text, texto text, relevancia real)
language plpgsql stable security definer set search_path = public as $$
declare termos text[]; q tsquery;
begin
  if auth.uid() is not null and not public.tem_permissao('agente', 'ver') then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  select array_agg(case when length(lexeme) >= 5 then quote_literal(lexeme) || ':*' else quote_literal(lexeme) end)
    into termos
  from unnest(to_tsvector('portuguese', public.f_unaccent(coalesce(_pergunta, ''))))
  where length(lexeme) >= 3;
  if termos is null then return; end if;
  q := to_tsquery('portuguese', array_to_string(termos, ' | '));
  return query
  select d.id, d.titulo, d.categoria, t.texto,
         ((select count(*) from unnest(termos) x where t.fts @@ to_tsquery('portuguese', x))::real
           + ts_rank_cd(t.fts, q, 1))::real as rel
  from public.ia_trechos t
  join public.ia_documentos d on d.id = t.documento_id
  where t.fts @@ q
    and d.ativo and d.status = 'pronto'
    and (d.unidades is null or cardinality(d.unidades) = 0 or _unidade is null or _unidade = any(d.unidades))
  order by rel desc
  limit greatest(1, least(coalesce(_limite, 4), 10));
end $$;
