-- Assistente virtual (chat do site): conversas e mensagens.
-- O visitante/paciente fala SÓ pela edge function sancet-assistente (service
-- role), que valida o token secreto da conversa. A equipe lê tudo no staff.

create table if not exists public.chat_conversas (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null,                 -- sha256 do token secreto guardado no navegador
  paciente_id uuid references pacientes(id) on delete set null,
  canal text not null default 'site',       -- site | voz | whatsapp (futuro)
  status text not null default 'ia',        -- ia | humano | encerrada
  contexto jsonb not null default '{}'::jsonb, -- carrinho/rascunho do agendamento
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_conversas_upd_idx on chat_conversas(updated_at desc);

create table if not exists public.chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  autor text not null,                      -- paciente | assistente | equipe | sistema
  texto text,
  anexo_path text,
  meta jsonb not null default '{}'::jsonb,  -- ações (carrinho), ferramentas usadas
  created_at timestamptz not null default now()
);
create index if not exists chat_mensagens_conversa_idx on chat_mensagens(conversa_id, created_at);

alter table public.chat_conversas enable row level security;
alter table public.chat_mensagens enable row level security;

drop policy if exists chat_conversas_staff on public.chat_conversas;
create policy chat_conversas_staff on public.chat_conversas for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'staff'::app_role));
drop policy if exists chat_mensagens_staff on public.chat_mensagens;
create policy chat_mensagens_staff on public.chat_mensagens for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'staff'::app_role));

grant select on public.chat_conversas, public.chat_mensagens to authenticated;
grant all on public.chat_conversas, public.chat_mensagens to service_role;
