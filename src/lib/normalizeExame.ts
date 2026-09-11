/**
 * Normaliza o nome do exame para casar com a chave `nome_norm` das tabelas
 * `exame_preparo` e `exames_convenio` (importadas das planilhas do Shift).
 * DEVE espelhar exatamente a normalização usada no import (Python):
 * remove prefixo [I], tira acentos, MAIÚSCULAS, colapsa espaços, apara pontuação.
 */
export function normalizeExameNome(nome: string | null | undefined): string {
  return (nome ?? "")
    .replace(/^\[I\]\s*/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.;,\s]+|[.;,\s]+$/g, "");
}
