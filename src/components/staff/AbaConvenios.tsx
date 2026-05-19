import { useEffect, useMemo, useState } from "react";
import { Search, Upload, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { lerCsvComEncoding, csvParaObjetos } from "@/lib/csv-import";

type Convenio = {
  id: string;
  nome: string;
  arquivo_cruzado_id: number | null;
  ativo: boolean;
  qtd_planos?: number;
};

type Plano = {
  id: string;
  convenio_id: string;
  codigo_item: string;
  descricao: string;
  ativo: boolean;
};

export const AbaConvenios = () => {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const [conv, pls] = await Promise.all([
      supabase.from("convenios_cache").select("id, nome, arquivo_cruzado_id, ativo").order("nome"),
      supabase.from("convenios_planos").select("convenio_id"),
    ]);
    const contagens = new Map<string, number>();
    ((pls.data as { convenio_id: string }[]) ?? []).forEach((p) => {
      contagens.set(p.convenio_id, (contagens.get(p.convenio_id) ?? 0) + 1);
    });
    const lista = ((conv.data as Convenio[]) ?? []).map((c) => ({
      ...c,
      qtd_planos: contagens.get(c.id) ?? 0,
    }));
    setConvenios(lista);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (!selecionado) {
      setPlanos([]);
      return;
    }
    supabase
      .from("convenios_planos")
      .select("id, convenio_id, codigo_item, descricao, ativo")
      .eq("convenio_id", selecionado)
      .order("codigo_item")
      .then(({ data }) => setPlanos((data as Plano[]) ?? []));
  }, [selecionado]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return convenios;
    return convenios.filter((c) => c.nome.toLowerCase().includes(q));
  }, [convenios, busca]);

  const togglePlano = async (plano: Plano, novo: boolean) => {
    setPlanos((prev) => prev.map((p) => (p.id === plano.id ? { ...p, ativo: novo } : p)));
    const { error } = await supabase
      .from("convenios_planos")
      .update({ ativo: novo, atualizado_em: new Date().toISOString() })
      .eq("id", plano.id);
    if (error) {
      toast.error("Erro ao atualizar");
      setPlanos((prev) => prev.map((p) => (p.id === plano.id ? { ...p, ativo: !novo } : p)));
    }
  };

  const importarPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportando(true);
    try {
      const texto = await lerCsvComEncoding(file);
      const linhas = csvParaObjetos(texto, ";");
      if (linhas.length === 0) {
        toast.error("Planilha vazia");
        return;
      }

      // Agrupar por ArquivoCruzado.Id
      const grupos = new Map<number, { descricao: string; itens: { codigo: string; descricao: string }[] }>();
      let erros = 0;

      for (const row of linhas) {
        const idStr = (row["ArquivoCruzado.Id"] ?? "").trim();
        const descConv = (row["ArquivoCruzado.Descricao"] ?? "").trim();
        const codigo = (row["ItemCodigo"] ?? "").trim();
        const descItem = (row["Descricao"] ?? "").trim();
        const idNum = parseInt(idStr, 10);
        if (!idStr || isNaN(idNum) || !descConv || !codigo || !descItem) {
          erros++;
          continue;
        }
        if (!grupos.has(idNum)) grupos.set(idNum, { descricao: descConv, itens: [] });
        grupos.get(idNum)!.itens.push({ codigo, descricao: descItem });
      }

      // Upsert convênios
      const conveniosUpsert = Array.from(grupos.entries()).map(([id, g]) => ({
        arquivo_cruzado_id: id,
        nome: g.descricao,
        codigo_shift: String(id),
        ativo: true,
      }));

      const { data: conveniosInseridos, error: errConv } = await supabase
        .from("convenios_cache")
        .upsert(conveniosUpsert, { onConflict: "arquivo_cruzado_id" })
        .select("id, arquivo_cruzado_id");

      if (errConv) {
        toast.error("Erro ao importar convênios: " + errConv.message);
        return;
      }

      const idMap = new Map<number, string>();
      (conveniosInseridos ?? []).forEach((c: any) => {
        if (c.arquivo_cruzado_id != null) idMap.set(c.arquivo_cruzado_id, c.id);
      });

      // Upsert planos
      const planosUpsert: any[] = [];
      for (const [acId, grupo] of grupos.entries()) {
        const convId = idMap.get(acId);
        if (!convId) continue;
        for (const item of grupo.itens) {
          planosUpsert.push({
            convenio_id: convId,
            codigo_item: item.codigo,
            descricao: item.descricao,
            ativo: true,
            atualizado_em: new Date().toISOString(),
          });
        }
      }

      // Upsert em lotes de 1000
      let planosOk = 0;
      const lote = 1000;
      for (let i = 0; i < planosUpsert.length; i += lote) {
        const slice = planosUpsert.slice(i, i + lote);
        const { error } = await supabase
          .from("convenios_planos")
          .upsert(slice, { onConflict: "convenio_id,codigo_item" });
        if (error) {
          erros += slice.length;
        } else {
          planosOk += slice.length;
        }
      }

      toast.success(`Importação concluída`, {
        description: `${grupos.size} convênios e ${planosOk} planos importados · ${erros} erros`,
      });
      carregar();
    } catch (err: any) {
      toast.error("Erro ao processar planilha", { description: err?.message ?? String(err) });
    } finally {
      setImportando(false);
    }
  };

  const convenioAtual = convenios.find((c) => c.id === selecionado);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <Shield className="h-6 w-6" /> Convênios
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerenciados via importação de planilha (não vem da sync da Shift).
          </p>
        </div>
        <label>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={importarPlanilha}
            disabled={importando}
          />
          <Button asChild disabled={importando} className="gap-2 text-white cursor-pointer" style={{ backgroundColor: "#C8102E" }}>
            <span>
              {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importando ? "Importando..." : "Importar planilha de convênios"}
            </span>
          </Button>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[340px,1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Convênios ({convenios.length})</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {carregando ? (
                <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
              ) : filtrados.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhum convênio. Importe a planilha.</p>
              ) : (
                <ul>
                  {filtrados.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelecionado(c.id)}
                        className={cn(
                          "flex w-full items-center justify-between border-b px-4 py-2.5 text-left text-sm transition hover:bg-muted/50",
                          selecionado === c.id && "bg-muted",
                        )}
                      >
                        <span className="truncate pr-2">{c.nome}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {c.qtd_planos}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {convenioAtual ? convenioAtual.nome : "Selecione um convênio"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!convenioAtual ? (
              <p className="text-sm text-muted-foreground">Escolha um convênio à esquerda para ver seus planos.</p>
            ) : planos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este convênio ainda não tem planos.</p>
            ) : (
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Código</th>
                      <th className="px-3 py-2 text-left font-medium">Descrição</th>
                      <th className="px-3 py-2 text-right font-medium w-20">Ativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planos.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{p.codigo_item}</td>
                        <td className="px-3 py-2">{p.descricao}</td>
                        <td className="px-3 py-2 text-right">
                          <Switch checked={p.ativo} onCheckedChange={(v) => togglePlano(p, v)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
