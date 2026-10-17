-- Convênios salvos na conta do paciente (aba "Convênio" em Meus agendamentos):
-- convênio, plano, número e foto da carteirinha, para agilizar os próximos pedidos.

create table if not exists public.paciente_convenios (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  convenio_id uuid,
  convenio_nome text not null,
  convenio_codigo_shift text,
  plano_codigo text,
  plano_descricao text,
  numero_carteirinha text not null,
  validade date,
  url_carteirinha text,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists paciente_convenios_paciente_idx on paciente_convenios(paciente_id);

alter table public.paciente_convenios enable row level security;

-- Paciente: só os próprios.
drop policy if exists paciente_convenios_proprio on public.paciente_convenios;
create policy paciente_convenios_proprio on public.paciente_convenios for all to authenticated
  using (paciente_id in (select id from pacientes where auth_user_id = auth.uid()))
  with check (
    paciente_id in (select id from pacientes where auth_user_id = auth.uid())
    -- foto da carteirinha só da pasta do próprio paciente (CPF)
    and (
      url_carteirinha is null
      or split_part(url_carteirinha, '/', 1) in (
        select cpf from pacientes where auth_user_id = auth.uid()
        union
        select regexp_replace(cpf, '\D', '', 'g') from pacientes where auth_user_id = auth.uid()
      )
    )
  );

-- Equipe: leitura (ver o convênio salvo do paciente).
drop policy if exists paciente_convenios_staff on public.paciente_convenios;
create policy paciente_convenios_staff on public.paciente_convenios for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'staff'::app_role));

grant select, insert, update, delete on public.paciente_convenios to authenticated;
grant all on public.paciente_convenios to service_role;
