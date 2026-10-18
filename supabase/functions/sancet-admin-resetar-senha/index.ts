// Admin: define/altera a senha de um paciente (cria auth user se não existir)
// ou de um usuário da equipe (body.user_id).
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

    const { paciente_id, user_id, nova_senha } = await req.json();

    // Usuário da equipe (aba Equipe): só troca a senha de quem está em user_roles.
    if (user_id) {
      // Senha de admin/super admin só o super admin troca (evita tomar a conta de outro admin).
      const [{ data: alvoSuper }, { data: euSuper }, { data: alvoRole }, { data: podeEquipe }] = await Promise.all([
        admin.rpc("eh_super_admin_uid", { _uid: user_id }),
        admin.rpc("eh_super_admin_uid", { _uid: user.id }),
        admin.from("user_roles").select("role").eq("user_id", user_id).maybeSingle(),
        admin.rpc("tem_permissao_uid", { _uid: user.id, _modulo: "equipe", _acao: "editar" }),
      ]);
      if (!podeEquipe) return json({ error: "Sem permissão para alterar senhas da equipe." }, 403);
      if ((alvoSuper || alvoRole?.role === "admin") && !euSuper && user_id !== user.id) {
        return json({ error: "Somente o super admin pode alterar a senha de administradores." }, 403);
      }
      if (!nova_senha || String(nova_senha).length < 8) {
        return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
      }
      const { data: membro } = await admin.from("user_roles").select("user_id").eq("user_id", user_id).maybeSingle();
      if (!membro) return json({ error: "Usuário da equipe não encontrado." }, 404);
      const { error: uErr } = await admin.auth.admin.updateUserById(String(user_id), {
        password: String(nova_senha),
      });
      if (uErr) return json({ error: "Falha ao alterar a senha.", detalhe: uErr.message }, 500);
      return json({ ok: true });
    }

    const { data: podePac } = await admin.rpc("tem_permissao_uid", { _uid: user.id, _modulo: "pacientes", _acao: "editar" });
    if (!podePac) return json({ error: "Sem permissão para alterar dados de pacientes." }, 403);
    // Nunca mexe em conta da equipe pelo fluxo de paciente (impede tomar conta de admin).
    const ehEquipe = async (uid: string | null) =>
      !!uid && !!(await admin.from("user_roles").select("user_id").eq("user_id", uid).maybeSingle()).data;

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
      if (await ehEquipe(pac.auth_user_id)) return json({ error: "Este login pertence à equipe. Altere a senha em Equipe." }, 403);
      const { error: uErr } = await admin.auth.admin.updateUserById(pac.auth_user_id, {
        password: String(nova_senha),
        email_confirm: true,
      });
      if (uErr) return json({ error: "Falha ao atualizar senha.", detalhe: uErr.message }, 500);
      return json({ ok: true, criado: false });
    }

    // 2) Não vinculado → verifica se já existe auth user com esse e-mail
    const { data: achado } = await admin.rpc("auth_user_por_email", { _email: emailNorm });
    const authUserId: string | null = achado ?? null;

    if (authUserId) {
      if (await ehEquipe(authUserId)) return json({ error: "Este e-mail é de um login da equipe. Não é possível usar como acesso de paciente." }, 403);
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
