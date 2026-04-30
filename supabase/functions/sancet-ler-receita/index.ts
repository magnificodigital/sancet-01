import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const catalogoJson = formData.get("catalogo") as string | null;

    if (!file || !catalogoJson) {
      return new Response(
        JSON.stringify({ error: "Arquivo ou catálogo ausente" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    // base64 em chunks para evitar estouro de stack
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < fileBytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(fileBytes.subarray(i, i + chunk)) as unknown as number[],
      );
    }
    const base64 = btoa(binary);

    const isPdf = file.type === "application/pdf";
    const sourceBlock = isPdf
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf",
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.type || "image/jpeg",
            data: base64,
          },
        };

    const promptText =
      `Você é um assistente de laboratório. Analise este pedido médico e identifique os exames e vacinas solicitados.

Compare com este catálogo disponível (array JSON): ${catalogoJson}

Retorne APENAS um JSON válido com este formato:
{
  "encontrados": ["codigo_shift_1", "codigo_shift_2"],
  "nao_encontrados": ["nome do exame que não está no catálogo"]
}

Encontrados = exames do pedido que existem no catálogo (retorne o codigo_shift).
Não encontrados = exames do pedido que NÃO existem no catálogo (retorne o nome como aparece no pedido).
Não invente exames. Só retorne o JSON, sem explicações.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [sourceBlock, { type: "text", text: promptText }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Falha na leitura do pedido" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";

    // Extrai o primeiro bloco JSON da resposta (à prova de prefixos/markdown)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Resposta inválida da IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let resultado: { encontrados: string[]; nao_encontrados: string[] };
    try {
      resultado = JSON.parse(match[0]);
    } catch {
      return new Response(
        JSON.stringify({ error: "JSON inválido retornado pela IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sancet-ler-receita error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
