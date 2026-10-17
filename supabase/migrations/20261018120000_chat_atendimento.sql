-- Central de atendimento do chat: a equipe vê a conversa com a IA, assume,
-- liga/desliga a IA, responde (texto + anexos), deixa notas internas,
-- transfere para outro atendente e encerra.
--
-- status da conversa: ia | aguardando (pediu humano) | humano | encerrada
-- autor da mensagem: paciente | assistente | equipe | nota (interna) | sistema
-- meta.publico = true → aviso de sistema que o paciente também vê.

alter table public.chat_conversas
  add column if not exists responsavel_id uuid references auth.users(id) on delete set null,
  add column if not exists ia_ativa boolean not null default true,
  add column if not exists canal_chave text not null default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists ultima_msg_em timestamptz,
  add column if not exists ultima_msg_texto text,
  add column if not exists ultima_msg_autor text,
  add column if not exists nao_lidas int not null default 0;
create index if not exists chat_conversas_ultima_idx on public.chat_conversas(ultima_msg_em desc nulls last);
create index if not exists chat_conversas_resp_idx on public.chat_conversas(responsavel_id);

alter table public.chat_mensagens
  add column if not exists autor_id uuid,
  add column if not exists autor_nome text,
  add column if not exists anexo_nome text,
  add column if not exists anexo_mime text;

-- Preenche o resumo das conversas que já existem.
update public.chat_conversas c set
  ultima_msg_em = m.created_at, ultima_msg_texto = left(m.texto, 200), ultima_msg_autor = m.autor
from (
  select distinct on (conversa_id) conversa_id, created_at, texto, autor
  from public.chat_mensagens where texto is not null
  order by conversa_id, created_at desc
) m
where m.conversa_id = c.id and c.ultima_msg_em is null;

-- ---------- helpers ----------
create or replace function public.chat_eh_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'staff'::app_role);
$$;

create or replace function public.chat_nome_equipe(_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(r.nome), ''), split_part(r.email, '@', 1), 'Atendente')
  from public.user_roles r where r.user_id = _uid limit 1;
$$;

-- ---------- resumo + aviso em tempo real ao paciente ----------
create or replace function public.chat_mensagem_inserida()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_chave text;
begin
  if new.texto is null and new.anexo_path is null then
    return new; -- registro técnico (ferramentas da voz)
  end if;
  if new.autor <> 'nota' and (new.autor <> 'sistema' or coalesce((new.meta->>'publico')::boolean, false)) then
    update public.chat_conversas set
      ultima_msg_em = new.created_at,
      ultima_msg_texto = left(coalesce(new.texto, '📎 ' || coalesce(new.anexo_nome, 'anexo')), 200),
      ultima_msg_autor = new.autor,
      nao_lidas = case when new.autor = 'paciente' then nao_lidas + 1 else nao_lidas end,
      updated_at = now()
    where id = new.conversa_id
    returning canal_chave into v_chave;
  else
    select canal_chave into v_chave from public.chat_conversas where id = new.conversa_id;
  end if;
  -- Só um "ping" (sem conteúdo) no canal secreto da conversa: o site do
  -- paciente busca as novidades pela edge function, que valida o token.
  if new.autor = 'equipe' or (new.autor = 'sistema' and coalesce((new.meta->>'publico')::boolean, false)) then
    begin
      perform realtime.send(jsonb_build_object('t', 'nova'), 'nova', 'chat-' || v_chave, false);
    exception when others then null; -- tempo real é best-effort (o site também consulta)
    end;
  end if;
  return new;
end $$;
drop trigger if exists chat_mensagem_inserida on public.chat_mensagens;
create trigger chat_mensagem_inserida after insert on public.chat_mensagens
  for each row execute function public.chat_mensagem_inserida();

-- ---------- ações da equipe ----------
create or replace function public.chat_pode_mexer(_c public.chat_conversas)
returns boolean language sql stable security definer set search_path = public as $$
  select public.chat_eh_equipe() and (
    _c.responsavel_id is null or _c.responsavel_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role)
  );
$$;

create or replace function public.chat_assumir(_conversa uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; v_nome text;
begin
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.chat_pode_mexer(c) then
    raise exception 'Esta conversa está com %. Peça a transferência.', public.chat_nome_equipe(c.responsavel_id) using errcode = '42501';
  end if;
  if c.responsavel_id = auth.uid() and not c.ia_ativa and c.status = 'humano' then return; end if;
  v_nome := public.chat_nome_equipe(auth.uid());
  update public.chat_conversas set responsavel_id = auth.uid(), ia_ativa = false, status = 'humano', nao_lidas = 0 where id = _conversa;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema', v_nome || ' (equipe Sancet) entrou na conversa.', jsonb_build_object('publico', true, 'evento', 'assumida', 'por', auth.uid()));
end $$;

create or replace function public.chat_transferir(_conversa uuid, _para uuid, _obs text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; v_de text; v_para text;
begin
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.chat_pode_mexer(c) then raise exception 'Só o responsável ou um admin pode transferir.' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.user_roles r where r.user_id = _para and r.role in ('admin', 'staff') and coalesce(r.ativo, true)
  ) then raise exception 'Atendente inválido.'; end if;
  v_de := public.chat_nome_equipe(auth.uid());
  v_para := public.chat_nome_equipe(_para);
  update public.chat_conversas set responsavel_id = _para, ia_ativa = false, status = 'humano' where id = _conversa;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema', 'Conversa transferida para ' || v_para || '.', jsonb_build_object('publico', true, 'evento', 'transferida', 'de', auth.uid(), 'para', _para));
  if nullif(trim(coalesce(_obs, '')), '') is not null then
    insert into public.chat_mensagens (conversa_id, autor, autor_id, autor_nome, texto)
    values (_conversa, 'nota', auth.uid(), v_de, 'Transferência: ' || left(trim(_obs), 2000));
  end if;
end $$;

create or replace function public.chat_definir_ia(_conversa uuid, _ativa boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas;
begin
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.chat_pode_mexer(c) then raise exception 'Só o responsável ou um admin pode alterar a IA.' using errcode = '42501'; end if;
  if c.ia_ativa = _ativa then return; end if;
  update public.chat_conversas set ia_ativa = _ativa,
    status = case when _ativa then 'ia' when c.status = 'ia' then 'humano' else c.status end,
    responsavel_id = case when not _ativa and c.responsavel_id is null then auth.uid() else c.responsavel_id end
  where id = _conversa;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema',
    case when _ativa then 'A assistente virtual voltou a responder nesta conversa.'
         else public.chat_nome_equipe(auth.uid()) || ' (equipe Sancet) assumiu o atendimento.' end,
    jsonb_build_object('publico', true, 'evento', case when _ativa then 'ia_ativada' else 'ia_desativada' end, 'por', auth.uid()));
end $$;

create or replace function public.chat_enviar(
  _conversa uuid, _texto text, _anexo_path text default null, _anexo_nome text default null,
  _anexo_mime text default null, _interna boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas; v_id uuid; v_nome text;
begin
  _texto := nullif(left(trim(coalesce(_texto, '')), 4000), '');
  if _texto is null and _anexo_path is null then raise exception 'Mensagem vazia.'; end if;
  if _anexo_path is not null and _anexo_path not like _conversa::text || '/%' then raise exception 'Anexo inválido.'; end if;
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.chat_eh_equipe() then raise exception 'Sem permissão.' using errcode = '42501'; end if;
  v_nome := public.chat_nome_equipe(auth.uid());
  if _interna then
    insert into public.chat_mensagens (conversa_id, autor, autor_id, autor_nome, texto, anexo_path, anexo_nome, anexo_mime)
    values (_conversa, 'nota', auth.uid(), v_nome, _texto, _anexo_path, _anexo_nome, _anexo_mime) returning id into v_id;
    return v_id;
  end if;
  if not public.chat_pode_mexer(c) then
    raise exception 'Esta conversa está com %. Peça a transferência.', public.chat_nome_equipe(c.responsavel_id) using errcode = '42501';
  end if;
  -- Responder = assumir (a IA para de responder).
  if c.responsavel_id is null or c.ia_ativa or c.status <> 'humano' then
    update public.chat_conversas set responsavel_id = coalesce(c.responsavel_id, auth.uid()), ia_ativa = false, status = 'humano' where id = _conversa;
    if c.responsavel_id is null or c.status <> 'humano' then
      insert into public.chat_mensagens (conversa_id, autor, texto, meta)
      values (_conversa, 'sistema', v_nome || ' (equipe Sancet) entrou na conversa.', jsonb_build_object('publico', true, 'evento', 'assumida', 'por', auth.uid()));
    end if;
  end if;
  insert into public.chat_mensagens (conversa_id, autor, autor_id, autor_nome, texto, anexo_path, anexo_nome, anexo_mime)
  values (_conversa, 'equipe', auth.uid(), v_nome, _texto, _anexo_path, left(_anexo_nome, 200), left(_anexo_mime, 100)) returning id into v_id;
  update public.chat_conversas set nao_lidas = 0 where id = _conversa;
  return v_id;
end $$;

create or replace function public.chat_encerrar(_conversa uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.chat_conversas;
begin
  select * into c from public.chat_conversas where id = _conversa for update;
  if not found then raise exception 'Conversa não encontrada.'; end if;
  if not public.chat_pode_mexer(c) then raise exception 'Só o responsável ou um admin pode encerrar.' using errcode = '42501'; end if;
  update public.chat_conversas set status = 'encerrada', ia_ativa = true, nao_lidas = 0 where id = _conversa;
  insert into public.chat_mensagens (conversa_id, autor, texto, meta)
  values (_conversa, 'sistema', 'Atendimento encerrado. Se precisar de algo, é só escrever aqui. 😊', jsonb_build_object('publico', true, 'evento', 'encerrada', 'por', auth.uid()));
end $$;

create or replace function public.chat_marcar_lida(_conversa uuid)
returns void language sql security definer set search_path = public as $$
  update public.chat_conversas set nao_lidas = 0
  where id = _conversa and public.chat_eh_equipe() and (responsavel_id is null or responsavel_id = auth.uid());
$$;

-- Atendentes disponíveis para transferência.
create or replace function public.chat_atendentes()
returns table (user_id uuid, nome text, role text) language sql stable security definer set search_path = public as $$
  select r.user_id, public.chat_nome_equipe(r.user_id), r.role::text
  from public.user_roles r
  where public.chat_eh_equipe() and r.role in ('admin', 'staff') and coalesce(r.ativo, true)
  order by 2;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'chat_eh_equipe()', 'chat_nome_equipe(uuid)', 'chat_pode_mexer(public.chat_conversas)',
    'chat_assumir(uuid)', 'chat_transferir(uuid,uuid,text)', 'chat_definir_ia(uuid,boolean)',
    'chat_enviar(uuid,text,text,text,text,boolean)', 'chat_encerrar(uuid)', 'chat_marcar_lida(uuid)', 'chat_atendentes()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- anexos do chat ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-anexos', 'chat-anexos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists chat_anexos_equipe_sel on storage.objects;
create policy chat_anexos_equipe_sel on storage.objects for select to authenticated
  using (bucket_id = 'chat-anexos' and public.chat_eh_equipe());
drop policy if exists chat_anexos_equipe_ins on storage.objects;
create policy chat_anexos_equipe_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-anexos' and public.chat_eh_equipe());

-- ---------- tempo real para o painel ----------
do $$
begin
  begin alter publication supabase_realtime add table public.chat_conversas; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.chat_mensagens; exception when duplicate_object then null; end;
end $$;
