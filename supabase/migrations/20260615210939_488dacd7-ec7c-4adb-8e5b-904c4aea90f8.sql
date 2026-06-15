ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS emails_enviados jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO public.configuracoes (chave, valor) VALUES
  ('RESEND_API_KEY', ''),
  ('RESEND_EMAIL_FROM', 'onboarding@resend.dev'),
  ('RESEND_EMAILS_ADMIN', '')
ON CONFLICT (chave) DO NOTHING;