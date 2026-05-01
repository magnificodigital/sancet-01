import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatarData } from "./utils";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const POR_PAGINA = 20;

type Pac = {
  id: string;
  nome: string | null;
  cpf: string;
  email: string | null;
  celular: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  created_at: string | null;
};

type Form = {
  nome: string;
  cpf: string;
  email: string;
  celular: string;
  data_nascimento: string;
  sexo: string;
  cidade: string;
  uf: string;
  cep: string;
};

const FORM_VAZIO: Form = {
  nome: "", cpf: "", email: "", celular: "",
  data_nascimento: "", sexo: "", cidade: "", uf: "", cep: "",
};

export const AbaPacientes = () => {
  const [pacientes, setPacientes] = useState<Pac[]>([]);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [editando, setEditando] = useState<Pac | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const { data } = await supabase
      .from("pacientes")
      .select("id, nome, cpf, email, celular, data_nascimento, sexo, cidade, uf, cep, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setPacientes((data as Pac[]) ?? []);
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setDrawerAberto(true);
  };

  const abrirEditar = (p: Pac) => {
    setEditando(p);
    setForm({
      nome:            p.nome ?? "",
      cpf:             p.cpf,
      email:           p.email ?? "",
      celular:         p.celular ?? "",
      data_nascimento: p.data_nascimento ?? "",
      sexo:            p.sexo ?? "",
      cidade:          p.cidade ?? "",
      uf:              p.uf ?? "",
      cep:             p.cep ?? "",
    });
    setDrawerAberto(true);
  };

  const set = <K extends keyof Form>(campo: K, valor: Form[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error("Nome obrigatório."); return; }
    if (!form.cpf.trim())  { toast.error("CPF obrigatório."); return; }
    if (!form.data_nascimento) { toast.error("Data de nascimento obrigatória."); return; }
    setSalvando(true);

    const payload: any = {
      nome:            form.nome.trim(),
      cpf:             form.cpf.replace(/\D/g, ""),
      email:           form.email.trim() || null,
      celular:         form.celular.trim() || null,
      data_nascimento: form.data_nascimento || null,
      sexo:            form.sexo || null,
      cidade:          form.cidade.trim() || null,
      uf:              form.uf || null,
      cep:             form.cep.replace(/\D/g, "") || null,
    };

    const { error } = editando
      ? await supabase.from("pacientes").update(payload).eq("id", editando.id)
      : await supabase.from("pacientes").insert(payload);

    setSalvando(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success(editando ? "Paciente atualizado!" : "Paciente cadastrado!");
    setDrawerAberto(false);
    carregar();
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter(
      (p) =>
        (p.nome ?? "").toLowerCase().includes(q) ||
        p.cpf.includes(q) ||
        (p.email ?? "").toLowerCase().includes(q),
    );
  }, [pacientes, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const fatia        = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-secondary">Pacientes</h1>
        <Button
          size="sm"
          onClick={abrirNovo}
          className="gap-1.5 text-white"
          style={{ backgroundColor: "#C8102E" }}
        >
          <Plus className="h-4 w-4" /> Novo paciente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
          placeholder="Buscar por nome, CPF ou e-mail..."
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Cadastrado em</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fatia.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-[220px] truncate">{p.nome ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{p.cpf}</TableCell>
                <TableCell className="max-w-[200px] truncate">{p.email ?? "—"}</TableCell>
                <TableCell>{p.celular ?? "—"}</TableCell>
                <TableCell>
                  {p.cidade ? `${p.cidade}${p.uf ? "/" + p.uf : ""}` : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatarData(p.created_at)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(p)} className="gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {fatia.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {paginaAtual} de {totalPaginas} · {filtrados.length} pacientes
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={paginaAtual === 1}
              onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={paginaAtual === totalPaginas}
              onClick={() => setPagina((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editando ? "Editar paciente" : "Novo paciente"}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Nome do paciente"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CPF *</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => set("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  className="font-mono"
                  disabled={!!editando}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de nascimento *</Label>
                <Input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => set("data_nascimento", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select value={form.sexo} onValueChange={(v) => set("sexo", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Feminino</SelectItem>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="O">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Celular</Label>
                <Input
                  value={form.celular}
                  onChange={(e) => set("celular", e.target.value)}
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input
                  value={form.cep}
                  onChange={(e) => set("cep", e.target.value)}
                  placeholder="00000-000"
                />
              </div>
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
