import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { precoItemReais } from "@/lib/preco";
import { formatarPreco, Pedido } from "./utils";

type Props = {
  pedido: Pedido;
  nomeStaff?: string | null;
  podeEditar: boolean;
  onSalvo?: () => void;
};

type Resultado = {
  codigoShift: string;
  nome: string;
  precoParticular: number | null;
  prazoResultado: string | null;
  disponivelNaUnidade: boolean;
  disponivelEmCasa: boolean;
};

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

const precoCentavosDoItem = (it: any): number | null => {
  const reais = precoItemReais({
    precoParticular: it?.precoParticular ?? null,
    precoCentavos: it?.precoCentavos ?? it?.preco_centavos ?? null,
  });
  return reais == null ? null : Math.round(reais * 100);
};

const novoItem = (r: Resultado) => ({
  codigoShift: r.codigoShift,
  tipo: "exame" as const,
  nome: r.nome,
  outrosNomes: "",
  precoParticular: r.precoParticular,
  precoCentavos: null,
  prazoResultado: r.prazoResultado,
  preparo: null,
  disponivelNaUnidade: r.disponivelNaUnidade,
  disponivelEmCasa: r.disponivelEmCasa,
});

/**
 * Lista de exames do pedido no painel do staff, com edição: remover itens,
 * buscar e incluir exames do catálogo (convênio: catálogo completo; particular:
 * catálogo com preço) e atalho para os exames lidos pela IA no pedido médico.
 */
export const EditorItensPedido = ({ pedido, nomeStaff, podeEditar, onSalvo }: Props) => {
  const ehConvenio = pedido.tipo_solicitacao === "convenio";
  const [itens, setItens] = useState<any[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setItens(Array.isArray(pedido.itens) ? (pedido.itens as any[]) : []);
    setTotal(pedido.valor_total_centavos ?? null);
    setEditando(false);
    setBusca("");
    setResultados([]);
  }, [pedido.id]);

  // Busca no catálogo (com pequeno atraso para não consultar a cada tecla).
  useEffect(() => {
    const termo = busca.trim();
    if (!editando || termo.length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      if (ehConvenio) {
        const { data } = await (supabase as any)
          .from("exames_convenio")
          .select("codigo_shift, nome")
          .eq("ativo", true)
          .ilike("nome_norm", `%${semAcento(termo)}%`)
          .order("nome")
          .limit(12);
        setResultados(
          ((data ?? []) as any[]).map((e) => ({
            codigoShift: String(e.codigo_shift),
            nome: e.nome,
            precoParticular: null,
            prazoResultado: null,
            disponivelNaUnidade: true,
            disponivelEmCasa: false,
          })),
        );
      } else {
        const { data } = await supabase
          .from("exames_cache")
          .select("codigo_shift, nome, preco_particular, prazo_resultado, disponivel_na_unidade, disponivel_em_casa")
          .eq("ativo", true)
          .ilike("nome", `%${termo}%`)
          .order("nome")
          .limit(12);
        setResultados(
          ((data ?? []) as any[]).map((e) => ({
            codigoShift: String(e.codigo_shift),
            nome: e.nome,
            precoParticular: e.preco_particular ?? null,
            prazoResultado: e.prazo_resultado ?? null,
            disponivelNaUnidade: e.disponivel_na_unidade ?? true,
            disponivelEmCasa: e.disponivel_em_casa ?? false,
          })),
        );
      }
      setBuscando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busca, editando, ehConvenio]);

  const jaTem = (codigo: string) => rascunho.some((i) => String(i.codigoShift) === String(codigo));

  const adicionar = (r: Resultado) => {
    if (jaTem(r.codigoShift)) {
      toast.message("Esse exame já está no pedido.");
      return;
    }
    setRascunho((prev) => [...prev, novoItem(r)]);
  };

  // Atalho: exames que a IA leu no pedido médico e ainda não estão na lista.
  const daIA: any[] = (Array.isArray((pedido as any).exames_identificados_ia)
    ? (pedido as any).exames_identificados_ia
    : []
  ).filter((ex: any) => ex?.codigo_shift && !jaTem(ex.codigo_shift));

  const adicionarDaIA = async (ex: any) => {
    // Completa com preço/prazo do catálogo particular quando houver.
    let r: Resultado = {
      codigoShift: String(ex.codigo_shift),
      nome: ex.nome ?? String(ex.codigo_shift),
      precoParticular: null,
      prazoResultado: null,
      disponivelNaUnidade: true,
      disponivelEmCasa: false,
    };
    if (!ehConvenio) {
      const { data } = await supabase
        .from("exames_cache")
        .select("nome, preco_particular, prazo_resultado, disponivel_na_unidade, disponivel_em_casa")
        .eq("codigo_shift", String(ex.codigo_shift))
        .maybeSingle();
      if (data) {
        r = {
          ...r,
          nome: (data as any).nome ?? r.nome,
          precoParticular: (data as any).preco_particular ?? null,
          prazoResultado: (data as any).prazo_resultado ?? null,
          disponivelNaUnidade: (data as any).disponivel_na_unidade ?? true,
          disponivelEmCasa: (data as any).disponivel_em_casa ?? false,
        };
      }
    }
    adicionar(r);
  };

  const iniciar = () => {
    setRascunho(itens);
    setBusca("");
    setEditando(true);
  };

  const salvar = async () => {
    const removidos = itens.filter((i) => !rascunho.some((r) => String(r.codigoShift) === String(i.codigoShift)));
    const incluidos = rascunho.filter((r) => !itens.some((i) => String(i.codigoShift) === String(r.codigoShift)));
    if (removidos.length === 0 && incluidos.length === 0) {
      setEditando(false);
      return;
    }
    setSalvando(true);
    const novoTotal = ehConvenio
      ? 0
      : rascunho.reduce((acc, i) => acc + (precoCentavosDoItem(i) ?? 0), 0);

    const quando = new Date().toLocaleString("pt-BR");
    const partes = [
      incluidos.length ? `incluídos: ${incluidos.map((i) => i.nome).join(", ")}` : "",
      removidos.length ? `removidos: ${removidos.map((i) => i.nome).join(", ")}` : "",
    ].filter(Boolean);
    const linha = `[${quando}] Exames alterados por ${nomeStaff || "staff"} — ${partes.join("; ")}.`;

    // Relê as observações atuais para não sobrescrever registros recentes.
    const { data: atual } = await supabase
      .from("pedidos")
      .select("observacoes")
      .eq("id", pedido.id)
      .maybeSingle();
    const obs = (atual as any)?.observacoes;
    const observacoes = obs ? `${obs}\n${linha}` : linha;

    const { data, error } = await supabase
      .from("pedidos")
      .update({ itens: rascunho, valor_total_centavos: novoTotal, observacoes })
      .eq("id", pedido.id)
      .select("id");
    setSalvando(false);
    if (error || !data || data.length === 0) {
      toast.error(error ? "Não foi possível salvar os exames." : "Sem permissão para alterar este pedido.");
      return;
    }
    setItens(rascunho);
    setTotal(novoTotal);
    setEditando(false);
    toast.success("Exames do pedido atualizados.");
    onSalvo?.();
  };

  const lista = editando ? rascunho : itens;
  const totalExibido = editando
    ? ehConvenio
      ? 0
      : rascunho.reduce((acc, i) => acc + (precoCentavosDoItem(i) ?? 0), 0)
    : total;

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Exames e vacinas {editando && <span className="text-brand">(editando)</span>}
        </p>
        {podeEditar && !editando && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={iniciar}>
            <Pencil className="h-3.5 w-3.5" /> Editar exames
          </Button>
        )}
      </div>

      <ul className="divide-y">
        {lista.map((it: any, idx: number) => (
          <li key={`${it.codigoShift}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{it.nome ?? it.codigoShift ?? "—"}</span>
            <span className="shrink-0 font-medium">
              {ehConvenio ? "Convênio" : formatarPreco(precoCentavosDoItem(it))}
            </span>
            {editando && (
              <button
                type="button"
                onClick={() => setRascunho((prev) => prev.filter((_, i) => i !== idx))}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                aria-label={`Remover ${it.nome}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
        {lista.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted-foreground">Sem itens</li>
        )}
      </ul>

      {editando && (
        <div className="space-y-3 border-t bg-muted/30 p-3">
          {daIA.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-brand">
                <Sparkles className="h-3.5 w-3.5" /> Lidos pela IA no pedido médico (não estão na lista)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {daIA.map((ex: any) => (
                  <button
                    key={ex.codigo_shift}
                    type="button"
                    onClick={() => adicionarDaIA(ex)}
                    className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-white px-2.5 py-1 text-xs hover:bg-brand/5"
                  >
                    <Plus className="h-3 w-3" /> {ex.nome ?? ex.codigo_shift}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={ehConvenio ? "Incluir exame (catálogo de convênio)…" : "Incluir exame (catálogo particular)…"}
              className="bg-white pl-9"
            />
            {buscando && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {resultados.length > 0 && (
            <ul className="max-h-56 divide-y overflow-y-auto rounded-md border bg-white">
              {resultados.map((r) => (
                <li key={r.codigoShift}>
                  <button
                    type="button"
                    onClick={() => adicionar(r)}
                    disabled={jaTem(r.codigoShift)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1 truncate">{r.nome}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {jaTem(r.codigoShift)
                        ? "já incluído"
                        : ehConvenio
                          ? ""
                          : formatarPreco(r.precoParticular != null ? Math.round(r.precoParticular * 100) : null)}
                    </span>
                    {!jaTem(r.codigoShift) && <Plus className="h-4 w-4 shrink-0 text-brand" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={salvar} disabled={salvando} className="bg-brand text-white hover:bg-brand-hover">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar exames"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditando(false)} disabled={salvando}>
              Cancelar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            A alteração fica registrada no histórico do pedido
            {ehConvenio ? "." : " e o total é recalculado."}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t px-3 py-2 text-sm font-bold">
        <span>Total</span>
        <span>{ehConvenio ? "Convênio" : formatarPreco(totalExibido)}</span>
      </div>
    </div>
  );
};
