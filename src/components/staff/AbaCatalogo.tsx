import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Upload, Download, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lerCsvComEncoding, csvParaObjetos, parsePrecoBR } from "@/lib/csv-import";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarPreco } from "./utils";
import {
  CATEGORIAS_EXAMES,
  CATEGORIAS_VACINAS,
} from "@/components/catalogo/types";
import { normalizeExameNome } from "@/lib/normalizeExame";
import { CatalogoConvenio } from "./CatalogoConvenio";
import {
  baixarPlanilha,
  emLotes,
  lerPlanilha,
  PreviaImportacao,
  ResumoImportacao,
  simNao,
  vazio,
} from "./PreviaImportacao";

type Item = {
  id: string;
  nome: string;
  codigo_shift: string;
  outros_nomes: string[] | null;
  categoria: string | null;
  preco_centavos: number | null;
  preco_particular: number | null;
  prazo_resultado: string | null;
  preparo: string | null;
  disponivel_na_unidade: boolean;
  disponivel_em_casa: boolean;
  ativo: boolean;
};

type FormState = {
  nome: string;
  codigo_shift: string;
  outros_nomes: string;
  categoria: string;
  preco_reais: string;
  prazo_resultado: string;
  preparo: string;
  jejum_horas: string;
  disponivel_na_unidade: boolean;
  disponivel_em_casa: boolean;
  ativo: boolean;
};

const formVazio: FormState = {
  nome: "",
  codigo_shift: "",
  outros_nomes: "",
  categoria: "",
  preco_reais: "",
  prazo_resultado: "",
  preparo: "",
  jejum_horas: "",
  disponivel_na_unidade: true,
  disponivel_em_casa: false,
  ativo: true,
};

const Tabela = ({ tabela, podeEditar }: { tabela: "exames_cache" | "vacinas_cache"; podeEditar: boolean }) => {
  const [itens, setItens] = useState<Item[]>([]);
  const [busca, setBusca] = useState("");
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  const [form, setForm] = useState<FormState>(formVazio);
  const [salvando, setSalvando] = useState(false);

  const categorias =
    tabela === "exames_cache" ? CATEGORIAS_EXAMES : CATEGORIAS_VACINAS;

  const carregar = async () => {
    const campos =
      tabela === "exames_cache"
        ? "id, nome, codigo_shift, outros_nomes, categoria, preco_centavos, preco_particular, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa, ativo"
        : "id, nome, codigo_shift, outros_nomes, categoria, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa, ativo";
    // O banco devolve no máximo 1000 linhas por consulta: busca em páginas.
    const todos: Item[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await (supabase as any)
        .from(tabela)
        .select(campos)
        .order("nome")
        .range(de, de + 999);
      if (error) break;
      todos.push(...((data as Item[]) ?? []));
      if (!data || data.length < 1000) break;
    }
    setItens(todos);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela]);

  const toggleAtivo = async (item: Item, novo: boolean) => {
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: novo } : i)));
    const { error } = await supabase.from(tabela).update({ ativo: novo }).eq("id", item.id);
    if (error) {
      toast.error("Erro ao atualizar");
      setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: !novo } : i)));
      return;
    }
    toast.success(novo ? "Ativado" : "Desativado");
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(formVazio);
    setDrawerAberto(true);
  };

  const abrirEdicao = async (item: Item) => {
    setEditando(item);
    // Exames: o preparo mora em exame_preparo (jejum + instruções), casado por nome.
    let preparoText = item.preparo ?? "";
    let jejum_horas = "";
    if (tabela === "exames_cache") {
      const { data } = await (supabase as any)
        .from("exame_preparo")
        .select("jejum_horas, instrucoes")
        .eq("nome_norm", normalizeExameNome(item.nome))
        .maybeSingle();
      if (data) {
        jejum_horas = data.jejum_horas ? String(data.jejum_horas) : "";
        preparoText = ((data.instrucoes as string[]) ?? []).join("\n");
      }
    }
    setForm({
      nome: item.nome ?? "",
      codigo_shift: item.codigo_shift ?? "",
      outros_nomes: (item.outros_nomes ?? []).join(", "),
      categoria: item.categoria ?? "",
      preco_reais:
        tabela === "exames_cache"
          ? item.preco_particular != null
            ? Number(item.preco_particular).toFixed(2)
            : ""
          : item.preco_centavos != null
            ? (item.preco_centavos / 100).toFixed(2)
            : "",
      prazo_resultado: item.prazo_resultado ?? "",
      preparo: preparoText,
      jejum_horas,
      disponivel_na_unidade: item.disponivel_na_unidade,
      disponivel_em_casa: item.disponivel_em_casa,
      ativo: item.ativo,
    });
    setDrawerAberto(true);
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.codigo_shift.trim()) {
      toast.error("Nome e Código Shift são obrigatórios");
      return;
    }
    setSalvando(true);

    const outros = form.outros_nomes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const precoNum = parseFloat(form.preco_reais.replace(",", "."));
    const precoValido = !isNaN(precoNum);
    const preco_centavos = precoValido ? Math.round(precoNum * 100) : null;

    const payload: any = {
      nome: form.nome.trim(),
      codigo_shift: form.codigo_shift.trim(),
      outros_nomes: outros.length ? outros : null,
      categoria: form.categoria || null,
      preco_centavos,
      prazo_resultado: form.prazo_resultado.trim() || null,
      disponivel_na_unidade: form.disponivel_na_unidade,
      disponivel_em_casa: form.disponivel_em_casa,
      ativo: form.ativo,
    };
    if (tabela === "exames_cache") {
      payload.preco_particular = precoValido ? precoNum : null;
      // Exames: preparo NÃO vai pra exames_cache (a sync do Shift apagaria) — vai pra exame_preparo.
    } else {
      payload.preparo = form.preparo.trim() || null;
    }

    const { error } = editando
      ? await (supabase as any).from(tabela).update(payload).eq("id", editando.id)
      : await (supabase as any).from(tabela).insert(payload);

    if (error) {
      setSalvando(false);
      toast.error(error.message ?? "Erro ao salvar");
      return;
    }

    // Exames: grava preparo (jejum + instruções) na tabela isolada, casado por nome.
    if (tabela === "exames_cache") {
      const linhas = form.preparo
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const jejum = parseInt(form.jejum_horas, 10);
      const { error: prepErr } = await (supabase as any)
        .from("exame_preparo")
        .upsert(
          {
            nome_norm: normalizeExameNome(form.nome),
            jejum_horas: isNaN(jejum) ? 0 : jejum,
            instrucoes: linhas,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "nome_norm" },
        );
      if (prepErr) {
        setSalvando(false);
        toast.error("Item salvo, mas falhou ao salvar o preparo: " + prepErr.message);
        return;
      }
    }

    setSalvando(false);
    toast.success(editando ? "Item atualizado" : "Item criado");
    setDrawerAberto(false);
    carregar();
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((i) => i.nome.toLowerCase().includes(q));
  }, [itens, busca]);

  // ---------- Planilha (fonte de verdade do catálogo particular) ----------
  // "Baixar planilha" exporta o catálogo atual (já com os ajustes da tela);
  // "Importar planilha" mostra a prévia e só aplica depois de confirmar.
  const ehExame = tabela === "exames_cache";
  const [resumoImport, setResumoImport] = useState<ResumoImportacao | null>(null);
  const [aplicarImport, setAplicarImport] = useState<((desativar: boolean) => Promise<void>) | null>(null);
  const COLUNAS = [
    "codigo_shift", "nome", "outros_nomes", "categoria", "preco_reais", "prazo_resultado",
    "preparo", "disponivel_na_unidade", "disponivel_em_casa", "ativo",
  ];
  const precoReais = (i: Item) =>
    ehExame
      ? i.preco_particular != null ? Number(i.preco_particular) : null
      : i.preco_centavos != null ? i.preco_centavos / 100 : null;

  const baixarModelo = () => {
    const linhas = itens.map((i) => ({
      codigo_shift: i.codigo_shift,
      nome: i.nome,
      outros_nomes: (i.outros_nomes ?? []).join(", "),
      categoria: i.categoria ?? "",
      preco_reais: precoReais(i) ?? "",
      prazo_resultado: i.prazo_resultado ?? "",
      preparo: i.preparo ?? "",
      disponivel_na_unidade: i.disponivel_na_unidade ? "SIM" : "NAO",
      disponivel_em_casa: i.disponivel_em_casa ? "SIM" : "NAO",
      ativo: i.ativo ? "SIM" : "NAO",
    }));
    baixarPlanilha(
      `catalogo-${ehExame ? "exames-particular" : "vacinas"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      COLUNAS,
      linhas,
      [
        `Catálogo de ${ehExame ? "EXAMES PARTICULAR" : "VACINAS"} — Sancet`,
        "codigo_shift e nome são obrigatórios. O codigo_shift liga a linha ao item.",
        "preco_reais: valor em reais (ex.: 45,00). Vazio = não altera.",
        "outros_nomes: separados por vírgula. Campos de texto vazios = não alteram.",
        "disponivel_na_unidade / disponivel_em_casa / ativo: SIM ou NAO.",
        "Itens que não estiverem na planilha podem ser desativados na importação (nada é apagado).",
      ],
    );
  };

  const importarPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    let linhas: Record<string, any>[];
    try {
      linhas = await lerPlanilha(file);
    } catch (err: any) {
      toast.error(`Não foi possível ler a planilha: ${err?.message ?? err}`);
      return;
    }
    if (!linhas.length) { toast.error("Planilha vazia."); return; }
    if (!("codigo_shift" in linhas[0]) || !("nome" in linhas[0])) {
      toast.error('A planilha precisa das colunas "codigo_shift" e "nome". Use "Baixar planilha" como base.');
      return;
    }

    const porCodigo = new Map(itens.map((i) => [String(i.codigo_shift), i]));
    const ignorados: string[] = [];
    const vistos = new Map<string, Record<string, any>>();
    const agora = new Date().toISOString();
    linhas.forEach((r, idx) => {
      const codigo = String(r.codigo_shift ?? "").trim();
      const nome = String(r.nome ?? "").trim();
      if (!codigo || !nome) { ignorados.push(`Linha ${idx + 2}: sem código ou nome`); return; }
      if (vistos.has(codigo)) ignorados.push(`Linha ${idx + 2}: código ${codigo} repetido (vale a última)`);
      const atual = porCodigo.get(codigo);
      const reg: Record<string, any> = {
        codigo_shift: codigo,
        nome,
        disponivel_na_unidade: simNao(r.disponivel_na_unidade, atual?.disponivel_na_unidade ?? true),
        disponivel_em_casa: simNao(r.disponivel_em_casa, atual?.disponivel_em_casa ?? false),
        ativo: simNao(r.ativo, true),
        atualizado_em: agora,
      };
      if (!vazio(r.outros_nomes)) reg.outros_nomes = String(r.outros_nomes).split(",").map((x) => x.trim()).filter(Boolean);
      if (!vazio(r.categoria)) reg.categoria = String(r.categoria).trim();
      if (!vazio(r.prazo_resultado)) reg.prazo_resultado = String(r.prazo_resultado).trim();
      if (!vazio(r.preparo)) reg.preparo = String(r.preparo).trim();
      if (!vazio(r.preco_reais)) {
        const n = typeof r.preco_reais === "number" ? r.preco_reais : parsePrecoBR(String(r.preco_reais));
        if (n == null || Number.isNaN(n)) ignorados.push(`Linha ${idx + 2}: preço inválido (${r.preco_reais}) — preço não alterado`);
        else {
          reg.preco_centavos = Math.round(n * 100);
          if (ehExame) reg.preco_particular = Math.round(n * 100) / 100;
        }
      }
      vistos.set(codigo, reg);
    });

    const novos: Record<string, any>[] = [];
    const alterados: Record<string, any>[] = [];
    const comparar = ["nome", "outros_nomes", "categoria", "prazo_resultado", "preparo", "disponivel_na_unidade", "disponivel_em_casa", "ativo", ehExame ? "preco_particular" : "preco_centavos"];
    vistos.forEach((reg, codigo) => {
      const atual = porCodigo.get(codigo) as any;
      if (!atual) return void novos.push(reg);
      const mudou = comparar.some((c) => c in reg && JSON.stringify(reg[c] ?? null) !== JSON.stringify(c === "preco_particular" && atual[c] != null ? Number(atual[c]) : atual[c] ?? null));
      if (mudou) alterados.push(reg);
    });
    const semPlanilha = itens.filter((i) => i.ativo && !vistos.has(String(i.codigo_shift)));

    setResumoImport({
      novos: novos.map((n) => `${n.codigo_shift} — ${n.nome}`),
      alterados: alterados.map((n) => `${n.codigo_shift} — ${n.nome}`),
      semPlanilha: semPlanilha.map((i) => `${i.codigo_shift} — ${i.nome}`),
      ignorados,
    });
    setAplicarImport(() => async (desativar: boolean) => {
      try {
        // Upsert por código: só as colunas presentes em cada linha são gravadas.
        for (const reg of [...novos, ...alterados]) {
          const { error } = await (supabase as any).from(tabela).upsert(reg, { onConflict: "codigo_shift" });
          if (error) throw error;
        }
        if (desativar) {
          for (const lote of emLotes(semPlanilha.map((i) => i.id), 300)) {
            const { error } = await (supabase as any).from(tabela).update({ ativo: false }).in("id", lote);
            if (error) throw error;
          }
        }
        toast.success(
          `Catálogo atualizado: ${novos.length} novos, ${alterados.length} alterados` +
            (desativar && semPlanilha.length ? `, ${semPlanilha.length} desativados.` : "."),
        );
        setResumoImport(null);
        carregar();
      } catch (err: any) {
        toast.error(`Erro ao aplicar: ${err?.message ?? err}. Parte pode ter sido gravada; importe de novo para concluir.`);
      }
    });
  };
  const importarPrecosCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const texto = await lerCsvComEncoding(file);
      const linhas = csvParaObjetos(texto, ";");
      if (linhas.length === 0) {
        toast.error("Planilha vazia");
        return;
      }

      // 2-3) parse + dedup
      const linhas_lidas = linhas.length;
      let linhas_invalidas = 0;
      const precoPorMnemonico = new Map<string, number>();

      for (const row of linhas) {
        const mnemonico = (row["Mnemônico"] ?? row["Mnemonico"] ?? "").trim().toUpperCase();
        const precoStr = (row["Preço"] ?? row["Preco"] ?? "").trim();
        if (!mnemonico) { linhas_invalidas++; continue; }
        const preco = parsePrecoBR(precoStr);
        if (preco == null) { linhas_invalidas++; continue; }
        precoPorMnemonico.set(mnemonico, preco);
      }

      const mnemonicos = Array.from(precoPorMnemonico.keys());
      if (mnemonicos.length === 0) {
        toast.error("Nenhuma linha válida encontrada");
        return;
      }

      // 4) single query para mapear mnemonico -> id (em lotes pra evitar URL gigante)
      const mapaInfo = new Map<string, { id: string; codigo_shift: string; nome: string }>();
      const loteBusca = 500;
      for (let i = 0; i < mnemonicos.length; i += loteBusca) {
        const slice = mnemonicos.slice(i, i + loteBusca);
        const { data, error } = await supabase
          .from("exames_cache")
          .select("id, mnemonico, codigo_shift, nome")
          .in("mnemonico", slice);
        if (error) {
          console.error("[import precos] erro buscando ids:", error);
          toast.error("Erro ao buscar exames: " + error.message);
          return;
        }
        for (const r of data ?? []) {
          if (r.mnemonico) mapaInfo.set(r.mnemonico.toUpperCase(), { id: r.id, codigo_shift: r.codigo_shift, nome: r.nome });
        }
      }

      // 5) montar updates
      const mnemonicos_sem_match: string[] = [];
      const updates: { id: string; codigo_shift: string; nome: string; preco_particular: number; atualizado_em: string }[] = [];
      const agora = new Date().toISOString();
      for (const [mn, preco] of precoPorMnemonico.entries()) {
        const info = mapaInfo.get(mn);
        if (!info) { mnemonicos_sem_match.push(mn); continue; }
        updates.push({ id: info.id, codigo_shift: info.codigo_shift, nome: info.nome, preco_particular: preco, atualizado_em: agora });
      }

      // 6) upsert em batches de 500
      const batches_com_erro: { batch_index: number; error: string }[] = [];
      let precos_atualizados = 0;
      const lote = 500;
      for (let i = 0; i < updates.length; i += lote) {
        const batch = updates.slice(i, i + lote);
        const { error } = await supabase
          .from("exames_cache")
          .upsert(batch, { onConflict: "id" });
        if (error) {
          console.error("[import precos batch fail]", {
            batch_index: Math.floor(i / lote),
            batch_size: batch.length,
            error_code: error.code,
            error_message: error.message,
            error_details: error.details,
          });
          batches_com_erro.push({ batch_index: Math.floor(i / lote), error: error.message });
        } else {
          precos_atualizados += batch.length;
        }
      }

      console.log("[import precos] resumo:", {
        linhas_lidas,
        linhas_invalidas,
        mnemonicos_sem_match,
        precos_atualizados,
        batches_com_erro,
      });

      if (batches_com_erro.length > 0) {
        toast.error(`Importação parcial: ${precos_atualizados} atualizados, ${batches_com_erro.length} lotes com erro`);
      } else {
        toast.success(`Atualizados ${precos_atualizados} preços de ${mnemonicos.length} exames`, {
          description: mnemonicos_sem_match.length > 0
            ? `${mnemonicos_sem_match.length} mnemônicos sem correspondência`
            : undefined,
        });
      }
      carregar();
    } catch (err: any) {
      console.error("[import precos] erro:", err);
      toast.error("Erro ao processar CSV", { description: err?.message ?? String(err) });
    }
  };


  return (
    <div className="space-y-4">
      <PreviaImportacao
        resumo={resumoImport}
        onCancelar={() => setResumoImport(null)}
        onAplicar={async (d) => {
          if (aplicarImport) await aplicarImport(d);
        }}
      />
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome..."
            className="pl-9"
          />
        </div>

        {podeEditar && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={baixarModelo} className="gap-1.5">
              <Download className="h-4 w-4" /> Baixar planilha
            </Button>

            <label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={importarPlanilha}
              />
              <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" asChild>
                <span><Upload className="h-4 w-4" /> Importar planilha</span>
              </Button>
            </label>

            {tabela === "exames_cache" && (
              <label>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={importarPrecosCsv}
                />
                <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" asChild>
                  <span><DollarSign className="h-4 w-4" /> Importar preços (CSV)</span>
                </Button>
              </label>
            )}

            <Button
              size="sm"
              onClick={abrirNovo}
              className="gap-1.5 text-white"
              style={{ backgroundColor: "hsl(var(--brand))" }}
            >
              <Plus className="h-4 w-4" /> Novo item
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Em casa</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="max-w-[260px] truncate">{i.nome}</TableCell>
                <TableCell className="font-mono text-xs">{i.codigo_shift}</TableCell>
                <TableCell className="text-xs">{i.categoria ?? "—"}</TableCell>
                <TableCell>
                  {tabela === "exames_cache"
                    ? i.preco_particular != null
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(i.preco_particular))
                      : "—"
                    : formatarPreco(i.preco_centavos)}
                </TableCell>
                <TableCell>{i.disponivel_na_unidade ? "Sim" : "Não"}</TableCell>
                <TableCell>{i.disponivel_em_casa ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <Switch
                    checked={i.ativo}
                    disabled={!podeEditar}
                    onCheckedChange={(v) => toggleAtivo(i, v)}
                  />
                </TableCell>
                <TableCell>
                  {podeEditar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirEdicao(i)}
                      className="gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhum item.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editando ? "Editar item" : "Novo item"}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Código Shift *</Label>
              <Input
                value={form.codigo_shift}
                onChange={(e) => setForm({ ...form, codigo_shift: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Outros nomes (separados por vírgula)</Label>
              <Input
                value={form.outros_nomes}
                onChange={(e) => setForm({ ...form, outros_nomes: e.target.value })}
                placeholder="ex: hemograma, CBC"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm({ ...form, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_reais}
                onChange={(e) => setForm({ ...form, preco_reais: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Prazo do resultado</Label>
              <Input
                value={form.prazo_resultado}
                onChange={(e) => setForm({ ...form, prazo_resultado: e.target.value })}
                placeholder="ex: 1 dia útil"
              />
            </div>

            {tabela === "exames_cache" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Jejum (horas)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.jejum_horas}
                    onChange={(e) => setForm({ ...form, jejum_horas: e.target.value })}
                    placeholder="0 = sem jejum obrigatório"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Preparo — instruções (uma por linha)</Label>
                  <Textarea
                    value={form.preparo}
                    onChange={(e) => setForm({ ...form, preparo: e.target.value })}
                    rows={5}
                    placeholder={"Informar medicamentos em uso durante os últimos 3 dias.\nColher a primeira amostra do dia."}
                  />
                  <p className="text-xs text-muted-foreground">
                    Salvo na tabela de preparos (o que o paciente vê). Não é apagado pela sincronização do Shift.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label>Preparo</Label>
                <Textarea
                  value={form.preparo}
                  onChange={(e) => setForm({ ...form, preparo: e.target.value })}
                  rows={4}
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Disponível na unidade</Label>
              <Switch
                checked={form.disponivel_na_unidade}
                onCheckedChange={(v) => setForm({ ...form, disponivel_na_unidade: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Disponível em casa</Label>
              <Switch
                checked={form.disponivel_em_casa}
                onCheckedChange={(v) => setForm({ ...form, disponivel_em_casa: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Ativo</Label>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={salvar}
                disabled={salvando}
                className="flex-1 text-white hover:opacity-90"
                style={{ backgroundColor: "hsl(var(--brand))" }}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDrawerAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

type AbaCatalogoProps = {
  permissoes?: { catalogo: { ver: boolean; editar: boolean; excluir: boolean } } | null;
};

export const AbaCatalogo = ({ permissoes }: AbaCatalogoProps = {}) => {
  if (permissoes?.catalogo?.ver === false) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Você não tem permissão para ver esta seção.
      </div>
    );
  }
  const podeEditar = permissoes?.catalogo?.editar !== false;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-secondary">Catálogo</h1>
      <Tabs defaultValue="exames">
        <TabsList>
          <TabsTrigger value="exames">Exames particular</TabsTrigger>
          <TabsTrigger value="convenio">Exames convênio</TabsTrigger>
          <TabsTrigger value="vacinas">Vacinas</TabsTrigger>
        </TabsList>
        <TabsContent value="convenio" className="mt-4">
          <CatalogoConvenio podeEditar={podeEditar} />
        </TabsContent>
        <TabsContent value="exames" className="mt-4">
          <Tabela tabela="exames_cache" podeEditar={podeEditar} />
        </TabsContent>
        <TabsContent value="vacinas" className="mt-4">
          <Tabela tabela="vacinas_cache" podeEditar={podeEditar} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
