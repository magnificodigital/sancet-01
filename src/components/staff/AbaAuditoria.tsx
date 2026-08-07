import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  ator_email: string | null;
  paciente_nome: string | null;
  acao: string;
  detalhe: string | null;
  criado_em: string;
};

const ACAO_LABEL: Record<string, string> = {
  ver_paciente: "Abriu cadastro do paciente",
  ver_pedido: "Abriu pedido",
  ver_resultado: "Visualizou resultado",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const AbaAuditoria = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("auditoria_acesso")
        .select("id, ator_email, paciente_nome, acao, detalhe, criado_em")
        .order("criado_em", { ascending: false })
        .limit(300);
      if (error) setErro(error.message);
      setRows((data as Row[]) ?? []);
      setCarregando(false);
    })();
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Registro de acessos da equipe a dados de paciente (LGPD — rastreabilidade). Mostra os 300 mais recentes.
      </p>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Quem acessou</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Detalhe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(r.criado_em)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.ator_email ?? "—"}</TableCell>
                <TableCell>{ACAO_LABEL[r.acao] ?? r.acao}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.paciente_nome ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.detalhe ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!carregando && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {erro
                    ? "Não foi possível carregar (a tabela de auditoria pode ainda não existir — rode o SQL)."
                    : "Nenhum acesso registrado ainda."}
                </TableCell>
              </TableRow>
            )}
            {carregando && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
