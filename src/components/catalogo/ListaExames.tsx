import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, FlaskConical, Home, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSacola } from "@/stores/sacola";
import { formatBRL, precoItemReais } from "@/lib/preco";
import { ItemCatalogo } from "./types";
import { ExameDrawer } from "./ExameDrawer";

type Props = {
  tipo: "exame" | "vacina";
  busca: string;
  emCasa: boolean;
  categoriasSelecionadas: string[];
  /** Padrão true. Em fluxo convênio, passar false para esconder preço e mostrar badge de cobertura. */
  mostrarPreco?: boolean;
  /** "loja" (exames_cache, padrão) ou "convenio" (catálogo completo em exames_convenio). */
  origem?: "loja" | "convenio";
};

const PAGE_SIZE = 20;

// O Supabase devolve no máximo 1.000 linhas por consulta. O catálogo convênio tem
// mais que isso: sem paginar, a lista parava perto da letra "T" (sumiam UREIA,
// TRANSAMINASES, VITAMINAS...). Busca tudo em lotes.
async function buscarTudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: any }>) {
  const todos: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw error;
    todos.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return todos;
}

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Siglas/apelidos comuns — só entram na busca (não aparecem no card).
const APELIDOS: [RegExp, string][] = [
  [/TRANSAMINASE OXALACETICA|ASPARTATO AMINOTRANSFERASE/, "tgo ast"],
  [/TRANSAMINASE PIRUVICA|ALANINA AMINOTRANSFERASE/, "tgp alt"],
  [/GAMA GLUTAMIL/, "ggt gama gt"],
  [/HEMOGLOBINA GLICOSILADA|HEMOGLOBINA GLICADA/, "hba1c a1c glicada"],
  [/TIREOESTIMULANTE|^TSH/, "tsh tireoide"],
  [/TIROXINA/, "t4 tireoide"],
  [/TRIIODOTIRONINA/, "t3 tireoide"],
  [/LUTEINIZANTE|LUTEOTROPINA/, "lh"],
  [/FOLICULO ESTIMULANTE/, "fsh"],
  [/ANTIGENO PROSTATICO|^PSA/, "psa prostata"],
  [/HEMOSSEDIMENTACAO/, "vhs"],
  [/PROTEINA C REATIVA/, "pcr"],
  [/URINA TIPO|SUMARIO DE URINA|ELEMENTOS ANORMAIS/, "eas urina tipo 1"],
  [/HDL/, "hdl colesterol bom"],
  [/LDL/, "ldl colesterol ruim"],
  [/ACIDO URICO|URICEMIA/, "acido urico"],
  [/COLESTEROLEMIA|LIPIDOGRAMA/, "colesterol"],
  [/GLICEMIA|GLICOSE/, "glicose glicemia acucar"],
  [/VITAMINA D|25-HIDROXI|D25/, "vitamina d"],
];
const apelidosDe = (nome: string) => {
  const n = semAcento(nome).toUpperCase();
  return APELIDOS.filter(([re]) => re.test(n)).map(([, a]) => a).join(" ");
};

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

export const ListaExames = ({ tipo, busca, emCasa, categoriasSelecionadas, mostrarPreco = true, origem = "loja" }: Props) => {
  const [pagina, setPagina] = useState(1);
  const [selecionado, setSelecionado] = useState<ItemCatalogo | null>(null);
  const { itens: itensSacola, adicionar, remover } = useSacola();

  // Convênio (exame) usa o catálogo COMPLETO (exames_convenio); loja usa exames_cache.
  const ehConvenioFull = origem === "convenio" && tipo === "exame";
  const tabela = tipo === "exame" ? "exames_cache" : "vacinas_cache";

  const { data, isLoading } = useQuery({
    queryKey: [ehConvenioFull ? "exames_convenio" : tabela],
    queryFn: async () => {
      if (ehConvenioFull) {
        const data = await buscarTudo<any>((de, ate) =>
          (supabase as any)
            .from("exames_convenio")
            .select("codigo_shift, nome")
            .eq("ativo", true)
            .order("nome")
            .range(de, ate),
        );
        // Nome do MESMO exame (mesmo código Shift) no catálogo particular: lá ele
        // costuma trazer a sigla ("TRANSAMINASE OXALACETICA - TGO"). Só p/ busca.
        const loja = await buscarTudo<any>((de, ate) =>
          supabase.from("exames_cache").select("codigo_shift, nome, outros_nomes").range(de, ate),
        );
        const aliasPorCodigo = new Map<string, string[]>();
        for (const l of loja) {
          aliasPorCodigo.set(String(l.codigo_shift), [l.nome, ...((l.outros_nomes as string[]) ?? [])]);
        }
        return data.map((e) => ({
          codigo_shift: String(e.codigo_shift),
          nome: e.nome,
          outros_nomes: aliasPorCodigo.get(String(e.codigo_shift)) ?? null,
          preco_particular: null,
          preco_centavos: null,
          prazo_resultado: null,
          preparo: null,
          disponivel_na_unidade: true,
          disponivel_em_casa: false,
          categoria: null,
        })) as ItemCatalogo[];
      }
      const colunas =
        tipo === "exame"
          ? "codigo_shift, nome, outros_nomes, preco_particular, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa, categoria"
          : "codigo_shift, nome, outros_nomes, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa, categoria";
      const data = await buscarTudo<any>((de, ate) =>
        supabase.from(tabela).select(colunas).eq("ativo", true).order("nome").range(de, ate),
      );
      return data as unknown as ItemCatalogo[];
    },
  });

  const fonte: ItemCatalogo[] = useMemo(() => {
    if (isLoading) return [];
    if (!data || data.length === 0) {
      // Sem mock no convênio: catálogo real ou vazio.
      if (ehConvenioFull) return [];
      return tipo === "exame" ? MOCK_EXAMES : MOCK_VACINAS;
    }
    return data;
  }, [data, isLoading, tipo, ehConvenioFull]);

  const filtrados = useMemo(() => {
    // Busca sem acento: "hormonio" acha "HORMÔNIO", "ureia" acha "URÉIA".
    const termo = semAcento(busca.trim());
    return fonte.filter((item) => {
      // Convênio (catálogo completo) não tem dados de categoria/coleta em casa.
      if (!ehConvenioFull) {
        if (emCasa && !item.disponivel_em_casa) return false;
        if (categoriasSelecionadas.length > 0) {
          if (!item.categoria || !categoriasSelecionadas.includes(item.categoria)) return false;
        }
      }
      if (termo) {
        const haystack = semAcento(
          [item.nome, ...(item.outros_nomes ?? []), apelidosDe(item.nome)].join(" "),
        );
        if (!haystack.includes(termo)) return false;
      }
      return true;
    });
  }, [fonte, busca, emCasa, categoriasSelecionadas, ehConvenioFull]);

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
                precoParticular: tipo === "exame" ? item.preco_particular ?? null : null,
                precoCentavos: tipo === "vacina" ? item.preco_centavos : null,
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
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {item.disponivel_na_unidade && (
                      <Badge variant="secondary" className="gap-1.5 font-normal">
                        <Building2 className="h-3 w-3" /> Na unidade
                      </Badge>
                    )}
                    {item.disponivel_em_casa && (
                      <Badge className="gap-1.5 font-normal bg-green-100 text-green-800 hover:bg-green-100 border border-green-200">
                        <Home className="h-3 w-3" /> Coleta em casa disponível
                      </Badge>
                    )}

                    {mostrarPreco && tipo === "exame" && item.preco_particular != null && (
                      <span className="ml-auto text-sm font-bold text-brand">
                        {formatBRL(Number(item.preco_particular))}
                      </span>
                    )}
                    {mostrarPreco && tipo === "vacina" && item.preco_centavos != null && (
                      <span className="ml-auto text-sm font-bold text-brand">
                        {formatBRL(item.preco_centavos / 100)}
                      </span>
                    )}
                    {!mostrarPreco && (
                      <Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-100 gap-1.5 font-normal border border-green-200">
                        <ShieldCheck className="h-3 w-3" />
                        Coberto pelo convênio
                      </Badge>
                    )}
                  </div>
                  {!mostrarPreco && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Sujeito à autorização da operadora.
                    </p>
                  )}
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
