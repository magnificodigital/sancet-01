// Sincroniza catálogo, unidades e convênios do Shift LIS em uma única execução,
// com log em shift_sync_logs. Mantém credenciais SHIFT_USER_ID / SHIFT_SENHA.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.2";
import { SOAP_HEADERS, buildEnvelope, slugify, loadShiftConfig, buildAuthTags } from "../_shared/shift-soap.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
});

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function findDeep(obj: any, key: string): any {
  if (!obj || typeof obj !== "object") return undefined;
  if (key in obj) return obj[key];
  for (const k of Object.keys(obj)) {
    const v = findDeep(obj[k], key);
    if (v !== undefined) return v;
  }
  return undefined;
}

async function soapCall(endpoint: string, userId: string | null, senha: string | null, method: string) {
  const envelope = buildEnvelope(
    method,
    `${buildAuthTags(userId, senha)}<pConfiguracaoWeb></pConfiguracaoWeb>`,
  );
  const res = await fetch(endpoint, { method: "POST", headers: SOAP_HEADERS, body: envelope });
  const xml = await res.text();
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}: ${xml.slice(0, 300)}`);
  return parser.parse(xml);
}

function pickInt(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}
function pickNum(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function pickStr(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

async function diffCounts(
  supabase: any,
  table: string,
  codigos: string[],
): Promise<Set<string>> {
  const existentes = new Set<string>();
  if (codigos.length === 0) return existentes;
  // chunk em 500 para evitar URLs gigantes
  for (let i = 0; i < codigos.length; i += 500) {
    const chunk = codigos.slice(i, i + 500);
    const { data, error } = await supabase
      .from(table)
      .select("codigo_shift")
      .in("codigo_shift", chunk);
    if (error) throw new Error(`Diff ${table}: ${error.message}`);
    (data ?? []).forEach((r: any) => existentes.add(r.codigo_shift));
  }
  return existentes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const inicio = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Auth + admin check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: claims.claims.sub,
    _role: "admin",
  });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Apenas administradores." }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Cria log
  const { data: logRow, error: logErr } = await supabase
    .from("shift_sync_logs")
    .insert({ status: "em_execucao" })
    .select("id")
    .single();
  if (logErr) {
    return new Response(JSON.stringify({ error: "Falha ao criar log: " + logErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const logId = logRow.id;

  const finalizar = async (extra: Record<string, any>) => {
    await supabase
      .from("shift_sync_logs")
      .update({
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - inicio,
        ...extra,
      })
      .eq("id", logId);
  };

  try {
    const { endpoint, userId, senha } = await loadShiftConfig(supabase);

    // ----- EXAMES -----
    const examesXml = await soapCall(endpoint, userId, senha, "WsGetTodosExames");
    const examesRaw = asArray(findDeep(examesXml, "procedimentoSimples"));
    const exames = examesRaw
      .map((e: any) => {
        const codigo = pickStr(e.id);
        const nome = pickStr(e.nome);
        if (!codigo || !nome) return null;
        return {
          codigo_shift: codigo,
          nome,
          slug: slugify(nome),
          mnemonico: pickStr(e.menmonico) ?? pickStr(e.mnemonico),
          material: pickStr(e.material),
          metodologia: pickStr(e.metodologia),
          jejum_horas: pickInt(e.jejumHoras ?? e.jejum),
          instrucoes_coleta: pickStr(e.instrucoesColeta),
          instrucoes_paciente: pickStr(e.instrucoesPaciente),
          descricao: pickStr(e.descricao),
          preparo: pickStr(e.preparo),
          prazo_resultado: pickStr(e.prazoEntrega ?? e.prazo),
          categoria: pickStr(e.categoria),
          ativo: true,
          atualizado_em: new Date().toISOString(),
          sincronizado_em: new Date().toISOString(),
        };
      })
      .filter(Boolean) as any[];

    const examesExist = await diffCounts(supabase, "exames_cache", exames.map((x) => x.codigo_shift));
    let examesCriados = 0, examesAtualizados = 0;
    if (exames.length) {
      const { error } = await supabase.from("exames_cache").upsert(exames, { onConflict: "codigo_shift" });
      if (error) throw new Error("Upsert exames: " + error.message);
      for (const x of exames) examesExist.has(x.codigo_shift) ? examesAtualizados++ : examesCriados++;
    }

    // ----- UNIDADES -----
    const unidadesXml = await soapCall(endpoint, userId, senha, "WsGetTodosUnidades");
    const unidadesRaw = asArray(findDeep(unidadesXml, "unidade"));
    const unidades = unidadesRaw
      .map((u: any) => {
        const codigo = pickStr(u.id);
        const nome = pickStr(u.nome);
        if (!codigo || !nome) return null;
        let lat: number | null = null, lng: number | null = null;
        const gmap = pickStr(u.gmapAddress);
        if (gmap && gmap.includes(",")) {
          const [a, b] = gmap.split(",").map((s) => s.trim());
          lat = pickNum(a); lng = pickNum(b);
        }
        return {
          codigo_shift: codigo,
          nome,
          slug: slugify(nome),
          logradouro: pickStr(u.logradouro),
          numero: pickStr(u.numero),
          bairro: pickStr(u.bairro),
          cidade: pickStr(u.cidade),
          uf: pickStr(u.estado),
          cep: pickStr(u.cep),
          telefone: pickStr(u.telefone),
          horario_funcionamento: pickStr(u.funcionamento),
          endereco: [pickStr(u.logradouro), pickStr(u.numero), pickStr(u.bairro)]
            .filter(Boolean).join(", ") || null,
          latitude: lat,
          longitude: lng,
          ativo: true,
          atualizado_em: new Date().toISOString(),
          sincronizado_em: new Date().toISOString(),
        };
      })
      .filter(Boolean) as any[];

    const unidadesExist = await diffCounts(supabase, "unidades_cache", unidades.map((x) => x.codigo_shift));
    let unidadesCriadas = 0, unidadesAtualizadas = 0;
    if (unidades.length) {
      const { error } = await supabase.from("unidades_cache").upsert(unidades, { onConflict: "codigo_shift" });
      if (error) throw new Error("Upsert unidades: " + error.message);
      for (const x of unidades) unidadesExist.has(x.codigo_shift) ? unidadesAtualizadas++ : unidadesCriadas++;
    }

    // ----- CONVENIOS -----
    const convXml = await soapCall(endpoint, userId, senha, "WsGetTodosFontePagadora");
    const convRaw = asArray(findDeep(convXml, "fontePagadora"));
    const convenios = convRaw
      .map((c: any) => {
        const codigo = pickStr(c.id);
        const nome = pickStr(c.descricao ?? c.nome);
        if (!codigo || !nome) return null;
        return {
          codigo_shift: codigo,
          nome,
          observacoes: pickStr(c.observacoesFP ?? c.observacoes),
          requisitos: pickStr(c.requisitosNecessarios ?? c.requisitos),
          ativo: true,
          atualizado_em: new Date().toISOString(),
          sincronizado_em: new Date().toISOString(),
        };
      })
      .filter(Boolean) as any[];

    const convExist = await diffCounts(supabase, "convenios_cache", convenios.map((x) => x.codigo_shift));
    let convCriados = 0, convAtualizados = 0;
    if (convenios.length) {
      const { error } = await supabase.from("convenios_cache").upsert(convenios, { onConflict: "codigo_shift" });
      if (error) throw new Error("Upsert convenios: " + error.message);
      for (const x of convenios) convExist.has(x.codigo_shift) ? convAtualizados++ : convCriados++;
    }

    await finalizar({
      status: "sucesso",
      exames_criados: examesCriados,
      exames_atualizados: examesAtualizados,
      unidades_criadas: unidadesCriadas,
      unidades_atualizadas: unidadesAtualizadas,
      convenios_criados: convCriados,
      convenios_atualizados: convAtualizados,
    });

    return new Response(JSON.stringify({
      sucesso: true,
      log_id: logId,
      exames: { criados: examesCriados, atualizados: examesAtualizados },
      unidades: { criadas: unidadesCriadas, atualizadas: unidadesAtualizadas },
      convenios: { criados: convCriados, atualizados: convAtualizados },
      duracao_ms: Date.now() - inicio,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await finalizar({ status: "erro", erro_mensagem: msg });
    return new Response(JSON.stringify({ sucesso: false, log_id: logId, erro: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
