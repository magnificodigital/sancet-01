// sancet-recall: motor de lembretes de retorno (Recall).
// Aciona por: cron (header x-cron-secret) OU admin autenticado (botão "rodar agora").
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function template(nomePaciente: string, exame: string, siteUrl: string, optoutToken: string) {
  const primeiro = (nomePaciente || "").split(" ")[0] || "Olá";
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f6;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee">
    <div style="background:#C8102E;color:#fff;padding:16px 20px;font-size:18px;font-weight:600">Sancet Medicina Diagnóstica</div>
    <div style="padding:24px;color:#222;font-size:14px;line-height:1.55">
      <h2 style="margin:0 0 12px;color:#C8102E">Hora de repetir seu exame</h2>
      <p>Olá, <b>${escapeHtml(primeiro)}</b>!</p>
      <p>Já faz um tempo desde o seu exame de <b>${escapeHtml(exame)}</b> na Sancet. Exames de acompanhamento costumam ser repetidos periodicamente — que tal agendar novamente?</p>
      <p style="margin-top:16px"><a href="${siteUrl}/exames" style="background:#C8102E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Agendar novamente</a></p>
      <p style="color:#888;font-size:12px;margin-top:20px">Este é um lembrete de cuidado e não substitui a orientação do seu médico. Se não quiser mais receber lembretes, <a href="${siteUrl}/recall/sair/${optoutToken}" style="color:#888">clique aqui para sair</a>.</p>
    </div>
  </div></body></html>`;
  const text = `Olá, ${primeiro}!\n\nJá faz um tempo desde o seu exame de ${exame} na Sancet. Que tal agendar novamente?\n\nAgendar: ${siteUrl}/exames\n\nPara não receber mais lembretes: ${siteUrl}/recall/sair/${optoutToken}`;
  return { html, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Autorização: cron (segredo) OU admin autenticado.
    const cronSecret = Deno.env.get("RECALL_CRON_SECRET") ?? "";
    const headerSecret = req.headers.get("x-cron-secret") ?? "";
    let autorizado = cronSecret !== "" && headerSecret === cronSecret;

    if (!autorizado) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      if (jwt) {
        const { data: u } = await admin.auth.getUser(jwt);
        if (u?.user) {
          const { data: isAdmin } = await admin.rpc("has_role", {
            _user_id: u.user.id,
            _role: "admin",
          });
          autorizado = isAdmin === true;
        }
      }
    }
    if (!autorizado) return json({ error: "não autorizado" }, 401);

    // Config Resend + site.
    const { data: cfgRows } = await admin
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", ["RESEND_API_KEY", "RESEND_EMAIL_FROM", "SITE_URL"]);
    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: any) => (cfg[r.chave] = r.valor ?? ""));
    const apiKey = cfg.RESEND_API_KEY?.trim();
    const from = cfg.RESEND_EMAIL_FROM?.trim() || "onboarding@resend.dev";
    const siteUrl = (cfg.SITE_URL?.trim() || "https://sancet.vercel.app").replace(/\/+$/, "");
    if (!apiKey) return json({ error: "Envio de e-mail não configurado." }, 200);

    // Candidatos (a RPC já respeita o toggle, regras, opt-out e cooldown).
    const { data: cand } = await admin.rpc("recall_candidatos");
    const lista: any[] = Array.isArray(cand) ? cand : [];
    if (lista.length === 0) return json({ ok: true, enviados: 0, motivo: "sem candidatos ou recall desligado" });

    let enviados = 0;
    const erros: string[] = [];
    for (const c of lista) {
      const { html, text } = template(c.paciente_nome, c.exame_nome, siteUrl, c.optout_token);
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [c.email],
          subject: `Sancet — Hora de repetir seu exame de ${c.exame_nome}`,
          html,
          text,
        }),
      });
      if (r.ok) {
        enviados++;
        await admin.from("recall_envios").insert({
          paciente_id: c.paciente_id,
          paciente_cpf: c.cpf,
          codigo_shift: c.codigo_shift,
          nome: c.exame_nome,
        });
      } else {
        const b = await r.json().catch(() => ({}));
        erros.push(`${c.email}: ${JSON.stringify(b)}`);
      }
    }

    return json({ ok: true, enviados, total_candidatos: lista.length, erros });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
