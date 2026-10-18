-- Chat: avaliação ao encerrar (com alerta de nota baixa), perguntas que a IA
-- não soube responder (viram perguntas frequentes) e agrupamento de mensagens.

alter table public.chat_conversas
  add column if not exists avaliacao_solicitada_em timestamptz,
  add column if not exists avaliacao_nota int check (avaliacao_nota between 1 and 5),
  add column if not exists avaliacao_comentario text,
  add column if not exists avaliacao_em timestamptz,
  add column if not exists avaliacao_atendente uuid;
create index if not exists chat_conversas_avaliacao_idx on public.chat_conversas(avaliacao_em desc) where avaliacao_nota is not null;

alter table public.assistente_config
  add column if not exists avaliacao_ativa boolean not null default true,
  add column if not exists avaliacao_pergunta text,
  add column if not exists avaliacao_alerta_nota int not null default 2 check (avaliacao_alerta_nota between 1 and 4),
  add column if not exists agrupar_seg int not null default 4 check (agrupar_seg between 0 and 15),
  add column if not exists ia_tarefas boolean not null default true;
grant select (avaliacao_ativa, avaliacao_pergunta, avaliacao_alerta_nota, agrupar_seg, ia_tarefas) on public.assistente_config to authenticated;
grant update (avaliacao_ativa, avaliacao_pergunta, avaliacao_alerta_nota, agrupar_seg, ia_tarefas) on public.assistente_config to authenticated;

-- ---------- Perguntas sem resposta ----------
create table if not exists public.ia_lacunas (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references public.chat_conversas(id) on delete set null,
  pergunta text not null,
  pergunta_norm text not null,
  unidade_nome text,
  status text not null default 'aberta' check (status in ('aberta', 'resolvida', 'ignorada')),
  resolvida_por uuid,
  resolvida_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ia_lacunas_status_idx on public.ia_lacunas(status, created_at desc);
alter table public.ia_lacunas enable row level security;
revoke all on public.ia_lacunas from anon, authenticated;
grant select on public.ia_lacunas to authenticated;
grant all on public.ia_lacunas to service_role;
drop policy if exists ia_lacunas_equipe on public.ia_lacunas;
create policy ia_lacunas_equipe on public.ia_lacunas for select to authenticated using (public.chat_eh_equipe());

-- Resolve (e opcionalmente vira pergunta frequente da IA). Todas as iguais saem juntas.
create or replace function public.ia_lacuna_resolver(_id uuid, _resposta text default null, _pergunta text default null, _ignorar boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare l public.ia_lacunas;
begin
  if not (public.tem_permissao('config', 'editar') or public.has_role(auth.uid(), 'admin'::app_role)) then
    raise exception 'Sem permissão para editar o assistente.' using errcode = '42501';
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
revoke all on function public.ia_lacuna_resolver(uuid, text, text, boolean) from public, anon;
grant execute on function public.ia_lacuna_resolver(uuid, text, text, boolean) to authenticated;

-- ---------- Encerrar: pede avaliação ----------
create or replace function public.chat_encerrar(_conversa uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; cfg public.assistente_config; v_msg text;
begin
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.chat_pode_mexer(c) then raise exception 'Só o responsável ou um admin pode encerrar.' using errcode = '42501'; end if;
  select * into cfg from public.assistente_config where id = 1;
  v_msg := coalesce(nullif(trim(cfg.msg_encerramento), ''), 'Atendimento encerrado. Se precisar de algo, é só escrever aqui. 😊');
  update public.chat_conversas set status = 'encerrada', ia_ativa = true, nao_lidas = 0 where id = _conversa;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema', v_msg, jsonb_build_object('publico', true, 'evento', 'encerrada', 'por', auth.uid()));
  -- Avaliação (uma vez por conversa, só se houve atendimento humano).
  if coalesce(cfg.avaliacao_ativa, true) and c.avaliacao_nota is null and c.responsavel_id is not null then
    update public.chat_conversas set avaliacao_solicitada_em = now(), avaliacao_atendente = c.responsavel_id where id = _conversa;
    insert into public.chat_mensagens (conversa_id, autor, texto, meta)
    values (_conversa, 'sistema',
      coalesce(nullif(trim(cfg.avaliacao_pergunta), ''), 'Como foi o seu atendimento? Toque nas estrelas para avaliar. ⭐'),
      jsonb_build_object('publico', true, 'evento', 'avaliacao'));
  end if;
end $$;
