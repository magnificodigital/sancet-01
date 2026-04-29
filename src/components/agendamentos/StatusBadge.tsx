import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusPedido =
  | "novo"
  | "em_analise"
  | "aguardando_pagamento"
  | "confirmado"
  | "concluido"
  | "cancelado";

const MAP: Record<StatusPedido, { label: string; className: string }> = {
  novo: { label: "Novo", className: "bg-muted text-foreground" },
  em_analise: { label: "Em análise", className: "bg-yellow-100 text-yellow-800" },
  aguardando_pagamento: {
    label: "Aguardando pagamento",
    className: "bg-orange-100 text-orange-800",
  },
  confirmado: { label: "Confirmado", className: "bg-green-100 text-green-800" },
  concluido: { label: "Concluído", className: "bg-blue-100 text-blue-800" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-800" },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const m = MAP[status as StatusPedido] ?? MAP.novo;
  return <Badge className={cn("border-transparent", m.className)}>{m.label}</Badge>;
};
