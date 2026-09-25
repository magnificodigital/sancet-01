import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// URL do SITE (onde o app roda), não o domínio de envio do Resend.
// Pode ser sobrescrito pela config SITE_URL (troca fácil quando o domínio mudar).
let BASE_URL = "https://sancet.vercel.app";

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

// Espelha src/lib/normalizeExame.ts — chave de exame_preparo.nome_norm.
function normalizeExameNome(nome: string | null | undefined): string {
  return (nome ?? "")
    .replace(/^\[I\]\s*/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.;,\s]+|[.;,\s]+$/g, "");
}

type PreparoItem = { nome: string; jejum_horas: number | null; instrucoes: string[] | null };

function templatePreparoPaciente(p: any, preparos: PreparoItem[]): { subject: string; html: string } {
  const subject = `Sancet — Preparo dos seus exames (pedido ${p.protocolo})`;

  // 1) JEJUM ÚNICO: vale o MAIOR entre os exames do pedido (regra do laboratório).
  const jejumDe = (pr: PreparoItem) => Math.max(0, Number(pr.jejum_horas ?? 0) || 0);
  const maiorJejum = preparos.reduce((m, pr) => Math.max(m, jejumDe(pr)), 0);
  const exigem = preparos.filter((pr) => maiorJejum > 0 && jejumDe(pr) === maiorJejum).map((pr) => pr.nome);
  const quadroJejum = maiorJejum > 0
    ? `<div style="border:2px solid #ea580c;background:#fff7ed;border-radius:8px;padding:14px 16px;margin:14px 0">
         <p style="margin:0;font-size:18px;font-weight:700;color:#9a3412">Jejum: ${maiorJejum} horas</p>
         <p style="margin:6px 0 0;color:#7c2d12">Esse é o <b>maior jejum</b> entre os exames do seu pedido e vale para <b>todos</b> eles.
         Exigido por: ${exigem.map((n) => escapeHtml(n)).join(", ")}.</p>
         <p style="margin:6px 0 0;color:#7c2d12;font-size:12px">Durante o jejum, pode beber água.</p>
       </div>`
    : `<div style="border:2px solid #16a34a;background:#f0fdf4;border-radius:8px;padding:14px 16px;margin:14px 0">
         <p style="margin:0;font-size:18px;font-weight:700;color:#166534">Não é necessário jejum</p>
         <p style="margin:6px 0 0;color:#14532d">Nenhum exame do seu pedido exige jejum.</p>
       </div>`;

  // 2) Orientações sem as frases de jejum (o quadro acima já cobre o jejum).
  const limpar = (pr: PreparoItem) =>
    [...new Set((Array.isArray(pr.instrucoes) ? pr.instrucoes : [])
      .map((l) => String(l).replace(/\s+/g, " ").trim())
      // "vide informações" é nota interna do Shift, sem sentido para o paciente.
      .filter((l) => l && !/jejum/i.test(l) && !/^sem preparo espec/i.test(l) && !/vide informa/i.test(l)))];
  const porExame = preparos.map((pr) => ({ nome: pr.nome, linhas: limpar(pr) }));

  // 3) Orientações repetidas em 2+ exames viram "gerais" (aparecem uma vez só).
  const conta = new Map<string, number>();
  porExame.forEach((e) => e.linhas.forEach((l) => conta.set(l, (conta.get(l) ?? 0) + 1)));
  const gerais = [...conta.entries()].filter(([, n]) => n >= 2).map(([l]) => l);
  const geraisSet = new Set(gerais);
  const especificos = porExame
    .map((e) => ({ nome: e.nome, linhas: e.linhas.filter((l) => !geraisSet.has(l)) }))
    .filter((e) => e.linhas.length > 0);
  const semExtra = porExame.filter((e) => !especificos.some((x) => x.nome === e.nome)).map((e) => e.nome);

  const lista = (ls: string[]) =>
    `<ul style="margin:6px 0 0;padding-left:18px">${ls.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`;
  const blocoGerais = gerais.length
    ? `<h3 style="margin:18px 0 4px;font-size:15px;color:#222">Orientações gerais</h3>${lista(gerais)}`
    : "";
  const blocoEspecificos = especificos.length
    ? `<h3 style="margin:18px 0 4px;font-size:15px;color:#222">Orientações específicas</h3>` +
      especificos
        .map((e) => `<div style="border:1px solid #eee;border-radius:8px;padding:10px 12px;margin:8px 0">
            <p style="margin:0;font-weight:600;color:#222">${escapeHtml(e.nome)}</p>${lista(e.linhas)}</div>`)
        .join("")
    : "";
  const blocoSemExtra = semExtra.length
    ? `<p style="margin:14px 0 0;color:#555;font-size:13px"><b>Sem outras orientações além do jejum:</b> ${semExtra.map((n) => escapeHtml(n)).join(", ")}.</p>`
    : "";

  const html = shell(
    "Preparo dos seus exames",
    `<p>Olá, <b>${escapeHtml(p.paciente_nome)}</b>!</p>
     <p>Seu pedido <b>${escapeHtml(p.protocolo)}</b> foi confirmado. Veja como se preparar:</p>
     ${quadroJejum}
     ${blocoGerais}
     ${blocoEspecificos}
     ${blocoSemExtra}
     <p style="color:#888;font-size:12px;margin-top:16px">Em caso de dúvida, fale com a recepção.</p>`,
  );
  return { subject, html };
}

function templateInformacaoPaciente(p: any): { subject: string; html: string } {
  const subject = `Sancet — Informação sobre o seu pedido ${p.protocolo}`;
  const msg = escapeHtml(p.info_paciente ?? "").replace(/\n/g, "<br/>");
  const html = shell(
    "Temos uma informação sobre o seu pedido",
    `<p>Olá, <b>${escapeHtml(p.paciente_nome)}</b>!</p>
     <p>A equipe da Sancet deixou uma informação sobre o seu pedido <b>${escapeHtml(p.protocolo)}</b>:</p>
     <div style="border-left:4px solid #0284c7;background:#f0f9ff;padding:12px 14px;margin:12px 0;border-radius:4px">${msg}</div>
     <p style="margin-top:16px"><a href="${BASE_URL}/agendamentos" style="background:#C8102E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Ver meu pedido</a></p>`,
  );
  return { subject, html };
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

function templateResultadoPaciente(p: any): { subject: string; html: string } {
  const subject = `Sancet — Resultado do pedido ${p.protocolo} disponível ✅`;
  const html = shell(
    "Seu resultado está pronto ✅",
    `<p>Olá, <b>${escapeHtml(p.paciente_nome)}</b>!</p>
     <p>O resultado do seu pedido <b>${escapeHtml(p.protocolo)}</b> já está disponível. Você pode acessá-lo com segurança pelo portal.</p>
     <p style="margin-top:16px"><a href="${BASE_URL}/agendamentos?aba=resultados" style="background:#C8102E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Ver meu resultado</a></p>
     <p style="color:#888;font-size:12px;margin-top:12px">Para sua segurança, o acesso exige seu login. O resultado tem finalidade diagnóstica e não substitui a avaliação de um médico.</p>
     ${p.nps_token ? `<hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
     <p style="margin:0 0 8px">Como foi sua experiência com a Sancet? Leva 10 segundos:</p>
     <p style="margin:0"><a href="${BASE_URL}/nps/${p.nps_token}" style="background:#0F5132;color:#fff;padding:9px 15px;border-radius:6px;text-decoration:none;display:inline-block">Avaliar atendimento</a></p>` : ""}`,
  );
  return { subject, html };
}

function templateSolicitarToken(p: any): { subject: string; html: string } {
  const subject = `Sancet — Informe o token do seu convênio (pedido ${p.protocolo})`;
  const html = shell(
    "Informe o token do seu convênio",
    `<p>Olá, <b>${escapeHtml(p.paciente_nome)}</b>!</p>
     <p>Para dar andamento ao seu pedido <b>${escapeHtml(p.protocolo)}</b> pelo convênio ${escapeHtml(p.convenio_nome ?? "")}, precisamos do <b>token/senha de autorização</b> fornecido pela sua operadora.</p>
     <p>É rápido: clique no botão, faça login e digite o código. Se a operadora enviou <b>mais de um token</b>, você poderá adicionar todos.</p>
     <p style="margin-top:16px"><a href="${BASE_URL}/agendamentos?token=${encodeURIComponent(p.protocolo)}" style="background:#C8102E;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Informar token</a></p>`,
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

// Versão texto do HTML — e-mail multipart (html + text) melhora a
// entregabilidade (inbox do Hotmail/Outlook prefere multipart).
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .split("\n").map((l) => l.trim()).filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n")
    .trim();
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
      text: htmlToText(opts.html),
    }),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, response: body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // dry_run (só p/ tipo "preparo"): calcula o preparo e devolve CONTAGENS,
    // sem enviar e-mail nem gravar log — p/ diagnóstico sem incomodar o paciente.
    const { pedido_id, tipo, dry_run, protocolo } = await req.json();
    // No dry_run de preparo aceita também o protocolo (só devolve contagens).
    const porProtocolo = !pedido_id && dry_run === true && tipo === "preparo" && !!protocolo;
    if ((!pedido_id && !porProtocolo) || !["novo", "confirmado", "resultado", "solicitar_token", "preparo", "informacao"].includes(tipo)) {
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
      .in("chave", ["RESEND_API_KEY", "RESEND_EMAIL_FROM", "RESEND_EMAILS_ADMIN", "SITE_URL"]);
    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: any) => (cfg[r.chave] = r.valor ?? ""));
    if (cfg.SITE_URL?.trim()) BASE_URL = cfg.SITE_URL.trim().replace(/\/+$/, "");

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
      .eq(porProtocolo ? "protocolo" : "id", porProtocolo ? protocolo : pedido_id)
      .maybeSingle();
    if (pedErr || !pedido) {
      return new Response(JSON.stringify({ error: "pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotência: nunca notificar "resultado pronto" duas vezes para o mesmo pedido.
    if (tipo === "resultado") {
      const jaNotificado = (Array.isArray(pedido.emails_enviados)
        ? pedido.emails_enviados
        : []
      ).some((l: any) => l?.tipo === "resultado" && l?.status === "ok");
      if (jaNotificado) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "ja_notificado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // Garante um token de NPS para o link "Avaliar atendimento" no e-mail.
      if (!pedido.nps_token) {
        const token = crypto.randomUUID();
        await supabase.from("pedidos").update({ nps_token: token }).eq("id", pedido.id);
        (pedido as any).nps_token = token;
      }
    }

    // Preparativos: um e-mail único com o preparo de cada exame (1x por pedido).
    let preparosLista: PreparoItem[] = [];
    if (tipo === "preparo") {
      const jaEnviado = (Array.isArray(pedido.emails_enviados) ? pedido.emails_enviados : [])
        .some((l: any) => l?.tipo === "preparo" && l?.status === "ok");
      if (jaEnviado && !dry_run) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "ja_notificado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const erros: string[] = [];
      const exames = (Array.isArray(pedido.itens) ? pedido.itens : [])
        .filter((it: any) => (it?.tipo ?? "exame") !== "vacina" && it?.nome);
      const codigoDe = (it: any) => {
        const n = parseInt(String(it?.codigoShift ?? it?.codigo_shift ?? ""), 10);
        return Number.isFinite(n) ? n : null;
      };

      // 1) Código Shift -> nome_norm do catálogo convênio. É o nome que foi usado
      //    ao casar o preparo, e resolve sinônimos (ex.: COLESTEROLEMIA -> COLESTEROL TOTAL).
      const nomePorCodigo: Record<string, string> = {};
      const codigos = [...new Set(exames.map(codigoDe).filter((n): n is number => n !== null))];
      if (codigos.length) {
        const { data, error } = await supabase
          .from("exames_convenio")
          .select("codigo_shift, nome_norm")
          .in("codigo_shift", codigos);
        if (error) erros.push(`exames_convenio: ${error.message}`);
        (data ?? []).forEach((r: any) => (nomePorCodigo[String(r.codigo_shift)] = r.nome_norm));
      }

      // 2) Candidatos por exame: nome do catálogo (via código) e depois o nome do item.
      const candidatos = (it: any): string[] => {
        const c = codigoDe(it);
        return [c !== null ? nomePorCodigo[String(c)] : "", normalizeExameNome(it.nome)]
          .filter((k): k is string => !!k);
      };
      const chaves = [...new Set(exames.flatMap(candidatos))];
      const mapa: Record<string, any> = {};
      for (let i = 0; i < chaves.length; i += 15) {
        const { data, error } = await supabase
          .from("exame_preparo")
          .select("nome_norm,jejum_horas,instrucoes")
          .in("nome_norm", chaves.slice(i, i + 15));
        if (error) erros.push(`exame_preparo: ${error.message}`);
        (data ?? []).forEach((r: any) => (mapa[r.nome_norm] = r));
      }
      if (erros.length) console.error("preparo lookup:", erros);

      let comPreparo = 0;
      preparosLista = exames.map((it: any) => {
        const r = candidatos(it).map((k) => mapa[k]).find(Boolean);
        if (r) comPreparo++;
        return {
          nome: it.nome,
          jejum_horas: r?.jejum_horas ?? 0,
          instrucoes: r?.instrucoes ?? ["Sem preparo específico. Em caso de dúvida, confirme na recepção."],
        };
      });

      if (dry_run) {
        // Só contagens — nada de nomes de exames (dado de saúde).
        return new Response(
          JSON.stringify({ dry_run: true, total: exames.length, com_preparo: comPreparo, erros }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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
          : tipo === "resultado"
            ? templateResultadoPaciente(pedido)
            : tipo === "solicitar_token"
              ? templateSolicitarToken(pedido)
              : tipo === "preparo"
                ? templatePreparoPaciente(pedido, preparosLista)
                : tipo === "informacao"
                  ? templateInformacaoPaciente(pedido)
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
