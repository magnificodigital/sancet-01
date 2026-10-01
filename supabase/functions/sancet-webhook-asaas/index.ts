import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

// Mapeamento de eventos Asaas → status_pagamento Sancet
const EVENT_MAP: Record<string, string> = {
  PAYMENT_CONFIRMED: "pago",
  PAYMENT_RECEIVED: "pago",
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "falhou",
  PAYMENT_OVERDUE: "vencido",
  PAYMENT_REFUNDED: "estornado",
  PAYMENT_CHARGEBACK_REQUESTED: "estornado",
  PAYMENT_DELETED: "cancelado",
};

function ambienteAsaas(apiKey: string, cfgAmbiente?: string): string {
  const amb = (cfgAmbiente ?? "").toLowerCase();
  if (amb === "producao" || amb === "production" || amb === "prod") return "https://api.asaas.com/api/v3";
  if (amb === "sandbox" || amb === "homologacao" || amb === "hmlg") return "https://sandbox.asaas.com/api/v3";
  const k = apiKey.toLowerCase();
  if (k.includes("hmlg") || k.includes("sandbox") || k.includes("homolog")) return "https://sandbox.asaas.com/api/v3";
  if (apiKey.startsWith("$aact_YTU5YTE0M")) return "https://sandbox.asaas.com/api/v3";
  return "https://api.asaas.com/api/v3";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: cfgRows } = await supabase
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", ["ASAAS_WEBHOOK_TOKEN", "ASAAS_API_KEY", "ASAAS_AMBIENTE"]);
    const cfg: Record<string, string> = {};
    (cfgRows ?? []).forEach((r: any) => (cfg[r.chave] = r.valor ?? ""));

    // Token configurado no painel Asaas (quando existir, é obrigatório).
    const expected = cfg.ASAAS_WEBHOOK_TOKEN?.trim();
    if (expected) {
      const received = req.headers.get("asaas-access-token");
      if (received !== expected) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();
    const event = payload?.event as string | undefined;
    const payment = payload?.payment ?? {};
    const protocolo = payment?.externalReference as string | undefined;

    console.log("[webhook-asaas]", { event, protocolo, paymentId: payment?.id });

    if (!event || !protocolo) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const novoStatus = EVENT_MAP[event];
    if (!novoStatus) {
      return new Response(JSON.stringify({ ok: true, ignored: event }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Nunca confia só no corpo do webhook: confirma a cobrança direto na API
    // do Asaas (evita alguém forjar um "PAYMENT_RECEIVED" e marcar como pago).
    const apiKey = cfg.ASAAS_API_KEY?.trim();
    if (!apiKey || !payment?.id) {
      return new Response(JSON.stringify({ error: "nao_verificavel" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const real = await fetch(`${ambienteAsaas(apiKey, cfg.ASAAS_AMBIENTE)}/payments/${encodeURIComponent(payment.id)}`, {
      headers: { access_token: apiKey },
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (!real?.id || real.externalReference !== protocolo) {
      return new Response(JSON.stringify({ error: "cobranca_nao_confere" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (novoStatus === "pago") {
      const pagoDeVerdade = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(String(real.status));
      const { data: ped } = await supabase
        .from("pedidos")
        .select("valor_total_centavos")
        .eq("protocolo", protocolo)
        .maybeSingle();
      const valorOk = !!ped && Math.round(Number(real.value) * 100) >= Number(ped.valor_total_centavos ?? 0);
      if (!pagoDeVerdade || !valorOk) {
        console.error("[webhook-asaas] pagamento não confere", { protocolo, status: real.status, value: real.value });
        return new Response(JSON.stringify({ error: "pagamento_nao_confere" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const update: Record<string, unknown> = {
      status_pagamento: novoStatus,
      updated_at: new Date().toISOString(),
    };

    // Progressão automática do status do pedido conforme o pagamento
    if (novoStatus === "pago") {
      update.status = "confirmado";
    } else if (novoStatus === "vencido" || novoStatus === "falhou") {
      update.status = "aguardando_pagamento";
    } else if (novoStatus === "cancelado") {
      update.status = "cancelado";
    }


    const { error } = await supabase
      .from("pedidos")
      .update(update)
      .eq("protocolo", protocolo);

    if (error) {
      console.error("[webhook-asaas] update error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, protocolo, status: novoStatus }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[webhook-asaas] erro", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
