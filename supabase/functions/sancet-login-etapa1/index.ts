// sancet-login-etapa1: envia código 2FA por email
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

function emailShell(codigo: string): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f6f6;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee">
    <div style="background:#C8102E;color:#fff;padding:16px 20px;font-size:18px;font-weight:600">Sancet</div>
    <div style="padding:24px;color:#222;font-size:14px;line-height:1.55">
      <h2 style="margin:0 0 12px;color:#C8102E">Seu código de acesso</h2>
      <p>Use o código abaixo para concluir seu login. Ele expira em <b>10 minutos</b>.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">${codigo}</div>
      <p style="color:#888;font-size:12px">Se você não tentou entrar, ignore este e-mail.</p>
    </div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, senha } = await req.json();
    const emailNorm = String(email ?? "").trim().toLowerCase();
    if (!emailNorm || !senha) return json({ error: "Informe e-mail e senha." }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) Valida senha num cliente efêmero (sem sessão persistente)
    const ephemeral = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signIn, error: sErr } = await ephemeral.auth.signInWithPassword({
      email: emailNorm,
      password: String(senha),
    });
    if (sErr || !signIn?.user) {
      return json({ error: "E-mail ou senha incorretos." }, 401);
    }
    await ephemeral.auth.signOut();

    // 2) Gera código 6 dígitos
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await sha256Hex(`${emailNorm}:${codigo}`);
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalida códigos anteriores não usados desse email
    await admin
      .from("login_codigos_2fa")
      .update({ usado_em: new Date().toISOString() })
      .eq("email", emailNorm)
      .is("usado_em", null);

    const { error: insErr } = await admin.from("login_codigos_2fa").insert({
      email: emailNorm,
      codigo_hash: hash,
      expires_at: expires,
    });
    if (insErr) return json({ error: "Falha ao gerar código.", detalhe: insErr.message }, 500);

    // 3) Envia email via Resend (mesma config de enviar-email-pedido)
    const { data: cfgRows } = await admin
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", ["RESEND_API_KEY", "RESEND_EMAIL_FROM"]);
    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: any) => (cfg[r.chave] = r.valor ?? ""));
    const apiKey = cfg.RESEND_API_KEY?.trim();
    const from = cfg.RESEND_EMAIL_FROM?.trim() || "onboarding@resend.dev";

    if (!apiKey) {
      // Sem Resend, não é seguro devolver o código para o cliente.
      return json({ error: "Envio de e-mail não configurado. Contate o suporte." }, 500);
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [emailNorm],
        subject: `Sancet — Código de acesso ${codigo}`,
        html: emailShell(codigo),
      }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      return json({ error: "Falha ao enviar o e-mail com o código.", detalhe: body }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
