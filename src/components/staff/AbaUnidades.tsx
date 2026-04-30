import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Un = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  aceita_domicilio: boolean;
  ativo: boolean;
};

export const AbaUnidades = () => {
  const [unidades, setUnidades] = useState<Un[]>([]);

  const carregar = async () => {
    const { data } = await supabase
      .from("unidades_cache")
      .select("id, nome, cidade, uf, telefone, aceita_domicilio, ativo")
      .order("nome");
    setUnidades((data as Un[]) ?? []);
  };

  useEffect(() => {
    carregar();
  }, []);

  const toggleAtivo = async (u: Un, novo: boolean) => {
    setUnidades((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo: novo } : x)));
    const { error } = await supabase
      .from("unidades_cache")
      .update({ ativo: novo })
      .eq("id", u.id);
    if (error) {
      toast.error("Erro ao atualizar");
      setUnidades((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo: !novo } : x)));
      return;
    }
    toast.success(novo ? "Ativado" : "Desativado");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-secondary">Unidades</h1>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Atende domicílio</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unidades.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="max-w-[240px] truncate">{u.nome}</TableCell>
                <TableCell>{u.cidade ?? "—"}</TableCell>
                <TableCell>{u.uf ?? "—"}</TableCell>
                <TableCell>{u.telefone ?? "—"}</TableCell>
                <TableCell>{u.aceita_domicilio ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <Switch
                    checked={u.ativo}
                    onCheckedChange={(v) => toggleAtivo(u, v)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {unidades.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhuma unidade.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
