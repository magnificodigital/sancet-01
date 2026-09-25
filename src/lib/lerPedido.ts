import { supabase } from "@/integrations/supabase/client";
import type { ItemSacola } from "@/stores/sacola";

// Converte o arquivo em base64 sem o prefixo data: (formato que a IA espera).
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export type LeituraPedido = { itens: ItemSacola[]; naoEncontrados: string[] };

/**
 * Lê um pedido médico (imagem) com a IA e devolve os itens do catálogo
 * identificados + os nomes que não foram reconhecidos.
 * Mesma lógica do LeitorReceita da home, reaproveitável no fluxo de envio.
 */
// Catálogo de convênio COMPLETO (1.191+ exames), em lotes (limite de 1.000/consulta).
async function catalogoConvenio(): Promise<any[]> {
  const todos: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await (supabase as any)
      .from("exames_convenio")
      .select("codigo_shift, nome")
      .eq("ativo", true)
      .order("nome")
      .range(de, de + 999);
    if (error) throw error;
    todos.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return todos.map((e) => ({
    codigo_shift: String(e.codigo_shift),
    nome: e.nome,
    outros_nomes: [],
    preco_particular: null,
    preco_centavos: null,
    prazo_resultado: null,
    preparo: null,
    disponivel_na_unidade: true,
    disponivel_em_casa: false,
    tipo: "exame" as const,
  }));
}

/**
 * origem "convenio": compara com o catálogo de convênio completo — antes só
 * usava o particular (~470 exames) e a IA "não achava" exames de convênio.
 */
export async function lerPedidoIA(
  arquivo: File,
  origem: "loja" | "convenio" = "loja",
): Promise<LeituraPedido> {
  if (origem === "convenio") {
    return lerComCatalogo(arquivo, await catalogoConvenio());
  }
  const [exRes, vacRes] = await Promise.all([
    supabase
      .from("exames_cache")
      .select(
        "codigo_shift, nome, outros_nomes, preco_particular, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa",
      )
      .eq("ativo", true),
    supabase
      .from("vacinas_cache")
      .select(
        "codigo_shift, nome, outros_nomes, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa",
      )
      .eq("ativo", true),
  ]);
  if (exRes.error) throw exRes.error;
  if (vacRes.error) throw vacRes.error;

  const cat: any[] = [
    ...(exRes.data ?? []).map((e: any) => ({ ...e, tipo: "exame" as const })),
    ...(vacRes.data ?? []).map((v: any) => ({
      ...v,
      tipo: "vacina" as const,
      preco_particular: null,
    })),
  ];

  return lerComCatalogo(arquivo, cat);
}

async function lerComCatalogo(arquivo: File, cat: any[]): Promise<LeituraPedido> {
  const catalogoEnxuto = cat.map((c) => ({
    codigo_shift: c.codigo_shift,
    nome: c.nome,
    outros_nomes: c.outros_nomes ?? [],
  }));

  const fileBase64 = await toBase64(arquivo);
  const { data, error } = await supabase.functions.invoke("sancet-ler-receita", {
    body: {
      fileBase64,
      mimeType: arquivo.type || "image/jpeg",
      catalogo: catalogoEnxuto,
    },
  });
  if (error) throw error;
  if (!data || !Array.isArray(data.encontrados)) {
    throw new Error("Resposta inválida da IA");
  }

  const itens: ItemSacola[] = [];
  for (const codigo of data.encontrados as string[]) {
    const it = cat.find((c) => String(c.codigo_shift) === String(codigo));
    if (!it) continue;
    itens.push({
      codigoShift: it.codigo_shift,
      tipo: it.tipo,
      nome: it.nome,
      outrosNomes: (it.outros_nomes ?? []).join(", "),
      precoParticular: it.tipo === "exame" ? it.preco_particular ?? null : null,
      precoCentavos: it.tipo === "vacina" ? it.preco_centavos : null,
      prazoResultado: it.prazo_resultado,
      preparo: it.preparo,
      disponivelNaUnidade: it.disponivel_na_unidade,
      disponivelEmCasa: it.disponivel_em_casa,
    });
  }

  return { itens, naoEncontrados: (data.nao_encontrados ?? []) as string[] };
}
