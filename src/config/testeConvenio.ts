// Identificação da unidade Matriz no Shift.
// Usada quando "Mostrar apenas a unidade Matriz" está ligado em
// Configurações → Modo de atendimento (flag agora configurável pelo admin).
//
// Uma unidade é considerada Matriz se o `codigo_shift` for igual a
// MATRIZ_CODIGO_SHIFT OU se o `nome` contiver MATRIZ_NOME (case-insensitive).
// (Matriz Sancet — Mogi das Cruzes/SP — codigo_shift "1".)
export const MATRIZ_CODIGO_SHIFT = "1";
export const MATRIZ_NOME = "matriz";
