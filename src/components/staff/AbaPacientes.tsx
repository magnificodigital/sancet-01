import { useEffect, useMemo, useState } from "react";
import { Pencil, Search, Trash2, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatarData } from "./utils";

const POR_PAGINA = 20;
const COR_PRIMARIA = "#1B3A6B";

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

// ===== Máscaras =====
const mascararCPF = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const mascararCelular = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const mascararCEP = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
};

type Props = {
  permissoes?: { pacientes: { ver: boolean; editar: boolean; excluir: boolean } } | null;
};

export const AbaPacientes = ({ permissoes }: Props = {}) => {
  if (permissoes?.pacientes?.ver === false) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Você não tem permissão para ver esta seção.
      </div>
    );
  }
  const podeEditar = permissoes?.pacientes?.editar !== false;
  const [pacientes, setPacientes] = useState<Pac[]>([]);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState<Pac | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

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
    setPacienteEditando(null);
    setForm(FORM_VAZIO);
    setSheetAberto(true);
  };

  const abrirEditar = (p: Pac) => {
    setPacienteEditando(p);
    setForm({
      nome:            p.nome ?? "",
      cpf:             mascararCPF(p.cpf),
      email:           p.email ?? "",
      celular:         p.celular ? mascararCelular(p.celular) : "",
      data_nascimento: p.data_nascimento ?? "",
      sexo:            p.sexo ?? "",
      cidade:          p.cidade ?? "",
      uf:              p.uf ?? "",
      cep:             p.cep ? mascararCEP(p.cep) : "",
    });
    setSheetAberto(true);
  };

  const set = <K extends keyof Form>(campo: K, valor: Form[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) { toast.error("CEP inválido."); return; }
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado."); return; }
      setForm((prev) => ({
        ...prev,
        cidade: data.localidade ?? prev.cidade,
        uf:     (data.uf ?? prev.uf).toUpperCase(),
      }));
      toast.success("Endereço preenchido!");
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  };

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error("Nome obrigatório."); return; }
    const cpfLimpo = form.cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) { toast.error("CPF inválido."); return; }
    if (!form.data_nascimento) { toast.error("Data de nascimento obrigatória."); return; }

    setSalvando(true);

    // Verificar CPF duplicado em novos cadastros
    if (!pacienteEditando) {
      const { data: existente } = await supabase
        .from("pacientes")
        .select("id")
        .eq("cpf", cpfLimpo)
        .maybeSingle();
      if (existente) {
        setSalvando(false);
        toast.error("CPF já cadastrado");
        return;
      }
    }

    const payload: any = {
      nome:            form.nome.trim(),
      email:           form.email.trim() || null,
      celular:         form.celular.replace(/\D/g, "") || null,
      data_nascimento: form.data_nascimento || null,
      sexo:            form.sexo || null,
      cidade:          form.cidade.trim() || null,
      uf:              form.uf.toUpperCase() || null,
      cep:             form.cep.replace(/\D/g, "") || null,
    };

    const { error } = pacienteEditando
      ? await supabase.from("pacientes").update(payload).eq("id", pacienteEditando.id)
      : await supabase.from("pacientes").upsert({ ...payload, cpf: cpfLimpo }, { onConflict: "cpf" });

    setSalvando(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Paciente salvo");
    setSheetAberto(false);
    carregar();
  };

  const excluir = async () => {
    if (!pacienteEditando) return;
    if (!window.confirm(`Excluir o paciente ${pacienteEditando.nome ?? pacienteEditando.cpf}?`)) return;

    setExcluindo(true);

    const { count } = await supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("paciente_id", pacienteEditando.id);

    if (count && count > 0) {
      setExcluindo(false);
      toast.error("Paciente possui pedidos e não pode ser excluído");
      return;
    }

    const { error } = await supabase
      .from("pacientes")
      .delete()
      .eq("id", pacienteEditando.id);

    setExcluindo(false);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Paciente excluído");
    setSheetAberto(false);
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
        {podeEditar && (
          <Button
            size="sm"
            onClick={abrirNovo}
            className="gap-1.5 text-white hover:opacity-90"
            style={{ backgroundColor: COR_PRIMARIA }}
          >
            <UserPlus className="h-4 w-4" /> Novo paciente
          </Button>
        )}
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
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fatia.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-[220px] truncate">{p.nome ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{mascararCPF(p.cpf)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{p.email ?? "—"}</TableCell>
                <TableCell>{p.celular ? mascararCelular(p.celular) : "—"}</TableCell>
                <TableCell>
                  {p.cidade ? `${p.cidade}${p.uf ? "/" + p.uf : ""}` : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatarData(p.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  {podeEditar && (
                    <Button variant="outline" size="sm" onClick={() => abrirEditar(p)} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  )}
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

      <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[480px] flex flex-col">
          <SheetHeader>
            <SheetTitle>{pacienteEditando ? "Editar paciente" : "Novo paciente"}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4 flex-1">
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
                  onChange={(e) => set("cpf", mascararCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="font-mono"
                  disabled={!!pacienteEditando}
                  maxLength={14}
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
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
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

            <div className="space-y-1.5">
              <Label>Celular</Label>
              <Input
                value={form.celular}
                onChange={(e) => set("celular", mascararCelular(e.target.value))}
                placeholder="(11) 99999-0000"
                maxLength={15}
              />
            </div>

            <div className="space-y-1.5">
              <Label>CEP</Label>
              <div className="flex gap-2">
                <Input
                  value={form.cep}
                  onChange={(e) => set("cep", mascararCEP(e.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={buscarCep}
                  disabled={buscandoCep}
                  className="shrink-0"
                >
                  {buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_80px] gap-3">
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
                <Input
                  value={form.uf}
                  onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  maxLength={2}
                  className="uppercase"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            <div className="flex gap-2 w-full">
              <Button
                onClick={salvar}
                disabled={salvando || excluindo}
                className="flex-1 text-white hover:opacity-90"
                style={{ backgroundColor: COR_PRIMARIA }}
              >
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSheetAberto(false)}
                disabled={salvando || excluindo}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
            {pacienteEditando && (
              <Button
                variant="destructive"
                onClick={excluir}
                disabled={salvando || excluindo}
                className="w-full gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                {excluindo ? "Excluindo..." : "Excluir paciente"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
