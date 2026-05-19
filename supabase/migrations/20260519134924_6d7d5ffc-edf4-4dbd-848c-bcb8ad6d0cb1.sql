-- Exames: novos campos clínicos
alter table public.exames_cache add column if not exists mnemonico text;
alter table public.exames_cache add column if not exists material text;
alter table public.exames_cache add column if not exists metodologia text;
alter table public.exames_cache add column if not exists jejum_horas integer;
alter table public.exames_cache add column if not exists instrucoes_coleta text;
alter table public.exames_cache add column if not exists instrucoes_paciente text;
alter table public.exames_cache add column if not exists sincronizado_em timestamptz;

-- Unidades: novos campos de endereço/horário
alter table public.unidades_cache add column if not exists logradouro text;
alter table public.unidades_cache add column if not exists numero text;
alter table public.unidades_cache add column if not exists horario_funcionamento text;
alter table public.unidades_cache add column if not exists sincronizado_em timestamptz;

-- Convenios: observações e requisitos
alter table public.convenios_cache add column if not exists observacoes text;
alter table public.convenios_cache add column if not exists requisitos text;
alter table public.convenios_cache add column if not exists sincronizado_em timestamptz;

-- Log de sincronizações
create table if not exists public.shift_sync_logs (
  id uuid primary key default gen_random_uuid(),
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  status text not null default 'em_execucao',
  exames_criados integer not null default 0,
  exames_atualizados integer not null default 0,
  unidades_criadas integer not null default 0,
  unidades_atualizadas integer not null default 0,
  convenios_criados integer not null default 0,
  convenios_atualizados integer not null default 0,
  erro_mensagem text,
  duracao_ms integer
);

alter table public.shift_sync_logs enable row level security;

drop policy if exists admin_read_sync_logs on public.shift_sync_logs;
create policy admin_read_sync_logs on public.shift_sync_logs
  for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists service_all_sync_logs on public.shift_sync_logs;
create policy service_all_sync_logs on public.shift_sync_logs
  for all to service_role using (true) with check (true);

grant all on table public.shift_sync_logs to service_role;
grant all on table public.exames_cache, public.unidades_cache, public.convenios_cache to service_role;

create index if not exists idx_shift_sync_logs_iniciado_em on public.shift_sync_logs (iniciado_em desc);