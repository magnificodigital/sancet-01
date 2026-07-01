# 2FA por e-mail no login do paciente

Login continua sendo **e-mail + senha**. Depois da senha correta, o paciente recebe um **código de 6 dígitos por e-mail** e precisa digitá-lo para concluir o login. Cadastro, "esqueci senha" e "primeiro acesso" não mudam.

## Fluxo

1. Tela `/entrar`: paciente digita e-mail + senha e clica **Continuar**.
2. Frontend chama a Edge Function `sancet-login-etapa1`:
   - Valida a senha criando um cliente Supabase efêmero e chamando `signInWithPassword`. Se der certo, faz `signOut` imediatamente (não deixa sessão vazando).
   - Gera código de 6 dígitos, grava `hash + expires_at (10 min) + tentativas` em `login_codigos_2fa`.
   - Envia e-mail com o código via Resend (função `enviar-email-pedido` já usa Resend — mesma stack).
3. Tela mostra input do código (6 dígitos, `InputOTP`).
4. Frontend chama `sancet-login-etapa2` com e-mail + código:
   - Valida hash/expiração/tentativas (máx 5).
   - Se OK, gera magic link via `admin.generateLink({ type: 'magiclink' })` e devolve `token_hash` + `email`.
5. Frontend faz `supabase.auth.verifyOtp({ email, token_hash, type: 'magiclink' })` — sessão criada.

## Banco (migration)

```sql
CREATE TABLE public.login_codigos_2fa (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  codigo_hash text not null,
  expires_at timestamptz not null,
  tentativas int not null default 0,
  usado_em timestamptz,
  created_at timestamptz not null default now()
);
CREATE INDEX ON public.login_codigos_2fa (email, created_at desc);
-- Grants: só service_role (usado só nas edge functions)
GRANT ALL ON public.login_codigos_2fa TO service_role;
ALTER TABLE public.login_codigos_2fa ENABLE ROW LEVEL SECURITY;
-- Sem policy: ninguém acessa via PostgREST.
```

## Edge Functions

- `sancet-login-etapa1` (nova): valida senha, gera código, envia e-mail.
- `sancet-login-etapa2` (nova): valida código, devolve `token_hash` de magic link.
- Reutiliza `RESEND_API_KEY` se já configurado; caso contrário, pedir com `add_secret`.

## Frontend

- `src/pages/Entrar.tsx`: refator em 2 passos (senha → código). Botão "Reenviar código" (respeita cooldown de 30s).
- Sem alterações em `Cadastro`, `EsqueciSenha`, `RedefinirSenha`, `PrimeiroAcesso`.

## Fora de escopo

- Aplicar 2FA no staff (`/staff/login`) — só paciente por enquanto.
- "Lembrar deste dispositivo por 30 dias" — pode ser feito depois com cookie.
- SMS/WhatsApp OTP.
