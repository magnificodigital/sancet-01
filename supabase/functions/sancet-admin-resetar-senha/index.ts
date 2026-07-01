// Admin: define/altera a senha de um paciente (cria auth user se não existir).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autorizado" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Apenas administradores podem alterar senhas." }, 403);

    const { paciente_id, nova_senha } = await req.json();
    if (!paciente_id || !nova_senha || String(nova_senha).length < 6) {
      return json({ error: "Informe paciente e senha com ao menos 6 caracteres." }, 400);
    }

    const { data: pac, error: errPac } = await admin
      .from("pacientes")
      .select("id, email, nome, auth_user_id")
      .eq("id", paciente_id)
      .maybeSingle();
    if (errPac) return json({ error: errPac.message }, 500);
    if (!pac) return json({ error: "Paciente não encontrado." }, 404);
    if (!pac.email) return json({ error: "Paciente não possui e-mail cadastrado." }, 400);

    const emailNorm = String(pac.email).trim().toLowerCase();

    // 1) Já vinculado → apenas atualiza senha
    if (pac.auth_user_id) {
      const { error: uErr } = await admin.auth.admin.updateUserById(pac.auth_user_id, {
        password: String(nova_senha),
        email_confirm: true,
      });
      if (uErr) return json({ error: "Falha ao atualizar senha.", detalhe: uErr.message }, 500);
      return json({ ok: true, criado: false });
    }

    // 2) Não vinculado → verifica se já existe auth user com esse e-mail
    let authUserId: string | null = null;
    try {
      // listUsers com filtro por email (paginado; consulta simples)
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === emailNorm);
      if (found) authUserId = found.id;
    } catch { /* ignore */ }

    if (authUserId) {
      const { error: uErr } = await admin.auth.admin.updateUserById(authUserId, {
        password: String(nova_senha),
        email_confirm: true,
      });
      if (uErr) return json({ error: "Falha ao atualizar senha.", detalhe: uErr.message }, 500);
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: emailNorm,
        password: String(nova_senha),
        email_confirm: true,
        user_metadata: { nome: pac.nome ?? null, paciente_id: pac.id },
      });
      if (cErr || !created?.user) {
        return json({ error: "Falha ao criar login do paciente.", detalhe: cErr?.message }, 500);
      }
      authUserId = created.user.id;
    }

    // Vincula paciente ao auth user
    const { error: linkErr } = await admin
      .from("pacientes")
      .update({ auth_user_id: authUserId })
      .eq("id", pac.id);
    if (linkErr) return json({ error: "Senha definida mas falhou ao vincular paciente.", detalhe: linkErr.message }, 500);

    return json({ ok: true, criado: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
