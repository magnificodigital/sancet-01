import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // 1. Ler configurações do Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: configRows } = await supabase
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", ["OPENROUTER_API_KEY", "OPENROUTER_MODELO"]);

    const cfg: Record<string, string> = {};
    (configRows ?? []).forEach((r: any) => { cfg[r.chave] = r.valor; });

    const apiKey = cfg["OPENROUTER_API_KEY"];
    const modelo = cfg["OPENROUTER_MODELO"] || "google/gemini-2.5-flash-preview:free";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY não configurada no painel admin." }),
        { status: 400, headers: cors }
      );
    }

    // 2. Ler JSON
    const { fileBase64, mimeType: mimeTypeReq, catalogo } = await req.json();

    if (!fileBase64 || !catalogo) {
      return new Response(
        JSON.stringify({ error: "Arquivo ou catálogo ausente." }),
        { status: 400, headers: cors }
      );
    }

    const base64 = fileBase64;
    const mimeType = mimeTypeReq || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // 3. Montar catálogo enxuto
    const catalogoTexto = catalogo
      .map((c: any) => {
        const outros = (c.outros_nomes ?? []).join(", ");
        return `${c.codigo_shift} | ${c.nome}${outros ? ` | ${outros}` : ""}`;
      })
      .join("\n");

    // 5. Prompt para o modelo
    const systemPrompt = `Você é um especialista em pedidos médicos brasileiros. Analise a imagem ou PDF fornecido — pode ser um pedido escrito à mão com letra de médico, impresso ou digital.

Sua tarefa:
1. Identifique TODOS os exames laboratoriais, procedimentos e vacinas solicitados no documento, mesmo com letra difícil.
2. Compare cada exame identificado com o catálogo abaixo (formato: codigo_shift | nome | outros_nomes).
3. Use correspondência inteligente: "hemograma" → "Hemograma Completo", "TSH" → "TSH Ultrassensível", "glicose" → "Glicemia em Jejum", etc.

CATÁLOGO DISPONÍVEL:
${catalogoTexto}

Responda SOMENTE com um JSON válido, sem markdown, sem explicações:
{
  "encontrados": ["codigo_shift_1", "codigo_shift_2"],
  "nao_encontrados": ["Nome exato como aparece no pedido para exames não encontrados"]
}`;

    // 6. Chamar OpenRouter
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sancet.com.br",
        "X-Title": "Sancet Leitor de Receitas",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: systemPrompt,
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      throw new Error(`OpenRouter error ${orRes.status}: ${errText}`);
    }

    const orData = await orRes.json();
    const content = orData.choices?.[0]?.message?.content ?? "";

    // 7. Extrair JSON da resposta (remove possível markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta da IA não contém JSON válido.");

    const resultado = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(resultado), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("sancet-ler-receita error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Erro interno" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
