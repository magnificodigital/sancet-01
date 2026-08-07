import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { cpf, data_nascimento, email, senha } = await req.json();
    const cpfClean = String(cpf ?? "").replace(/\D/g, "");
    // Retornamos SEMPRE 200 nos erros de negócio (com { error }), para a mensagem
    // amigável chegar ao front sem o genérico "Edge Function returned non-2xx".
    if (!cpfClean || !data_nascimento || !email || !senha) {
      return json({ error: "Dados incompletos." }, 200);
    }
    if (String(senha).length < 8) {
      return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 200);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // CPF pode estar salvo com ou sem máscara — busca as duas formas.
    const cpfFmt =
      cpfClean.length === 11
        ? `${cpfClean.slice(0, 3)}.${cpfClean.slice(3, 6)}.${cpfClean.slice(6, 9)}-${cpfClean.slice(9)}`
        : cpfClean;

    // 1) Localiza paciente por CPF (com/sem máscara) + data_nasc
    const { data: paciente, error: pacErr } = await admin
      .from("pacientes")
      .select("id, auth_user_id, email")
      .or(`cpf.eq.${cpfClean},cpf.eq.${cpfFmt}`)
      .eq("data_nascimento", String(data_nascimento))
      .maybeSingle();

    if (pacErr) return json({ error: pacErr.message }, 200);
    if (!paciente) {
      return json(
        {
          error:
            "Não encontramos um cadastro com esse CPF e data de nascimento. Se ainda não é paciente, use 'Fazer cadastro'.",
        },
        200,
      );
    }
    if (paciente.auth_user_id) {
      return json(
        { error: "Este paciente já tem acesso. Use 'Entrar' ou 'Esqueci minha senha'." },
        200,
      );
    }

    // 2) Cria usuário no Auth
    const { data: userResp, error: userErr } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(senha),
      email_confirm: true,
      user_metadata: { cpf: cpfClean, is_primeiro_acesso: true },
    });
    if (userErr || !userResp?.user) {
      const msg = userErr?.message || "Não foi possível criar a conta.";
      if (/already/i.test(msg)) {
        return json(
          { error: "Este e-mail já está em uso. Use 'Esqueci minha senha' para recuperar o acesso." },
          200,
        );
      }
      return json({ error: msg }, 200);
    }

    // 3) Vincula o auth_user_id ao paciente (o trigger não roda pra vincular esse específico)
    const { error: updErr } = await admin
      .from("pacientes")
      .update({
        auth_user_id: userResp.user.id,
        email: String(email).trim().toLowerCase(),
      })
      .eq("id", paciente.id);
    if (updErr) {
      // Rollback: apaga o usuário criado
      await admin.auth.admin.deleteUser(userResp.user.id);
      return json({ error: updErr.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
