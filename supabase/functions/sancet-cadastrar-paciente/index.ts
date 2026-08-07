import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const body = await req.json();
    const {
      cpf, data_nascimento, nome, sexo, email, celular, senha,
      cep, logradouro, numero, complemento, bairro, cidade, uf,
    } = body ?? {};

    if (!cpf || !data_nascimento || !nome || !email || !senha) {
      return json({ error: "Dados incompletos." }, 200);
    }
    if (String(senha).length < 8) {
      return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 200);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const emailLower = String(email).trim().toLowerCase();
    const cpfClean = String(cpf).replace(/\D/g, "");
    const cpfFmt =
      cpfClean.length === 11
        ? `${cpfClean.slice(0, 3)}.${cpfClean.slice(3, 6)}.${cpfClean.slice(6, 9)}-${cpfClean.slice(9)}`
        : cpfClean;

    // Verifica se já existe paciente com esse CPF (com ou sem máscara)
    const { data: existente } = await admin
      .from("pacientes")
      .select("id, auth_user_id")
      .or(`cpf.eq.${cpfClean},cpf.eq.${cpfFmt}`)
      .maybeSingle();

    if (existente?.auth_user_id) {
      return json({ error: "Este CPF já possui cadastro. Use 'Entrar' ou 'Esqueci minha senha'." }, 200);
    }

    // Cria usuário no Auth com email já confirmado (não dispara email → sem rate limit)
    const { data: userResp, error: userErr } = await admin.auth.admin.createUser({
      email: emailLower,
      password: String(senha),
      email_confirm: true,
      user_metadata: {
        cpf: String(cpf),
        nome,
        data_nascimento: String(data_nascimento),
      },
    });

    if (userErr || !userResp?.user) {
      const msg = userErr?.message || "Não foi possível criar a conta.";
      if (/already/i.test(msg)) {
        return json({ error: "Este e-mail já está em uso." }, 200);
      }
      return json({ error: msg }, 200);
    }

    const authUserId = userResp.user.id;

    // Upsert do paciente (trigger handle_new_paciente_user pode ter vinculado; garantimos dados)
    const patch: Record<string, unknown> = {
      auth_user_id: authUserId,
      cpf: String(cpf),
      data_nascimento: String(data_nascimento),
      nome,
      sexo: sexo || null,
      email: emailLower,
      celular: celular || null,
      cep: cep || null,
      logradouro: logradouro || null,
      numero: numero || null,
      complemento: complemento || null,
      bairro: bairro || null,
      cidade: cidade || null,
      uf: uf || null,
    };

    if (existente?.id) {
      const { error: updErr } = await admin.from("pacientes").update(patch).eq("id", existente.id);
      if (updErr) {
        await admin.auth.admin.deleteUser(authUserId);
        return json({ error: updErr.message }, 200);
      }
    } else {
      // pode ter sido criado pelo trigger; tenta update por auth_user_id, senão insert
      const { data: byAuth } = await admin
        .from("pacientes")
        .select("id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (byAuth?.id) {
        const { error: updErr } = await admin.from("pacientes").update(patch).eq("id", byAuth.id);
        if (updErr) {
          await admin.auth.admin.deleteUser(authUserId);
          return json({ error: updErr.message }, 200);
        }
      } else {
        const { error: insErr } = await admin.from("pacientes").insert(patch);
        if (insErr) {
          await admin.auth.admin.deleteUser(authUserId);
          return json({ error: insErr.message }, 200);
        }
      }
    }

    // Faz login e retorna a sessão para o cliente aplicar
    const { data: signIn, error: signErr } = await admin.auth.signInWithPassword({
      email: emailLower,
      password: String(senha),
    });
    if (signErr || !signIn?.session) {
      return json({ ok: true, session: null });
    }

    return json({ ok: true, session: signIn.session });
  } catch (e) {
    return json({ error: (e as Error).message }, 200);
  }
});
