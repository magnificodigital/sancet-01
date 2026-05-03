import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
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

type Item = {
  id: string;
  nome: string;
  codigo_shift: string;
  outros_nomes: string[] | null;
  categoria: string | null;
  preco_centavos: number | null;
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
    const { data } = await supabase
      .from(tabela)
      .select(
        "id, nome, codigo_shift, outros_nomes, categoria, preco_centavos, prazo_resultado, preparo, disponivel_na_unidade, disponivel_em_casa, ativo",
      )
      .order("nome");
    setItens((data as Item[]) ?? []);
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

  const abrirEdicao = (item: Item) => {
    setEditando(item);
    setForm({
      nome: item.nome ?? "",
      codigo_shift: item.codigo_shift ?? "",
      outros_nomes: (item.outros_nomes ?? []).join(", "),
      categoria: item.categoria ?? "",
      preco_reais:
        item.preco_centavos != null ? (item.preco_centavos / 100).toFixed(2) : "",
      prazo_resultado: item.prazo_resultado ?? "",
      preparo: item.preparo ?? "",
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
    const preco_centavos = isNaN(precoNum) ? null : Math.round(precoNum * 100);

    const payload = {
      nome: form.nome.trim(),
      codigo_shift: form.codigo_shift.trim(),
      outros_nomes: outros.length ? outros : null,
      categoria: form.categoria || null,
      preco_centavos,
      prazo_resultado: form.prazo_resultado.trim() || null,
      preparo: form.preparo.trim() || null,
      disponivel_na_unidade: form.disponivel_na_unidade,
      disponivel_em_casa: form.disponivel_em_casa,
      ativo: form.ativo,
    };

    const { error } = editando
      ? await supabase.from(tabela).update(payload).eq("id", editando.id)
      : await supabase.from(tabela).insert(payload);

    setSalvando(false);
    if (error) {
      toast.error(error.message ?? "Erro ao salvar");
      return;
    }
    toast.success(editando ? "Item atualizado" : "Item criado");
    setDrawerAberto(false);
    carregar();
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((i) => i.nome.toLowerCase().includes(q));
  }, [itens, busca]);

  const baixarModelo = () => {
    const colunas = [
      "nome", "codigo_shift", "outros_nomes", "categoria",
      "preco_reais", "prazo_resultado", "preparo",
      "disponivel_na_unidade", "disponivel_em_casa", "ativo"
    ];
    const exemplo = [{
      nome: "Hemograma Completo",
      codigo_shift: "EX001",
      outros_nomes: "Hemograma, CBC",
      categoria: tabela === "exames_cache" ? "Sangue e urina" : "Adolescentes e Adultos",
      preco_reais: "45.00",
      prazo_resultado: "1 dia útil",
      preparo: "Jejum não necessário.",
      disponivel_na_unidade: "SIM",
      disponivel_em_casa: "SIM",
      ativo: "SIM",
    }];
    const ws = XLSX.utils.json_to_sheet(exemplo, { header: colunas });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, `modelo-${tabela === "exames_cache" ? "exames" : "vacinas"}.xlsx`);
  };

  const importarPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws);

    if (rows.length === 0) { toast.error("Planilha vazia."); return; }

    const registros = rows.map((r) => ({
      nome:                  String(r.nome ?? "").trim(),
      codigo_shift:          String(r.codigo_shift ?? "").trim(),
      outros_nomes:          r.outros_nomes
                               ? String(r.outros_nomes).split(",").map((s: string) => s.trim()).filter(Boolean)
                               : [],
      categoria:             r.categoria ? String(r.categoria).trim() : null,
      preco_centavos:        r.preco_reais ? Math.round(parseFloat(String(r.preco_reais).replace(",", ".")) * 100) : null,
      prazo_resultado:       r.prazo_resultado ? String(r.prazo_resultado).trim() : null,
      preparo:               r.preparo ? String(r.preparo).trim() : null,
      disponivel_na_unidade: String(r.disponivel_na_unidade ?? "").toUpperCase() === "SIM",
      disponivel_em_casa:    String(r.disponivel_em_casa ?? "").toUpperCase() === "SIM",
      ativo:                 String(r.ativo ?? "SIM").toUpperCase() !== "NAO",
      atualizado_em:         new Date().toISOString(),
    })).filter((r) => r.nome && r.codigo_shift);

    if (registros.length === 0) { toast.error("Nenhum registro válido encontrado."); return; }

    const { error } = await supabase
      .from(tabela)
      .upsert(registros, { onConflict: "codigo_shift" });

    if (error) { toast.error("Erro ao importar: " + error.message); return; }
    toast.success(`${registros.length} itens importados com sucesso!`);
    carregar();
  };

  return (
    <div className="space-y-4">
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
              <Download className="h-4 w-4" /> Baixar modelo
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

            <Button
              size="sm"
              onClick={() => { setEditando(null); setDrawerAberto(true); }}
              className="gap-1.5 text-white"
              style={{ backgroundColor: "#C8102E" }}
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
                <TableCell>{formatarPreco(i.preco_centavos)}</TableCell>
                <TableCell>{i.disponivel_na_unidade ? "Sim" : "Não"}</TableCell>
                <TableCell>{i.disponivel_em_casa ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <Switch
                    checked={i.ativo}
                    onCheckedChange={(v) => toggleAtivo(i, v)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirEdicao(i)}
                    className="gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
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

            <div className="space-y-1.5">
              <Label>Preparo</Label>
              <Textarea
                value={form.preparo}
                onChange={(e) => setForm({ ...form, preparo: e.target.value })}
                rows={4}
              />
            </div>

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
                style={{ backgroundColor: "#C8102E" }}
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

export const AbaCatalogo = () => (
  <div className="space-y-5">
    <h1 className="text-2xl font-bold text-secondary">Catálogo</h1>
    <Tabs defaultValue="exames">
      <TabsList>
        <TabsTrigger value="exames">Exames</TabsTrigger>
        <TabsTrigger value="vacinas">Vacinas</TabsTrigger>
      </TabsList>
      <TabsContent value="exames" className="mt-4">
        <Tabela tabela="exames_cache" />
      </TabsContent>
      <TabsContent value="vacinas" className="mt-4">
        <Tabela tabela="vacinas_cache" />
      </TabsContent>
    </Tabs>
  </div>
);
