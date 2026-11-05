-- Assunto e etiquetas nas conversas + direcionamento por assunto.
-- Assunto: um por conversa (a IA identifica; a equipe pode trocar). Cada
-- assunto pode ter atendentes preferenciais (ou exclusivos) na distribuição.
-- Etiquetas: várias por conversa, escolhidas de uma lista do painel.

create table if not exists public.chat_assuntos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (length(btrim(nome)) between 2 and 60),
  descricao text,                       -- ajuda a IA a reconhecer o assunto
  cor text not null default '#64748b',
  atendentes uuid[] not null default '{}', -- vazio = qualquer atendente
  exclusivo boolean not null default false, -- true = só esses atendentes recebem
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_etiquetas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (length(btrim(nome)) between 1 and 40),
  cor text not null default '#64748b',
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.chat_conversas
  add column if not exists assunto_id uuid references public.chat_assuntos(id) on delete set null,
  add column if not exists etiquetas text[] not null default '{}';
create index if not exists chat_conversas_assunto_idx on public.chat_conversas(assunto_id);
create index if not exists chat_conversas_etiquetas_idx on public.chat_conversas using gin(etiquetas);

-- Quem configura: admin ou quem edita o Agente de IA / as configurações do assistente.
create or replace function public.chat_pode_configurar()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin'::app_role) or public.tem_permissao('agente', 'editar')
$$;

alter table public.chat_assuntos enable row level security;
alter table public.chat_etiquetas enable row level security;
revoke all on public.chat_assuntos, public.chat_etiquetas from anon;
grant select, insert, update, delete on public.chat_assuntos, public.chat_etiquetas to authenticated;
grant all on public.chat_assuntos, public.chat_etiquetas to service_role;

drop policy if exists "equipe vê assuntos" on public.chat_assuntos;
create policy "equipe vê assuntos" on public.chat_assuntos for select to authenticated using (public.chat_eh_equipe());
drop policy if exists "config edita assuntos" on public.chat_assuntos;
create policy "config edita assuntos" on public.chat_assuntos for all to authenticated
  using (public.chat_pode_configurar()) with check (public.chat_pode_configurar());

drop policy if exists "equipe vê etiquetas" on public.chat_etiquetas;
create policy "equipe vê etiquetas" on public.chat_etiquetas for select to authenticated using (public.chat_eh_equipe());
drop policy if exists "config edita etiquetas" on public.chat_etiquetas;
create policy "config edita etiquetas" on public.chat_etiquetas for all to authenticated
  using (public.chat_pode_configurar()) with check (public.chat_pode_configurar());

-- Equipe troca o assunto (e a conversa na fila é redistribuída para quem atende esse assunto).
create or replace function public.chat_definir_assunto(_conversa uuid, _assunto uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; v_nome text;
begin
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not (public.chat_eh_equipe() and public.tem_permissao('conversas', 'editar') and public.chat_pode_ver(c.unidade_codigo_shift, c.responsavel_id)) then
    raise exception 'Sem permissão para alterar esta conversa.' using errcode = '42501';
  end if;
  if _assunto is not null and not exists (select 1 from public.chat_assuntos where id = _assunto and ativo) then
    raise exception 'Assunto inválido.';
  end if;
  if c.assunto_id is not distinct from _assunto then return; end if;
  update public.chat_conversas set assunto_id = _assunto where id = _conversa;
  select nome into v_nome from public.chat_assuntos where id = _assunto;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema', '🏷️ Assunto: ' || coalesce(v_nome, '(sem assunto)') || ' — por ' || public.chat_nome_equipe(auth.uid()),
          jsonb_build_object('evento', 'assunto', 'assunto_id', _assunto, 'por', auth.uid()));
  if c.status = 'aguardando' and c.responsavel_id is null then perform public.chat_distribuir(_conversa); end if;
end $$;

create or replace function public.chat_definir_etiquetas(_conversa uuid, _etiquetas text[])
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; v text[];
begin
  select * into c from public.chat_conversas where id = _conversa;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not (public.chat_eh_equipe() and public.tem_permissao('conversas', 'editar') and public.chat_pode_ver(c.unidade_codigo_shift, c.responsavel_id)) then
    raise exception 'Sem permissão para alterar esta conversa.' using errcode = '42501';
  end if;
  -- Só etiquetas cadastradas (as que já estavam na conversa continuam valendo).
  select coalesce(array_agg(distinct e order by e), '{}') into v
  from unnest(coalesce(_etiquetas, '{}')) e
  where e in (select nome from public.chat_etiquetas where ativo) or e = any(c.etiquetas);
  update public.chat_conversas set etiquetas = v where id = _conversa;
end $$;

revoke all on function public.chat_definir_assunto(uuid, uuid), public.chat_definir_etiquetas(uuid, text[]), public.chat_pode_configurar() from public, anon;
grant execute on function public.chat_definir_assunto(uuid, uuid), public.chat_definir_etiquetas(uuid, text[]), public.chat_pode_configurar() to authenticated;

-- Distribuição: respeita o assunto (atendentes preferenciais primeiro; se o
-- assunto for exclusivo, só eles). Resto igual: online, unidade, limite e rodízio.
create or replace function public.chat_distribuir(_conversa uuid)
 returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare c public.chat_conversas; cfg public.assistente_config; v uuid; v_nome text; a_ids uuid[]; a_excl boolean;
begin
  select * into cfg from public.assistente_config where id = 1;
  if not coalesce(cfg.fila_distribuir, true) then return null; end if;
  select * into c from public.chat_conversas where id = _conversa for update skip locked;
  if not found or c.status <> 'aguardando' or c.responsavel_id is not null then return null; end if;
  select atendentes, exclusivo into a_ids, a_excl from public.chat_assuntos where id = c.assunto_id and ativo;
  a_ids := coalesce(a_ids, '{}');

  select a.user_id into v
  from public.atendentes_status a
  join public.user_roles r on r.user_id = a.user_id
  where a.status = 'online'
    and a.ultimo_ping > now() - interval '3 minutes'
    and coalesce(r.ativo, true)
    and (r.role = 'staff' or (r.role = 'admin' and (coalesce(cfg.fila_incluir_admins, false) or a.user_id = any(a_ids))))
    and (
      c.unidade_codigo_shift is null or r.role = 'admin' or exists (
        select 1 from public.user_unidades uu join public.unidades_cache uc on uc.id = uu.unidade_id
        where uu.user_id = a.user_id and uc.codigo_shift = c.unidade_codigo_shift
      )
    )
    and (not coalesce(a_excl, false) or cardinality(a_ids) = 0 or a.user_id = any(a_ids))
    and (select count(*) from public.chat_conversas x where x.responsavel_id = a.user_id and x.status = 'humano')
        < coalesce(cfg.fila_max_por_atendente, 6)
  order by (cardinality(a_ids) > 0 and not (a.user_id = any(a_ids))),
           (r.role = 'admin'),
           (select count(*) from public.chat_conversas x where x.responsavel_id = a.user_id and x.status = 'humano'),
           a.ultima_atribuicao nulls first
  limit 1;
  if v is null then return null; end if;

  v_nome := public.chat_nome_equipe(v);
  update public.chat_conversas set responsavel_id = v, status = 'humano', ia_ativa = false, atribuida_em = now() where id = _conversa;
  update public.atendentes_status set ultima_atribuicao = now() where user_id = v;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema', v_nome || ' (equipe Sancet) vai te atender. 🙂',
          jsonb_build_object('publico', true, 'evento', 'atribuida', 'para', v));
  return v;
end $function$;

-- Assuntos iniciais (a equipe edita/apaga no painel).
insert into public.chat_assuntos (nome, descricao, cor, ordem) values
  ('Agendamento', 'Marcar, reagendar ou cancelar exames', '#2563eb', 1),
  ('Resultados', 'Resultado de exame, prazo, acesso ao laudo', '#16a34a', 2),
  ('Convênios', 'Cobertura, autorização, token, carteirinha', '#7c3aed', 3),
  ('Pagamento', 'Pagamento, PIX, boleto, reembolso, nota fiscal', '#d97706', 4),
  ('Reclamação', 'Insatisfação, problema no atendimento', '#dc2626', 5),
  ('Outros', 'Demais dúvidas', '#64748b', 9)
on conflict (nome) do nothing;
insert into public.chat_etiquetas (nome, cor, ordem) values
  ('Urgente', '#dc2626', 1),
  ('Retornar contato', '#d97706', 2),
  ('Aguardando paciente', '#2563eb', 3),
  ('Resolvido', '#16a34a', 4)
on conflict (nome) do nothing;
