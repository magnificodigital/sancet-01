/**
 * Helpers de formatação e leitura de preços.
 *
 * Convenção:
 * - `preco_particular` (exames_cache) é numeric em REAIS (ex: 72.00).
 * - `preco_centavos` (vacinas_cache) é integer em CENTAVOS (ex: 7200).
 *
 * Use `formatBRL` para formatar qualquer valor em reais.
 * Use `precoItemReais` para obter o valor em reais a partir de um item da sacola
 * (que pode ter `precoParticular` (exames) ou `precoCentavos` (vacinas)).
 */

export function formatBRL(valor: number | null | undefined): string {
  if (valor == null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function precoItemReais(item: {
  precoParticular?: number | null;
  precoCentavos?: number | null;
}): number | null {
  if (item.precoParticular != null) return Number(item.precoParticular);
  if (item.precoCentavos != null) return item.precoCentavos / 100;
  return null;
}
