import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, FlaskConical, Home, ShoppingBag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSacola } from "@/stores/sacola";
import { ItemCatalogo } from "./types";
import { ExameDrawer } from "./ExameDrawer";

type Props = {
  tipo: "exame" | "vacina";
  busca: string;
  emCasa: boolean;
  categoriasSelecionadas: string[];
};

const PAGE_SIZE = 20;

const MOCK_EXAMES: ItemCatalogo[] = [
  {
    codigo_shift: "MOCK-EX-001",
    nome: "Hemograma Completo",
    outros_nomes: ["Hemograma", "CBC", "Eritrograma"],
    preco_centavos: 4500,
    prazo_resultado: "1 dia útil",
    preparo: "Jejum não necessário.",
    disponivel_na_unidade: true,
    disponivel_em_casa: true,
    categoria: "Sangue e urina",
  },
  {
    codigo_shift: "MOCK-EX-002",
    nome: "Glicose em Jejum",
    outros_nomes: ["Glicemia", "Açúcar no sangue"],
    preco_centavos: 2500,
    prazo_resultado: "1 dia útil",
    preparo: "Jejum de 8 horas.",
    disponivel_na_unidade: true,
    disponivel_em_casa: false,
    categoria: "Sangue e urina",
  },
  {
    codigo_shift: "MOCK-EX-003",
    nome: "TSH - Hormônio Tireoestimulante",
    outros_nomes: ["TSH", "Tireoide", "Tireotrófico"],
    preco_centavos: 6800,
    prazo_resultado: "2 dias úteis",
    preparo: "Não há necessidade de jejum.",
    disponivel_na_unidade: true,
    disponivel_em_casa: true,
    categoria: "Hormônios",
  },
  {
    codigo_shift: "MOCK-EX-004",
    nome: "Colesterol Total e Frações",
    outros_nomes: ["Lipidograma", "Perfil lipídico"],
    preco_centavos: 5200,
    prazo_resultado: "1 dia útil",
    preparo: "Jejum de 12 horas.",
    disponivel_na_unidade: true,
    disponivel_em_casa: false,
    categoria: "Sangue e urina",
  },
];

const MOCK_VACINAS: ItemCatalogo[] = [
  {
    codigo_shift: "MOCK-VA-001",
    nome: "Vacina contra Gripe (Influenza)",
    outros_nomes: ["Influenza", "Flu"],
    preco_centavos: 12000,
    prazo_resultado: null,
    preparo: "Sem preparo específico.",
    disponivel_na_unidade: true,
    disponivel_em_casa: true,
    categoria: "Adolescentes e Adultos",
  },
  {
    codigo_shift: "MOCK-VA-002",
    nome: "Vacina HPV 9-valente",
    outros_nomes: ["HPV", "Papiloma vírus"],
    preco_centavos: 85000,
    prazo_resultado: null,
    preparo: "Sem preparo específico.",
    disponivel_na_unidade: true,
    disponivel_em_casa: false,
    categoria: "Adolescentes e Adultos",
  },
  {
    codigo_shift: "MOCK-VA-003",
    nome: "Vacina contra Hepatite B",
    outros_nomes: ["Hepatite B", "HBV"],
    preco_centavos: 14000,
    prazo_resultado: null,
    preparo: "Sem preparo específico.",
    disponivel_na_unidade: true,
    disponivel_em_casa: true,
    categoria: "Adolescentes e Adultos",
  },
  {
    codigo_shift: "MOCK-VA-004",
    nome: "Vacina Tríplice Viral (MMR)",
    outros_nomes: ["MMR", "Sarampo, Caxumba e Rubéola"],
    preco_centavos: 18000,
    prazo_resultado: null,
    preparo: "Sem preparo específico.",
    disponivel_na_unidade: true,
    disponivel_em_casa: false,
    categoria: "Crianças",
  },
];

export const ListaExames = ({ tipo, busca, emCasa, categoriasSelecionadas }: Props) => {
  const [pagina, setPagina] = useState(1);
  const [selecionado, setSelecionado] = useState<ItemCatalogo | null>(null);
  const { itens: itensSacola, adicionar, remover } = useSacola();

  const tabela = tipo === "exame" ? "exames_cache" : "vacinas_cache";

  const { data, isLoading } = useQuery({
    queryKey: [tabela],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabela)
        .select("codigo_shift, nome, outros_nomes, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa, categoria")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as ItemCatalogo[];
    },
  });

  const fonte: ItemCatalogo[] = useMemo(() => {
    if (isLoading) return [];
    if (!data || data.length === 0) {
      return tipo === "exame" ? MOCK_EXAMES : MOCK_VACINAS;
    }
    return data;
  }, [data, isLoading, tipo]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return fonte.filter((item) => {
      if (emCasa && !item.disponivel_em_casa) return false;
      if (categoriasSelecionadas.length > 0) {
        if (!item.categoria || !categoriasSelecionadas.includes(item.categoria)) return false;
      }
      if (termo) {
        const haystack = [
          item.nome,
          ...(item.outros_nomes ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(termo)) return false;
      }
      return true;
    });
  }, [fonte, busca, emCasa, categoriasSelecionadas]);

  const visiveis = filtrados.slice(0, pagina * PAGE_SIZE);
  const temMais = filtrados.length > visiveis.length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (filtrados.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-20">
        <FlaskConical className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-secondary">
          {tipo === "exame" ? "Nenhum exame encontrado" : "Nenhuma vacina encontrada"}
        </h3>
        <p className="text-sm text-muted-foreground">Tente outro termo de busca.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {visiveis.map((item) => {
          const jaAdicionado = itensSacola.some((i) => i.codigoShift === item.codigo_shift);
          const handleToggle = () => {
            if (jaAdicionado) {
              remover(item.codigo_shift);
            } else {
              adicionar({
                codigoShift: item.codigo_shift,
                tipo,
                nome: item.nome,
                outrosNomes: (item.outros_nomes ?? []).join(", "),
                precoCentavos: item.preco_centavos,
                prazoResultado: item.prazo_resultado,
                preparo: item.preparo,
                disponivelNaUnidade: item.disponivel_na_unidade,
                disponivelEmCasa: item.disponivel_em_casa,
              });
            }
          };

          return (
            <div
              key={item.codigo_shift}
              className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-secondary text-base mb-1">{item.nome}</h3>
                  {item.outros_nomes && item.outros_nomes.length > 0 && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      <span className="font-medium">Outros nomes:</span>{" "}
                      {item.outros_nomes.join(", ")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {item.disponivel_na_unidade && (
                      <Badge variant="secondary" className="gap-1.5 font-normal">
                        <Building2 className="h-3 w-3" /> Na unidade
                      </Badge>
                    )}
                    {item.disponivel_em_casa && (
                      <Badge variant="secondary" className="gap-1.5 font-normal">
                        <Home className="h-3 w-3" /> Em casa
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 md:flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setSelecionado(item)}
                    className="flex-1 md:flex-initial"
                  >
                    Ver detalhes
                  </Button>
                  <Button
                    onClick={handleToggle}
                    className={cn(
                      "flex-1 md:flex-initial",
                      jaAdicionado
                        ? "bg-background border border-primary text-primary hover:bg-primary/5"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                  >
                    {jaAdicionado ? (
                      <>
                        <Trash2 className="h-4 w-4" /> Remover
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" /> Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {temMais && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => setPagina((p) => p + 1)}>
            Ver mais
          </Button>
        </div>
      )}

      <ExameDrawer
        item={selecionado}
        tipo={tipo}
        onClose={() => setSelecionado(null)}
      />
    </>
  );
};
