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
import {
  formatarAgendamentoCurto,
  formatarData,
  Pedido,
  rotuloPeriodo,
  statusAgendamento,
} from "./utils";
import { cn } from "@/lib/utils";

type Props = {
  pedidos: Pedido[];
  onAbrir: (p: Pedido) => void;
  vazioMsg?: string;
};

const AgendamentoCell = ({ p }: { p: Pedido }) => {
  const s = statusAgendamento(p.data_agendamento, p.status);
  if (s === "sem") return <span className="text-muted-foreground">—</span>;

  const per = rotuloPeriodo(p.periodo_agendamento);

  if (s === "hoje") {
    return (
      <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800">
        Hoje{per ? ` — ${per}` : ""}
      </span>
    );
  }
  if (s === "amanha") {
    return (
      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
        Amanhã{per ? ` — ${per}` : ""}
      </span>
    );
  }
  if (s === "atrasado") {
    return (
      <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
        Atrasado
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-xs",
        s === "passado" ? "text-muted-foreground" : "text-foreground",
      )}
    >
      {formatarAgendamentoCurto(p.data_agendamento, p.periodo_agendamento)}
    </span>
  );
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
            <TableHead>Agendamento</TableHead>
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
                <AgendamentoCell p={p} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <BadgeStatus status={p.status} />
                  {p.status_pagamento === "pago" && (
                    <span className="inline-flex rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                      Pago
                    </span>
                  )}
                  {p.status_pagamento === "pendente" && p.status === "aguardando_pagamento" && (
                    <span className="inline-flex rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-800">
                      Aguardando pgto
                    </span>
                  )}
                  {(p.status_pagamento === "vencido" || p.status_pagamento === "falhou") && (
                    <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
                      {p.status_pagamento === "vencido" ? "Vencido" : "Falhou"}
                    </span>
                  )}
                </div>
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
                  <Eye className="h-4 w-4" style={{ color: "hsl(var(--brand))" }} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
