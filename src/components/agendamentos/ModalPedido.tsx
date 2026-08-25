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
import { Circle, CheckCircle2, Download, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatarPreco } from "@/components/catalogo/types";
import { StatusBadge } from "./StatusBadge";
import { Pedido } from "./CardPedido";
import { usePaciente } from "@/hooks/usePaciente";

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
  const { paciente } = usePaciente();
  const [resultados, setResultados] = useState<
    Array<{ id: string; nome_arquivo: string; arquivo_url: string; created_at: string }>
  >([]);
  const [tokens, setTokens] = useState<string[]>([""]);
  const [salvandoTokens, setSalvandoTokens] = useState(false);

  useEffect(() => {
    if (!pedido || !paciente?.id) return;
    setResultados([]);
    supabase
      .rpc("resultados_do_paciente_auth")
      .then(({ data }) => {
        const todos = ((data as any) ?? []) as Array<{
          id: string;
          pedido_protocolo: string;
          nome_arquivo: string;
          arquivo_url: string;
          created_at: string;
        }>;
        setResultados(todos.filter((r) => r.pedido_protocolo === pedido.protocolo));
      });
  }, [pedido, paciente?.id]);

  useEffect(() => {
    const t = Array.isArray(pedido?.convenio_tokens) ? pedido!.convenio_tokens : [];
    setTokens(t.length ? t.map(String) : [""]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido?.id]);

  const cancelar = async () => {
    if (!pedido) return;
    const { error } = await supabase.rpc("cancelar_meu_pedido_auth", {
      p_protocolo: pedido.protocolo,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Agendamento cancelado");
    qc.invalidateQueries({ queryKey: ["pedidos"] });
    onClose();
  };

  const salvarTokens = async () => {
    if (!pedido) return;
    const limpos = tokens.map((t) => t.trim()).filter(Boolean);
    if (limpos.length === 0) return toast.error("Digite ao menos um token.");
    setSalvandoTokens(true);
    const { error } = await supabase.rpc("salvar_tokens_convenio_auth", {
      p_protocolo: pedido.protocolo,
      p_tokens: limpos,
    });
    setSalvandoTokens(false);
    if (error) return toast.error(error.message);
    toast.success("Token(s) enviado(s)! A recepção foi avisada.");
    qc.invalidateQueries({ queryKey: ["pedidos"] });
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
  // Convênio não exibe preço (nem por item, nem total) — regra do projeto.
  const isConvenio = pedido.tipo_solicitacao === "convenio";

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
                  {!isConvenio && (
                    <span className="text-muted-foreground whitespace-nowrap">
                      {i.precoCentavos != null ? formatarPreco(i.precoCentavos) : "—"}
                    </span>
                  )}
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

          {!isConvenio && (
            <section>
              <h4 className="text-sm font-semibold mb-2">Valor total</h4>
              <p className="text-lg font-bold text-brand">
                {formatarPreco(pedido.valor_total_centavos ?? 0)}
              </p>
            </section>
          )}

          {isConvenio &&
            (pedido.convenio_token_solicitado_em ||
              (Array.isArray(pedido.convenio_tokens) &&
                pedido.convenio_tokens.length > 0)) && (
              <section className="rounded-lg border border-brand/30 bg-brand/5 p-4">
                <h4 className="mb-1 text-sm font-semibold text-secondary">
                  Token do convênio
                </h4>
                <p className="mb-3 text-sm text-muted-foreground">
                  Informe o(s) token(s)/senha(s) de autorização que sua operadora
                  enviou. Se ela mandou mais de um, adicione todos.
                </p>
                <div className="space-y-2">
                  {tokens.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={t}
                        onChange={(e) =>
                          setTokens((prev) =>
                            prev.map((x, idx) => (idx === i ? e.target.value : x)),
                          )
                        }
                        placeholder={`Token ${i + 1}`}
                        className="font-mono"
                      />
                      {tokens.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground"
                          onClick={() =>
                            setTokens((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          aria-label="Remover token"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setTokens((prev) => [...prev, ""])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Tem mais algum token?
                  </Button>
                </div>
                <Button
                  onClick={salvarTokens}
                  disabled={salvandoTokens}
                  className="mt-3 w-full bg-brand text-white hover:bg-brand-hover"
                >
                  {salvandoTokens ? "Enviando..." : "Enviar token(s)"}
                </Button>
                {pedido.convenio_token_preenchido_em && (
                  <p className="mt-2 text-xs text-green-600">
                    Enviado em{" "}
                    {format(
                      new Date(pedido.convenio_token_preenchido_em),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR },
                    )}
                    . Você pode reenviar se precisar corrigir.
                  </p>
                )}
              </section>
            )}

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
                      className="gap-1.5 border-brand-2 text-brand-2"
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
                          concluida ? "bg-brand" : "bg-border"
                        )}
                      />
                    )}
                    {concluida ? (
                      <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
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
                  className="w-full border-brand text-brand hover:bg-brand/5 hover:text-brand"
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
                    className="bg-brand hover:bg-brand-hover"
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
