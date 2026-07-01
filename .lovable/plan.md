
## Objetivo

1. Mostrar o **CPF (somente leitura)** na aba Dados pessoais.
2. Substituir o login por **CPF + data de nascimento** por **e-mail + senha** usando **Supabase Auth**, mantendo os dados do paciente na tabela `pacientes`.

---

## Parte 1 — CPF em Dados pessoais (rápido)

- Em `src/components/agendamentos/AbaDadosPessoais.tsx`: adicionar campo **CPF** como `readOnly` (com máscara), acima do Nome. Vem do `meu_perfil` (já retorna `cpf`).
- Não editável — CPF é chave e não deve mudar pela UI do paciente.

---

## Parte 2 — Migrar para Supabase Auth (email + senha)

### 2.1 Banco

Migração SQL:
- Adicionar `pacientes.auth_user_id uuid` (nullable, UNIQUE, FK lógica p/ `auth.users`).
- Índice em `pacientes.auth_user_id`.
- Nova RPC `meu_perfil_auth()` — usa `auth.uid()` para buscar o paciente vinculado. Substitui `meu_perfil(cpf, nasc)`.
- Nova RPC `atualizar_meu_perfil_auth(p_patch jsonb)` — usa `auth.uid()`.
- Nova RPC `pedidos_do_paciente_auth()`, `resultados_do_paciente_auth()`, `pedido_por_protocolo_auth(protocolo)`, `criar_pedido_paciente_auth(p_pedido)`, `cancelar_meu_pedido_auth(protocolo)`, `confirmar_pagamento_manual_auth(protocolo)` — todas resolvem o paciente por `auth.uid()`.
- Atualizar RLS de `pedidos`: paciente autenticado pode ler os próprios (via `paciente_id = (select id from pacientes where auth_user_id = auth.uid())`).
- Trigger em `auth.users` (`on_auth_user_created_paciente`): quando cadastro traz `raw_user_meta_data` com cpf/nome/nasc, cria ou vincula linha em `pacientes` (idempotente, ligando pelo CPF se já existir).

### 2.2 Auth config
- Habilitar **Email/Password** (já é padrão). Desabilitar confirmação por e-mail para não travar login imediato (o usuário pode reativar depois no dashboard).
- Recomendar ao usuário ativar **Leaked Password Protection** no dashboard.

### 2.3 Frontend

- `src/hooks/usePaciente.ts`: parar de ler `localStorage`. Passar a usar `supabase.auth.getSession()` + `onAuthStateChange`. Expor `paciente` (perfil carregado de `meu_perfil_auth`), `session`, `logado`, `logout` (chama `supabase.auth.signOut()`).
- `src/pages/Entrar.tsx`: trocar formulário para **e-mail + senha**. Link "Esqueci a senha".
- Nova página `src/pages/EsqueciSenha.tsx` (envia magic link de reset) e `src/pages/RedefinirSenha.tsx` (`updateUser({ password })`).
- `src/pages/Cadastro.tsx`: adicionar campos **e-mail + senha + confirmar senha**. Chama `supabase.auth.signUp({ email, password, options: { data: { cpf, nome, data_nascimento } } })`. O trigger cria o registro em `pacientes`.
- Refatorar todos consumidores que chamavam RPCs com `(p_cpf, p_data_nasc)` para as versões `_auth`:
  - `AbaDadosPessoais.tsx`, `EtapaEndereco.tsx`, `Agendamentos.tsx` (lista pedidos/resultados/perfil), `EnviarPedido.tsx` (`criar_pedido_paciente_auth`), `Pronto.tsx` (`pedido_por_protocolo_auth`, `confirmar_pagamento_manual_auth`), `Pagamento.tsx` (dados do paciente), `EnviarReceita.tsx`.
- `App.tsx`: rotas `/esqueci-senha` e `/redefinir-senha`.
- Guardas de rota (`/agendamentos`, `/checkout`, `/pagamento`): redirecionar para `/entrar` se `!session`.
- Remover uso de `localStorage["sancet-paciente"]` (migração transparente: primeiro acesso pós-deploy pede login novamente).

### 2.4 Migração de pacientes existentes

- Emails já preenchidos em `pacientes.email`: **não** criamos usuários automaticamente (senha em massa é ruim). Estratégia: no primeiro login, se o e-mail existir em `pacientes` mas não em `auth.users`, mostramos "Crie sua senha" — fluxo de **primeiro acesso**:
  - Página `/primeiro-acesso`: paciente digita CPF + data de nasc + nova senha. Backend (RPC `vincular_conta_existente`) valida CPF/nasc, cria usuário em `auth.users` via edge function `sancet-primeiro-acesso` (usando service role), grava `auth_user_id` no paciente.
- Pacientes sem e-mail cadastrado: mensagem "Procure a recepção para atualizar seu e-mail".

---

## Detalhes técnicos

- Manter `AbaDadosPessoais.tsx` como componente de perfil; CPF `readOnly`, `data_nascimento` também `readOnly`.
- `usePaciente()` deixa de escrever em `localStorage` e passa a ser um `useEffect` que faz `supabase.auth.getSession()` → `meu_perfil_auth()` → cache em `useState`. Escuta `onAuthStateChange`.
- Edge function `sancet-primeiro-acesso`:
  - Input: `{ cpf, data_nascimento, email, senha }`.
  - Valida paciente existe e ainda não tem `auth_user_id`.
  - `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { cpf } })`.
  - `UPDATE pacientes SET auth_user_id = ... WHERE id = ...`.
- Grants: novas RPCs `GRANT EXECUTE ... TO authenticated`. Revogar `EXECUTE` das versões antigas de `anon` (mantendo `login_paciente` só até deprecar).
- Manter compat: por 1 release, deixar `login_paciente` funcionando para não quebrar clientes em cache; remover no próximo.

---

## Fora de escopo

- Confirmação de e-mail obrigatória (fica opcional para o dono ativar depois).
- OAuth (Google/Apple).
- Recuperação por SMS.

---

## Ordem de execução

1. Migração SQL (colunas, RPCs `_auth`, RLS, trigger).
2. Edge function `sancet-primeiro-acesso`.
3. `usePaciente` + `Entrar` + `Cadastro` + `EsqueciSenha` + `RedefinirSenha` + `PrimeiroAcesso`.
4. Refactor de todos consumidores das RPCs antigas.
5. Adicionar CPF `readOnly` em `AbaDadosPessoais`.
6. Guardas de rota.

Depois de aprovado, executo tudo em sequência.
