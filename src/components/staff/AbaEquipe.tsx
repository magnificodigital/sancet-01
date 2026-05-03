import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Shield } from "lucide-react";

type StaffUsuario = {
  id: string;
  user_id: string;
  email: string;
  nome: string | null;
  role: "admin" | "staff";
  ativo: boolean;
  permissoes: any;
};

type FormNovoUsuario = { nome: string; email: string; senha: string };

const PERMISSOES_PADRAO = {
  pedidos:   { ver: true, editar: false, excluir: false },
  pacientes: { ver: true, editar: false, excluir: false },
  catalogo:  { ver: true, editar: false, excluir: false },
  unidades:  { ver: true, editar: false, excluir: false },
  sync:      { ver: false },
  config:    { ver: false, editar: false },
};

const SECOES_CRUD: Array<{ key: keyof typeof PERMISSOES_PADRAO; label: string }> = [
  { key: "pedidos", label: "Pedidos" },
  { key: "pacientes", label: "Pacientes" },
  { key: "catalogo", label: "Catálogo" },
  { key: "unidades", label: "Unidades" },
];

export const AbaEquipe = () => {
  const [usuarios, setUsuarios] = useState<StaffUsuario[]>([]);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [editando, setEditando] = useState<StaffUsuario | null>(null);
  const [formNovo, setFormNovo] = useState<FormNovoUsuario>({ nome: "", email: "", senha: "" });
  const [salvando, setSalvando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [nomeEdit, setNomeEdit] = useState("");
  const [ativoEdit, setAtivoEdit] = useState(true);
  const [permEdit, setPermEdit] = useState<any>(PERMISSOES_PADRAO);

  const carregar = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("id, user_id, email, nome, role, ativo, permissoes")
      .order("role", { ascending: false })
      .order("nome", { ascending: true });
    setUsuarios((data as any) ?? []);
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNovo = () => {
    setEditando(null);
    setFormNovo({ nome: "", email: "", senha: "" });
    setSheetAberto(true);
  };

  const abrirEditar = (u: StaffUsuario) => {
    setEditando(u);
    setNomeEdit(u.nome ?? "");
    setAtivoEdit(u.ativo);
    setPermEdit(u.permissoes ?? PERMISSOES_PADRAO);
    setSheetAberto(true);
  };

  const criar = async () => {
    if (!formNovo.nome || !formNovo.email || !formNovo.senha) {
      toast.error("Preencha todos os campos");
      return;
    }
    setCriando(true);
    try {
      const { error } = await supabase.functions.invoke("sancet-criar-staff", {
        body: formNovo,
      });
      if (error) throw error;
      toast.success("Usuário criado!");
      setSheetAberto(false);
      await carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar usuário");
    } finally {
      setCriando(false);
    }
  };

  const salvar = async () => {
    if (!editando) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ nome: nomeEdit, ativo: ativoEdit, permissoes: permEdit })
        .eq("id", editando.id);
      if (error) throw error;
      toast.success("Usuário atualizado!");
      setSheetAberto(false);
      await carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  const togglePerm = (secao: string, acao: string, valor: boolean) => {
    setPermEdit((prev: any) => ({
      ...prev,
      [secao]: { ...(prev?.[secao] ?? {}), [acao]: valor },
    }));
  };

  const isAdminEdit = editando?.role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" /> Equipe
        </h2>
        <Button
          onClick={abrirNovo}
          className="gap-1.5 bg-[#C8102E] hover:bg-[#a30d25] text-white"
        >
          <Plus className="h-4 w-4" /> Novo usuário
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.nome ?? "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  {u.role === "admin" ? (
                    <Badge className="bg-[#1B3A6B] hover:bg-[#1B3A6B] text-white">Admin</Badge>
                  ) : (
                    <Badge variant="secondary">Staff</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.ativo}
                    onCheckedChange={async (v) => {
                      await supabase.from("user_roles").update({ ativo: v }).eq("id", u.id);
                      carregar();
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => abrirEditar(u)} className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editando ? "Editar usuário" : "Novo usuário"}</SheetTitle>
          </SheetHeader>

          {!editando ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  value={formNovo.nome}
                  onChange={(e) => setFormNovo({ ...formNovo, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formNovo.email}
                  onChange={(e) => setFormNovo({ ...formNovo, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha temporária</Label>
                <Input
                  type="password"
                  value={formNovo.senha}
                  onChange={(e) => setFormNovo({ ...formNovo, senha: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={editando.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <div>
                  {editando.role === "admin" ? (
                    <Badge className="bg-[#1B3A6B] hover:bg-[#1B3A6B] text-white">Admin</Badge>
                  ) : (
                    <Badge variant="secondary">Staff</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Permissões</Label>
                <div className="rounded-md border divide-y">
                  {SECOES_CRUD.map((s) => (
                    <div key={s.key} className="p-3">
                      <p className="text-sm font-medium mb-2">{s.label}</p>
                      <div className="flex gap-4">
                        {(["ver", "editar", "excluir"] as const).map((acao) => (
                          <label key={acao} className="flex items-center gap-2 text-sm capitalize">
                            <Checkbox
                              checked={!!permEdit?.[s.key]?.[acao]}
                              disabled={isAdminEdit}
                              onCheckedChange={(v) => togglePerm(s.key, acao, !!v)}
                            />
                            {acao}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="p-3">
                    <p className="text-sm font-medium mb-2">Sync</p>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!permEdit?.sync?.ver}
                        disabled={isAdminEdit}
                        onCheckedChange={(v) => togglePerm("sync", "ver", !!v)}
                      />
                      Ver
                    </label>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium mb-2">Configurações</p>
                    <div className="flex gap-4">
                      {(["ver", "editar"] as const).map((acao) => (
                        <label key={acao} className="flex items-center gap-2 text-sm capitalize">
                          <Checkbox
                            checked={!!permEdit?.config?.[acao]}
                            disabled={isAdminEdit}
                            onCheckedChange={(v) => togglePerm("config", acao, !!v)}
                          />
                          {acao}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Usuário ativo</Label>
                <Switch checked={ativoEdit} onCheckedChange={setAtivoEdit} />
              </div>
            </div>
          )}

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetAberto(false)}>
              Cancelar
            </Button>
            {editando ? (
              <Button onClick={salvar} disabled={salvando} className="bg-[#1B3A6B] hover:bg-[#162f58] text-white">
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            ) : (
              <Button onClick={criar} disabled={criando} className="bg-[#C8102E] hover:bg-[#a30d25] text-white">
                {criando ? "Criando..." : "Criar"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
