import { useEffect, useState } from "react";
import { Loader2, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type Un = {
  id: string;
  codigo_shift: string | null;
  nome: string;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  horario: string | null;
  aceita_domicilio: boolean;
  ativo: boolean;
  foto_url: string | null;
};

type Form = {
  codigo_shift: string;
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  horario: string;
  aceita_domicilio: boolean;
  ativo: boolean;
  foto_url: string;
};

const FORM_VAZIO: Form = {
  codigo_shift: "", nome: "", endereco: "", bairro: "",
  cidade: "", uf: "", telefone: "", email: "", horario: "",
  aceita_domicilio: true, ativo: true, foto_url: "",
};

type Props = {
  permissoes?: { unidades: { ver: boolean; editar: boolean; excluir: boolean } } | null;
};

export const AbaUnidades = ({ permissoes }: Props = {}) => {
  if (permissoes?.unidades?.ver === false) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Você não tem permissão para ver esta seção.
      </div>
    );
  }
  const podeEditar = permissoes?.unidades?.editar !== false;
  const podeExcluir = permissoes?.unidades?.excluir !== false;
  const [unidades, setUnidades] = useState<Un[]>([]);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [editando, setEditando] = useState<Un | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [excluindo, setExcluindo] = useState<Un | null>(null);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [deletando, setDeletando] = useState(false);

  const carregar = async () => {
    const { data } = await supabase
      .from("unidades_cache")
      .select("id, codigo_shift, nome, endereco, bairro, cidade, uf, telefone, email, horarios, aceita_domicilio, ativo, foto_url")
      .order("nome");

    const mapped: Un[] = (data ?? []).map((u: any) => ({
      id: u.id,
      codigo_shift: u.codigo_shift ?? null,
      nome: u.nome,
      endereco: u.endereco ?? null,
      bairro: u.bairro ?? null,
      cidade: u.cidade ?? null,
      uf: u.uf ?? null,
      telefone: u.telefone ?? null,
      email: u.email ?? null,
      horario: typeof u.horarios === "string" ? u.horarios : (u.horarios?.texto ?? null),
      aceita_domicilio: !!u.aceita_domicilio,
      ativo: !!u.ativo,
      foto_url: u.foto_url ?? null,
    }));
    setUnidades(mapped);
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setDrawerAberto(true);
  };

  const abrirEditar = (u: Un) => {
    setEditando(u);
    setForm({
      codigo_shift:    u.codigo_shift ?? "",
      nome:            u.nome,
      endereco:        u.endereco ?? "",
      bairro:          u.bairro ?? "",
      cidade:          u.cidade ?? "",
      uf:              u.uf ?? "",
      telefone:        u.telefone ?? "",
      email:           u.email ?? "",
      horario:         u.horario ?? "",
      aceita_domicilio: u.aceita_domicilio,
      ativo:           u.ativo,
      foto_url:        u.foto_url ?? "",
    });
    setDrawerAberto(true);
  };

  const set = <K extends keyof Form>(campo: K, valor: Form[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error("Nome obrigatório."); return; }
    if (!editando && !form.codigo_shift.trim()) {
      toast.error("Código Shift obrigatório para novas unidades.");
      return;
    }
    setSalvando(true);

    const payload: any = {
      codigo_shift:     form.codigo_shift.trim() || null,
      nome:             form.nome.trim(),
      endereco:         form.endereco.trim() || null,
      bairro:           form.bairro.trim() || null,
      cidade:           form.cidade.trim() || null,
      uf:               form.uf || null,
      telefone:         form.telefone.trim() || null,
      email:            form.email.trim() || null,
      horarios:         form.horario.trim() ? { texto: form.horario.trim() } : null,
      aceita_domicilio: form.aceita_domicilio,
      ativo:            form.ativo,
      foto_url:         form.foto_url || null,
      atualizado_em:    new Date().toISOString(),
    };

    const { error } = editando
      ? await supabase.from("unidades_cache").update(payload).eq("id", editando.id)
      : await supabase.from("unidades_cache").insert(payload);

    setSalvando(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }

    toast.success(editando ? "Unidade atualizada!" : "Unidade criada!");
    setDrawerAberto(false);
    carregar();
  };

  const toggleAtivo = async (u: Un, novo: boolean) => {
    setUnidades((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo: novo } : x)));
    const { error } = await supabase.from("unidades_cache").update({ ativo: novo }).eq("id", u.id);
    if (error) {
      toast.error("Erro ao atualizar");
      setUnidades((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo: !novo } : x)));
      return;
    }
    toast.success(novo ? "Ativada" : "Desativada");
  };

  const abrirExcluir = (u: Un) => {
    setExcluindo(u);
    setConfirmacaoTexto("");
  };

  const confirmarExcluir = async () => {
    if (!excluindo) return;
    if (confirmacaoTexto !== excluindo.nome) return;
    setDeletando(true);
    const { error } = await supabase.from("unidades_cache").delete().eq("id", excluindo.id);
    setDeletando(false);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Unidade excluída permanentemente");
    setUnidades((prev) => prev.filter((x) => x.id !== excluindo.id));
    setExcluindo(null);
    setConfirmacaoTexto("");
  };

  const onSelecionarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `unidades/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("imagens-exames")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("imagens-exames").getPublicUrl(path);
      set("foto_url", data.publicUrl);
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const unidadesVisiveis = mostrarInativas ? unidades : unidades.filter((u) => u.ativo);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-secondary">Unidades</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Switch checked={mostrarInativas} onCheckedChange={setMostrarInativas} />
            Mostrar inativas
          </label>
          {podeEditar && (
            <Button
              size="sm"
              onClick={abrirNovo}
              className="gap-1.5 text-white"
              style={{ backgroundColor: "#C8102E" }}
            >
              <Plus className="h-4 w-4" /> Nova unidade
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Domicílio</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-[160px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unidadesVisiveis.map((u) => (
              <TableRow key={u.id} className={!u.ativo ? "opacity-60" : ""}>
                <TableCell>
                  {u.foto_url ? (
                    <img src={u.foto_url} alt={u.nome} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <ImageOff className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{u.nome}</span>
                    {!u.ativo && (
                      <Badge variant="secondary" className="shrink-0 text-xs">Inativa</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[220px] truncate">{u.endereco ?? "—"}</TableCell>
                <TableCell>{u.cidade ? `${u.cidade}${u.uf ? "/" + u.uf : ""}` : "—"}</TableCell>
                <TableCell>{u.telefone ?? "—"}</TableCell>
                <TableCell className="max-w-[180px] truncate">{u.horario ?? "—"}</TableCell>
                <TableCell>{u.aceita_domicilio ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <Switch checked={u.ativo} disabled={!podeEditar} onCheckedChange={(v) => toggleAtivo(u, v)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {podeEditar && (
                      <Button variant="ghost" size="sm" onClick={() => abrirEditar(u)} className="gap-1">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                    )}
                    {podeExcluir && !u.ativo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirExcluir(u)}
                        className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir permanentemente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {unidadesVisiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  {unidades.length === 0
                    ? 'Nenhuma unidade. Clique em "Nova unidade" para adicionar.'
                    : "Nenhuma unidade ativa. Ative o filtro \"Mostrar inativas\" para ver as desativadas."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!excluindo} onOpenChange={(open) => { if (!open) { setExcluindo(null); setConfirmacaoTexto(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir unidade permanentemente</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm">
                <p>
                  Esta ação é <strong>IRREVERSÍVEL</strong>. Para confirmar, digite o nome da unidade:{" "}
                  <strong>{excluindo?.nome}</strong>
                </p>
                {excluindo?.codigo_shift && /^\d+$/.test(excluindo.codigo_shift) && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                    ⚠️ Esta unidade tem <code className="font-mono">codigo_shift</code> numérico (vinda da Shift).
                    O próximo Sync Shift vai recriá-la sem foto.
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmacaoTexto}
            onChange={(e) => setConfirmacaoTexto(e.target.value)}
            placeholder="Digite o nome exato da unidade"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setExcluindo(null); setConfirmacaoTexto(""); }}
              disabled={deletando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExcluir}
              disabled={deletando || !excluindo || confirmacaoTexto !== excluindo.nome}
              className="gap-1.5"
            >
              {deletando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editando ? "Editar unidade" : "Nova unidade"}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex: Unidade Centro"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Código Shift {editando ? "" : "*"}</Label>
              <Input
                value={form.codigo_shift}
                onChange={(e) => set("codigo_shift", e.target.value)}
                placeholder="Preenchido automaticamente pelo sync"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input
                value={form.endereco}
                onChange={(e) => set("endereco", e.target.value)}
                placeholder="Rua, número"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input
                value={form.bairro}
                onChange={(e) => set("bairro", e.target.value)}
                placeholder="Centro"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => set("cidade", e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={form.uf} onValueChange={(v) => set("uf", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                placeholder="(11) 3000-0000"
              />
            </div>

            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contato@sancet.com.br"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Horário de funcionamento</Label>
              <Input
                value={form.horario}
                onChange={(e) => set("horario", e.target.value)}
                placeholder="Seg–Sex 7h–17h / Sáb 7h–12h"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Foto da unidade</Label>
              {form.foto_url && (
                <img
                  src={form.foto_url}
                  alt="Prévia da foto da unidade"
                  className="max-h-32 w-full rounded-lg object-cover"
                />
              )}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>Escolher imagem</>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={onSelecionarFoto}
                />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Atende em domicílio</Label>
              <Switch
                checked={form.aceita_domicilio}
                onCheckedChange={(v) => set("aceita_domicilio", v)}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="cursor-pointer">Ativo</Label>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => set("ativo", v)}
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
                className="flex-1"
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
