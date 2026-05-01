import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Circle, CheckCircle2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatarPreco } from "@/components/catalogo/types";
import { StatusBadge } from "./StatusBadge";
import { Pedido } from "./CardPedido";

type Props = {
  pedido: Pedido | null;
  onClose: () => void;
};

const ETAPAS = [
  { key: "novo", label: "Pedido recebido" },
  { key: "em_analise", label: "Em análise" },
  { key: "confirmado", label: "Confirmado" },
  { key: "concluido", label: "Concluído" },
];

export const ModalPedido = ({ pedido, onClose }: Props) => {
  const qc = useQueryClient();
  const [resultados, setResultados] = useState<
    Array<{ id: string; nome_arquivo: string; arquivo_url: string; created_at: string }>
  >([]);

  useEffect(() => {
    if (!pedido) return;
    setResultados([]);
    supabase
      .from("resultados")
      .select("id, nome_arquivo, arquivo_url, created_at")
      .eq("pedido_protocolo", pedido.protocolo)
      .order("created_at", { ascending: false })
      .then(({ data }) => setResultados((data as any) ?? []));
  }, [pedido]);

  const cancelar = async () => {
    if (!pedido) return;
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "cancelado" })
      .eq("id", pedido.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Agendamento cancelado");
    qc.invalidateQueries({ queryKey: ["pedidos"] });
    onClose();
  };

  if (!pedido) {
    return (
      <Sheet open={false} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-[480px]" />
      </Sheet>
    );
  }

  const itens: { nome: string; precoCentavos: number | null }[] = Array.isArray(
    pedido.itens
  )
    ? pedido.itens
    : [];

  const podeCancelar = ["novo", "em_analise"].includes(pedido.status);
  const idxAtual = ETAPAS.findIndex((e) => e.key === pedido.status);
  const dataPedido = pedido.created_at
    ? format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "—";

  const endereco = pedido.endereco_coleta as any;

  return (
    <Sheet open={!!pedido} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-xl text-secondary text-left">
              {pedido.protocolo}
            </SheetTitle>
            <StatusBadge status={pedido.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h4 className="text-sm font-semibold mb-2">Procedimentos</h4>
            <ul className="space-y-1.5">
              {itens.map((i, idx) => (
                <li key={idx} className="flex justify-between text-sm gap-2">
                  <span className="truncate">{i.nome}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {i.precoCentavos != null ? formatarPreco(i.precoCentavos) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-sm font-semibold mb-2">Local de atendimento</h4>
            {pedido.modalidade_coleta === "domicilio" ? (
              <p className="text-sm text-muted-foreground">
                Em casa
                {endereco && (
                  <>
                    {" "}— {endereco.logradouro}, {endereco.numero}
                    {endereco.bairro ? `, ${endereco.bairro}` : ""}{" "}
                    {endereco.cidade ? `${endereco.cidade}/${endereco.uf}` : ""}
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Unidade — {pedido.unidade_nome ?? "—"}
              </p>
            )}
          </section>

          <section>
            <h4 className="text-sm font-semibold mb-2">Tipo</h4>
            <p className="text-sm text-muted-foreground">
              {pedido.tipo_solicitacao === "convenio" ? "Convênio" : "Particular"}
              {pedido.convenio_nome && ` · ${pedido.convenio_nome}`}
              {pedido.numero_carteirinha && ` · Carteirinha ${pedido.numero_carteirinha}`}
            </p>
          </section>

          <section>
            <h4 className="text-sm font-semibold mb-2">Valor total</h4>
            <p className="text-lg font-bold text-[#C8102E]">
              {formatarPreco(pedido.valor_total_centavos ?? 0)}
            </p>
          </section>

          <section>
            <h4 className="text-sm font-semibold mb-2">Resultados</h4>
            {resultados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Resultado ainda não disponível.</p>
            ) : (
              <ul className="space-y-2">
                {resultados.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium truncate max-w-[220px]">{r.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-[#1B3A6B] text-[#1B3A6B]"
                      onClick={() => window.open(r.arquivo_url, "_blank", "noopener,noreferrer")}
                    >
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="text-sm font-semibold mb-3">Linha do tempo</h4>
            <ol className="relative space-y-4 ml-2">
              {ETAPAS.map((e, idx) => {
                const concluida =
                  idxAtual >= idx && pedido.status !== "cancelado";
                return (
                  <li key={e.key} className="flex items-start gap-3 relative">
                    {idx < ETAPAS.length - 1 && (
                      <span
                        className={cn(
                          "absolute left-[9px] top-5 w-px h-6",
                          concluida ? "bg-[#C8102E]" : "bg-border"
                        )}
                      />
                    )}
                    {concluida ? (
                      <CheckCircle2 className="h-5 w-5 text-[#C8102E] shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={cn("text-sm", concluida && "font-medium")}>
                        {e.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {idx === 0 && concluida ? dataPedido : concluida ? "—" : "Aguardando"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {podeCancelar && (
          <div className="p-6 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E]/5 hover:text-[#C8102E]"
                >
                  Cancelar agendamento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={cancelar}
                    className="bg-[#C8102E] hover:bg-[#a80d26]"
                  >
                    Sim, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
