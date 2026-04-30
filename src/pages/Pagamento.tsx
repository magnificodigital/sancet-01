import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Loader2, QrCode, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Etapa = "carregando" | "aguardando_pix" | "pago" | "erro";

type PixData = {
  qr_code_base64: string;
  pix_code: string;
};

type Pedido = {
  protocolo: string;
  valor_total_centavos: number;
  itens: any[];
  status_pagamento: string | null;
};

const Pagamento = () => {
  const { protocolo } = useParams();
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!protocolo) return;

    supabase
      .from("pedidos")
      .select("protocolo, valor_total_centavos, itens, status_pagamento")
      .eq("protocolo", protocolo)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setEtapa("erro");
          return;
        }
        setPedido(data as Pedido);

        if (data.status_pagamento === "pago") {
          navigate(`/pronto/${protocolo}`, { replace: true });
          return;
        }

        supabase.functions
          .invoke("sancet-criar-pagamento", {
            body: {
              protocolo: data.protocolo,
              valor_centavos: data.valor_total_centavos,
              descricao: `Pedido Sancet ${data.protocolo}`,
            },
          })
          .then(({ data: pix, error: pixErr }) => {
            if (pixErr || !pix?.pix_code) {
              setEtapa("erro");
              return;
            }
            setPixData(pix as PixData);
            setEtapa("aguardando_pix");
          });
      });
  }, [protocolo, navigate]);

  useEffect(() => {
    if (etapa !== "aguardando_pix" || !protocolo) return;
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from("pedidos")
        .select("status_pagamento")
        .eq("protocolo", protocolo)
        .maybeSingle();
      if (data?.status_pagamento === "pago") {
        clearInterval(timer);
        setEtapa("pago");
        setTimeout(() => navigate(`/pronto/${protocolo}`), 2000);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [etapa, protocolo, navigate]);

  const copiarCodigo = () => {
    if (!pixData?.pix_code) return;
    navigator.clipboard.writeText(pixData.pix_code);
    setCopiado(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopiado(false), 3000);
  };

  const confirmarManual = async () => {
    if (!protocolo) return;
    setConfirming(true);
    await supabase
      .from("pedidos")
      .update({ status_pagamento: "aguardando_confirmacao" })
      .eq("protocolo", protocolo);
    navigate(`/pronto/${protocolo}`);
  };

  const formatarPreco = (centavos: number) =>
    (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-xl px-4 py-6">
        <Link to="/sacola" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {etapa === "carregando" && (
            <div className="flex flex-col items-center py-10 text-center">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-[#C8102E]" />
              <p className="text-sm font-medium text-secondary">Gerando cobrança...</p>
              <Skeleton className="mt-4 h-40 w-40" />
            </div>
          )}

          {etapa === "erro" && (
            <div className="flex flex-col items-center py-10 text-center">
              <AlertCircle className="mb-3 h-12 w-12 text-[#C8102E]" />
              <h2 className="text-lg font-bold text-secondary">Não foi possível gerar o PIX</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Verifique se o gateway de pagamento está configurado no painel admin.
              </p>
              <Button onClick={() => window.location.reload()} className="mt-5 bg-[#C8102E] text-white hover:bg-[#a80d26]">
                Tentar novamente
              </Button>
            </div>
          )}

          {etapa === "aguardando_pix" && pixData && pedido && (
            <>
              <div className="text-center">
                <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                  Aguardando pagamento
                </Badge>
                <h1 className="mt-3 text-2xl font-bold text-secondary">Pague via PIX</h1>
                <p className="mt-1 text-3xl font-bold text-[#C8102E]">
                  {formatarPreco(pedido.valor_total_centavos)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Protocolo: {pedido.protocolo}</p>
              </div>

              <div className="mt-6 flex justify-center">
                {pixData.qr_code_base64 ? (
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="h-56 w-56 rounded-lg border border-border bg-white p-2"
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-lg border border-dashed border-border bg-muted">
                    <QrCode className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="mt-6">
                <p className="mb-2 text-sm font-medium text-secondary">Ou copie o código PIX:</p>
                <div className="flex items-stretch gap-2">
                  <code className="flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 text-xs">
                    {pixData.pix_code}
                  </code>
                  <Button onClick={copiarCodigo} variant="outline" size="icon">
                    {copiado ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-muted/50 p-4 text-center">
                <p className="mb-3 text-xs text-muted-foreground">
                  O pagamento é confirmado automaticamente. Se já pagou e a tela não atualizou:
                </p>
                <Button onClick={confirmarManual} disabled={confirming} variant="outline" size="sm">
                  {confirming ? "Registrando..." : "Já paguei"}
                </Button>
              </div>
            </>
          )}

          {etapa === "pago" && (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2 className="mb-3 h-14 w-14 text-green-600" />
              <h2 className="text-xl font-bold text-secondary">Pagamento confirmado!</h2>
              <p className="mt-1 text-sm text-muted-foreground">Redirecionando...</p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default Pagamento;
