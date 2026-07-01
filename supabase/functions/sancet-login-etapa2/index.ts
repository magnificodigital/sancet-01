import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, codigo } = await req.json();
    const emailNorm = String(email ?? "").trim().toLowerCase();
    const codigoNorm = String(codigo ?? "").replace(/\D/g, "");
    if (!emailNorm || codigoNorm.length !== 6) {
      return json({ error: "Código inválido." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca último código não usado
    const { data: linha } = await admin
      .from("login_codigos_2fa")
      .select("id, codigo_hash, expires_at, tentativas, usado_em")
      .eq("email", emailNorm)
      .is("usado_em", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!linha) return json({ error: "Nenhum código pendente. Solicite um novo." }, 400);
    if (new Date(linha.expires_at).getTime() < Date.now()) {
      return json({ error: "Código expirado. Solicite um novo." }, 400);
    }
    if ((linha.tentativas ?? 0) >= 5) {
      await admin.from("login_codigos_2fa").update({ usado_em: new Date().toISOString() }).eq("id", linha.id);
      return json({ error: "Muitas tentativas. Solicite um novo código." }, 429);
    }

    const hash = await sha256Hex(`${emailNorm}:${codigoNorm}`);
    if (hash !== linha.codigo_hash) {
      await admin
        .from("login_codigos_2fa")
        .update({ tentativas: (linha.tentativas ?? 0) + 1 })
        .eq("id", linha.id);
      return json({ error: "Código incorreto." }, 400);
    }

    // Marca como usado
    await admin
      .from("login_codigos_2fa")
      .update({ usado_em: new Date().toISOString() })
      .eq("id", linha.id);

    // Gera token magic link — o frontend usa verifyOtp para criar a sessão
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: emailNorm,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      return json({ error: "Falha ao concluir login.", detalhe: linkErr?.message }, 500);
    }

    return json({
      ok: true,
      email: emailNorm,
      token_hash: link.properties.hashed_token,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
