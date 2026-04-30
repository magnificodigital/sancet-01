import { Eye, Building2, Home } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BadgeStatus } from "./BadgeStatus";
import { formatarData, Pedido } from "./utils";

type Props = {
  pedidos: Pedido[];
  onAbrir: (p: Pedido) => void;
  vazioMsg?: string;
};

export const TabelaPedidos = ({ pedidos, onAbrir, vazioMsg = "Nenhum pedido." }: Props) => {
  if (pedidos.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center text-sm text-muted-foreground">
        {vazioMsg}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Protocolo</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Modalidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pedidos.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs font-bold">{p.protocolo}</TableCell>
              <TableCell className="max-w-[220px] truncate" title={p.paciente_nome ?? ""}>
                {p.paciente_nome ?? "—"}
              </TableCell>
              <TableCell>
                <span
                  className={
                    "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium " +
                    (p.tipo_solicitacao === "convenio"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-blue-200 bg-blue-50 text-blue-800")
                  }
                >
                  {p.tipo_solicitacao === "convenio" ? "Convênio" : "Particular"}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-xs">
                  {p.modalidade_coleta === "domicilio" ? (
                    <>
                      <Home className="h-3.5 w-3.5" /> Em casa
                    </>
                  ) : (
                    <>
                      <Building2 className="h-3.5 w-3.5" />{" "}
                      <span className="max-w-[140px] truncate">
                        {p.unidade_nome ?? "Unidade"}
                      </span>
                    </>
                  )}
                </span>
              </TableCell>
              <TableCell>
                <BadgeStatus status={p.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatarData(p.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onAbrir(p)}
                  aria-label="Ver detalhes"
                >
                  <Eye className="h-4 w-4" style={{ color: "#C8102E" }} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
