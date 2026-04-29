import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Home, Building2, Wallet, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";

export type Pedido = {
  id: string;
  protocolo: string;
  status: string;
  created_at: string | null;
  itens: any;
  modalidade_coleta: string;
  unidade_nome: string | null;
  tipo_solicitacao: string;
  valor_total_centavos: number | null;
  endereco_coleta: any;
  convenio_nome: string | null;
  numero_carteirinha: string | null;
  url_carteirinha: string | null;
};

type Props = {
  pedido: Pedido;
  onVerDetalhes: (p: Pedido) => void;
};

export const CardPedido = ({ pedido, onVerDetalhes }: Props) => {
  const itens: { nome: string }[] = Array.isArray(pedido.itens) ? pedido.itens : [];
  const primeiros = itens.slice(0, 3);
  const restantes = itens.length - primeiros.length;

  const dataFmt = pedido.created_at
    ? format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "—";

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-secondary">{pedido.protocolo}</p>
        <StatusBadge status={pedido.status} />
      </div>

      <p className="text-sm text-muted-foreground">Solicitado em {dataFmt}</p>

      <ul className="text-sm space-y-1">
        {primeiros.map((i, idx) => (
          <li key={idx} className="truncate">• {i.nome}</li>
        ))}
        {restantes > 0 && (
          <li className="text-muted-foreground">+ {restantes} procedimento(s)</li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
        <Badge variant="secondary" className="gap-1.5">
          {pedido.modalidade_coleta === "domicilio" ? (
            <>
              <Home className="h-3 w-3" /> Em casa
            </>
          ) : (
            <>
              <Building2 className="h-3 w-3" /> {pedido.unidade_nome ?? "Unidade"}
            </>
          )}
        </Badge>
        <Badge variant="secondary" className="gap-1.5">
          {pedido.tipo_solicitacao === "convenio" ? (
            <>
              <CreditCard className="h-3 w-3" /> Convênio
            </>
          ) : (
            <>
              <Wallet className="h-3 w-3" /> Particular
            </>
          )}
        </Badge>

        <button
          onClick={() => onVerDetalhes(pedido)}
          className="ml-auto text-sm font-medium text-[#C8102E] hover:underline"
        >
          Ver detalhes
        </button>
      </div>
    </div>
  );
};
