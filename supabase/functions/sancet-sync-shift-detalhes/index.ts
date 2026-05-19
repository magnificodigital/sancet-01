// Sincroniza detalhes individuais de cada exame via WsGetExamesById.
// Roda 1 chamada SOAP por exame ativo, com delay pra não saturar o proxy.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.2";
import { buildEnvelope, loadShiftConfig } from "../_shared/shift-soap.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHIFT_PROXY_URL = "https://sancet-shift-proxysancet-shift-proxy.willy-5c4.workers.dev/";

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

function pickStr(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
function pickInt(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDetalhe(endpoint: string, exameId: string) {
  const envelope = buildEnvelope(
    "WsGetExamesById",
    `<www:pExameId>${exameId}</www:pExameId><www:pConfiguracaoWeb></www:pConfiguracaoWeb><www:pSiglaURL></www:pSiglaURL>`,
  );
  const response = await fetch(SHIFT_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": '""',
      "X-Target-Url": endpoint,
    },
    body: envelope,
  });
  const xml = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${xml.slice(0, 200)}`);
  }
  return parser.parse(xml);
}

function mapDetalhe(parsed: any) {
  const result = findDeep(parsed, "WsGetExamesByIdResult") ?? parsed;
  const material = pickStr(findDeep(result, "material"));
  const metodologia = pickStr(findDeep(result, "metodo") ?? findDeep(result, "metodologia"));
  const prazo = pickStr(findDeep(result, "prazo"));
  const jejum = pickInt(findDeep(result, "instrucaoJejum"));

  const instrucoes = asArray(findDeep(result, "instrucao"));
  const preferidas = ["Jejum", "Paciente", "Coleta"];
  const partes: string[] = [];
  for (const nome of preferidas) {
    for (const inst of instrucoes) {
      const n = pickStr(inst?.nome);
      const v = pickStr(inst?.valor);
      if (n && v && n.toLowerCase() === nome.toLowerCase()) {
        partes.push(`${n}: ${v}`);
      }
    }
  }
  // Demais instruções (que não sejam as preferidas)
  for (const inst of instrucoes) {
    const n = pickStr(inst?.nome);
    const v = pickStr(inst?.valor);
    if (!n || !v) continue;
    if (preferidas.some((p) => p.toLowerCase() === n.toLowerCase())) continue;
    partes.push(`${n}: ${v}`);
  }
  const preparo = partes.length ? partes.join("\n\n") : null;

  return {
    material,
    metodologia,
    prazo_resultado: prazo,
    jejum_horas: jejum,
    preparo,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const inicio = Date.now();
  let logId: string | null = null;
  let supabase: any;

  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth + admin
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

    // Cria log
    const { data: logRow, error: logErr } = await supabase
      .from("shift_sync_logs")
      .insert({ status: "em_execucao", tipo: "detalhes" })
      .select("id")
      .single();
    if (logErr) {
      return new Response(JSON.stringify({ error: "Falha ao criar log: " + logErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logId = logRow.id;

    const { endpoint } = await loadShiftConfig(supabase);

    // Busca todos os exames ativos (paginando p/ ultrapassar limite de 1000)
    const exames: { codigo_shift: string }[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("exames_cache")
        .select("codigo_shift")
        .eq("ativo", true)
        .order("codigo_shift", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw new Error("Listar exames: " + error.message);
      const rows = data ?? [];
      exames.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }

    console.log(`[detalhes] total de exames a processar: ${exames.length}`);

    let processados = 0;
    let atualizados = 0;
    let falhados = 0;

    for (const ex of exames) {
      try {
        const parsed = await fetchDetalhe(endpoint, ex.codigo_shift);
        const det = mapDetalhe(parsed);

        // Só atualiza se tiver algo útil
        const patch: Record<string, any> = { atualizado_em: new Date().toISOString() };
        if (det.material !== null) patch.material = det.material;
        if (det.metodologia !== null) patch.metodologia = det.metodologia;
        if (det.prazo_resultado !== null) patch.prazo_resultado = det.prazo_resultado;
        if (det.jejum_horas !== null) patch.jejum_horas = det.jejum_horas;
        if (det.preparo !== null) patch.preparo = det.preparo;

        if (Object.keys(patch).length > 1) {
          const { error: upErr } = await supabase
            .from("exames_cache")
            .update(patch)
            .eq("codigo_shift", ex.codigo_shift);
          if (upErr) {
            console.error(`[detalhes] erro update ${ex.codigo_shift}:`, upErr.message);
            falhados++;
          } else {
            atualizados++;
          }
        }
      } catch (e: any) {
        falhados++;
        console.error(`[detalhes] falha exame ${ex.codigo_shift}:`, e?.message ?? String(e));
      }

      processados++;
      if (processados % 50 === 0) {
        console.log(`[detalhes] progresso: ${processados}/${exames.length} (atualizados=${atualizados}, falhados=${falhados})`);
      }

      await sleep(100);
    }

    await supabase
      .from("shift_sync_logs")
      .update({
        status: "sucesso",
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - inicio,
        exames_processados: processados,
        exames_atualizados: atualizados,
        exames_falhados: falhados,
      })
      .eq("id", logId);

    console.log(`[detalhes] FIM: processados=${processados}, atualizados=${atualizados}, falhados=${falhados}`);

    return new Response(JSON.stringify({
      sucesso: true,
      log_id: logId,
      processados,
      atualizados,
      falhados,
      duracao_ms: Date.now() - inicio,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.error("[detalhes] ERRO FATAL:", msg);
    if (logId && supabase) {
      try {
        await supabase
          .from("shift_sync_logs")
          .update({
            status: "erro",
            erro_mensagem: msg,
            finalizado_em: new Date().toISOString(),
            duracao_ms: Date.now() - inicio,
          })
          .eq("id", logId);
      } catch (_) { /* noop */ }
    }
    return new Response(JSON.stringify({ sucesso: false, log_id: logId, erro: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
