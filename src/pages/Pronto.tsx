import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Mail, Copy, CheckCircle2, AlertCircle,
  Printer, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePaciente } from "@/hooks/usePaciente";

const Pronto = () => {
  const { protocolo } = useParams();
  const { paciente } = usePaciente();
  const [emailPaciente, setEmailPaciente] = useState<string>("");
  const voucherRef = useRef<HTMLDivElement>(null);

  const { data: pedido, isLoading, isError } = useQuery({
    queryKey: ["pedido", protocolo],
    enabled: !!protocolo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("protocolo, modalidade_coleta, paciente_cpf, paciente_nome, itens, valor_total_centavos, tipo_solicitacao")
        .eq("protocolo", protocolo!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    (async () => {
      if (!pedido?.paciente_cpf) return;
      const { data } = await supabase
        .from("pacientes")
        .select("email")
        .eq("cpf", pedido.paciente_cpf)
        .maybeSingle();
      setEmailPaciente(data?.email ?? paciente?.nome ?? "");
    })();
  }, [pedido?.paciente_cpf, paciente?.nome]);

  const copiar = () => {
    if (!protocolo) return;
    navigator.clipboard.writeText(protocolo);
    toast.success("Protocolo copiado!");
  };

  const compartilharWhatsApp = () => {
    const texto = encodeURIComponent(
      `✅ Meu pedido na Sancet foi confirmado!\n\nProtocolo: *${protocolo}*\nApresente este código na unidade.\n\nhttps://sancet.com.br`
    );
    window.open(`https://wa.me/?text=${texto}`, "_blank", "noopener,noreferrer");
  };

  const imprimir = () => window.print();

  const formatarPreco = (centavos: number) =>
    (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const qrUrl = protocolo
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(protocolo)}&bgcolor=ffffff&color=1B3A6B&margin=8`
    : null;

  return (
    <PageShell>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #voucher, #voucher * { visibility: visible; }
          #voucher { position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Link
          to="/agendamentos"
          className="no-print inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Meus agendamentos
        </Link>

        {isLoading && (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        )}

        {!isLoading && (isError || !pedido) && (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center">
            <AlertCircle className="mb-3 h-12 w-12 text-[#C8102E]" />
            <h1 className="text-lg font-bold text-secondary">Protocolo não encontrado</h1>
            <Button asChild className="mt-5 bg-[#C8102E] text-white hover:bg-[#a80d26]">
              <Link to="/agendamentos">Ir para agendamentos</Link>
            </Button>
          </div>
        )}

        {pedido && (
          <div className="mt-4 space-y-5">
            {/* Cabeçalho de sucesso */}
            <div className="no-print flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
              <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-green-600" />
              <div>
                <h1 className="text-xl font-bold text-secondary">Tudo certo!</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pedido.modalidade_coleta === "domicilio"
                    ? "Um profissional irá até você. Aguarde a confirmação."
                    : "Compareça à unidade no horário de sua preferência."}
                </p>
              </div>
            </div>

            {/* VOUCHER */}
            <div
              id="voucher"
              ref={voucherRef}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              {/* Header do voucher */}
              <div
                className="flex items-center justify-between px-6 py-4 text-white"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Sancet</p>
                  <p className="text-lg font-bold">Comprovante de Pedido</p>
                </div>
                <Badge variant="outline" className="border-white/40 bg-white/10 text-white">
                  {pedido.tipo_solicitacao === "convenio" ? "Convênio" : "Particular"}
                </Badge>
              </div>

              <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
                {/* Dados */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Protocolo</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xl font-bold text-secondary">{pedido.protocolo}</span>
                      <Button onClick={copiar} variant="ghost" size="icon" className="no-print h-8 w-8">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {pedido.paciente_nome && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paciente</p>
                      <p className="mt-1 text-sm font-medium text-secondary">{pedido.paciente_nome}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modalidade</p>
                    <p className="mt-1 text-sm font-medium text-secondary">
                      {pedido.modalidade_coleta === "domicilio" ? "🏠 Coleta em domicílio" : "🏥 Na unidade"}
                    </p>
                  </div>

                  {pedido.itens && Array.isArray(pedido.itens) && pedido.itens.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Procedimentos</p>
                      <ul className="mt-1.5 space-y-1">
                        {(pedido.itens as any[]).map((item: any, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                            <span>{item.nome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pedido.valor_total_centavos > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
                      <p className="mt-1 text-2xl font-bold text-[#C8102E]">
                        {formatarPreco(pedido.valor_total_centavos)}
                      </p>
                    </div>
                  )}
                </div>

                {/* QR Code */}
                {qrUrl && (
                  <div className="flex flex-col items-center">
                    <img
                      src={qrUrl}
                      alt={`QR Code ${pedido.protocolo}`}
                      className="h-40 w-40 rounded-lg border border-border bg-white p-1"
                    />
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      Escaneie na<br />recepção
                    </p>
                  </div>
                )}
              </div>

              {/* Rodapé do voucher */}
              <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-6 py-4">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Instruções de preparo enviadas para{" "}
                  <span className="font-medium text-secondary">{emailPaciente || "seu e-mail"}</span>
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="no-print grid grid-cols-2 gap-3">
              <Button onClick={compartilharWhatsApp} variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Compartilhar
              </Button>
              <Button onClick={imprimir} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>

            <Button asChild className="no-print w-full bg-[#C8102E] text-white hover:bg-[#a80d26]">
              <Link to="/agendamentos">Ver meus agendamentos</Link>
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Pronto;
