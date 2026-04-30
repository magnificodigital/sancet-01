import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
  cep: string | null;
  telefone: string | null;
  email: string | null;
  horario: string | null;
  aceita_domicilio: boolean;
  ativo: boolean;
};

type Form = {
  codigo_shift: string;
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  horario: string;
  aceita_domicilio: boolean;
  ativo: boolean;
};

const FORM_VAZIO: Form = {
  codigo_shift: "", nome: "", endereco: "", bairro: "", cidade: "",
  uf: "", cep: "", telefone: "", email: "", horario: "",
  aceita_domicilio: true, ativo: true,
};

export const AbaUnidades = () => {
  const [unidades, setUnidades] = useState<Un[]>([]);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [editando, setEditando] = useState<Un | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const { data } = await supabase
      .from("unidades_cache")
      .select("id, codigo_shift, nome, endereco, bairro, cidade, uf, cep, telefone, email, horarios, aceita_domicilio, ativo")
      .order("nome");

    const mapped: Un[] = (data ?? []).map((u: any) => ({
      id: u.id,
      codigo_shift: u.codigo_shift ?? null,
      nome: u.nome,
      endereco: u.endereco ?? null,
      bairro: u.bairro ?? null,
      cidade: u.cidade ?? null,
      uf: u.uf ?? null,
      cep: u.cep ?? null,
      telefone: u.telefone ?? null,
      email: u.email ?? null,
      horario: typeof u.horarios === "string" ? u.horarios : (u.horarios?.texto ?? null),
      aceita_domicilio: !!u.aceita_domicilio,
      ativo: !!u.ativo,
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
      codigo_shift:     u.codigo_shift ?? "",
      nome:             u.nome,
      endereco:         u.endereco ?? "",
      bairro:           u.bairro ?? "",
      cidade:           u.cidade ?? "",
      uf:               u.uf ?? "",
      cep:              u.cep ?? "",
      telefone:         u.telefone ?? "",
      email:            u.email ?? "",
      horario:          u.horario ?? "",
      aceita_domicilio: u.aceita_domicilio,
      ativo:            u.ativo,
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
      codigo_shift:     form.codigo_shift.trim(),
      nome:             form.nome.trim(),
      endereco:         form.endereco.trim() || null,
      bairro:           form.bairro.trim() || null,
      cidade:           form.cidade.trim() || null,
      uf:               form.uf || null,
      cep:              form.cep.trim() || null,
      telefone:         form.telefone.trim() || null,
      email:            form.email.trim() || null,
      horarios:         form.horario.trim() ? { texto: form.horario.trim() } : null,
      aceita_domicilio: form.aceita_domicilio,
      ativo:            form.ativo,
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-secondary">Unidades</h1>
        <Button
          size="sm"
          onClick={abrirNovo}
          className="gap-1.5 text-white"
          style={{ backgroundColor: "#C8102E" }}
        >
          <Plus className="h-4 w-4" /> Nova unidade
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Domicílio</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unidades.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="max-w-[220px] truncate">{u.nome}</TableCell>
                <TableCell className="max-w-[220px] truncate">{u.endereco ?? "—"}</TableCell>
                <TableCell>{u.cidade ? `${u.cidade}${u.uf ? "/" + u.uf : ""}` : "—"}</TableCell>
                <TableCell>{u.telefone ?? "—"}</TableCell>
                <TableCell className="max-w-[180px] truncate">{u.horario ?? "—"}</TableCell>
                <TableCell>{u.aceita_domicilio ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <Switch checked={u.ativo} onCheckedChange={(v) => toggleAtivo(u, v)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(u)} className="gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {unidades.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhuma unidade. Clique em "Nova unidade" para adicionar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
              <Label>CEP</Label>
              <Input
                value={form.cep}
                onChange={(e) => set("cep", e.target.value)}
                placeholder="00000-000"
              />
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
                placeholder="contato@unidade.com.br"
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
