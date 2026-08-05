import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f6;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee;">
    <div style="background:#C8102E;color:#fff;padding:16px 20px;font-size:18px;font-weight:600;">Sancet</div>
    <div style="padding:20px;color:#222;font-size:14px;line-height:1.55;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#C8102E;">${escapeHtml(title)}</h2>
      ${inner}
    </div>
    <div style="padding:12px 20px;color:#888;font-size:11px;border-top:1px solid #eee;">Mensagem enviada por um formulário do site.</div>
  </div></body></html>`;
}

async function enviarResend(opts: {
  apiKey: string;
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; response: any }> {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      reply_to: opts.replyTo || undefined,
      subject: opts.subject,
      html: opts.html,
    }),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, response: body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { nome, email, telefone, mensagem, pagina } = await req.json();
    if (!String(nome ?? "").trim() || !String(mensagem ?? "").trim()) {
      return json(400, { ok: false, reason: "Nome e mensagem são obrigatórios." });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cfgRows } = await supabase
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", ["RESEND_API_KEY", "RESEND_EMAIL_FROM", "RESEND_EMAILS_ADMIN"]);
    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: any) => (cfg[r.chave] = r.valor ?? ""));

    const apiKey = cfg.RESEND_API_KEY?.trim();
    const from = cfg.RESEND_EMAIL_FROM?.trim() || "onboarding@resend.dev";
    const to = (cfg.RESEND_EMAILS_ADMIN ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!apiKey) return json(502, { ok: false, reason: "E-mail não configurado (RESEND_API_KEY)." });
    if (to.length === 0) return json(502, { ok: false, reason: "Nenhum destinatário configurado (RESEND_EMAILS_ADMIN)." });

    const subject = `[Sancet] Contato pelo site — ${String(nome).trim()}`;
    const html = shell(
      "Nova mensagem de contato",
      `<p><b>Nome:</b> ${escapeHtml(nome)}</p>
       <p><b>E-mail:</b> ${escapeHtml(email) || "—"}</p>
       <p><b>Telefone:</b> ${escapeHtml(telefone) || "—"}</p>
       <p><b>Página:</b> ${escapeHtml(pagina) || "—"}</p>
       <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
       <p style="white-space:pre-line">${escapeHtml(mensagem)}</p>`,
    );

    const enviado = await enviarResend({
      apiKey,
      from,
      to,
      replyTo: String(email ?? "").trim() || undefined,
      subject,
      html,
    });

    if (!enviado.ok) return json(502, { ok: false, reason: "Falha no envio.", resend: enviado.response });
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { ok: false, reason: (e as Error)?.message ?? "Erro inesperado." });
  }
});
