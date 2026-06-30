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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validação opcional do token configurado no painel Asaas
    const { data: cfgRow } = await supabase
      .from("configuracoes")
      .select("valor")
      .eq("chave", "ASAAS_WEBHOOK_TOKEN")
      .maybeSingle();

    const expected = cfgRow?.valor;
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

    const update: Record<string, unknown> = {
      status_pagamento: novoStatus,
      updated_at: new Date().toISOString(),
    };


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
