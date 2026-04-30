import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows } = await supabase
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", [
        "GATEWAY_ATIVO",
        "ASAAS_API_KEY",
        "MERCADOPAGO_ACCESS_TOKEN",
        "PAGHIPER_API_KEY",
        "PAGHIPER_TOKEN",
      ]);

    const cfg: Record<string, string> = {};
    (rows ?? []).forEach((r: any) => { cfg[r.chave] = r.valor; });

    const gateway = cfg["GATEWAY_ATIVO"] || "asaas";
    const { protocolo, valor_centavos, descricao } = await req.json();
    const valor = valor_centavos / 100;

    let pixData: { qr_code_base64: string; pix_code: string } | undefined;

    // ── ASAAS ──
    if (gateway === "asaas") {
      const apiKey = cfg["ASAAS_API_KEY"];
      if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");

      const baseUrl = apiKey.startsWith("$aact_YTU5YTE0M")
        ? "https://sandbox.asaas.com/api/v3"
        : "https://api.asaas.com/api/v3";

      const custRes = await fetch(`${baseUrl}/customers?name=Sancet+Paciente`, {
        headers: { access_token: apiKey },
      });
      const custData = await custRes.json();
      let customerId = custData.data?.[0]?.id;

      if (!customerId) {
        const newCust = await fetch(`${baseUrl}/customers`, {
          method: "POST",
          headers: { access_token: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Paciente Sancet", cpfCnpj: "00000000000" }),
        });
        const nc = await newCust.json();
        customerId = nc.id;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      const due = dueDate.toISOString().split("T")[0];

      const chargeRes = await fetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { access_token: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: valor,
          dueDate: due,
          description: descricao,
          externalReference: protocolo,
        }),
      });
      const charge = await chargeRes.json();

      const pixRes = await fetch(`${baseUrl}/payments/${charge.id}/pixQrCode`, {
        headers: { access_token: apiKey },
      });
      const pix = await pixRes.json();
      pixData = { qr_code_base64: pix.encodedImage ?? "", pix_code: pix.payload ?? "" };
    }

    // ── MERCADO PAGO ──
    else if (gateway === "mercadopago") {
      const token = cfg["MERCADOPAGO_ACCESS_TOKEN"];
      if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada.");

      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": protocolo,
        },
        body: JSON.stringify({
          transaction_amount: valor,
          description: descricao,
          payment_method_id: "pix",
          payer: { email: "paciente@sancet.com.br" },
          external_reference: protocolo,
        }),
      });
      const mp = await mpRes.json();
      const td = mp.point_of_interaction?.transaction_data;
      pixData = { qr_code_base64: td?.qr_code_base64 ?? "", pix_code: td?.qr_code ?? "" };
    }

    // ── PAGHIPER ──
    else if (gateway === "paghiper") {
      const apiKey = cfg["PAGHIPER_API_KEY"];
      const token = cfg["PAGHIPER_TOKEN"];
      if (!apiKey || !token) throw new Error("PAGHIPER_API_KEY ou PAGHIPER_TOKEN não configurados.");

      const phRes = await fetch("https://pix.paghiper.com/invoice/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          order_id: protocolo,
          payer_name: "Paciente Sancet",
          payer_cpf: "00000000000",
          payer_email: "paciente@sancet.com.br",
          notification_url: "",
          days_due_date: 1,
          items: [{ description: descricao, quantity: 1, item_id: "1", price_cents: valor_centavos }],
        }),
      });
      const ph = await phRes.json();
      const inv = ph.pix_create_request;
      pixData = {
        qr_code_base64: inv?.qrcode_image_url ?? "",
        pix_code: inv?.qr_code ?? "",
      };
    }

    else {
      throw new Error(`Gateway "${gateway}" não reconhecido.`);
    }

    return new Response(JSON.stringify(pixData!), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("sancet-criar-pagamento error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Erro interno" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
