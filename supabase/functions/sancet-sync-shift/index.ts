// Sincroniza catálogo, unidades e convênios do Shift LIS em uma única execução,
// com log em shift_sync_logs. Mantém credenciais SHIFT_USER_ID / SHIFT_SENHA.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.2";
import { buildEnvelope, slugify, loadShiftConfig, buildAuthTags } from "../_shared/shift-soap.ts";

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

function dedupByCodigoShift<T extends { codigo_shift: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.codigo_shift, item);
  }
  return Array.from(map.values());
}

function dedupBySlug<T extends { slug: string | null; nome: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  const out: T[] = [];
  for (const item of items) {
    if (!item.slug) { out.push(item); continue; }
    const existing = map.get(item.slug);
    if (!existing || item.nome.length > existing.nome.length) {
      map.set(item.slug, item);
    }
  }
  return [...out, ...Array.from(map.values())];
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

async function soapCall(endpoint: string, userId: string | null, senha: string | null, method: string, configWeb = "") {
  console.log(`[sync] SOAP ${method} → ${endpoint} (auth: ${!!(userId && senha)})`);
  const envelope = buildEnvelope(
    method,
    `${buildAuthTags(userId, senha)}<www:pConfiguracaoWeb>${configWeb}</www:pConfiguracaoWeb>`,
  );

  const SHIFT_PROXY_URL = 'https://sancet-shift-proxysancet-shift-proxy.willy-5c4.workers.dev/';

  console.log(`[sync] via proxy: ${SHIFT_PROXY_URL} → target: ${endpoint}`);

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
  console.log(`[sync] SOAP ${method} ← HTTP ${response.status}, ${xml.length} bytes`);
  console.log(`[sync] SOAP ${method} preview:`, xml.slice(0, 400));
  if (!response.ok) {
    const chunkSize = 250;
    for (let i = 0; i < xml.length; i += chunkSize) {
      console.error(`[soap_fault_chunk ${i}]:`, xml.substring(i, i + chunkSize));
    }
    throw new Error(`${method} HTTP ${response.status}: (ver logs em chunks) ${xml.slice(0, 400)}`);
  }
  try {
    return parser.parse(xml);
  } catch (e: any) {
    console.error(`[sync] SOAP ${method} parse error:`, e?.message);
    throw new Error(`${method} parse: ${e?.message}`);
  }
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
  let etapa = "init";
  let logId: string | null = null;
  let supabase: any;

  try {
    console.log("[sync] iniciando");
    etapa = "create_client";
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Auth + admin check
    etapa = "auth_header";
    const authHeader = req.headers.get("Authorization");
    console.log("[sync] auth header presente:", !!authHeader);
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    etapa = "get_claims";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    console.log("[sync] user:", claims?.claims?.sub, "claimsErr:", claimsErr?.message);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    etapa = "has_role";
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: claims.claims.sub,
      _role: "admin",
    });
    console.log("[sync] is admin:", isAdmin, "roleErr:", roleErr?.message);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Cria log
    etapa = "criar_log";
    const { data: logRow, error: logErr } = await supabase
      .from("shift_sync_logs")
      .insert({ status: "em_execucao" })
      .select("id")
      .single();
    console.log("[sync] log criado:", logRow?.id, "logErr:", logErr?.message);
    if (logErr) {
      return new Response(JSON.stringify({ error: "Falha ao criar log: " + logErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logId = logRow.id;

    const finalizar = async (extra: Record<string, any>) => {
      if (!logId) return;
      await supabase
        .from("shift_sync_logs")
        .update({
          finalizado_em: new Date().toISOString(),
          duracao_ms: Date.now() - inicio,
          ...extra,
        })
        .eq("id", logId);
    };

    etapa = "load_config";
    const { endpoint, endpointMobile, userId, senha } = await loadShiftConfig(supabase);
    console.log("[sync] config — endpoint consultas:", endpoint, "endpoint mobile:", endpointMobile, "tem credenciais:", !!(userId && senha));
    

    // ----- EXAMES -----
    etapa = "soap_exames";
    console.log("[sync] === EXAMES ===");
    const examesXml = await soapCall(endpoint, userId, senha, "WsGetTodosExames");
    console.log("[sync] exames root keys:", Object.keys(examesXml ?? {}));
    const examesRaw = asArray(findDeep(examesXml, "procedimentoSimples")).filter((e: any) => {
      const id = String(e?.id ?? '').trim();
      const nome = String(e?.nome ?? '').trim();
      // Descarta lixo: id === nome E muito curto
      if (id === nome && id.length <= 3) return false;
      // Descarta nomes vazios ou só números/letras isoladas
      if (nome.length < 3) return false;
      return true;
    });
    console.log("[sync] exames brutos encontrados:", examesRaw.length);
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
    console.log("[sync] exames válidos para upsert:", exames.length);
    const examesDedupCodigo = dedupByCodigoShift(exames);
    console.log(`[sync] exames após dedup código: ${examesDedupCodigo.length} (era ${exames.length})`);
    const examesDedup = dedupBySlug(examesDedupCodigo);
    console.log(`[sync] exames após dedup slug: ${examesDedup.length} (era ${examesDedupCodigo.length})`);

    etapa = "diff_exames";
    const examesExist = await diffCounts(supabase, "exames_cache", examesDedup.map((x) => x.codigo_shift));
    let examesCriados = 0, examesAtualizados = 0;
    if (examesDedup.length) {
      etapa = "upsert_exames";
      const { error } = await supabase.from("exames_cache").upsert(examesDedup, { onConflict: "codigo_shift" });
      if (error) {
        console.error("[sync] ERRO upsert exames:", JSON.stringify(error));
        throw new Error("Upsert exames: " + error.message);
      }
      for (const x of examesDedup) examesExist.has(x.codigo_shift) ? examesAtualizados++ : examesCriados++;
      console.log("[sync] exames criados:", examesCriados, "atualizados:", examesAtualizados);
    }

    // ----- UNIDADES -----
    etapa = "soap_unidades";
    console.log("[sync] === UNIDADES ===");
    const unidadesXml = await soapCall(endpoint, userId, senha, "WsGetTodosUnidades");
    console.log("[sync] unidades root keys:", Object.keys(unidadesXml ?? {}));
    const unidadesRaw = asArray(findDeep(unidadesXml, "unidade"));
    console.log("[sync] unidades brutas encontradas:", unidadesRaw.length);
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
    console.log("[sync] unidades válidas para upsert:", unidades.length);
    const unidadesDedupCodigo = dedupByCodigoShift(unidades);
    console.log(`[sync] unidades após dedup código: ${unidadesDedupCodigo.length} (era ${unidades.length})`);
    const unidadesDedup = dedupBySlug(unidadesDedupCodigo);
    console.log(`[sync] unidades após dedup slug: ${unidadesDedup.length} (era ${unidadesDedupCodigo.length})`);

    etapa = "diff_unidades";
    const unidadesExist = await diffCounts(supabase, "unidades_cache", unidadesDedup.map((x) => x.codigo_shift));
    let unidadesCriadas = 0, unidadesAtualizadas = 0;
    if (unidadesDedup.length) {
      etapa = "upsert_unidades";
      for (const u of unidadesDedup) {
        // Lookup case-insensitive por nome (independente de ter codigo_shift)
        const { data: existente, error: lookupErr } = await supabase
          .from("unidades_cache")
          .select("id, codigo_shift")
          .ilike("nome", u.nome)
          .maybeSingle();
        if (lookupErr && lookupErr.code !== "PGRST116") {
          console.error("[sync] lookup unidade falhou:", lookupErr.message);
        }

        if (existente) {
          // Atualiza só codigo_shift + sincronizado_em, preservando foto/endereço
          const { error: upErr } = await supabase
            .from("unidades_cache")
            .update({
              codigo_shift: u.codigo_shift,
              sincronizado_em: new Date().toISOString(),
            })
            .eq("id", existente.id);
          if (upErr) {
            console.error("[sync] ERRO atualizar unidade:", upErr.message);
            throw new Error("Atualizar unidade: " + upErr.message);
          }
          unidadesAtualizadas++;
        } else {
          const { error: insErr } = await supabase
            .from("unidades_cache")
            .insert(u);
          if (insErr) {
            console.error("[sync] ERRO inserir unidade:", insErr.message);
            throw new Error("Inserir unidade: " + insErr.message);
          }
          unidadesCriadas++;
        }
      }
      console.log("[sync] unidades criadas:", unidadesCriadas, "atualizadas:", unidadesAtualizadas);
    }

    // ----- CONVENIOS -----
    etapa = "soap_convenios";
    console.log("[sync] === CONVENIOS ===");
    const convXml = await soapCall(endpointMobile, userId, senha, "WsGetTodosFontePagadora", "UNICO");
    console.log("[sync] convenios root keys:", Object.keys(convXml ?? {}));
    const convRaw = asArray(findDeep(convXml, "fontePagadora"));
    console.log("[sync] convenios brutos encontrados:", convRaw.length);
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
    console.log("[sync] convenios válidos para upsert:", convenios.length);
    const conveniosDedup = dedupByCodigoShift(convenios);
    console.log(`[sync] convenios após dedup: ${conveniosDedup.length} (era ${convenios.length})`);

    etapa = "diff_convenios";
    const convExist = await diffCounts(supabase, "convenios_cache", conveniosDedup.map((x) => x.codigo_shift));
    let convCriados = 0, convAtualizados = 0;
    if (conveniosDedup.length) {
      etapa = "upsert_convenios";
      const { error } = await supabase.from("convenios_cache").upsert(conveniosDedup, { onConflict: "codigo_shift" });
      if (error) {
        console.error("[sync] ERRO upsert convenios:", JSON.stringify(error));
        throw new Error("Upsert convenios: " + error.message);
      }
      for (const x of conveniosDedup) convExist.has(x.codigo_shift) ? convAtualizados++ : convCriados++;
      console.log("[sync] convenios criados:", convCriados, "atualizados:", convAtualizados);
    }

    etapa = "finalizar";
    await finalizar({
      status: "sucesso",
      exames_criados: examesCriados,
      exames_atualizados: examesAtualizados,
      unidades_criadas: unidadesCriadas,
      unidades_atualizadas: unidadesAtualizadas,
      convenios_criados: convCriados,
      convenios_atualizados: convAtualizados,
    });
    console.log("[sync] FIM com sucesso em", Date.now() - inicio, "ms");

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
    const stack = e?.stack ?? null;
    console.error(`[sync] ERRO FATAL na etapa="${etapa}":`, msg);
    if (stack) console.error("[sync] stack:", stack);
    if (logId && supabase) {
      try {
        await supabase
          .from("shift_sync_logs")
          .update({
            status: "erro",
            erro_mensagem: `[${etapa}] ${msg}`,
            finalizado_em: new Date().toISOString(),
            duracao_ms: Date.now() - inicio,
          })
          .eq("id", logId);
      } catch (logE: any) {
        console.error("[sync] falha ao gravar log de erro:", logE?.message);
      }
    }
    return new Response(JSON.stringify({
      sucesso: false,
      log_id: logId,
      etapa,
      erro: msg,
      stack,
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

