export type ItemCatalogo = {
  codigo_shift: string;
  nome: string;
  outros_nomes: string[] | null;
  /** Reais (exames_cache.preco_particular). */
  preco_particular?: number | null;
  /** Centavos (vacinas_cache.preco_centavos). */
  preco_centavos: number | null;
  prazo_resultado: string | null;
  preparo: string | null;
  disponivel_na_unidade: boolean;
  disponivel_em_casa: boolean;
  categoria: string | null;
};

// Mantido por compat: aceita centavos e formata em BRL.
export const formatarPreco = (centavos: number | null | undefined) => {
  if (centavos == null) return null;
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export const CATEGORIAS_EXAMES = [
  "Sangue e urina",
  "Imagem",
  "Hormônios",
  "Genética",
  "Cardiologia",
  "Infectologia",
];

export const CATEGORIAS_VACINAS = [
  "Gestantes",
  "Bebês",
  "Crianças",
  "Adolescentes e Adultos",
  "Idosos",
  "Viajante",
];
