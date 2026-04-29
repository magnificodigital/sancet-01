import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ItemSacola = {
  codigoShift: string;
  tipo: "exame" | "vacina";
  nome: string;
  outrosNomes: string;
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
      total: () =>
        get().itens.reduce((acc, i) => acc + (i.precoCentavos ?? 0), 0),
      quantidade: () => get().itens.length,
    }),
    {
      name: "sancet-sacola",
    }
  )
);
