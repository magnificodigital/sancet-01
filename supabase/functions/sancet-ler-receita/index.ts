const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    const modelo = Deno.env.get("OPENROUTER_MODELO") || "google/gemini-2.5-flash-preview:free";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY não configurada nos secrets da edge function." }),
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
    const isPdf = mimeType.includes("pdf");

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
    // PDF e imagem usam formatos de conteúdo DIFERENTES no OpenRouter:
    //  - imagem  → { type: "image_url" }
    //  - PDF     → { type: "file", file: { filename, file_data } } + plugin file-parser
    // O engine "native" entrega o PDF direto ao Gemini, que o lê com a mesma
    // capacidade de visão das imagens (funciona até com PDF escaneado/manuscrito).
    const conteudoArquivo = isPdf
      ? {
          type: "file",
          file: { filename: "pedido.pdf", file_data: dataUrl },
        }
      : {
          type: "image_url",
          image_url: { url: dataUrl },
        };

    const requestBody: Record<string, unknown> = {
      model: modelo,
      messages: [
        {
          role: "user",
          content: [
            conteudoArquivo,
            {
              type: "text",
              text: systemPrompt,
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    };

    if (isPdf) {
      requestBody.plugins = [
        { id: "file-parser", pdf: { engine: "native" } },
      ];
    }

    const chamarOpenRouter = async (body: Record<string, unknown>) => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sancet.com.br",
          "X-Title": "Sancet Leitor de Receitas",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter error ${res.status}: ${errText}`);
      }
      const json = await res.json();
      return (json.choices?.[0]?.message?.content ?? "") as string;
    };

    let content = "";
    try {
      content = await chamarOpenRouter(requestBody);
    } catch (primeiroErro) {
      // Fallback só para PDF: se o engine "native" não for suportado pelo
      // modelo, tenta de novo extraindo o texto do PDF (engine "pdf-text",
      // grátis). Cobre PDFs digitais; escaneados dependem do engine nativo.
      if (!isPdf) throw primeiroErro;
      console.warn("PDF native falhou, tentando pdf-text:", (primeiroErro as Error).message);
      content = await chamarOpenRouter({
        ...requestBody,
        plugins: [{ id: "file-parser", pdf: { engine: "pdf-text" } }],
      });
    }

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
