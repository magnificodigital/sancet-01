-- Recall (lembrete de retorno) — controlado pelo admin (liga/desliga + regras).

-- Interruptor geral (começa DESLIGADO).
insert into configuracoes (chave, valor)
values ('RECALL_ATIVO', 'false')
on conflict (chave) do nothing;

-- Opt-out por paciente (LGPD) + token para link de descadastro no e-mail.
alter table pacientes add column if not exists recall_optout boolean not null default false;
alter table pacientes add column if not exists recall_optout_token uuid not null default gen_random_uuid();
create unique index if not exists pacientes_recall_optout_token_idx on pacientes(recall_optout_token);

-- Regras: exame (codigo_shift) → periodicidade em meses.
create table if not exists public.recall_regras (
  id uuid primary key default gen_random_uuid(),
  codigo_shift text not null,
  nome text not null,
  meses int not null check (meses between 1 and 120),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists recall_regras_codigo_idx on recall_regras(codigo_shift);

-- Registro de envios (idempotência: não repetir o mesmo lembrete dentro do ciclo).
create table if not exists public.recall_envios (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete cascade,
  paciente_cpf text,
  codigo_shift text,
  nome text,
  enviado_em timestamptz not null default now()
);
create index if not exists recall_envios_pac_cod_idx on recall_envios(paciente_id, codigo_shift, enviado_em);

alter table public.recall_regras enable row level security;
alter table public.recall_envios enable row level security;

-- Staff lê; admin gerencia as regras.
drop policy if exists recall_regras_sel on public.recall_regras;
create policy recall_regras_sel on public.recall_regras for select
  using (exists (select 1 from user_roles where user_id = auth.uid()));
drop policy if exists recall_regras_wr on public.recall_regras;
create policy recall_regras_wr on public.recall_regras for all
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists recall_envios_sel on public.recall_envios;
create policy recall_envios_sel on public.recall_envios for select
  using (exists (select 1 from user_roles where user_id = auth.uid()));
-- Inserção só pelo motor (service role, que ignora RLS). Sem policy de insert.

-- RPC: candidatos ao recall (respeita toggle, regras ativas, opt-out e cooldown).
-- Usada pelo motor (envio) e pela tela "Devidos" do painel.
create or replace function public.recall_candidatos()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_ativo boolean;
begin
  select (valor = 'true') into v_ativo from configuracoes where chave = 'RECALL_ATIVO';
  if not coalesce(v_ativo, false) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(c))
    from (
      select pac.id as paciente_id, pac.cpf, pac.email,
             pac.nome as paciente_nome, pac.recall_optout_token as optout_token,
             r.codigo_shift, r.nome as exame_nome, r.meses, ult.ultima_data
      from recall_regras r
      join lateral (
        select p.paciente_id, max(coalesce(p.data_agendamento, p.created_at::date)) as ultima_data
        from pedidos p, jsonb_array_elements(p.itens) it
        where p.status in ('atendido', 'concluido')
          and it->>'codigoShift' = r.codigo_shift
          and p.paciente_id is not null
        group by p.paciente_id
      ) ult on true
      join pacientes pac on pac.id = ult.paciente_id
      where r.ativo
        and ult.ultima_data <= (now()::date - (r.meses || ' months')::interval)
        and coalesce(pac.recall_optout, false) = false
        and pac.email is not null and btrim(pac.email) <> ''
        and not exists (
          select 1 from recall_envios e
          where e.paciente_id = pac.id and e.codigo_shift = r.codigo_shift
            and e.enviado_em > now() - (r.meses || ' months')::interval
        )
    ) c
  ), '[]'::jsonb);
end $$;
grant execute on function public.recall_candidatos() to authenticated, service_role;

-- RPC pública: paciente sai dos lembretes pelo token do e-mail.
create or replace function public.recall_optout(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  update pacientes set recall_optout = true where recall_optout_token = p_token returning id into v_id;
  if v_id is null then
    return jsonb_build_object('error', 'Link inválido.');
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.recall_optout(uuid) to anon, authenticated;
