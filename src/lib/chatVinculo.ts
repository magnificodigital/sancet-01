// Liga o pedido criado no site à conversa do chat que montou o carrinho.
const CHAVE = "sancet_chat_vinculo";

export type VinculoChat = {
  conversa_id: string;
  token?: string;
  teste?: string | null;
  unidade_codigo_shift?: string | null;
  unidade_nome?: string | null;
  em: number;
};

export const salvarVinculoChat = (v: Omit<VinculoChat, "em">) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...v, em: Date.now() }));
  } catch {
    /* sem storage */
  }
};

/** Vínculo válido por 24h. */
export const lerVinculoChat = (): VinculoChat | null => {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (v?.conversa_id && Date.now() - (v.em ?? 0) < 24 * 3600_000) return v;
  } catch {
    /* sem storage */
  }
  return null;
};

export const limparVinculoChat = () => {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* sem storage */
  }
};
