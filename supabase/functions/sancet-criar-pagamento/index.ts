import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

/** Extrai a mensagem descritiva de erro do gateway (sem expor nome do provedor). */
function extractGatewayMessage(data: any): string {
  const errs = data?.errors;
  if (Array.isArray(errs) && errs.length) {
    return errs.map((e: any) => e?.description || e?.code).filter(Boolean).join("; ");
  }
  return data?.message || data?.raw || "";
}

type CampoInvalido = "cpf" | "email" | "celular" | "nome" | "valor" | "config" | "gateway";

function classificarErro(raw: string): { campo: CampoInvalido; mensagem: string } {
  const m = raw.toLowerCase();
  if (m.includes("api_key") || m.includes("access_token") || m.includes("unauthorized") || m.includes("401") || m.includes("403")) {
    return { campo: "config", mensagem: "O sistema de pagamentos ainda não está configurado corretamente. Por favor, entre em contato com a recepção." };
  }
  if (m.includes("cpf")) {
    return { campo: "cpf", mensagem: "O CPF do cadastro é inválido. Confira seus dados pessoais e tente novamente." };
  }
  if (m.includes("email") || m.includes("e-mail")) {
    return { campo: "email", mensagem: "O e-mail do cadastro é inválido. Atualize seus dados pessoais para continuar." };
  }
  if (m.includes("mobilephone") || m.includes("telefone") || m.includes("celular") || m.includes("phone")) {
    return { campo: "celular", mensagem: "O celular do cadastro é inválido. Atualize seus dados pessoais para continuar." };
  }
  if (m.includes("name") || m.includes("nome")) {
    return { campo: "nome", mensagem: "O nome do cadastro está incompleto. Atualize seus dados pessoais para continuar." };
  }
  if (m.includes("value") || m.includes("valor") || m.includes("mín")) {
    return { campo: "valor", mensagem: "O valor do pedido está abaixo do mínimo aceito para pagamento online." };
  }
  return { campo: "gateway", mensagem: "Não conseguimos gerar o pagamento agora. Tente novamente em instantes ou entre em contato com a recepção." };
}

/** Valida cadastro do paciente ANTES de chamar o gateway. */
function validarCadastro(dados: {
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
  celular?: string | null;
}): { ok: true } | { ok: false; campo: CampoInvalido; mensagem: string } {
  const nome = (dados.nome ?? "").trim();
  if (nome.length < 3 || !nome.includes(" ")) {
    return { ok: false, campo: "nome", mensagem: "O cadastro precisa ter o nome completo do paciente. Atualize seus dados pessoais para continuar." };
  }
  const cpf = onlyDigits(dados.cpf);
  if (cpf.length !== 11) {
    return { ok: false, campo: "cpf", mensagem: "O CPF do cadastro está incompleto. Atualize seus dados pessoais para continuar." };
  }
  const email = (dados.email ?? "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, campo: "email", mensagem: "Você precisa cadastrar um e-mail válido para gerar o pagamento. Atualize seus dados pessoais para continuar." };
  }
  const cel = onlyDigits(dados.celular);
  if (cel.length !== 10 && cel.length !== 11) {
    return { ok: false, campo: "celular", mensagem: "Você precisa cadastrar um celular válido (com DDD) para gerar o pagamento. Atualize seus dados pessoais para continuar." };
  }
  return { ok: true };
}

type Metodo = "pix" | "boleto" | "cartao";
const ASAAS_BILLING: Record<Metodo, string> = {
  pix: "PIX",
  boleto: "BOLETO",
  cartao: "CREDIT_CARD",
};

function ambienteAsaas(apiKey: string, cfgAmbiente?: string): string {
  const amb = (cfgAmbiente ?? "").toLowerCase();
  if (amb === "producao" || amb === "production" || amb === "prod") return "https://api.asaas.com/api/v3";
  if (amb === "sandbox" || amb === "homologacao" || amb === "hmlg") return "https://sandbox.asaas.com/api/v3";
  // Heurística: qualquer marca de homologação/sandbox → sandbox
  const k = apiKey.toLowerCase();
  if (k.includes("hmlg") || k.includes("sandbox") || k.includes("homolog")) return "https://sandbox.asaas.com/api/v3";
  // Chave antiga sandbox conhecida
  if (apiKey.startsWith("$aact_YTU5YTE0M")) return "https://sandbox.asaas.com/api/v3";
  return "https://api.asaas.com/api/v3";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const respondError = (campo: CampoInvalido, mensagem: string, detalhe?: string, status = 400) =>
    new Response(
      JSON.stringify({ error: mensagem, campo, detalhe: detalhe ?? null }),
      { status, headers: { ...cors, "Content-Type": "application/json" } }
    );

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
        "ASAAS_AMBIENTE",
        "MERCADOPAGO_ACCESS_TOKEN",
        "PAGHIPER_API_KEY",
        "PAGHIPER_TOKEN",
      ]);

    const cfg: Record<string, string> = {};
    (rows ?? []).forEach((r: any) => { cfg[r.chave] = r.valor; });

    const gateway = cfg["GATEWAY_ATIVO"] || "asaas";
    const body = await req.json().catch(() => ({}));
    const { protocolo, valor_centavos, descricao } = body;
    const metodo: Metodo = (["pix", "boleto", "cartao"] as const).includes(body.metodo) ? body.metodo : "pix";
    const valor = valor_centavos / 100;

    // Busca dados reais do pedido
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("id, paciente_nome, paciente_cpf, asaas_payment_id, asaas_customer_id, paciente_id")
      .eq("protocolo", protocolo)
      .maybeSingle();

    if (!pedido) return respondError("gateway", "Pedido não encontrado.", "protocolo inexistente", 404);

    let pacienteEmail: string | null = null;
    let pacienteCelular: string | null = null;
    if (pedido?.paciente_id) {
      const { data: pac } = await supabase
        .from("pacientes")
        .select("email, celular")
        .eq("id", pedido.paciente_id)
        .maybeSingle();
      pacienteEmail = pac?.email ?? null;
      pacienteCelular = pac?.celular ?? null;
    }

    // Pré-validação — evita chamar o gateway com dados ruins
    const valid = validarCadastro({
      nome: pedido?.paciente_nome,
      cpf: pedido?.paciente_cpf,
      email: pacienteEmail,
      celular: pacienteCelular,
    });
    if (!valid.ok) return respondError(valid.campo, valid.mensagem, `cadastro incompleto: ${valid.campo}`);

    if (!valor_centavos || valor_centavos < 300) {
      return respondError("valor", "O valor mínimo para pagamento online é R$ 3,00.", `valor_centavos=${valor_centavos}`);
    }

    let payload: any;

    // ── ASAAS ──
    if (gateway === "asaas") {
      const apiKey = cfg["ASAAS_API_KEY"];
      if (!apiKey) {
        return respondError("config", "O sistema de pagamentos ainda não está configurado. Entre em contato com a recepção.", "ASAAS_API_KEY ausente");
      }

      const baseUrl = ambienteAsaas(apiKey, cfg["ASAAS_AMBIENTE"]);
      const headers = { access_token: apiKey, "Content-Type": "application/json" };
      const billingType = ASAAS_BILLING[metodo];

      // ── Idempotência: reusa cobrança existente SÓ se billingType bate ──
      let chargeId: string | null = null;
      let charge: any = null;

      if (pedido?.asaas_payment_id) {
        const getRes = await fetch(`${baseUrl}/payments/${pedido.asaas_payment_id}`, { headers });
        const existing = await safeJson(getRes);
        if (getRes.ok && existing?.id && existing.billingType === billingType && existing.status !== "OVERDUE") {
          chargeId = existing.id;
          charge = existing;
        }
      }

      // ── Customer: reusa ou cria ──
      let customerId = pedido?.asaas_customer_id ?? null;
      const cpf = onlyDigits(pedido?.paciente_cpf);
      const nome = (pedido?.paciente_nome ?? "").trim().replace(/\s+/g, " ");
      const email = (pacienteEmail ?? "").trim();
      const celular = onlyDigits(pacienteCelular);

      if (!chargeId) {
        if (!customerId && cpf) {
          const custRes = await fetch(`${baseUrl}/customers?cpfCnpj=${cpf}`, { headers });
          const custData = await safeJson(custRes);
          customerId = custData.data?.[0]?.id ?? null;
        }

        if (!customerId) {
          const custBody = {
            name: nome,
            cpfCnpj: cpf,
            email,
            mobilePhone: celular,
          };

          const newCust = await fetch(`${baseUrl}/customers`, {
            method: "POST", headers, body: JSON.stringify(custBody),
          });
          const nc = await safeJson(newCust);
          if (!newCust.ok || !nc.id) {
            const raw = extractGatewayMessage(nc) || `resposta inesperada (status ${newCust.status}) do gateway`;
            console.error("Gateway customer error:", newCust.status, JSON.stringify(nc), "url:", baseUrl);
            const cls = classificarErro(raw);
            return respondError(cls.campo, cls.mensagem, `status ${newCust.status}: ${raw}`);
          }
          customerId = nc.id;
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (metodo === "boleto" ? 3 : 1));
        const due = dueDate.toISOString().split("T")[0];

        const chargeRes = await fetch(`${baseUrl}/payments`, {
          method: "POST", headers,
          body: JSON.stringify({
            customer: customerId,
            billingType,
            value: valor,
            dueDate: due,
            description: descricao,
            externalReference: protocolo,
          }),
        });
        charge = await safeJson(chargeRes);
        if (!chargeRes.ok || !charge.id) {
          const raw = extractGatewayMessage(charge) || `resposta inesperada (status ${chargeRes.status})`;
          const cls = classificarErro(raw);
          return respondError(cls.campo, cls.mensagem, `status ${chargeRes.status}: ${raw}`);
        }
        chargeId = charge.id;

        if (pedido?.id) {
          await supabase.from("pedidos")
            .update({ asaas_payment_id: chargeId, asaas_customer_id: customerId })
            .eq("id", pedido.id);
        }
      }

      // Sinaliza para o staff que o paciente iniciou o pagamento
      if (pedido?.id) {
        await supabase
          .from("pedidos")
          .update({ status: "aguardando_pagamento", status_pagamento: "pendente", updated_at: new Date().toISOString() })
          .eq("id", pedido.id)
          .in("status", ["novo", "em_analise"]);
      }

      payload = { metodo, invoice_url: charge.invoiceUrl ?? null };

      if (metodo === "pix") {
        const pixRes = await fetch(`${baseUrl}/payments/${chargeId}/pixQrCode`, { headers });
        const pix = await safeJson(pixRes);
        if (!pixRes.ok || !pix.payload) {
          const raw = extractGatewayMessage(pix) || "falha ao gerar QR Code PIX";
          const cls = classificarErro(raw);
          return respondError(cls.campo, cls.mensagem, `PIX: ${raw}`);
        }
        payload.pix = { qr_code_base64: pix.encodedImage ?? "", pix_code: pix.payload };
      } else if (metodo === "boleto") {
        const idRes = await fetch(`${baseUrl}/payments/${chargeId}/identificationField`, { headers });
        const id = await safeJson(idRes);
        payload.boleto = {
          linha_digitavel: id.identificationField ?? "",
          codigo_barras: id.barCode ?? "",
          pdf_url: charge.bankSlipUrl ?? null,
        };
      }
    }

    // ── MERCADO PAGO (só PIX) ──
    else if (gateway === "mercadopago") {
      const token = cfg["MERCADOPAGO_ACCESS_TOKEN"];
      if (!token) return respondError("config", "O sistema de pagamentos ainda não está configurado. Entre em contato com a recepção.", "MERCADOPAGO_ACCESS_TOKEN ausente");

      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": protocolo },
        body: JSON.stringify({
          transaction_amount: valor, description: descricao, payment_method_id: "pix",
          payer: { email: pacienteEmail }, external_reference: protocolo,
        }),
      });
      const mp = await safeJson(mpRes);
      const td = mp.point_of_interaction?.transaction_data;
      if (!mpRes.ok || !td) {
        const raw = extractGatewayMessage(mp) || `status ${mpRes.status}`;
        const cls = classificarErro(raw);
        return respondError(cls.campo, cls.mensagem, raw);
      }
      payload = { metodo: "pix", invoice_url: null, pix: { qr_code_base64: td?.qr_code_base64 ?? "", pix_code: td?.qr_code ?? "" } };
    }

    // ── PAGHIPER (só PIX) ──
    else if (gateway === "paghiper") {
      const apiKey = cfg["PAGHIPER_API_KEY"];
      const token = cfg["PAGHIPER_TOKEN"];
      if (!apiKey || !token) return respondError("config", "O sistema de pagamentos ainda não está configurado. Entre em contato com a recepção.", "PagHiper ausente");

      const phRes = await fetch("https://pix.paghiper.com/invoice/create/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey, order_id: protocolo,
          payer_name: pedido?.paciente_nome,
          payer_cpf: onlyDigits(pedido?.paciente_cpf),
          payer_email: pacienteEmail,
          notification_url: "", days_due_date: 1,
          items: [{ description: descricao, quantity: 1, item_id: "1", price_cents: valor_centavos }],
        }),
      });
      const ph = await safeJson(phRes);
      const inv = ph.pix_create_request;
      if (!phRes.ok || !inv) {
        const raw = extractGatewayMessage(ph) || `status ${phRes.status}`;
        const cls = classificarErro(raw);
        return respondError(cls.campo, cls.mensagem, raw);
      }
      payload = { metodo: "pix", invoice_url: null, pix: { qr_code_base64: inv?.qrcode_image_url ?? "", pix_code: inv?.qr_code ?? "" } };
    }

    else {
      return respondError("config", "O sistema de pagamentos ainda não está configurado. Entre em contato com a recepção.", `gateway desconhecido: ${gateway}`);
    }

    // Compat: mantém campos legados na raiz
    if (payload.pix) {
      payload.qr_code_base64 = payload.pix.qr_code_base64;
      payload.pix_code = payload.pix.pix_code;
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("sancet-criar-pagamento error:", err);
    return new Response(
      JSON.stringify({
        error: "Não conseguimos gerar o pagamento agora. Tente novamente em instantes ou entre em contato com a recepção.",
        campo: "gateway",
        detalhe: err?.message ?? "erro interno",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
