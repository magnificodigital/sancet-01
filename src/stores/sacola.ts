import { create } from "zustand";
import { persist } from "zustand/middleware";
import { precoItemReais } from "@/lib/preco";

export type ItemSacola = {
  codigoShift: string;
  tipo: "exame" | "vacina";
  nome: string;
  outrosNomes: string;
  /** Em REAIS — usado por exames (exames_cache.preco_particular). */
  precoParticular: number | null;
  /** Em CENTAVOS — usado por vacinas (vacinas_cache.preco_centavos). */
  precoCentavos: number | null;
  prazoResultado: string | null;
  preparo: string | null;
  disponivelNaUnidade: boolean;
  disponivelEmCasa: boolean;
};

type SacolaStore = {
  itens: ItemSacola[];
  naoAdicionados: string[];
  adicionar: (item: ItemSacola) => void;
  remover: (codigo: string) => void;
  limpar: () => void;
  setNaoAdicionados: (termos: string[]) => void;
  /** Retorna o total em CENTAVOS (para gravar em pedidos.valor_total_centavos). */
  total: () => number;
  quantidade: () => number;
};

export const useSacola = create<SacolaStore>()(
  persist(
    (set, get) => ({
      itens: [],
      naoAdicionados: [],
      adicionar: (item) =>
        set((state) => {
          if (state.itens.some((i) => i.codigoShift === item.codigoShift)) {
            return state;
          }
          return { itens: [...state.itens, item] };
        }),
      remover: (codigo) =>
        set((state) => ({
          itens: state.itens.filter((i) => i.codigoShift !== codigo),
        })),
      limpar: () => set({ itens: [], naoAdicionados: [] }),
      setNaoAdicionados: (termos) => set({ naoAdicionados: termos }),
      total: () => {
        const reais = get().itens.reduce(
          (acc, i) => acc + (precoItemReais(i) ?? 0),
          0,
        );
        return Math.round(reais * 100);
      },
      quantidade: () => get().itens.length,
    }),
    {
      name: "sancet-sacola",
    },
  ),
);
