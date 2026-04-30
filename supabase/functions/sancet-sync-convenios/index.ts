// Sincroniza convênios (fontes pagadoras) do Shift LIS → convenios_cache
// Secrets: SHIFT_ENDPOINT, SHIFT_USER_ID, SHIFT_SENHA
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SOAP_HEADERS, buildEnvelope, getter, loadShiftConfig } from "../_shared/shift-soap.ts";

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
      "WsGetTodosFontePagadora",
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

    const convenios: any[] = [];
    const matches = xml.matchAll(/<FontePagadora>([\s\S]*?)<\/FontePagadora>/g);
    for (const m of matches) {
      const get = getter(m[1]);
      const nome = get("Nome");
      const codigo = get("Codigo");
      if (!codigo || !nome) continue;
      convenios.push({
        codigo_shift: codigo,
        nome,
        ativo: true,
        atualizado_em: new Date().toISOString(),
      });
    }

    if (convenios.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, total: 0, aviso: "Nenhuma <FontePagadora> encontrada na resposta SOAP." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase
      .from("convenios_cache")
      .upsert(convenios, { onConflict: "codigo_shift" });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true, total: convenios.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
