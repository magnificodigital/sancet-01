import { useEffect, useMemo, useState } from "react";
import { Search, Upload, Shield, Loader2, Plus, Trash2, Pencil, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { lerCsvComEncoding, csvParaObjetos } from "@/lib/csv-import";

type Convenio = {
  id: string;
  nome: string;
  codigo_shift: string | null;
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
  const [modalConvenio, setModalConvenio] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [salvandoConvenio, setSalvandoConvenio] = useState(false);
  const [novoPlanoCodigo, setNovoPlanoCodigo] = useState("");
  const [novoPlanoDesc, setNovoPlanoDesc] = useState("");
  const [salvandoPlano, setSalvandoPlano] = useState(false);

  // Edit/Delete convênio
  const [editarConv, setEditarConv] = useState<Convenio | null>(null);
  const [editConvNome, setEditConvNome] = useState("");
  const [editConvAtivo, setEditConvAtivo] = useState(true);
  const [salvandoEditConv, setSalvandoEditConv] = useState(false);
  const [excluirConv, setExcluirConv] = useState<Convenio | null>(null);
  const [confirmacaoNome, setConfirmacaoNome] = useState("");
  const [excluindoConv, setExcluindoConv] = useState(false);

  // Edit/Delete plano
  const [editarPlano, setEditarPlano] = useState<Plano | null>(null);
  const [editPlanoCodigo, setEditPlanoCodigo] = useState("");
  const [editPlanoDesc, setEditPlanoDesc] = useState("");
  const [editPlanoAtivo, setEditPlanoAtivo] = useState(true);
  const [salvandoEditPlano, setSalvandoEditPlano] = useState(false);
  const [excluirPlano, setExcluirPlano] = useState<Plano | null>(null);
  const [excluindoPlano, setExcluindoPlano] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("convenios_cache")
      .select("id, nome, codigo_shift, arquivo_cruzado_id, ativo, convenios_planos(count)")
      .order("nome");
    if (error) {
      console.error("[convenios carregar]", error);
      setCarregando(false);
      return;
    }
    const lista = ((data as any[]) ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      codigo_shift: c.codigo_shift,
      arquivo_cruzado_id: c.arquivo_cruzado_id,
      ativo: c.ativo,
      qtd_planos: c.convenios_planos?.[0]?.count ?? 0,
    })) as Convenio[];
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

  const criarConvenio = async () => {
    const nome = novoNome.trim();
    if (!nome) {
      toast.error("Informe o nome do convênio");
      return;
    }
    setSalvandoConvenio(true);
    const codigo = `manual-${Date.now().toString(36)}`;
    const { data, error } = await supabase
      .from("convenios_cache")
      .insert({ nome, codigo_shift: codigo, ativo: true })
      .select("id")
      .single();
    setSalvandoConvenio(false);
    if (error) {
      toast.error("Erro ao criar convênio", { description: error.message });
      return;
    }
    toast.success("Convênio criado");
    setNovoNome("");
    setModalConvenio(false);
    await carregar();
    if (data?.id) setSelecionado(data.id);
  };

  const adicionarPlano = async () => {
    if (!selecionado) return;
    const codigo = novoPlanoCodigo.trim();
    const desc = novoPlanoDesc.trim();
    if (!codigo || !desc) {
      toast.error("Preencha código e descrição");
      return;
    }
    setSalvandoPlano(true);
    const { data, error } = await supabase
      .from("convenios_planos")
      .insert({ convenio_id: selecionado, codigo_item: codigo, descricao: desc, ativo: true })
      .select("id, convenio_id, codigo_item, descricao, ativo")
      .single();
    setSalvandoPlano(false);
    if (error) {
      toast.error("Erro ao adicionar plano", { description: error.message });
      return;
    }
    setPlanos((prev) => [...prev, data as Plano]);
    setNovoPlanoCodigo("");
    setNovoPlanoDesc("");
    setConvenios((prev) => prev.map((c) => (c.id === selecionado ? { ...c, qtd_planos: (c.qtd_planos ?? 0) + 1 } : c)));
  };

  // ---- Editar convênio ----
  const abrirEditarConv = (c: Convenio) => {
    setEditarConv(c);
    setEditConvNome(c.nome);
    setEditConvAtivo(c.ativo);
  };

  const salvarEditarConv = async () => {
    if (!editarConv) return;
    const nome = editConvNome.trim();
    if (!nome) {
      toast.error("Nome obrigatório");
      return;
    }
    setSalvandoEditConv(true);
    const { error } = await supabase
      .from("convenios_cache")
      .update({ nome, ativo: editConvAtivo, atualizado_em: new Date().toISOString() })
      .eq("id", editarConv.id);
    setSalvandoEditConv(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Convênio atualizado");
    setConvenios((prev) =>
      prev.map((c) => (c.id === editarConv.id ? { ...c, nome, ativo: editConvAtivo } : c)),
    );
    setEditarConv(null);
  };

  // ---- Excluir convênio ----
  const abrirExcluirConv = (c: Convenio) => {
    setExcluirConv(c);
    setConfirmacaoNome("");
  };

  const confirmarExcluirConv = async () => {
    if (!excluirConv) return;
    if (confirmacaoNome.trim() !== excluirConv.nome) return;
    setExcluindoConv(true);
    const { error } = await supabase.from("convenios_cache").delete().eq("id", excluirConv.id);
    setExcluindoConv(false);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    toast.success("Convênio excluído");
    if (selecionado === excluirConv.id) setSelecionado(null);
    setConvenios((prev) => prev.filter((c) => c.id !== excluirConv.id));
    setExcluirConv(null);
    setConfirmacaoNome("");
  };

  // ---- Editar plano ----
  const abrirEditarPlano = (p: Plano) => {
    setEditarPlano(p);
    setEditPlanoCodigo(p.codigo_item);
    setEditPlanoDesc(p.descricao);
    setEditPlanoAtivo(p.ativo);
  };

  const salvarEditarPlano = async () => {
    if (!editarPlano) return;
    const codigo = editPlanoCodigo.trim();
    const desc = editPlanoDesc.trim();
    if (!codigo || !desc) {
      toast.error("Código e descrição obrigatórios");
      return;
    }
    setSalvandoEditPlano(true);
    const { error } = await supabase
      .from("convenios_planos")
      .update({
        codigo_item: codigo,
        descricao: desc,
        ativo: editPlanoAtivo,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", editarPlano.id);
    setSalvandoEditPlano(false);
    if (error) {
      toast.error("Erro ao salvar plano", { description: error.message });
      return;
    }
    toast.success("Plano atualizado");
    setPlanos((prev) =>
      prev.map((p) =>
        p.id === editarPlano.id
          ? { ...p, codigo_item: codigo, descricao: desc, ativo: editPlanoAtivo }
          : p,
      ),
    );
    setEditarPlano(null);
  };

  // ---- Excluir plano ----
  const confirmarExcluirPlano = async () => {
    if (!excluirPlano) return;
    setExcluindoPlano(true);
    const { error } = await supabase.from("convenios_planos").delete().eq("id", excluirPlano.id);
    setExcluindoPlano(false);
    if (error) {
      toast.error("Erro ao excluir plano", { description: error.message });
      return;
    }
    toast.success("Plano excluído");
    setPlanos((prev) => prev.filter((p) => p.id !== excluirPlano.id));
    setConvenios((prev) =>
      prev.map((c) =>
        c.id === selecionado ? { ...c, qtd_planos: Math.max(0, (c.qtd_planos ?? 1) - 1) } : c,
      ),
    );
    setExcluirPlano(null);
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

      const grupos = new Map<number, { descricao: string; itens: { codigo: string; descricao: string }[] }>();
      let linhasInvalidas = 0;
      let planosLidos = 0;

      for (const row of linhas) {
        const idStr = (row["ArquivoCruzado.Id"] ?? "").trim();
        const descConv = (row["ArquivoCruzado.Descricao"] ?? "").trim();
        const codigo = (row["ItemCodigo"] ?? "").trim();
        const descItem = (row["Descricao"] ?? "").trim();
        const idNum = parseInt(idStr, 10);
        if (!idStr || isNaN(idNum) || !descConv || !codigo || !descItem) {
          linhasInvalidas++;
          continue;
        }
        if (!grupos.has(idNum)) grupos.set(idNum, { descricao: descConv, itens: [] });
        grupos.get(idNum)!.itens.push({ codigo, descricao: descItem });
        planosLidos++;
      }

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
        console.error("[convenios upsert fail]", errConv);
        toast.error("Erro ao importar convênios: " + errConv.message);
        return;
      }

      const idMap = new Map<number, string>();
      (conveniosInseridos ?? []).forEach((c: any) => {
        if (c.arquivo_cruzado_id != null) idMap.set(c.arquivo_cruzado_id, c.id);
      });

      const planosDedup = new Map<string, { convenio_id: string; codigo_item: string; descricao: string; ativo: boolean; atualizado_em: string }>();
      let semMatch = 0;
      let dedupCount = 0;
      const agora = new Date().toISOString();

      for (const [acId, grupo] of grupos.entries()) {
        const convId = idMap.get(acId);
        if (!convId) {
          semMatch += grupo.itens.length;
          continue;
        }
        for (const item of grupo.itens) {
          const codigo = item.codigo.trim();
          const descricao = item.descricao.trim();
          if (!codigo || !descricao) continue;
          const chave = `${convId}::${codigo}`;
          const existente = planosDedup.get(chave);
          if (existente) {
            dedupCount++;
            if (descricao.length > existente.descricao.length) existente.descricao = descricao;
          } else {
            planosDedup.set(chave, {
              convenio_id: convId,
              codigo_item: codigo,
              descricao,
              ativo: true,
              atualizado_em: agora,
            });
          }
        }
      }

      const planosUpsert = Array.from(planosDedup.values());

      let planosInseridos = 0;
      const batchesComErro: any[] = [];
      const lote = 500;
      for (let i = 0; i < planosUpsert.length; i += lote) {
        const batch = planosUpsert.slice(i, i + lote);
        const { error } = await supabase
          .from("convenios_planos")
          .upsert(batch, { onConflict: "convenio_id,codigo_item", ignoreDuplicates: false });
        if (error) {
          batchesComErro.push({ batch_index: i, error_message: error.message });
        } else {
          planosInseridos += batch.length;
        }
      }

      toast.success("Importação concluída", {
        description: `${grupos.size} convênios · ${planosInseridos}/${planosLidos} planos · ${dedupCount} dups · ${batchesComErro.length} batches c/ erro`,
      });
      carregar();
    } catch (err: any) {
      toast.error("Erro ao processar planilha", { description: err?.message ?? String(err) });
    } finally {
      setImportando(false);
    }
  };

  const convenioAtual = convenios.find((c) => c.id === selecionado);
  const editConvTemShift =
    !!editarConv?.codigo_shift && !editarConv.codigo_shift.startsWith("manual-");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <Shield className="h-6 w-6" /> Convênios
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerenciados via importação de planilha ou manualmente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModalConvenio(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Novo convênio
          </Button>
          <label>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={importarPlanilha}
              disabled={importando}
            />
            <Button asChild disabled={importando} className="gap-2 text-white cursor-pointer" style={{ backgroundColor: "hsl(var(--brand))" }}>
              <span>
                {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importando ? "Importando..." : "Importar planilha"}
              </span>
            </Button>
          </label>
        </div>
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
                <p className="p-4 text-sm text-muted-foreground">Nenhum convênio.</p>
              ) : (
                <ul>
                  {filtrados.map((c) => (
                    <li key={c.id} className="flex items-center border-b">
                      <button
                        onClick={() => setSelecionado(c.id)}
                        className={cn(
                          "flex flex-1 items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-muted/50",
                          selecionado === c.id && "bg-muted",
                          !c.ativo && "opacity-60",
                        )}
                      >
                        <span className="truncate pr-2">{c.nome}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {c.qtd_planos}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="px-3 py-2.5 text-muted-foreground transition hover:text-foreground"
                            aria-label={`Ações para ${c.nome}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => abrirEditarConv(c)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => abrirExcluirConv(c)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          <CardContent className="space-y-4">
            {!convenioAtual ? (
              <p className="text-sm text-muted-foreground">Escolha um convênio à esquerda para ver seus planos.</p>
            ) : (
              <>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Adicionar plano manualmente</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Código"
                      value={novoPlanoCodigo}
                      onChange={(e) => setNovoPlanoCodigo(e.target.value)}
                      className="sm:max-w-[140px]"
                    />
                    <Input
                      placeholder="Descrição"
                      value={novoPlanoDesc}
                      onChange={(e) => setNovoPlanoDesc(e.target.value)}
                    />
                    <Button onClick={adicionarPlano} disabled={salvandoPlano} className="gap-2">
                      {salvandoPlano ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Adicionar
                    </Button>
                  </div>
                </div>
                {planos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Este convênio ainda não tem planos.</p>
                ) : (
                  <div className="max-h-[calc(100vh-380px)] overflow-y-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Código</th>
                          <th className="px-3 py-2 text-left font-medium">Descrição</th>
                          <th className="px-3 py-2 text-right font-medium w-20">Ativo</th>
                          <th className="px-3 py-2 text-right font-medium w-24">Ações</th>
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
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => abrirEditarPlano(p)}
                                  aria-label="Editar plano"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setExcluirPlano(p)}
                                  aria-label="Excluir plano"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Novo convênio */}
      <Dialog open={modalConvenio} onOpenChange={setModalConvenio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo convênio</DialogTitle>
            <DialogDescription>
              Cadastre um convênio manualmente. Você poderá adicionar os planos em seguida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="novo-conv-nome">Nome do convênio</Label>
            <Input
              id="novo-conv-nome"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: Unimed Regional"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") criarConvenio();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConvenio(false)} disabled={salvandoConvenio}>
              Cancelar
            </Button>
            <Button onClick={criarConvenio} disabled={salvandoConvenio} className="gap-2">
              {salvandoConvenio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar convênio */}
      <Dialog open={!!editarConv} onOpenChange={(o) => !o && setEditarConv(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar convênio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-conv-nome">Nome</Label>
              <Input
                id="edit-conv-nome"
                value={editConvNome}
                onChange={(e) => setEditConvNome(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-conv-shift">Código Shift</Label>
              <Input
                id="edit-conv-shift"
                value={editarConv?.codigo_shift ?? ""}
                readOnly
                disabled
                className="font-mono text-xs"
              />
              {editConvTemShift && (
                <p className="text-xs text-amber-700">
                  Código vem da Shift. Alterar pode quebrar o vínculo na próxima sync.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="edit-conv-ativo" className="cursor-pointer">Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Convênios inativos não aparecem para o paciente.
                </p>
              </div>
              <Switch
                id="edit-conv-ativo"
                checked={editConvAtivo}
                onCheckedChange={setEditConvAtivo}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarConv(null)} disabled={salvandoEditConv}>
              Cancelar
            </Button>
            <Button onClick={salvarEditarConv} disabled={salvandoEditConv} className="gap-2">
              {salvandoEditConv && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir convênio */}
      <AlertDialog open={!!excluirConv} onOpenChange={(o) => !o && setExcluirConv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir convênio?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Esta ação é <strong>IRREVERSÍVEL</strong>. Esta operação vai EXCLUIR também todos
                  os <strong>{excluirConv?.qtd_planos ?? 0} planos</strong> vinculados a este convênio.
                </p>
                {excluirConv?.codigo_shift && !excluirConv.codigo_shift.startsWith("manual-") && (
                  <p className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">
                    ⚠️ Este convênio tem <code>codigo_shift</code>. Será recriado vazio (sem planos)
                    na próxima Sync Shift.
                  </p>
                )}
                <p>
                  Para confirmar, digite o nome do convênio:{" "}
                  <strong className="font-mono">{excluirConv?.nome}</strong>
                </p>
                <Input
                  value={confirmacaoNome}
                  onChange={(e) => setConfirmacaoNome(e.target.value)}
                  placeholder="Digite o nome exato"
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindoConv}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmacaoNome.trim() !== excluirConv?.nome || excluindoConv}
              onClick={(e) => {
                e.preventDefault();
                confirmarExcluirConv();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindoConv ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Editar plano */}
      <Dialog open={!!editarPlano} onOpenChange={(o) => !o && setEditarPlano(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-plano-codigo">Código</Label>
              <Input
                id="edit-plano-codigo"
                value={editPlanoCodigo}
                onChange={(e) => setEditPlanoCodigo(e.target.value)}
                className="font-mono"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plano-desc">Descrição</Label>
              <Input
                id="edit-plano-desc"
                value={editPlanoDesc}
                onChange={(e) => setEditPlanoDesc(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="edit-plano-ativo" className="cursor-pointer">Ativo</Label>
              <Switch
                id="edit-plano-ativo"
                checked={editPlanoAtivo}
                onCheckedChange={setEditPlanoAtivo}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarPlano(null)} disabled={salvandoEditPlano}>
              Cancelar
            </Button>
            <Button onClick={salvarEditarPlano} disabled={salvandoEditPlano} className="gap-2">
              {salvandoEditPlano && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir plano */}
      <AlertDialog open={!!excluirPlano} onOpenChange={(o) => !o && setExcluirPlano(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir o plano <strong className="font-mono">{excluirPlano?.codigo_item}</strong> —{" "}
              {excluirPlano?.descricao}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindoPlano}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarExcluirPlano();
              }}
              disabled={excluindoPlano}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindoPlano ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
