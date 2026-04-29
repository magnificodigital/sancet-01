export type ItemCatalogo = {
  codigo_shift: string;
  nome: string;
  outros_nomes: string[] | null;
  preco_centavos: number | null;
  prazo_resultado: string | null;
  preparo: string | null;
  disponivel_na_unidade: boolean;
  disponivel_em_casa: boolean;
  categoria: string | null;
};

export const formatarPreco = (centavos: number | null) => {
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
