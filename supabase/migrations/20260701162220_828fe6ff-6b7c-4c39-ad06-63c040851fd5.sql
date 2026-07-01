
CREATE TABLE public.login_codigos_2fa (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  codigo_hash text not null,
  expires_at timestamptz not null,
  tentativas int not null default 0,
  usado_em timestamptz,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_login_2fa_email_created ON public.login_codigos_2fa (email, created_at desc);

GRANT ALL ON public.login_codigos_2fa TO service_role;

ALTER TABLE public.login_codigos_2fa ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role (edge functions) acessa.
