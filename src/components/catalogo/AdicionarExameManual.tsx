import { useEffect, useState } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useSacola, ItemSacola } from "@/stores/sacola";
import { formatBRL } from "@/lib/preco";

type Props = {
  /** Texto acima da busca. */
  titulo?: string;
  /** Força o catálogo; por padrão segue o tipo da sacola (convênio = catálogo completo). */
  origem?: "loja" | "convenio";
};

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

/**
 * Busca e inclui exames na sacola manualmente. Usado sempre que a IA lê o
 * pedido médico, para o paciente que sabe qual é o exame não ficar sem saída
 * quando a leitura falha ou reconhece só parte do pedido.
 */
export const AdicionarExameManual = ({ titulo, origem }: Props) => {
  const { itens, tipo, adicionar } = useSacola();
  const catalogo = origem ?? (tipo === "convenio" ? "convenio" : "loja");
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ItemSacola[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      if (catalogo === "convenio") {
        const { data } = await (supabase as any)
          .from("exames_convenio")
          .select("codigo_shift, nome")
          .eq("ativo", true)
          .ilike("nome_norm", `%${semAcento(termo)}%`)
          .order("nome")
          .limit(10);
        setResultados(
          ((data ?? []) as any[]).map((e) => ({
            codigoShift: String(e.codigo_shift),
            tipo: "exame",
            nome: e.nome,
            outrosNomes: "",
            precoParticular: null,
            precoCentavos: null,
            prazoResultado: null,
            preparo: null,
            disponivelNaUnidade: true,
            disponivelEmCasa: false,
          })),
        );
      } else {
        const { data } = await supabase
          .from("exames_cache")
          .select("codigo_shift, nome, outros_nomes, preco_particular, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa")
          .eq("ativo", true)
          .ilike("nome", `%${termo}%`)
          .order("nome")
          .limit(10);
        setResultados(
          ((data ?? []) as any[]).map((e) => ({
            codigoShift: String(e.codigo_shift),
            tipo: "exame",
            nome: e.nome,
            outrosNomes: (e.outros_nomes ?? []).join(", "),
            precoParticular: e.preco_particular ?? null,
            precoCentavos: null,
            prazoResultado: e.prazo_resultado ?? null,
            preparo: e.preparo ?? null,
            disponivelNaUnidade: e.disponivel_na_unidade ?? true,
            disponivelEmCasa: e.disponivel_em_casa ?? false,
          })),
        );
      }
      setBuscando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busca, catalogo]);

  const naSacola = (codigo: string) => itens.some((i) => String(i.codigoShift) === String(codigo));

  const incluir = (it: ItemSacola) => {
    if (naSacola(it.codigoShift)) return;
    adicionar(it);
    toast.success(`${it.nome} adicionado.`);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-secondary">
        {titulo ?? "Sabe qual é o exame? Busque e inclua aqui:"}
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite o nome do exame (ex.: hemograma, TSH, glicose)"
          className="bg-white pl-9"
        />
        {buscando && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {busca.trim().length >= 2 && !buscando && resultados.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum exame encontrado com esse nome. Tente outro termo — ou siga assim
          mesmo: nossa equipe confere o seu pedido médico.
        </p>
      )}
      {resultados.length > 0 && (
        <ul className="max-h-60 divide-y overflow-y-auto rounded-md border bg-white">
          {resultados.map((r) => {
            const ja = naSacola(r.codigoShift);
            return (
              <li key={r.codigoShift}>
                <button
                  type="button"
                  onClick={() => incluir(r)}
                  disabled={ja}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="min-w-0 flex-1">{r.nome}</span>
                  {catalogo === "loja" && r.precoParticular != null && !ja && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBRL(r.precoParticular)}
                    </span>
                  )}
                  {ja ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-green-700">
                      <Check className="h-3.5 w-3.5" /> Incluído
                    </span>
                  ) : (
                    <Plus className="h-4 w-4 shrink-0 text-brand" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
