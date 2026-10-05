import { supabase } from "@/integrations/supabase/client";
import { normalizeExameNome } from "@/lib/normalizeExame";

export type JejumPedido = {
  /** Maior jejum (horas) entre os exames do pedido — é o que vale para todos. */
  horas: number;
  /** Exames que exigem esse maior jejum. */
  exigidoPor: string[];
  /** Exames sem preparo cadastrado. */
  semPreparo: string[];
  /** Orientações repetidas em 2+ exames (aparecem uma vez só, como no e-mail). */
  gerais: string[];
  /** Orientações próprias de cada exame. */
  especificos: { nome: string; linhas: string[] }[];
  /** Exames sem outras orientações além do jejum. */
  semExtra: string[];
};

/**
 * Calcula o jejum do pedido com a MESMA regra do e-mail de preparo
 * (enviar-email-pedido): casa pelo código Shift -> nome do catálogo convênio,
 * depois pelo nome do item; vale o maior jejum.
 */
export async function calcularJejumPedido(itens: any[]): Promise<JejumPedido> {
  const exames = (itens ?? []).filter((it) => (it?.tipo ?? "exame") !== "vacina" && it?.nome);
  const codigoDe = (it: any) => {
    const n = parseInt(String(it?.codigoShift ?? it?.codigo_shift ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  };

  const nomePorCodigo: Record<string, string> = {};
  const codigos = [...new Set(exames.map(codigoDe).filter((n): n is number => n !== null))];
  if (codigos.length) {
    const { data } = await (supabase as any)
      .from("exames_convenio")
      .select("codigo_shift, nome_norm")
      .in("codigo_shift", codigos);
    (data ?? []).forEach((r: any) => (nomePorCodigo[String(r.codigo_shift)] = r.nome_norm));
  }

  const candidatos = (it: any) => {
    const c = codigoDe(it);
    return [c !== null ? nomePorCodigo[String(c)] : "", normalizeExameNome(it.nome)].filter(Boolean);
  };
  const chaves = [...new Set(exames.flatMap(candidatos))];
  const mapa: Record<string, { horas: number; instrucoes: string[] | null }> = {};
  for (let i = 0; i < chaves.length; i += 15) {
    const { data } = await (supabase as any)
      .from("exame_preparo")
      .select("nome_norm, jejum_horas, instrucoes")
      .in("nome_norm", chaves.slice(i, i + 15));
    (data ?? []).forEach(
      (r: any) =>
        (mapa[r.nome_norm] = {
          horas: Number(r.jejum_horas ?? 0) || 0,
          instrucoes: Array.isArray(r.instrucoes) ? r.instrucoes : null,
        }),
    );
  }

  let horas = 0;
  const porExame = exames.map((it) => {
    const k = candidatos(it).find((c) => c in mapa);
    const h = k ? mapa[k].horas : null;
    if (h != null && h > horas) horas = h;
    const instrucoes = k
      ? mapa[k].instrucoes ?? []
      : ["Sem preparo específico. Em caso de dúvida, confirme na recepção."];
    return { nome: it.nome as string, horas: h, instrucoes };
  });

  // Orientações: mesma regra do e-mail (sem frases de jejum; repetidas em 2+
  // exames viram "gerais"; o resto fica por exame).
  const limpar = (ls: string[]) => [
    ...new Set(
      ls
        .map((l) => String(l).replace(/\s+/g, " ").trim())
        .filter((l) => l && !/jejum/i.test(l) && !/^sem preparo espec/i.test(l) && !/vide informa/i.test(l)),
    ),
  ];
  const linhasPorExame = porExame.map((e) => ({ nome: e.nome, linhas: limpar(e.instrucoes) }));
  const conta = new Map<string, number>();
  linhasPorExame.forEach((e) => e.linhas.forEach((l) => conta.set(l, (conta.get(l) ?? 0) + 1)));
  const gerais = [...conta.entries()].filter(([, n]) => n >= 2).map(([l]) => l);
  const geraisSet = new Set(gerais);
  const especificos = linhasPorExame
    .map((e) => ({ nome: e.nome, linhas: e.linhas.filter((l) => !geraisSet.has(l)) }))
    .filter((e) => e.linhas.length > 0);

  return {
    horas,
    exigidoPor: horas > 0 ? porExame.filter((e) => e.horas === horas).map((e) => e.nome) : [],
    semPreparo: porExame.filter((e) => e.horas == null).map((e) => e.nome),
    gerais,
    especificos,
    semExtra: linhasPorExame.filter((e) => !especificos.some((x) => x.nome === e.nome)).map((e) => e.nome),
  };
}
