// Catálogos que a IA consulta — as MESMAS fontes e regras das telas do site:
// - Particular: exames_cache (preço em reais) + vacinas_cache (preço em centavos).
// - Convênio: exames_convenio completo, com os nomes/siglas do mesmo código no
//   catálogo particular (igual à tela do convênio).
// - Convênios aceitos (convenios_cache) e seus planos (convenios_planos).
// Busca sem acento, por palavras em qualquer ordem, com os apelidos do site
// (TGO, TSH, HbA1c...). Carregado uma vez e guardado por alguns minutos.

const TTL_MS = 5 * 60_000;

const semAcento = (s: string) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const limpo = (s: string) => semAcento(s).replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// Mesma lista de siglas/apelidos da busca do site (ListaExames).
const APELIDOS: [RegExp, string][] = [
  [/TRANSAMINASE OXALACETICA|ASPARTATO AMINOTRANSFERASE/, "tgo ast"],
  [/TRANSAMINASE PIRUVICA|ALANINA AMINOTRANSFERASE/, "tgp alt"],
  [/GAMA GLUTAMIL/, "ggt gama gt"],
  [/HEMOGLOBINA GLICOSILADA|HEMOGLOBINA GLICADA/, "hba1c a1c glicada"],
  [/TIREOESTIMULANTE|^TSH/, "tsh tireoide"],
  [/TIROXINA/, "t4 tireoide"],
  [/TRIIODOTIRONINA/, "t3 tireoide"],
  [/LUTEINIZANTE|LUTEOTROPINA/, "lh"],
  [/FOLICULO ESTIMULANTE/, "fsh"],
  [/ANTIGENO PROSTATICO|^PSA/, "psa prostata"],
  [/HEMOSSEDIMENTACAO/, "vhs"],
  [/PROTEINA C REATIVA/, "pcr"],
  [/URINA TIPO|SUMARIO DE URINA|ELEMENTOS ANORMAIS/, "eas urina tipo 1"],
  [/HDL/, "hdl colesterol bom"],
  [/LDL/, "ldl colesterol ruim"],
  [/ACIDO URICO|URICEMIA/, "acido urico"],
  [/COLESTEROLEMIA|LIPIDOGRAMA/, "colesterol"],
  [/GLICEMIA|GLICOSE/, "glicose glicemia acucar"],
  [/VITAMINA D|25-HIDROXI|D25/, "vitamina d"],
  [/GONADOTROFINA CORIONICA|HCG/, "beta hcg gravidez"],
];
const apelidosDe = (nome: string) => {
  const n = semAcento(nome);
  return APELIDOS.filter(([re]) => re.test(n)).map(([, a]) => a).join(" ");
};

// Palavras que não ajudam a achar nada.
const VAZIAS = new Set(["DE", "DA", "DO", "DAS", "DOS", "E", "O", "A", "OS", "AS", "EM", "NO", "NA", "PARA", "EXAME", "EXAMES", "MEU", "MINHA", "QUERO", "FAZER", "PRECO", "VALOR", "QUANTO", "CUSTA"]);

export type ItemBusca = { chave: string; nome: string; texto: string; palavras: string[]; junto: string };

const indexar = (chave: string, nome: string, extras: string[]): ItemBusca => {
  const texto = limpo([nome, ...extras].join(" "));
  return { chave, nome, texto, palavras: texto.split(" "), junto: texto.replace(/ /g, "") };
};

/**
 * Cada palavra da busca precisa aparecer (em qualquer ordem): dentro de uma
 * palavra, junta ("SULAMERICA" = "SUL AMERICA") ou com o mesmo começo
 * ("EMPRESARIAL" ≈ "EMPRESA"). Sem resultado com todas, devolve os que batem
 * com a maioria (marcados como parecidos).
 */
export function buscar<T extends ItemBusca>(lista: T[], termo: string, limite = 20): { itens: T[]; total: number; parecidos: boolean } {
  const alvo = limpo(termo);
  if (!alvo) return { itens: lista.slice(0, limite), total: lista.length, parecidos: false };
  let ps = alvo.split(" ").filter((p) => p.length >= 2 && !VAZIAS.has(p));
  if (!ps.length) ps = alvo.split(" ");
  const casa = (it: ItemBusca, p: string) =>
    it.texto.includes(p) || it.junto.includes(p) ||
    (p.length >= 5 && it.palavras.some((w) => w.length >= 5 && (p.startsWith(w) || w.startsWith(p))));
  const nomeL = (it: ItemBusca) => limpo(it.nome);
  const pontos = lista.map((it) => {
    const n = ps.filter((p) => casa(it, p)).length;
    const nl = nomeL(it);
    const rank = nl === alvo ? 0 : nl.startsWith(alvo) ? 1 : nl.startsWith(ps[0]) ? 2 : 3;
    return { it, n, rank, tam: nl.length };
  });
  const ord = (a: any, b: any) => a.rank - b.rank || a.tam - b.tam || a.it.nome.localeCompare(b.it.nome);
  const todos = pontos.filter((p) => p.n === ps.length).sort(ord);
  if (todos.length) return { itens: todos.slice(0, limite).map((p) => p.it), total: todos.length, parecidos: false };
  const minimo = Math.max(1, Math.ceil(ps.length / 2));
  const parcial = pontos.filter((p) => p.n >= minimo).sort((a, b) => b.n - a.n || ord(a, b));
  return { itens: parcial.slice(0, Math.min(limite, 8)).map((p) => p.it), total: parcial.length, parecidos: parcial.length > 0 };
}

async function tudo(consulta: (de: number, ate: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const out: any[] = [];
  for (let de = 0; de < 20000; de += 1000) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export type ExameParticular = ItemBusca & { codigo_shift: string; tipo: "exame" | "vacina"; preco: number | null; prazo: string | null; disponivelEmCasa: boolean; disponivelNaUnidade: boolean; outros: string[]; preparo: string | null };
export type ExameConvenio = ItemBusca & { codigo_shift: string };
export type Convenio = ItemBusca & { id: string; codigo_shift: string | null };

let cache: { em: number; particular: ExameParticular[]; convenio: ExameConvenio[]; convenios: Convenio[] } | null = null;

export async function catalogos(admin: any) {
  if (cache && Date.now() - cache.em < TTL_MS) return cache;
  const [exs, vacs, conv, convs] = await Promise.all([
    tudo((de, ate) => admin.from("exames_cache").select("codigo_shift, nome, outros_nomes, preco_particular, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa, ativo").range(de, ate)),
    tudo((de, ate) => admin.from("vacinas_cache").select("codigo_shift, nome, outros_nomes, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa").eq("ativo", true).range(de, ate)),
    tudo((de, ate) => admin.from("exames_convenio").select("codigo_shift, nome").eq("ativo", true).order("nome").range(de, ate)),
    tudo((de, ate) => admin.from("convenios_cache").select("id, nome, codigo_shift").eq("ativo", true).order("nome").range(de, ate)),
  ]);
  // Nomes/siglas do mesmo código no catálogo particular (inclui inativos: só para a busca).
  const alias = new Map<string, string[]>();
  for (const e of exs) alias.set(String(e.codigo_shift), [e.nome, ...((e.outros_nomes as string[]) ?? [])]);
  const particular: ExameParticular[] = [
    ...exs.filter((e) => e.ativo).map((e) => ({
      ...indexar(`particular:${e.codigo_shift}`, e.nome, [...(e.outros_nomes ?? []), apelidosDe(e.nome)]),
      codigo_shift: String(e.codigo_shift), tipo: "exame" as const,
      preco: e.preco_particular != null ? Number(e.preco_particular) : null,
      prazo: e.prazo_resultado ?? null, preparo: e.preparo ?? null, outros: e.outros_nomes ?? [],
      disponivelEmCasa: e.disponivel_em_casa ?? false, disponivelNaUnidade: e.disponivel_na_unidade ?? true,
    })),
    ...vacs.map((v) => ({
      ...indexar(`vacina:${v.codigo_shift}`, v.nome, [...(v.outros_nomes ?? []), "vacina"]),
      codigo_shift: String(v.codigo_shift), tipo: "vacina" as const,
      preco: v.preco_centavos != null ? Number(v.preco_centavos) / 100 : null,
      prazo: v.prazo_resultado ?? null, preparo: v.preparo ?? null, outros: v.outros_nomes ?? [],
      disponivelEmCasa: v.disponivel_em_casa ?? false, disponivelNaUnidade: v.disponivel_na_unidade ?? true,
    })),
  ];
  const convenio: ExameConvenio[] = conv.map((e) => {
    const extras = alias.get(String(e.codigo_shift)) ?? [];
    return { ...indexar(`convenio:${e.codigo_shift}`, e.nome, [...extras, apelidosDe(e.nome), ...extras.map(apelidosDe)]), codigo_shift: String(e.codigo_shift) };
  });
  const convenios: Convenio[] = convs.map((c) => ({ ...indexar(c.id, c.nome, []), id: c.id, codigo_shift: c.codigo_shift ?? null }));
  cache = { em: Date.now(), particular, convenio, convenios };
  return cache;
}

/** Planos de um convênio (todos; o maior tem ~940). */
export async function planosDe(admin: any, convenioId: string) {
  const ps = await tudo((de, ate) => admin.from("convenios_planos").select("codigo_item, descricao").eq("convenio_id", convenioId).eq("ativo", true).order("descricao").range(de, ate));
  return ps.map((p) => ({ ...indexar(String(p.codigo_item), p.descricao, []), codigo: String(p.codigo_item) }));
}
