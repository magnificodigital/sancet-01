// Flags temporárias — fase de TESTE do fluxo de Convênio (ago/2026).
// Objetivo: enquanto validamos o convênio, simplificar o fluxo e restringir
// o atendimento à unidade Matriz. Para reverter ao comportamento normal,
// basta trocar a flag para `false` (ou apagar este arquivo e seus usos).

/** Esconde a opção "Particular" na tela de escolha de tipo (/exames). */
export const OCULTAR_PARTICULAR = true;

/** Esconde a opção "Sancet em Casa" (coleta em domicílio) no checkout. */
export const OCULTAR_SANCET_CASA = true;

/** Convênio pula o catálogo de exames e vai direto ao envio do pedido. */
export const CONVENIO_PULAR_CATALOGO = true;

/** Mostra apenas a unidade Matriz na seleção de unidade. */
export const SOMENTE_MATRIZ = true;

/**
 * Identificação da unidade Matriz no Shift.
 * Uma unidade é considerada Matriz se o `codigo_shift` for igual a
 * MATRIZ_CODIGO_SHIFT OU se o `nome` contiver MATRIZ_NOME (case-insensitive).
 * (Matriz Sancet — Mogi das Cruzes/SP — codigo_shift "1".)
 */
export const MATRIZ_CODIGO_SHIFT = "1";
export const MATRIZ_NOME = "matriz";
