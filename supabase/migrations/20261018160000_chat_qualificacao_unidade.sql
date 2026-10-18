-- Chat: qualificação do paciente (nome/telefone/e-mail + UNIDADE) antes do
-- atendimento, direcionamento para a equipe da unidade e vínculo com o pedido.

alter table public.chat_conversas
  add column if not exists lead_nome text,
  add column if not exists lead_telefone text,
  add column if not exists lead_email text,
  add column if not exists unidade_codigo_shift text,
  add column if not exists unidade_nome text,
  add column if not exists qualificado_em timestamptz,
  add column if not exists pedido_id uuid references public.pedidos(id) on delete set null,
  add column if not exists pedido_protocolo text;
create index if not exists chat_conversas_unidade_idx on public.chat_conversas(unidade_codigo_shift);

alter table public.assistente_config
  add column if not exists qualificar_obrigatorio boolean not null default true,
  add column if not exists qualificar_campos jsonb not null default
    '{"nome": true, "telefone": true, "email": false, "unidade": true}'::jsonb;
grant select (qualificar_obrigatorio, qualificar_campos) on public.assistente_config to authenticated;
grant update (qualificar_obrigatorio, qualificar_campos) on public.assistente_config to authenticated;

-- Equipe vê: conversas ainda sem unidade, da(s) sua(s) unidade(s) ou que estão com ela.
create or replace function public.chat_pode_ver(_unidade text, _responsavel uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin'::app_role)
    or (public.has_role(auth.uid(), 'staff'::app_role) and (
      _unidade is null or _responsavel = auth.uid() or public.pode_ver_pedido_unidade(_unidade)
    ));
$$;
revoke all on function public.chat_pode_ver(text, uuid) from public, anon;
grant execute on function public.chat_pode_ver(text, uuid) to authenticated;

drop policy if exists chat_conversas_staff on public.chat_conversas;
create policy chat_conversas_staff on public.chat_conversas for select to authenticated
  using (public.chat_pode_ver(unidade_codigo_shift, responsavel_id));

drop policy if exists chat_mensagens_staff on public.chat_mensagens;
create policy chat_mensagens_staff on public.chat_mensagens for select to authenticated
  using (exists (
    select 1 from public.chat_conversas c
    where c.id = chat_mensagens.conversa_id and public.chat_pode_ver(c.unidade_codigo_shift, c.responsavel_id)
  ));

-- Ações: além de responsável/admin, precisa enxergar a unidade da conversa.
create or replace function public.chat_pode_mexer(_c public.chat_conversas)
returns boolean language sql stable security definer set search_path = public as $$
  select public.chat_eh_equipe()
    and public.chat_pode_ver(_c.unidade_codigo_shift, _c.responsavel_id)
    and (_c.responsavel_id is null or _c.responsavel_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));
$$;

-- Nota interna também respeita a unidade.
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
  if not public.chat_eh_equipe() or not public.chat_pode_ver(c.unidade_codigo_shift, c.responsavel_id) then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  v_nome := public.chat_nome_equipe(auth.uid());
  if _interna then
    insert into public.chat_mensagens (conversa_id, autor, autor_id, autor_nome, texto, anexo_path, anexo_nome, anexo_mime)
    values (_conversa, 'nota', auth.uid(), v_nome, _texto, _anexo_path, _anexo_nome, _anexo_mime) returning id into v_id;
    return v_id;
  end if;
  if not public.chat_pode_mexer(c) then
    raise exception 'Esta conversa está com %. Peça a transferência.', public.chat_nome_equipe(c.responsavel_id) using errcode = '42501';
  end if;
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

-- Anexos do chat: só de conversas que a pessoa enxerga.
drop policy if exists chat_anexos_equipe_sel on storage.objects;
create policy chat_anexos_equipe_sel on storage.objects for select to authenticated
  using (bucket_id = 'chat-anexos' and exists (
    select 1 from public.chat_conversas c
    where c.id::text = split_part(name, '/', 1) and public.chat_pode_ver(c.unidade_codigo_shift, c.responsavel_id)
  ));
drop policy if exists chat_anexos_equipe_ins on storage.objects;
create policy chat_anexos_equipe_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-anexos' and exists (
    select 1 from public.chat_conversas c
    where c.id::text = split_part(name, '/', 1) and public.chat_pode_ver(c.unidade_codigo_shift, c.responsavel_id)
  ));
