import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarPreco } from "./utils";

type Item = {
  id: string;
  nome: string;
  codigo_shift: string;
  categoria: string | null;
  preco_centavos: number | null;
  disponivel_na_unidade: boolean;
  disponivel_em_casa: boolean;
  ativo: boolean;
};

const Tabela = ({ tabela }: { tabela: "exames_cache" | "vacinas_cache" }) => {
  const [itens, setItens] = useState<Item[]>([]);
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    const { data } = await supabase
      .from(tabela)
      .select(
        "id, nome, codigo_shift, categoria, preco_centavos, disponivel_na_unidade, disponivel_em_casa, ativo",
      )
      .order("nome");
    setItens((data as Item[]) ?? []);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela]);

  const toggleAtivo = async (item: Item, novo: boolean) => {
    setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: novo } : i)));
    const { error } = await supabase.from(tabela).update({ ativo: novo }).eq("id", item.id);
    if (error) {
      toast.error("Erro ao atualizar");
      setItens((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: !novo } : i)));
      return;
    }
    toast.success(novo ? "Ativado" : "Desativado");
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((i) => i.nome.toLowerCase().includes(q));
  }, [itens, busca]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Em casa</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="max-w-[260px] truncate">{i.nome}</TableCell>
                <TableCell className="font-mono text-xs">{i.codigo_shift}</TableCell>
                <TableCell className="text-xs">{i.categoria ?? "—"}</TableCell>
                <TableCell>{formatarPreco(i.preco_centavos)}</TableCell>
                <TableCell>{i.disponivel_na_unidade ? "Sim" : "Não"}</TableCell>
                <TableCell>{i.disponivel_em_casa ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <Switch
                    checked={i.ativo}
                    onCheckedChange={(v) => toggleAtivo(i, v)}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum item.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const AbaCatalogo = () => (
  <div className="space-y-5">
    <h1 className="text-2xl font-bold text-secondary">Catálogo</h1>
    <Tabs defaultValue="exames">
      <TabsList>
        <TabsTrigger value="exames">Exames</TabsTrigger>
        <TabsTrigger value="vacinas">Vacinas</TabsTrigger>
      </TabsList>
      <TabsContent value="exames" className="mt-4">
        <Tabela tabela="exames_cache" />
      </TabsContent>
      <TabsContent value="vacinas" className="mt-4">
        <Tabela tabela="vacinas_cache" />
      </TabsContent>
    </Tabs>
  </div>
);
