// Assistente virtual da Sancet (chat do site).
// - Conversa guardada em chat_conversas/chat_mensagens (token secreto por conversa).
// - IA (OpenRouter) com FERRAMENTAS que consultam os dados reais: catálogo,
//   preços, preparo, unidades/agenda, convênios e pedidos do paciente logado.
// - Agendamento: a IA monta o carrinho (ação "carrinho") e o site leva o paciente
//   ao checkout já preenchido (documentos + termos ficam no fluxo seguro do site).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_MSG = 2000;
const MAX_POR_HORA = 60;
const MAX_ANEXO = 14_000_000; // base64 (~10 MB)

async function sha256(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
const normalizar = (s: string) =>
  (s ?? "")
    .replace(/^\[I\]\s*/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
const limparBusca = (s: string) => String(s ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
const brl = (v: number | null) =>
  v == null ? "sob consulta" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS: Record<string, string> = {
  novo: "recebido, aguardando análise",
  em_analise: "em análise pela equipe",
  aguardando_pagamento: "aguardando pagamento",
  confirmado: "confirmado",
  atendido: "atendido",
  concluido: "concluído (resultado disponível)",
  cancelado: "cancelado",
};
const AGENDA_PADRAO: Record<string, string> = { "0": "fechado", "1": "ambos", "2": "ambos", "3": "ambos", "4": "ambos", "5": "ambos", "6": "manha" };
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function agoraSP() {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  return new Date(s);
}

const SISTEMA = (hoje: string, logado: string | null) => `Você é a assistente virtual da Sancet Medicina Diagnóstica (laboratório de análises clínicas). Fale em português do Brasil, de forma acolhedora, clara e CURTA (mensagens de chat; use listas quando ajudar).

Hoje é ${hoje} (horário de Brasília). ${logado ? `O paciente está logado como ${logado}.` : "O visitante NÃO está logado."}

O que você faz:
- Tira dúvidas sobre exames, preços (só particular), preparo/jejum, unidades, horários e convênios aceitos.
- Ajuda a agendar: descobre se é PARTICULAR ou CONVÊNIO, identifica os exames (o paciente pode mandar FOTO do pedido médico aqui no chat), e então chama montar_carrinho. Depois diga para ele clicar no botão "Continuar agendamento" que aparece no chat, onde escolhe unidade, data e envia os documentos.
- Documentos para agendar: pedido médico e documento com foto (RG ou CNH, frente e verso); no convênio também a carteirinha.
- Informa o andamento dos pedidos do paciente logado (meus_pedidos). Se não estiver logado, peça para entrar em sancet.vercel.app/entrar.
- Reagendar/cancelar: oriente a ir em "Meus agendamentos" (menu do topo > Reagendar / Cancelar agendamento).

Regras OBRIGATÓRIAS:
- NUNCA invente exames, preços, preparos, endereços ou horários: use SEMPRE as ferramentas. Se a ferramenta não encontrar, diga que não encontrou e sugira falar com a equipe.
- NUNCA dê orientação médica, diagnóstico, interpretação de resultado ou indicação de exame. Nesses casos, recomende procurar o médico.
- Preço só existe para particular. No convênio, a cobertura depende do plano (a equipe confirma).
- Agendamento: o primeiro dia disponível segue a regra do laboratório (datas_agendamento informa). Domingo e dias em que a unidade fecha não têm atendimento.
- Não peça CPF, senha ou dados de cartão no chat.
- Se o paciente quiser falar com uma pessoa, use contato_atendimento.`;

const FERRAMENTAS = [
  {
    type: "function",
    function: {
      name: "buscar_exames",
      description: "Busca exames no catálogo. tipo=particular traz preço e prazo; tipo=convenio busca no catálogo de convênio (sem preço).",
      parameters: {
        type: "object",
        properties: {
          termo: { type: "string", description: "nome ou parte do nome do exame (ex.: hemograma, tsh, glicose)" },
          tipo: { type: "string", enum: ["particular", "convenio"] },
        },
        required: ["termo", "tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "preparo_exames",
      description: "Preparo (jejum e orientações) de um ou mais exames. Use os nomes exatos retornados por buscar_exames.",
      parameters: {
        type: "object",
        properties: { exames: { type: "array", items: { type: "string" } } },
        required: ["exames"],
      },
    },
  },
  {
    type: "function",
    function: { name: "listar_unidades", description: "Unidades da Sancet com endereço, telefone e dias/períodos de atendimento.", parameters: { type: "object", properties: {} } },
  },
  {
    type: "function",
    function: {
      name: "buscar_convenios",
      description: "Verifica se um convênio é aceito (busca por nome).",
      parameters: { type: "object", properties: { termo: { type: "string" } }, required: ["termo"] },
    },
  },
  {
    type: "function",
    function: {
      name: "datas_agendamento",
      description: "Primeira data possível para agendar e os próximos dias com períodos disponíveis numa unidade.",
      parameters: { type: "object", properties: { unidade: { type: "string", description: "nome da unidade (opcional)" } } },
    },
  },
  {
    type: "function",
    function: { name: "meus_pedidos", description: "Pedidos/agendamentos do paciente LOGADO e o andamento de cada um.", parameters: { type: "object", properties: {} } },
  },
  {
    type: "function",
    function: {
      name: "montar_carrinho",
      description: "Coloca os exames escolhidos no carrinho do site para o paciente continuar o agendamento. Use os códigos (codigo_shift) retornados por buscar_exames ou pela leitura do pedido médico.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["particular", "convenio"] },
          codigos: { type: "array", items: { type: "string" } },
        },
        required: ["tipo", "codigos"],
      },
    },
  },
  {
    type: "function",
    function: { name: "contato_atendimento", description: "Telefones/contato da equipe para falar com uma pessoa.", parameters: { type: "object", properties: {} } },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) return json({ error: "Assistente indisponível no momento." }, 503);
    const modelo = Deno.env.get("OPENROUTER_MODELO_CHAT") || "google/gemini-2.5-flash";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const texto = String(body.mensagem ?? "").trim().slice(0, MAX_MSG);
    const anexo = body.anexo as { base64?: string; mime?: string; nome?: string } | undefined;
    if (!texto && !anexo?.base64) return json({ error: "Mensagem vazia." }, 400);
    if (anexo?.base64 && (anexo.base64.length > MAX_ANEXO || !/^(image\/|application\/pdf)/.test(String(anexo.mime)))) {
      return json({ error: "Envie uma foto ou PDF de até 10 MB." }, 400);
    }

    // Paciente logado (opcional)
    let paciente: { id: string; nome: string | null } | null = null;
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data } = await admin.auth.getUser(jwt).catch(() => ({ data: { user: null } }) as any);
      if (data?.user) {
        const { data: p } = await admin.from("pacientes").select("id, nome, nome_social").eq("auth_user_id", data.user.id).maybeSingle();
        if (p) paciente = { id: p.id, nome: (p as any).nome_social || p.nome };
      }
    }

    // Conversa (nova ou existente com token válido)
    let conversaId = String(body.conversa_id ?? "");
    let tokenNovo: string | null = null;
    let conversa: any = null;
    if (conversaId) {
      const { data } = await admin.from("chat_conversas").select("*").eq("id", conversaId).maybeSingle();
      if (!data || data.token_hash !== (await sha256(String(body.token ?? "")))) conversaId = "";
      else conversa = data;
    }
    if (!conversaId) {
      tokenNovo = crypto.randomUUID() + crypto.randomUUID();
      const { data, error } = await admin
        .from("chat_conversas")
        .insert({ token_hash: await sha256(tokenNovo), paciente_id: paciente?.id ?? null })
        .select("*")
        .single();
      if (error) throw error;
      conversa = data;
      conversaId = data.id;
    } else if (paciente && !conversa.paciente_id) {
      await admin.from("chat_conversas").update({ paciente_id: paciente.id }).eq("id", conversaId);
    }

    // Limite de uso
    const umaHora = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin
      .from("chat_mensagens")
      .select("id", { count: "exact", head: true })
      .eq("conversa_id", conversaId)
      .eq("autor", "paciente")
      .gte("created_at", umaHora);
    if ((count ?? 0) >= MAX_POR_HORA) {
      return json({ conversa_id: conversaId, token: tokenNovo, resposta: "Recebemos muitas mensagens em pouco tempo. Aguarde alguns minutos, por favor." });
    }

    // Leitura do pedido médico enviado no chat (reaproveita a função de leitura)
    let notaAnexo = "";
    if (anexo?.base64) {
      const tipoCtx = (conversa.contexto?.tipo as string) || "particular";
      const catalogo = await catalogoParaLeitura(admin, tipoCtx);
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sancet-ler-receita`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileBase64: anexo.base64, mimeType: anexo.mime, catalogo }),
      }).then((x) => x.json()).catch(() => null);
      const encontrados: string[] = Array.isArray(r?.encontrados) ? r.encontrados.map(String) : [];
      const porCod = new Map(catalogo.map((c: any) => [String(c.codigo_shift), c.nome]));
      notaAnexo =
        `[O paciente enviou a foto do pedido médico. Leitura automática (${tipoCtx}): ` +
        (encontrados.length
          ? `exames encontrados no catálogo: ${encontrados.map((c) => `${porCod.get(c) ?? c} (código ${c})`).join("; ")}.`
          : "nenhum exame do catálogo foi identificado.") +
        (Array.isArray(r?.nao_encontrados) && r.nao_encontrados.length ? ` Não reconhecidos: ${r.nao_encontrados.join(", ")}.` : "") +
        " Confirme com o paciente se é particular ou convênio antes de montar o carrinho.]";
    }

    await admin.from("chat_mensagens").insert({
      conversa_id: conversaId,
      autor: "paciente",
      texto: texto || (anexo ? "📎 Pedido médico enviado" : ""),
      meta: anexo ? { anexo: anexo.nome ?? "arquivo", leitura: notaAnexo } : {},
    });

    if (conversa.status === "humano") {
      await admin.from("chat_conversas").update({ updated_at: new Date().toISOString() }).eq("id", conversaId);
      return json({ conversa_id: conversaId, token: tokenNovo, resposta: null, aguardando_humano: true });
    }

    // Histórico recente
    const { data: hist } = await admin
      .from("chat_mensagens")
      .select("autor, texto, meta")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: false })
      .limit(20);
    const historico = (hist ?? []).reverse().map((m: any) => ({
      role: m.autor === "paciente" ? "user" : "assistant",
      content: [m.texto ?? "", m.meta?.leitura ?? ""].filter(Boolean).join("\n"),
    }));

    const sp = agoraSP();
    const hoje = `${DIAS[sp.getDay()]}, ${sp.toLocaleDateString("pt-BR")} ${String(sp.getHours()).padStart(2, "0")}:${String(sp.getMinutes()).padStart(2, "0")}`;
    const mensagens: any[] = [{ role: "system", content: SISTEMA(hoje, paciente?.nome ?? null) }, ...historico];

    const acoes: any[] = [];
    let contexto = { ...(conversa.contexto ?? {}) };
    let resposta = "";
    for (let volta = 0; volta < 6; volta++) {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sancet.com.br",
          "X-Title": "Sancet Assistente",
        },
        body: JSON.stringify({ model: modelo, messages: mensagens, tools: FERRAMENTAS, temperature: 0.3, max_tokens: 900 }),
      });
      if (!r.ok) throw new Error(`IA ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const msg = (await r.json()).choices?.[0]?.message;
      if (!msg) throw new Error("IA sem resposta");
      const chamadas = msg.tool_calls ?? [];
      if (!chamadas.length) {
        resposta = String(msg.content ?? "").trim();
        break;
      }
      mensagens.push({ role: "assistant", content: msg.content ?? "", tool_calls: chamadas });
      for (const c of chamadas) {
        let args: any = {};
        try {
          args = JSON.parse(c.function?.arguments || "{}");
        } catch { /* args inválidos */ }
        const resultado = await executar(admin, c.function?.name, args, paciente, acoes, contexto).catch((e) => ({
          erro: String(e?.message ?? e),
        }));
        if (c.function?.name === "montar_carrinho" && !(resultado as any)?.erro) contexto = { ...contexto, tipo: args.tipo };
        mensagens.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(resultado).slice(0, 12000) });
      }
    }
    if (!resposta) resposta = "Desculpe, não consegui concluir agora. Pode reformular ou falar com nossa equipe?";

    await admin.from("chat_mensagens").insert({ conversa_id: conversaId, autor: "assistente", texto: resposta, meta: acoes.length ? { acoes } : {} });
    await admin.from("chat_conversas").update({ contexto, updated_at: new Date().toISOString() }).eq("id", conversaId);

    return json({ conversa_id: conversaId, token: tokenNovo, resposta, acoes });
  } catch (e) {
    console.error("assistente:", e);
    return json({ error: "Não consegui responder agora. Tente de novo em instantes." }, 500);
  }
});

async function catalogoParaLeitura(admin: any, tipo: string) {
  if (tipo === "convenio") {
    const todos: any[] = [];
    for (let de = 0; ; de += 1000) {
      const { data } = await admin.from("exames_convenio").select("codigo_shift, nome").eq("ativo", true).range(de, de + 999);
      todos.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return todos;
  }
  const { data } = await admin.from("exames_cache").select("codigo_shift, nome, outros_nomes").eq("ativo", true).limit(1000);
  return data ?? [];
}

async function executar(admin: any, nome: string, a: any, paciente: any, acoes: any[], _contexto: any): Promise<unknown> {
  switch (nome) {
    case "buscar_exames": {
      const termo = limparBusca(a.termo);
      if (!termo) return { erro: "termo vazio" };
      if (a.tipo === "convenio") {
        const { data } = await admin
          .from("exames_convenio")
          .select("codigo_shift, nome")
          .eq("ativo", true)
          .ilike("nome_norm", `%${normalizar(termo)}%`)
          .order("nome")
          .limit(12);
        return { tipo: "convenio", exames: data ?? [], obs: "Cobertura depende do plano do convênio." };
      }
      const { data } = await admin
        .from("exames_cache")
        .select("codigo_shift, nome, outros_nomes, preco_particular, prazo_resultado")
        .eq("ativo", true)
        .ilike("nome", `%${termo}%`)
        .order("nome")
        .limit(12);
      return {
        tipo: "particular",
        exames: (data ?? []).map((e: any) => ({
          codigo_shift: e.codigo_shift,
          nome: e.nome,
          preco: brl(e.preco_particular != null ? Number(e.preco_particular) : null),
          prazo_resultado: e.prazo_resultado,
        })),
      };
    }
    case "preparo_exames": {
      const nomes: string[] = (Array.isArray(a.exames) ? a.exames : []).slice(0, 30).map(String);
      const chaves = [...new Set(nomes.map(normalizar))];
      const { data } = await admin.from("exame_preparo").select("nome_norm, jejum_horas, instrucoes").in("nome_norm", chaves);
      const mapa = new Map((data ?? []).map((r: any) => [r.nome_norm, r]));
      let maior = 0;
      const porExame = nomes.map((n) => {
        const r: any = mapa.get(normalizar(n));
        if (r && r.jejum_horas > maior) maior = r.jejum_horas;
        return {
          exame: n,
          jejum_horas: r ? r.jejum_horas : null,
          orientacoes: r
            ? (r.instrucoes ?? []).filter((l: string) => !/jejum/i.test(l) && !/vide informa/i.test(l))
            : ["Sem preparo cadastrado — confirme com a equipe."],
        };
      });
      return { jejum_do_pedido_horas: maior, regra: "Vale o MAIOR jejum entre os exames.", exames: porExame };
    }
    case "listar_unidades": {
      const { data } = await admin
        .from("unidades_cache")
        .select("nome, logradouro, numero, bairro, cidade, uf, endereco, telefone, horario_funcionamento, horarios")
        .eq("ativo", true)
        .order("nome");
      return (data ?? []).map((u: any) => ({
        nome: u.nome,
        endereco: [u.logradouro && `${u.logradouro}${u.numero ? `, ${u.numero}` : ""}`, u.bairro, u.cidade && `${u.cidade}/${u.uf ?? ""}`]
          .filter(Boolean)
          .join(" - ") || u.endereco,
        telefone: u.telefone,
        horario: u.horario_funcionamento,
        agenda: Object.fromEntries(
          [1, 2, 3, 4, 5, 6, 0].map((d) => [DIAS[d], (u.horarios?.dias?.[String(d)] ?? AGENDA_PADRAO[String(d)]).replace("ambos", "manhã e tarde").replace("manha", "manhã")]),
        ),
      }));
    }
    case "buscar_convenios": {
      const termo = limparBusca(a.termo);
      const { data } = await admin.from("convenios_cache").select("nome").eq("ativo", true).ilike("nome", `%${termo}%`).limit(15);
      return { aceitos: (data ?? []).map((c: any) => c.nome), obs: data?.length ? "" : "Não encontrado na lista de convênios aceitos." };
    }
    case "datas_agendamento": {
      const sp = agoraSP();
      const min = new Date(sp);
      min.setHours(0, 0, 0, 0);
      min.setDate(min.getDate() + 3 + (sp.getHours() >= 16 ? 1 : 0));
      let dias: any = null;
      if (a.unidade) {
        const { data } = await admin.from("unidades_cache").select("nome, horarios").ilike("nome", `%${limparBusca(a.unidade)}%`).limit(1).maybeSingle();
        dias = data?.horarios?.dias ?? null;
      }
      const proximos: string[] = [];
      const d = new Date(min);
      while (proximos.length < 8) {
        const disp = (dias?.[String(d.getDay())] ?? AGENDA_PADRAO[String(d.getDay())]) as string;
        if (disp !== "fechado") {
          proximos.push(`${DIAS[d.getDay()]} ${d.toLocaleDateString("pt-BR")} (${disp === "ambos" ? "manhã e tarde" : disp === "manha" ? "manhã" : "tarde"})`);
        }
        d.setDate(d.getDate() + 1);
      }
      return {
        primeira_data: min.toLocaleDateString("pt-BR"),
        regra: "Dois dias livres entre o pedido e o atendimento; pedidos a partir das 16h contam como do dia seguinte; até 30 dias à frente.",
        proximos_dias: proximos,
        periodos: "Manhã: 6h às 12h. Tarde: 12h às 16h.",
      };
    }
    case "meus_pedidos": {
      if (!paciente) return { erro: "O paciente não está logado. Peça para entrar em sancet.vercel.app/entrar." };
      const { data } = await admin
        .from("pedidos")
        .select("protocolo, status, tipo_solicitacao, unidade_nome, data_agendamento, periodo_agendamento, itens, created_at")
        .eq("paciente_id", paciente.id)
        .order("created_at", { ascending: false })
        .limit(6);
      return (data ?? []).map((p: any) => ({
        protocolo: p.protocolo,
        situacao: STATUS[p.status] ?? p.status,
        tipo: p.tipo_solicitacao,
        unidade: p.unidade_nome,
        agendamento: p.data_agendamento
          ? `${String(p.data_agendamento).split("-").reverse().join("/")} ${p.periodo_agendamento === "tarde" ? "tarde" : "manhã"}`
          : null,
        exames: Array.isArray(p.itens) ? p.itens.length : 0,
      }));
    }
    case "montar_carrinho": {
      const codigos = (Array.isArray(a.codigos) ? a.codigos : []).map(String).slice(0, 60);
      if (!codigos.length) return { erro: "nenhum código" };
      let itens: any[] = [];
      if (a.tipo === "convenio") {
        const nums = codigos.map((c: string) => parseInt(c, 10)).filter((n: number) => Number.isFinite(n));
        const { data } = await admin.from("exames_convenio").select("codigo_shift, nome").in("codigo_shift", nums).eq("ativo", true);
        itens = (data ?? []).map((e: any) => ({
          codigoShift: String(e.codigo_shift), tipo: "exame", nome: e.nome, outrosNomes: "",
          precoParticular: null, precoCentavos: null, prazoResultado: null, preparo: null,
          disponivelNaUnidade: true, disponivelEmCasa: false,
        }));
      } else {
        const { data } = await admin
          .from("exames_cache")
          .select("codigo_shift, nome, outros_nomes, preco_particular, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa")
          .in("codigo_shift", codigos)
          .eq("ativo", true);
        itens = (data ?? []).map((e: any) => ({
          codigoShift: String(e.codigo_shift), tipo: "exame", nome: e.nome, outrosNomes: (e.outros_nomes ?? []).join(", "),
          precoParticular: e.preco_particular ?? null, precoCentavos: null, prazoResultado: e.prazo_resultado ?? null,
          preparo: e.preparo ?? null, disponivelNaUnidade: e.disponivel_na_unidade ?? true, disponivelEmCasa: e.disponivel_em_casa ?? false,
        }));
      }
      if (!itens.length) return { erro: "Nenhum dos códigos foi encontrado no catálogo." };
      acoes.push({ tipo: "carrinho", tipo_compra: a.tipo, itens });
      return { ok: true, adicionados: itens.map((i) => i.nome), instrucao: 'Diga ao paciente para clicar em "Continuar agendamento" no chat.' };
    }
    case "contato_atendimento": {
      const { data } = await admin.from("unidades_cache").select("nome, telefone").eq("ativo", true).not("telefone", "is", null);
      return { telefones: data ?? [], obs: "Atendimento humano pelos telefones das unidades." };
    }
    default:
      return { erro: `ferramenta desconhecida: ${nome}` };
  }
}
