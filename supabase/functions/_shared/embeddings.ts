// Índice de significado (embeddings) para a base de conhecimento.
// Só funciona com a chave da OpenAI (Super Admin > Integrações); sem ela, a
// busca segue apenas por palavras.
import { segredo } from "./integracoes.ts";

export async function gerarEmbeddings(textos: string[]): Promise<number[][] | null> {
  const chave = await segredo("OPENAI_API_KEY");
  if (!chave || !textos.length) return null;
  const saida: number[][] = [];
  for (let i = 0; i < textos.length; i += 96) {
    const r = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: textos.slice(i, i + 96).map((t) => t.slice(0, 8000)) }),
    });
    if (!r.ok) {
      console.error("embeddings:", r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const d = await r.json();
    saida.push(...(d.data ?? []).sort((a: any, b: any) => a.index - b.index).map((x: any) => x.embedding));
  }
  return saida;
}

export const vetorTexto = (v: number[]) => `[${v.join(",")}]`;
