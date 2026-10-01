-- Ajuste 6: paciente envia documentos (vários) depois do pedido + equipe pode
-- solicitar um documento. Os arquivos ficam no bucket documentos-pedidos
-- (o paciente logado já pode enviar arquivos para lá).

alter table pedidos add column if not exists doc_solicitado_em timestamptz;
alter table pedidos add column if not exists doc_solicitado_texto text;
alter table pedidos add column if not exists anexo_paciente_em timestamptz;

create table if not exists public.pedido_anexos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  enviado_por text not null default 'paciente',
  arquivo_path text not null,
  nome_arquivo text,
  comentario text,
  created_at timestamptz not null default now()
);
create index if not exists pedido_anexos_pedido_idx on pedido_anexos(pedido_id, created_at desc);

alter table public.pedido_anexos enable row level security;
-- Equipe lê/gerencia; o paciente usa as RPCs abaixo (não acessa a tabela direto).
drop policy if exists pedido_anexos_staff on public.pedido_anexos;
create policy pedido_anexos_staff on public.pedido_anexos for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'staff'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'staff'::app_role));
grant all on public.pedido_anexos to service_role;

-- Paciente registra um anexo do PRÓPRIO pedido (depois de subir o arquivo).
create or replace function public.registrar_anexo_paciente_auth(
  p_protocolo text, p_path text, p_nome text, p_comentario text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_pedido uuid; v_cpf text;
begin
  select p.id, pa.cpf into v_pedido, v_cpf
  from pedidos p join pacientes pa on pa.id = p.paciente_id
  where p.protocolo = p_protocolo and pa.auth_user_id = auth.uid()
  limit 1;
  if v_pedido is null then
    return jsonb_build_object('error', 'Pedido não encontrado.');
  end if;
  -- O arquivo precisa estar na pasta do próprio paciente (CPF) no bucket.
  if p_path is null or split_part(p_path, '/', 1) not in (v_cpf, regexp_replace(v_cpf, '\D', '', 'g')) then
    return jsonb_build_object('error', 'Arquivo inválido.');
  end if;
  insert into pedido_anexos (pedido_id, enviado_por, arquivo_path, nome_arquivo, comentario)
  values (v_pedido, 'paciente', p_path, nullif(btrim(p_nome), ''), nullif(btrim(p_comentario), ''));
  update pedidos set anexo_paciente_em = now() where id = v_pedido;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.registrar_anexo_paciente_auth(text, text, text, text) to authenticated;

-- Paciente lista os anexos que ele mesmo enviou num pedido.
create or replace function public.anexos_do_pedido_auth(p_protocolo text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  from (
    select a.id, a.nome_arquivo, a.comentario, a.created_at
    from pedido_anexos a
    join pedidos p on p.id = a.pedido_id
    join pacientes pa on pa.id = p.paciente_id
    where p.protocolo = p_protocolo and pa.auth_user_id = auth.uid()
  ) t
$$;
grant execute on function public.anexos_do_pedido_auth(text) to authenticated;

-- O paciente passa a receber os campos de "documento solicitado".
create or replace function public.pedidos_do_paciente_auth()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by (t.created_at) desc), '[]'::jsonb)
  from (
    select p.id, p.protocolo, p.status, p.created_at, p.itens, p.modalidade_coleta,
           p.unidade_nome, p.tipo_solicitacao, p.valor_total_centavos,
           p.endereco_coleta, p.convenio_nome, p.numero_carteirinha, p.url_carteirinha,
           p.data_agendamento, p.periodo_agendamento,
           p.convenio_tokens, p.convenio_token_solicitado_em, p.convenio_token_preenchido_em,
           p.info_paciente, p.info_paciente_em,
           p.doc_solicitado_em, p.doc_solicitado_texto, p.anexo_paciente_em
    from pedidos p
    join pacientes pa on pa.id = p.paciente_id
    where pa.auth_user_id = auth.uid()
  ) t
$$;
grant execute on function public.pedidos_do_paciente_auth() to authenticated;
