import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BASE_URL = "https://sancet.magnificodigital.com";

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function rotuloPeriodo(p: string | null): string {
  if (p === "manha") return "Manhã";
  if (p === "tarde") return "Tarde";
  return "—";
}

function listaItensHtml(itens: any[]): string {
  if (!Array.isArray(itens) || itens.length === 0) return "<li>—</li>";
  return itens
    .map(
      (it) =>
        `<li>${escapeHtml(it?.nome ?? it?.codigoShift ?? "—")}</li>`,
    )
    .join("");
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f6;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee;">
    <div style="background:#C8102E;color:#fff;padding:16px 20px;font-size:18px;font-weight:600;">Sancet</div>
    <div style="padding:20px;color:#222;font-size:14px;line-height:1.55;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#C8102E;">${escapeHtml(title)}</h2>
      ${inner}
    </div>
    <div style="padding:12px 20px;color:#888;font-size:11px;border-top:1px solid #eee;">Esta é uma mensagem automática, por favor não responda.</div>
  </div></body></html>`;
}

function templateNovoPaciente(p: any): { subject: string; html: string } {
  const subject = `Sancet — Recebemos seu pedido ${p.protocolo}`;
  const conv =
    p.tipo_solicitacao === "convenio"
      ? `<p><b>Convênio:</b> ${escapeHtml(p.convenio_nome)} ${p.plano_descricao ? `/ ${escapeHtml(p.plano_descricao)}` : ""}</p>`
      : "";
  const html = shell(
    "Recebemos seu pedido",
    `<p>Olá, <b>${escapeHtml(p.paciente_nome)}</b>!</p>
     <p>Recebemos sua solicitação e ela está em análise. Caso necessário, nossa equipe entrará em contato.</p>
     <p><b>Assim que aprovarmos seu pedido, enviaremos a confirmação</b> para você comparecer à unidade selecionada. <b>AGUARDE NOSSA MENSAGEM</b> antes de ir.</p>
     <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
     <p><b>Protocolo:</b> ${escapeHtml(p.protocolo)}</p>
     <p><b>Unidade:</b> ${escapeHtml(p.unidade_nome ?? "—")}</p>
     <p><b>Agendamento:</b> ${formatarData(p.data_agendamento)} — ${rotuloPeriodo(p.periodo_agendamento)}</p>
     <p><b>Tipo:</b> ${p.tipo_solicitacao === "convenio" ? "Convênio" : "Particular"}</p>
     ${conv}
     <p><b>Itens:</b></p><ul>${listaItensHtml(p.itens)}</ul>
     <p style="margin-top:16px"><a href="${BASE_URL}/pronto/${encodeURIComponent(p.protocolo)}" style="background:#C8102E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Acessar voucher</a></p>`,
  );
  return { subject, html };
}

function templateConfirmadoPaciente(p: any, endereco: string): { subject: string; html: string } {
  const subject = `Sancet — Pedido ${p.protocolo} CONFIRMADO ✅`;
  const html = shell(
    "Pedido CONFIRMADO ✅",
    `<p>Olá, <b>${escapeHtml(p.paciente_nome)}</b>!</p>
     <p>Seu pedido foi <b>CONFIRMADO</b>. Pode comparecer à unidade.</p>
     <p><b>Protocolo:</b> ${escapeHtml(p.protocolo)}</p>
     <p><b>Unidade:</b> ${escapeHtml(p.unidade_nome ?? "—")}${endereco ? ` — ${escapeHtml(endereco)}` : ""}</p>
     <p><b>Agendamento:</b> ${formatarData(p.data_agendamento)} — ${rotuloPeriodo(p.periodo_agendamento)}</p>
     <p style="margin-top:16px"><a href="${BASE_URL}/pronto/${encodeURIComponent(p.protocolo)}" style="background:#C8102E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Apresentar voucher</a></p>`,
  );
  return { subject, html };
}

function templateAdmin(p: any): { subject: string; html: string } {
  const subject = `[Sancet] Novo pedido ${p.protocolo} — ${p.unidade_nome ?? "—"} — ${formatarData(p.data_agendamento)}`;
  const conv =
    p.tipo_solicitacao === "convenio"
      ? `<p><b>Convênio:</b> ${escapeHtml(p.convenio_nome)} ${p.plano_descricao ? `/ ${escapeHtml(p.plano_descricao)}` : ""}</p>`
      : "";
  const def = p.deficiencias
    ? `<p style="background:#fff3e0;border:1px solid #ffcc80;padding:8px;border-radius:4px"><b>Necessidades especiais:</b> ${escapeHtml(p.deficiencias)}</p>`
    : "";
  const html = shell(
    "Novo pedido recebido",
    `<p><b>Paciente:</b> ${escapeHtml(p.paciente_nome)} — CPF ${escapeHtml(p.paciente_cpf)}</p>
     <p><b>Unidade:</b> ${escapeHtml(p.unidade_nome ?? "—")}</p>
     <p><b>Agendamento:</b> ${formatarData(p.data_agendamento)} — ${rotuloPeriodo(p.periodo_agendamento)}</p>
     <p><b>Tipo:</b> ${p.tipo_solicitacao === "convenio" ? "Convênio" : "Particular"}</p>
     ${conv}
     <p><b>Itens:</b></p><ul>${listaItensHtml(p.itens)}</ul>
     ${def}
     <p style="margin-top:16px"><a href="${BASE_URL}/staff/pedidos?protocolo=${encodeURIComponent(p.protocolo)}" style="background:#C8102E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Abrir no painel</a></p>`,
  );
  return { subject, html };
}

async function enviarResend(opts: {
  apiKey: string;
  from: string;
  to: string[];
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
      subject: opts.subject,
      html: opts.html,
    }),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, response: body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pedido_id, tipo } = await req.json();
    if (!pedido_id || !["novo", "confirmado"].includes(tipo)) {
      return new Response(JSON.stringify({ error: "params inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    const adminToGlobal = (cfg.RESEND_EMAILS_ADMIN ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_api_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: pedido, error: pedErr } = await supabase
      .from("pedidos")
      .select("*")
      .eq("id", pedido_id)
      .maybeSingle();
    if (pedErr || !pedido) {
      return new Response(JSON.stringify({ error: "pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailPaciente: string | null = null;
    let endereco = "";
    if (pedido.paciente_id) {
      const { data: pac } = await supabase
        .from("pacientes")
        .select("email, logradouro, numero, bairro, cidade, uf")
        .eq("id", pedido.paciente_id)
        .maybeSingle();
      emailPaciente = (pac as any)?.email ?? null;
    }
    // endereço da unidade (best-effort)
    if (pedido.unidade_codigo_shift) {
      const { data: u } = await supabase
        .from("unidades_cache")
        .select("logradouro, numero, bairro, cidade, uf")
        .eq("codigo_shift", pedido.unidade_codigo_shift)
        .maybeSingle();
      if (u) {
        endereco = [
          (u as any).logradouro,
          (u as any).numero,
          (u as any).bairro,
          (u as any).cidade && (u as any).uf ? `${(u as any).cidade}/${(u as any).uf}` : (u as any).cidade,
        ]
          .filter(Boolean)
          .join(", ");
      }
    }

    const errors: string[] = [];
    let sent_paciente = false;
    let sent_admin = false;
    const logs: any[] = Array.isArray(pedido.emails_enviados) ? [...pedido.emails_enviados] : [];

    // Email para paciente
    if (emailPaciente) {
      const tpl =
        tipo === "novo"
          ? templateNovoPaciente(pedido)
          : templateConfirmadoPaciente(pedido, endereco);
      const r = await enviarResend({
        apiKey,
        from,
        to: [emailPaciente],
        subject: tpl.subject,
        html: tpl.html,
      });
      sent_paciente = r.ok;
      if (!r.ok) errors.push(`paciente: ${JSON.stringify(r.response)}`);
      logs.push({
        timestamp: new Date().toISOString(),
        tipo,
        destinatarios: [emailPaciente],
        status: r.ok ? "ok" : "erro",
        resend_response: r.response,
      });
    } else {
      logs.push({
        timestamp: new Date().toISOString(),
        tipo,
        destinatarios: [],
        status: "erro",
        resend_response: { error: "paciente sem email" },
      });
    }

    // Email admin: apenas no "novo". Junta admins globais + staff atribuídos à unidade do pedido.
    if (tipo === "novo") {
      const staffEmails: string[] = [];
      if (pedido.unidade_codigo_shift) {
        const { data: unidade } = await supabase
          .from("unidades_cache")
          .select("id")
          .eq("codigo_shift", pedido.unidade_codigo_shift)
          .maybeSingle();
        if (unidade?.id) {
          const { data: vincs } = await supabase
            .from("user_unidades")
            .select("user_id")
            .eq("unidade_id", unidade.id);
          const userIds = ((vincs as any[]) ?? []).map((v) => v.user_id);
          for (const uid of userIds) {
            const { data: u } = await supabase.auth.admin.getUserById(uid);
            const e = u?.user?.email;
            if (e) staffEmails.push(e);
          }
        }
      }
      const adminTo = Array.from(
        new Set([...adminToGlobal, ...staffEmails].map((s) => s.toLowerCase())),
      );

      if (adminTo.length > 0) {
        const tpl = templateAdmin(pedido);
        const r = await enviarResend({
          apiKey,
          from,
          to: adminTo,
          subject: tpl.subject,
          html: tpl.html,
        });
        sent_admin = r.ok;
        if (!r.ok) errors.push(`admin: ${JSON.stringify(r.response)}`);
        logs.push({
          timestamp: new Date().toISOString(),
          tipo: `admin_${tipo}`,
          destinatarios: adminTo,
          status: r.ok ? "ok" : "erro",
          resend_response: r.response,
        });
      }
    }

    await supabase
      .from("pedidos")
      .update({ emails_enviados: logs })
      .eq("id", pedido_id);

    return new Response(
      JSON.stringify({ sent_paciente, sent_admin, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
