import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Unidade = { id: string; nome: string; codigo_shift: string };

type Props = {
  userId: string | null;
  userEmail: string;
  role: "admin" | "staff";
  aberto: boolean;
  onFechar: () => void;
  onMudou?: () => void;
};

export const GerenciarUnidadesUsuario = ({
  userId,
  userEmail,
  role,
  aberto,
  onFechar,
  onMudou,
}: Props) => {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [atribuidas, setAtribuidas] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);

  const carregar = async () => {
    if (!userId) return;
    setCarregando(true);
    const [u, vinc] = await Promise.all([
      supabase.from("unidades_cache").select("id, nome, codigo_shift").eq("ativo", true).order("nome"),
      supabase.from("user_unidades").select("unidade_id").eq("user_id", userId),
    ]);
    setUnidades((u.data as Unidade[]) ?? []);
    setAtribuidas(new Set(((vinc.data as any[]) ?? []).map((r) => r.unidade_id)));
    setCarregando(false);
  };

  useEffect(() => {
    if (aberto && userId && role === "staff") carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, userId, role]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return unidades;
    return unidades.filter((u) => u.nome.toLowerCase().includes(q));
  }, [unidades, busca]);

  const alternar = async (unidadeId: string, marcar: boolean) => {
    if (!userId) return;
    // otimistic
    setAtribuidas((prev) => {
      const n = new Set(prev);
      if (marcar) n.add(unidadeId);
      else n.delete(unidadeId);
      return n;
    });

    if (marcar) {
      const { error } = await supabase
        .from("user_unidades")
        .insert({ user_id: userId, unidade_id: unidadeId });
      if (error) {
        toast.error("Não foi possível atribuir");
        setAtribuidas((prev) => {
          const n = new Set(prev);
          n.delete(unidadeId);
          return n;
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_unidades")
        .delete()
        .eq("user_id", userId)
        .eq("unidade_id", unidadeId);
      if (error) {
        toast.error("Não foi possível remover");
        setAtribuidas((prev) => {
          const n = new Set(prev);
          n.add(unidadeId);
          return n;
        });
        return;
      }
    }
    onMudou?.();
  };

  const marcarTodas = async () => {
    if (!userId) return;
    const faltam = unidades.filter((u) => !atribuidas.has(u.id));
    if (!faltam.length) return;
    setAtribuidas(new Set(unidades.map((u) => u.id)));
    const { error } = await supabase
      .from("user_unidades")
      .insert(faltam.map((u) => ({ user_id: userId, unidade_id: u.id })));
    if (error) {
      toast.error("Erro ao marcar todas");
      carregar();
      return;
    }
    onMudou?.();
  };

  const desmarcarTodas = async () => {
    if (!userId) return;
    setAtribuidas(new Set());
    const { error } = await supabase
      .from("user_unidades")
      .delete()
      .eq("user_id", userId);
    if (error) {
      toast.error("Erro ao desmarcar todas");
      carregar();
      return;
    }
    onMudou?.();
  };

  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Gerenciar unidades
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{userEmail}</p>
            <div className="mt-1">
              {role === "admin" ? (
                <Badge className="bg-[#1B3A6B] hover:bg-[#1B3A6B] text-white">Admin</Badge>
              ) : (
                <Badge variant="secondary">Staff</Badge>
              )}
            </div>
          </div>

          {role === "admin" ? (
            <Alert className="border-blue-200 bg-blue-50 text-blue-900">
              <ShieldCheck className="h-4 w-4 !text-blue-700" />
              <AlertDescription>
                Administradores têm acesso a todas as unidades automaticamente.
                Não é necessário atribuir.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {atribuidas.size} de {unidades.length} unidades atribuídas
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={marcarTodas}>
                    Marcar todas
                  </Button>
                  <Button size="sm" variant="outline" onClick={desmarcarTodas}>
                    Desmarcar todas
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar unidade..."
                  className="pl-9"
                />
              </div>

              <div className="max-h-[55vh] overflow-y-auto rounded-md border divide-y">
                {carregando && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Carregando...
                  </p>
                )}
                {!carregando && filtradas.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma unidade encontrada.
                  </p>
                )}
                {filtradas.map((u) => {
                  const marcada = atribuidas.has(u.id);
                  return (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={marcada}
                        onCheckedChange={(v) => alternar(u.id, !!v)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{u.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {u.codigo_shift}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
