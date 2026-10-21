// Base de conhecimento do Agente de IA: extrai o texto de arquivos (PDF, Word,
// TXT/MD/CSV, imagens), textos colados e páginas de site, divide em trechos e
// indexa para a IA consultar. Também faz a "busca de teste" do painel.
// Só quem tem a permissão "Agente de IA" (ver/editar).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";
import { modeloIA, segredo } from "../_shared/integracoes.ts";
import { gerarEmbeddings, vetorTexto } from "../_shared/embeddings.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_TEXTO = 400_000; // caracteres por material
const TAM_TRECHO = 1200;
const SOBREPOR = 200;

const limpar = (t: string) =>
  t.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();

/** Divide em trechos por parágrafo, com sobreposição para não cortar contexto. */
function dividir(texto: string): string[] {
  const pars = texto.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const trechos: string[] = [];
  let atual = "";
  for (const p of pars) {
    if ((atual + "\n\n" + p).length <= TAM_TRECHO) {
      atual = atual ? `${atual}\n\n${p}` : p;
      continue;
    }
    if (atual) trechos.push(atual);
    if (p.length <= TAM_TRECHO) {
      atual = (atual ? atual.slice(-SOBREPOR) + "\n\n" : "") + p;
      if (atual.length > TAM_TRECHO) atual = p;
    } else {
      // parágrafo enorme: fatia por frases/tamanho
      for (let i = 0; i < p.length; i += TAM_TRECHO - SOBREPOR) trechos.push(p.slice(i, i + TAM_TRECHO));
      atual = "";
    }
  }
  if (atual) trechos.push(atual);
  return trechos.filter((t) => t.replace(/\s/g, "").length >= 20);
}

function htmlParaTexto(html: string) {
  return limpar(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))),
  );
}

/** Word (.docx): o texto fica em word/document.xml dentro do zip. */
function docxParaTexto(bytes: Uint8Array) {
  const arqs = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  const xml = arqs["word/document.xml"] ? strFromU8(arqs["word/document.xml"]) : "";
  return limpar(
    xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<\/w:p>/g, "\n\n")
      .replace(/<w:br\/>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  );
}

/** Imagem ou PDF escaneado: a IA "lê" o arquivo e devolve o texto. */
async function lerComIA(bytes: Uint8Array, mime: string, nome: string) {
  const chave = await segredo("OPENROUTER_API_KEY");
  if (!chave) throw new Error("Sem chave da OpenRouter para ler imagens/PDF escaneado (Super Admin > Integrações).");
  let b64 = "";
  for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  b64 = btoa(b64);
  const conteudo =
    mime === "application/pdf"
      ? { type: "file", file: { filename: nome || "arquivo.pdf", file_data: `data:application/pdf;base64,${b64}` } }
      : { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } };
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", "X-Title": "Sancet Base de Conhecimento" },
    body: JSON.stringify({
      model: await modeloIA("receita", "google/gemini-2.5-flash"),
      temperature: 0,
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transcreva fielmente TODO o texto deste documento, em português, mantendo títulos, listas e tabelas (tabelas como linhas 'coluna: valor'). Não resuma, não comente, só o texto." },
            conteudo,
          ],
        },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Falha ao ler com IA (${r.status}).`);
  return limpar(String((await r.json()).choices?.[0]?.message?.content ?? ""));
}

/** Bloqueia endereços internos (SSRF) ao importar páginas. */
function urlPermitida(u: string) {
  try {
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol)) return false;
    const h = url.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === "[::1]") return false;
    return true;
  } catch {
    return false;
  }
}

async function extrair(admin: any, doc: any): Promise<string> {
  if (doc.tipo === "texto") return limpar(String(doc.texto_original ?? ""));
  if (doc.tipo === "url") {
    if (!urlPermitida(doc.url)) throw new Error("Endereço não permitido.");
    const r = await fetch(doc.url, { headers: { "User-Agent": "SancetBot/1.0 (base de conhecimento)" }, redirect: "follow" });
    if (!r.ok) throw new Error(`A página respondeu ${r.status}.`);
    const tipo = r.headers.get("content-type") ?? "";
    const corpo = (await r.text()).slice(0, 3_000_000);
    return tipo.includes("html") ? htmlParaTexto(corpo) : limpar(corpo);
  }
  // arquivo
  const { data: blob, error } = await admin.storage.from("ia-conhecimento").download(doc.arquivo_path);
  if (error || !blob) throw new Error("Arquivo não encontrado no armazenamento.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = String(doc.arquivo_mime ?? blob.type ?? "").split(";")[0];
  if (mime === "application/pdf") {
    let texto = "";
    try {
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      texto = limpar(Array.isArray(text) ? text.join("\n\n") : String(text));
    } catch {
      texto = "";
    }
    // PDF escaneado (imagem): pouco texto → lê com IA
    if (texto.replace(/\s/g, "").length < 200) texto = await lerComIA(bytes, mime, doc.arquivo_nome);
    return texto;
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return docxParaTexto(bytes);
  if (mime.startsWith("text/")) return limpar(new TextDecoder("utf-8").decode(bytes));
  if (mime.startsWith("image/")) return await lerComIA(bytes, mime, doc.arquivo_nome);
  throw new Error("Formato não suportado. Use PDF, Word (.docx), TXT, CSV ou imagem.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const usuario = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const body = await req.json().catch(() => ({}));
    const acao = String(body.acao ?? "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (acao === "buscar") {
      const { data: pode } = await usuario.rpc("tem_permissao", { _modulo: "agente", _acao: "ver" });
      if (pode !== true) return json({ error: "Sem permissão." }, 403);
      const pergunta = String(body.pergunta ?? "").slice(0, 500);
      const vq = await gerarEmbeddings([pergunta]).catch(() => null);
      const { data, error } = await usuario.rpc("ia_buscar_conhecimento", {
        _embedding: vq?.[0] ? vetorTexto(vq[0]) : null,
        _pergunta: pergunta,
        _unidade: body.unidade ?? null,
        _limite: Math.min(Math.max(Number(body.limite) || 5, 1), 10),
      });
      if (error) return json({ error: error.message }, 400);
      return json({ trechos: data ?? [] });
    }

    if (acao === "processar") {
      const { data: pode } = await usuario.rpc("tem_permissao", { _modulo: "agente", _acao: "editar" });
      if (pode !== true) return json({ error: "Sem permissão para editar o Agente de IA." }, 403);
      const id = String(body.documento_id ?? "");
      const { data: doc } = await admin.from("ia_documentos").select("*").eq("id", id).maybeSingle();
      if (!doc) return json({ error: "Material não encontrado." }, 404);
      await admin.from("ia_documentos").update({ status: "processando", erro: null }).eq("id", id);
      try {
        const texto = (await extrair(admin, doc)).slice(0, MAX_TEXTO);
        if (texto.replace(/\s/g, "").length < 20) throw new Error("Não encontrei texto neste material.");
        const trechos = dividir(texto);
        // Índice de significado (se houver chave da OpenAI); senão, só palavras.
        const vetores = await gerarEmbeddings(trechos.map((t) => `${doc.titulo}\n${t}`)).catch(() => null);
        await admin.from("ia_trechos").delete().eq("documento_id", id);
        for (let i = 0; i < trechos.length; i += 200) {
          const lote = trechos.slice(i, i + 200).map((t, j) => ({
            documento_id: id, ordem: i + j, texto: t,
            ...(vetores?.[i + j] ? { embedding: vetorTexto(vetores[i + j]) } : {}),
          }));
          const { error } = await admin.from("ia_trechos").insert(lote);
          if (error) throw new Error(error.message);
        }
        await admin.from("ia_documentos").update({ status: "pronto", erro: null, caracteres: texto.length, trechos: trechos.length }).eq("id", id);
        return json({ ok: true, caracteres: texto.length, trechos: trechos.length, semantico: !!vetores });
      } catch (e) {
        const msg = (e as Error).message?.slice(0, 300) || "Falha ao processar.";
        await admin.from("ia_documentos").update({ status: "erro", erro: msg }).eq("id", id);
        return json({ error: msg }, 422);
      }
    }

    // Situação da busca por significado (para o painel).
    if (acao === "status") {
      const { data: pode } = await usuario.rpc("tem_permissao", { _modulo: "agente", _acao: "ver" });
      if (pode !== true) return json({ error: "Sem permissão." }, 403);
      const [{ count: total }, { count: semVetor }] = await Promise.all([
        admin.from("ia_trechos").select("id", { count: "exact", head: true }),
        admin.from("ia_trechos").select("id", { count: "exact", head: true }).is("embedding", null),
      ]);
      return json({ semantico_disponivel: !!(await segredo("OPENAI_API_KEY")), trechos: total ?? 0, sem_indice: semVetor ?? 0 });
    }

    // Gera o índice de significado dos trechos que ainda não têm.
    if (acao === "indexar") {
      const { data: pode } = await usuario.rpc("tem_permissao", { _modulo: "agente", _acao: "editar" });
      if (pode !== true) return json({ error: "Sem permissão." }, 403);
      if (!(await segredo("OPENAI_API_KEY"))) return json({ error: "Cadastre a chave da OpenAI em Super Admin > Integrações." }, 400);
      const { data: pend } = await admin
        .from("ia_trechos")
        .select("id, texto, documento_id, ia_documentos(titulo)")
        .is("embedding", null)
        .limit(600);
      const lista = pend ?? [];
      const vetores = await gerarEmbeddings(lista.map((t: any) => `${t.ia_documentos?.titulo ?? ""}\n${t.texto}`));
      if (!vetores) return json({ error: "Falha ao gerar o índice (verifique a chave da OpenAI)." }, 502);
      for (let i = 0; i < lista.length; i++) {
        await admin.from("ia_trechos").update({ embedding: vetorTexto(vetores[i]) }).eq("id", lista[i].id);
      }
      const { count: restantes } = await admin.from("ia_trechos").select("id", { count: "exact", head: true }).is("embedding", null);
      return json({ ok: true, indexados: lista.length, restantes: restantes ?? 0 });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    console.error("conhecimento:", e);
    return json({ error: "Erro inesperado." }, 500);
  }
});
