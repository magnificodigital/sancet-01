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
    <div style="background:#C8102E;color:#fff;padding:16px 20px;font-size:18px;font-weight:600;">Sancet — Canal de Denúncias</div>
    <div style="padding:20px;color:#222;font-size:14px;line-height:1.55;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#C8102E;">${escapeHtml(title)}</h2>
      ${inner}
    </div>
    <div style="padding:12px 20px;color:#888;font-size:11px;border-top:1px solid #eee;">Mensagem confidencial recebida pelo canal de denúncias do site.</div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const {
      maioridade,
      natureza,
      tipo_envolvido,
      data_ocorrido,
      descricao,
      anexos, // array de paths no bucket documentos-pedidos
    } = await req.json();

    if (!maioridade) return json(400, { ok: false, reason: "É preciso confirmar a maioridade." });
    if (!String(descricao ?? "").trim()) {
      return json(400, { ok: false, reason: "Descreva o ocorrido." });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cfgRows } = await supabase
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", ["RESEND_API_KEY", "RESEND_EMAIL_FROM", "RESEND_EMAILS_ADMIN", "DENUNCIA_EMAIL"]);
    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: any) => (cfg[r.chave] = r.valor ?? ""));

    const apiKey = cfg.RESEND_API_KEY?.trim();
    const from = cfg.RESEND_EMAIL_FROM?.trim() || "onboarding@resend.dev";
    const to = (cfg.DENUNCIA_EMAIL || cfg.RESEND_EMAILS_ADMIN || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!apiKey) return json(502, { ok: false, reason: "E-mail não configurado." });
    if (to.length === 0) return json(502, { ok: false, reason: "Nenhum destinatário configurado." });

    // Links assinados (7 dias) para os anexos no bucket privado.
    let anexosHtml = "";
    if (Array.isArray(anexos) && anexos.length > 0) {
      const links: string[] = [];
      for (const path of anexos) {
        const { data } = await supabase.storage
          .from("documentos-pedidos")
          .createSignedUrl(String(path), 60 * 60 * 24 * 7);
        if (data?.signedUrl) links.push(data.signedUrl);
      }
      if (links.length) {
        anexosHtml =
          `<p><b>Anexos:</b></p><ul>` +
          links.map((u) => `<li><a href="${u}">Abrir anexo</a></li>`).join("") +
          `</ul>`;
      }
    }

    const html = shell(
      "Nova denúncia recebida",
      `<p><b>Natureza:</b> ${escapeHtml(natureza) || "—"}</p>
       <p><b>Tipo de envolvido:</b> ${escapeHtml(tipo_envolvido) || "—"}</p>
       <p><b>Data do ocorrido:</b> ${escapeHtml(data_ocorrido) || "—"}</p>
       <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
       <p style="white-space:pre-line">${escapeHtml(descricao)}</p>
       ${anexosHtml}`,
    );

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: "[Sancet] Nova denúncia", html }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      return json(502, { ok: false, reason: "Falha no envio.", resend: body });
    }
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { ok: false, reason: (e as Error)?.message ?? "Erro inesperado." });
  }
});
