-- Identificação do paciente dentro do chat: código de 6 dígitos enviado ao
-- e-mail cadastrado (mesmo nível de segurança do "Esqueci minha senha").
-- Só o servidor (edge function) lê/escreve.
create table if not exists public.chat_codigos (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.chat_conversas(id) on delete cascade,
  finalidade text not null check (finalidade in ('login', 'cadastro')),
  paciente_id uuid references public.pacientes(id) on delete cascade,
  email text,
  dados jsonb,                 -- cadastro novo (sem senha; criada depois em "Esqueci a senha")
  codigo_hash text,            -- null = CPF não encontrado (resposta neutra, nada enviado)
  expira_em timestamptz not null default now() + interval '10 minutes',
  tentativas int not null default 0,
  usado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists chat_codigos_conversa_idx on public.chat_codigos(conversa_id, created_at desc);
alter table public.chat_codigos enable row level security;
revoke all on public.chat_codigos from anon, authenticated;
grant all on public.chat_codigos to service_role;

do $$
begin
  perform cron.unschedule('limpar-chat-codigos') where exists (select 1 from cron.job where jobname = 'limpar-chat-codigos');
  perform cron.schedule('limpar-chat-codigos', '23 4 * * *', $c$delete from public.chat_codigos where created_at < now() - interval '2 days'$c$);
end $$;

-- Conferência de e-mail já usado (só o servidor chama).
create or replace function public.auth_usuario_por_email(_email text)
returns uuid language sql security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(_email) limit 1
$$;
revoke all on function public.auth_usuario_por_email(text) from public, anon, authenticated;
grant execute on function public.auth_usuario_por_email(text) to service_role;

create or replace function public.auth_email_por_id(_uid uuid)
returns text language sql security definer set search_path = public, auth as $$
  select lower(email) from auth.users where id = _uid
$$;
revoke all on function public.auth_email_por_id(uuid) from public, anon, authenticated;
grant execute on function public.auth_email_por_id(uuid) to service_role;
