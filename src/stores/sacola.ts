import { create } from "zustand";
import { persist } from "zustand/middleware";
import { precoItemReais } from "@/lib/preco";

export type ItemSacola = {
  codigoShift: string;
  tipo: "exame" | "vacina";
  nome: string;
  outrosNomes: string;
  precoParticular: number | null;
  precoCentavos: number | null;
  prazoResultado: string | null;
  preparo: string | null;
  disponivelNaUnidade: boolean;
  disponivelEmCasa: boolean;
};

export type TipoCompra = "particular" | "convenio" | null;

export type ConvenioCtx = {
  convenio_id: string | null;
  convenio_nome: string | null;
  convenio_codigo_shift: string | null;
  plano_codigo: string | null;
  plano_descricao: string | null;
  numero_carteirinha: string | null;
};

type SacolaStore = {
  // contexto
  tipo: TipoCompra;
  convenio_id: string | null;
  convenio_nome: string | null;
  convenio_codigo_shift: string | null;
  plano_codigo: string | null;
  plano_descricao: string | null;
  numero_carteirinha: string | null;

  // itens
  itens: ItemSacola[];
  naoAdicionados: string[];

  // actions
  setTipo: (tipo: TipoCompra) => void;
  setConvenio: (dados: ConvenioCtx) => void;
  limparContexto: () => void;
  adicionar: (item: ItemSacola) => void;
  remover: (codigo: string) => void;
  limpar: () => void;
  setNaoAdicionados: (termos: string[]) => void;
  total: () => number;
  quantidade: () => number;
};

const CONVENIO_VAZIO: ConvenioCtx = {
  convenio_id: null,
  convenio_nome: null,
  convenio_codigo_shift: null,
  plano_codigo: null,
  plano_descricao: null,
  numero_carteirinha: null,
};

export const useSacola = create<SacolaStore>()(
  persist(
    (set, get) => ({
      tipo: null,
      ...CONVENIO_VAZIO,
      itens: [],
      naoAdicionados: [],

      setTipo: (tipo) => set({ tipo }),
      setConvenio: (dados) => set({ ...dados }),
      limparContexto: () =>
        set({ tipo: null, itens: [], ...CONVENIO_VAZIO }),

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
