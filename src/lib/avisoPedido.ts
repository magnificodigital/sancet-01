// Marca "pedido recém-finalizado" para a tela /pronto abrir o aviso de próximos
// passos. Fica no sessionStorage (e não só no state da navegação) para não se
// perder se a tela recarregar/remontar enquanto o login carrega. Só é apagado
// quando o paciente fecha o aviso.
const chave = (protocolo: string) => `sancet_aviso_pedido:${protocolo}`;

export function marcarAvisoPedido(protocolo: string) {
  try {
    sessionStorage.setItem(chave(protocolo), "1");
  } catch {
    /* sem storage: o state da navegação ainda cobre o caso normal */
  }
}

export function temAvisoPedido(protocolo?: string) {
  if (!protocolo) return false;
  try {
    return sessionStorage.getItem(chave(protocolo)) === "1";
  } catch {
    return false;
  }
}

export function limparAvisoPedido(protocolo?: string) {
  if (!protocolo) return;
  try {
    sessionStorage.removeItem(chave(protocolo));
  } catch {
    /* ignore */
  }
}
