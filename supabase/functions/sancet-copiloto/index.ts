// Copiloto da equipe no chat: resumo da conversa e sugestão de resposta.
// Só equipe; a conversa é lida com o login de quem pede (respeita unidade/RLS).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { modeloIA, segredo } from "../_shared/integracoes.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const ROTULO: Record<string, string> = { paciente: "Paciente", assistente: "IA", equipe: "Atendente", nota: "Nota interna", sistema: "Sistema" };
const STATUS: Record<string, string> = {
  novo: "recebido", em_analise: "em análise", aguardando_pagamento: "aguardando pagamento", confirmado: "confirmado",
  atendido: "atendido", concluido: "concluído", cancelado: "cancelado",
};

async function ia(apiKey: string, modelo: string, sistema: string, usuario: string, max = 500) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Sancet Copiloto" },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.3,
      max_tokens: max,
      messages: [{ role: "system", content: sistema }, { role: "user", content: usuario }],
    }),
  });
  if (!r.ok) throw new Error(`IA ${r.status}`);
  return String((await r.json()).choices?.[0]?.message?.content ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: equipe } = await usuario.rpc("chat_eh_equipe");
    if (equipe !== true) return json({ error: "Somente a equipe." }, 403);

    const body = await req.json().catch(() => ({}));
    const acao = String(body.acao ?? "");
    const conversaId = String(body.conversa_id ?? "");

    // Lida COM o login de quem pediu: se não enxerga a conversa, não passa.
    const { data: c } = await usuario
      .from("chat_conversas")
      .select("id, status, paciente_id, lead_nome, lead_telefone, unidade_nome, pedido_protocolo, ultima_msg_em, resumo, resumo_em, pacientes(nome, nome_social)")
      .eq("id", conversaId)
      .maybeSingle();
    if (!c) return json({ error: "Conversa não encontrada." }, 404);

    if (acao === "resumo" && !body.forcar && c.resumo && c.resumo_em && c.ultima_msg_em && c.resumo_em >= c.ultima_msg_em) {
      return json({ resumo: c.resumo, resumo_em: c.resumo_em });
    }

    const apiKey = await segredo("OPENROUTER_API_KEY");
    if (!apiKey) return json({ error: "Chave da OpenRouter não configurada." }, 503);
    const modelo = await modeloIA("chat", "google/gemini-2.5-flash");

    const { data: msgs } = await usuario
      .from("chat_mensagens")
      .select("autor, autor_nome, texto, anexo_nome, meta, created_at")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: false })
      .limit(60);
    const linhas = (msgs ?? [])
      .reverse()
      .filter((m: any) => m.texto || m.anexo_nome)
      .map((m: any) => `${ROTULO[m.autor] ?? m.autor}${m.autor_nome ? ` (${m.autor_nome})` : ""}: ${m.texto ?? ""}${m.anexo_nome ? ` [anexo: ${m.anexo_nome}]` : ""}`)
      .join("\n")
      .slice(-12000);
    if (!linhas) return json({ resumo: null, sugestao: null });

    const nome = (c as any).pacientes?.nome_social || (c as any).pacientes?.nome || c.lead_nome || "paciente";
    let pedidos = "";
    if (c.paciente_id) {
      const { data: ps } = await usuario
        .from("pedidos")
        .select("protocolo, status, tipo_solicitacao, unidade_nome, data_agendamento, created_at")
        .eq("paciente_id", c.paciente_id)
        .order("created_at", { ascending: false })
        .limit(5);
      pedidos = (ps ?? [])
        .map((p: any) => `${p.protocolo} · ${STATUS[p.status] ?? p.status} · ${p.tipo_solicitacao} · ${p.unidade_nome ?? "-"}${p.data_agendamento ? ` · agendado ${String(p.data_agendamento).split("-").reverse().join("/")}` : ""}`)
        .join("\n");
    }
    const contexto = `Paciente: ${nome}${c.lead_telefone ? ` · celular ${c.lead_telefone}` : ""}
Unidade: ${c.unidade_nome ?? "não informada"}${c.pedido_protocolo ? `\nPedido desta conversa: ${c.pedido_protocolo}` : ""}${pedidos ? `\nPedidos do paciente:\n${pedidos}` : ""}

Conversa:
${linhas}`;

    if (acao === "resumo") {
      const resumo = await ia(
        apiKey,
        modelo,
        `Você resume conversas de atendimento de um laboratório (Sancet) para a recepção. Português do Brasil. Responda em no máximo 4 linhas curtas, começando cada uma com "• ":
• O que o paciente quer
• Dados já levantados (tipo particular/convênio, exames, unidade, pedido)
• O que falta / próximo passo
• Clima (só se houver irritação ou urgência)
Sem inventar nada que não esteja na conversa.`,
        contexto,
        300,
      );
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const agora = new Date().toISOString();
      await admin.from("chat_conversas").update({ resumo, resumo_em: agora }).eq("id", conversaId);
      return json({ resumo, resumo_em: agora });
    }

    if (acao === "sugerir") {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: cfg } = await admin.from("assistente_config").select("faq, instrucoes_extras, tom").eq("id", 1).maybeSingle();
      const faq = (Array.isArray(cfg?.faq) ? cfg.faq : [])
        .filter((f: any) => f?.pergunta && f?.resposta)
        .slice(0, 40)
        .map((f: any) => `P: ${f.pergunta}\nR: ${f.resposta}`)
        .join("\n");
      const { data: eu } = await usuario.rpc("chat_nome_equipe", { _uid: (await usuario.auth.getUser()).data.user?.id });
      const sugestao = await ia(
        apiKey,
        modelo,
        `Você escreve a PRÓXIMA mensagem que um atendente humano da Sancet (laboratório) vai enviar ao paciente no chat. Português do Brasil, ${cfg?.tom === "formal" ? "formal" : "cordial e acolhedor"}, curta (1 a 4 frases), sem assinatura. O atendente se chama ${eu ?? "atendente"}.
Regras: nunca dê orientação médica nem interprete resultados; não invente preços, datas, prazos ou status — se faltar informação, escreva que vai verificar; não peça senha nem cartão. Use as informações do contexto e as perguntas frequentes. Responda SÓ com o texto da mensagem.${faq ? `\n\nPerguntas frequentes oficiais:\n${faq}` : ""}${cfg?.instrucoes_extras ? `\n\nOrientações do laboratório:\n${String(cfg.instrucoes_extras).slice(0, 2000)}` : ""}`,
        contexto + (body.instrucao ? `\n\nO atendente quer responder no sentido de: ${String(body.instrucao).slice(0, 300)}` : ""),
        350,
      );
      return json({ sugestao });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    console.error("copiloto:", e);
    return json({ error: "Não foi possível gerar agora." }, 500);
  }
});
