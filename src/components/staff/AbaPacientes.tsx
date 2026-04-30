import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarData } from "./utils";

type Pac = {
  id: string;
  nome: string | null;
  cpf: string;
  email: string | null;
  celular: string | null;
  cidade: string | null;
  uf: string | null;
  created_at: string | null;
};

const POR_PAGINA = 20;

export const AbaPacientes = () => {
  const [pacientes, setPacientes] = useState<Pac[]>([]);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    supabase
      .from("pacientes")
      .select("id, nome, cpf, email, celular, cidade, uf, created_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setPacientes((data as Pac[]) ?? []));
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter(
      (p) =>
        (p.nome ?? "").toLowerCase().includes(q) ||
        p.cpf.toLowerCase().includes(q),
    );
  }, [pacientes, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const fatia = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-secondary">Pacientes</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
          placeholder="Buscar por nome ou CPF..."
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
              </TableRow>
            ))}
            {fatia.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum paciente.
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
    </div>
  );
};
