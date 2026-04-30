// Sincroniza catálogo de exames do Shift LIS → exames_cache
// Secrets: SHIFT_ENDPOINT, SHIFT_USER_ID, SHIFT_SENHA
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SOAP_HEADERS, buildEnvelope, slugify, getter, loadShiftConfig } from "../_shared/shift-soap.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { endpoint, userId, senha } = await loadShiftConfig(supabase);

    const envelope = buildEnvelope(
      "WsGetTodosExames",
      `<pUserId>${userId}</pUserId><pSenha>${senha}</pSenha>`,
    );

    const soapRes = await fetch(endpoint, { method: "POST", headers: SOAP_HEADERS, body: envelope });
    const xml = await soapRes.text();

    if (!soapRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `Shift retornou ${soapRes.status}`, xml: xml.slice(0, 500) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }

    const exames: any[] = [];
    const matches = xml.matchAll(/<Exame>([\s\S]*?)<\/Exame>/g);
    for (const m of matches) {
      const get = getter(m[1]);
      const nome = get("Nome");
      const codigo = get("Codigo");
      if (!codigo || !nome) continue;
      exames.push({
        codigo_shift: codigo,
        nome,
        slug: slugify(nome),
        descricao: get("Descricao") || null,
        preparo: get("Preparo") || null,
        prazo_resultado: get("PrazoEntrega") || null,
        categoria: get("Categoria") || null,
        ativo: true,
        atualizado_em: new Date().toISOString(),
      });
    }

    if (exames.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, total: 0, aviso: "Nenhum <Exame> encontrado na resposta SOAP." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase
      .from("exames_cache")
      .upsert(exames, { onConflict: "codigo_shift" });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true, total: exames.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
