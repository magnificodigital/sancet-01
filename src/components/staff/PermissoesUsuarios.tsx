import { Fragment, useEffect, useMemo, useState } from "react";
import { Crown, Loader2, RotateCcw, Save, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ACAO_LABEL, MODULOS, PERFIS, type Acao, type Permissoes } from "@/lib/permissoes";

const db = supabase as any;

type Usuario = {
  user_id: string;
  email: string;
  nome: string | null;
  role: "admin" | "staff";
  ativo: boolean;
  super_admin: boolean;
  permissoes: Permissoes; // efetivas
  personalizadas: Permissoes | null; // gravadas (null = padrão do papel)
};

const GRUPOS = [...new Set(MODULOS.map((m) => m.grupo))];
const ACOES: Acao[] = ["ver", "editar", "excluir"];

/** Super Admin > Permissões: o que cada usuário pode ver, editar e apagar. */
export const PermissoesUsuarios = ({ meuId }: { meuId: string | null }) => {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [busca, setBusca] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [perm, setPerm] = useState<Permissoes>({});
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [alterado, setAlterado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = async (manterSel?: string | null) => {
    const { data, error } = await db.rpc("equipe_permissoes");
    if (error) return toast.error(error.message);
    setUsuarios(data ?? []);
    const alvo = (data ?? []).find((u: Usuario) => u.user_id === (manterSel ?? selId)) ?? (data ?? [])[0];
    if (alvo) selecionar(alvo);
  };
  useEffect(() => {
    carregar();
  }, []);

  const selecionar = (u: Usuario) => {
    setSelId(u.user_id);
    setPerm(JSON.parse(JSON.stringify(u.permissoes ?? {})));
    setRole(u.role);
    setAlterado(false);
  };
  const sel = usuarios?.find((u) => u.user_id === selId) ?? null;

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (usuarios ?? []).filter((u) => !q || `${u.nome ?? ""} ${u.email}`.toLowerCase().includes(q));
  }, [usuarios, busca]);

  const marcar = (modulo: string, acao: Acao, v: boolean) => {
    setPerm((p) => {
      const atual = { ...(p[modulo] ?? {}) };
      atual[acao] = v;
      // Editar/apagar implica ver; tirar "ver" tira o resto.
      if (v && acao !== "ver") atual.ver = true;
      if (!v && acao === "ver") {
        if ("editar" in atual) atual.editar = false;
        if ("excluir" in atual) atual.excluir = false;
      }
      return { ...p, [modulo]: atual };
    });
    setAlterado(true);
  };

  const aplicarPerfil = (perfil: Permissoes) => {
    setPerm(JSON.parse(JSON.stringify(perfil)));
    setAlterado(true);
  };

  const salvar = async (padrao = false) => {
    if (!sel) return;
    if (padrao && !window.confirm("Voltar ao padrão do papel? (Admin = tudo; Staff = Recepção)")) return;
    setSalvando(true);
    // Grava a grade completa (só as áreas/ações conhecidas).
    const limpo: Permissoes = Object.fromEntries(
      MODULOS.map((m) => [m.id, Object.fromEntries(m.acoes.map((a) => [a, !!perm[m.id]?.[a]]))]),
    );
    const { error } = await db.rpc("definir_permissoes", {
      _user_id: sel.user_id,
      _permissoes: padrao ? null : limpo,
      _role: role !== sel.role ? role : null,
    });
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success(padrao ? "Permissões voltaram ao padrão." : `Permissões de ${sel.nome || sel.email} salvas.`);
    carregar(sel.user_id);
  };

  if (!usuarios) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Usuários */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar usuário" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="max-h-[560px] space-y-1 overflow-y-auto rounded-lg border p-1">
          {filtrados.map((u) => (
            <button
              key={u.user_id}
              onClick={() => (alterado && !window.confirm("Descartar alterações não salvas?") ? null : selecionar(u))}
              className={cn("w-full rounded-md px-3 py-2 text-left hover:bg-muted", u.user_id === selId && "bg-secondary/10")}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("truncate text-sm font-medium", !u.ativo && "text-muted-foreground line-through")}>{u.nome || u.email}</span>
                {u.super_admin && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{u.role === "admin" ? "Admin" : "Staff"}</span>
                {u.personalizadas && <span className="text-[10px] text-secondary">· personalizado</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Grade */}
      {sel && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{sel.nome || sel.email}</p>
              <p className="text-xs text-muted-foreground">{sel.email}</p>
            </div>
            <div className="w-40">
              <Select
                value={role}
                disabled={sel.user_id === meuId || sel.super_admin}
                onValueChange={(v) => {
                  setRole(v as "admin" | "staff");
                  setAlterado(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {sel.super_admin ? (
            <p className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <Crown className="h-4 w-4" /> Super admin tem acesso total. Para limitar, remova-o dos super admins primeiro.
            </p>
          ) : (
            <>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Aplicar perfil pronto</p>
                <div className="flex flex-wrap gap-1.5">
                  {PERFIS.map((p) => (
                    <Button key={p.id} type="button" size="sm" variant="outline" title={p.desc} onClick={() => aplicarPerfil(p.permissoes)}>
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Área</th>
                      {ACOES.map((a) => (
                        <th key={a} className="w-20 px-2 py-2 text-center font-medium">
                          {ACAO_LABEL[a]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GRUPOS.map((g) => (
                      <Fragment key={g}>
                        <tr key={`g-${g}`} className="bg-muted/20">
                          <td colSpan={4} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {g}
                          </td>
                        </tr>
                        {MODULOS.filter((m) => m.grupo === g).map((m) => (
                          <tr key={m.id} className="border-t">
                            <td className="px-3 py-2">
                              <p>{m.label}</p>
                              {m.dica && <p className="text-[11px] text-muted-foreground">{m.dica}</p>}
                            </td>
                            {ACOES.map((a) => (
                              <td key={a} className="px-2 py-2 text-center">
                                {m.acoes.includes(a) ? (
                                  <Checkbox checked={!!perm[m.id]?.[a]} onCheckedChange={(v) => marcar(m.id, a, !!v)} aria-label={`${ACAO_LABEL[a]} ${m.label}`} />
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Vale no painel e no banco de dados (não dá para burlar pela tela). As unidades que a pessoa atende continuam em Equipe.
              </p>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
            {!sel.super_admin && sel.personalizadas && (
              <Button variant="ghost" onClick={() => salvar(true)} disabled={salvando}>
                <RotateCcw className="mr-1 h-4 w-4" /> Voltar ao padrão
              </Button>
            )}
            <Button onClick={() => salvar(false)} disabled={!alterado || salvando || sel.super_admin}>
              {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Salvar permissões
            </Button>
          </div>
          {sel.personalizadas ? (
            <Badge variant="secondary">Permissões personalizadas</Badge>
          ) : (
            <Badge variant="outline">Usando o padrão do papel ({sel.role === "admin" ? "tudo" : "Recepção"})</Badge>
          )}
        </div>
      )}
    </div>
  );
};
