import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Loader2, QrCode, AlertCircle, CreditCard, FileText, ExternalLink, UserCog, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePaciente } from "@/hooks/usePaciente";

type Metodo = "pix" | "boleto" | "cartao";
type Etapa = "carregando" | "pronto" | "pago" | "erro";

type PagamentoData = {
  metodo: Metodo;
  invoice_url: string | null;
  pix?: { qr_code_base64: string; pix_code: string };
  boleto?: { linha_digitavel: string; codigo_barras: string; pdf_url: string | null };
};

type Pedido = {
  protocolo: string;
  valor_total_centavos: number;
  status_pagamento: string | null;
};

const Pagamento = () => {
  const { protocolo } = useParams();
  const navigate = useNavigate();
  const { paciente } = usePaciente();
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [erroMsg, setErroMsg] = useState<string>("");
  const [erroDetalhe, setErroDetalhe] = useState<string>("");
  const [erroCampo, setErroCampo] = useState<string>("");
  const [mostrarDetalhe, setMostrarDetalhe] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [metodo, setMetodo] = useState<Metodo>("pix");
  const [dados, setDados] = useState<PagamentoData | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const camposPaciente = new Set(["nome", "cpf", "email", "celular"]);

  const gerar = useCallback(async (metodoEscolhido: Metodo, ped: Pedido) => {
    setGerando(true);
    setDados(null);
    setMostrarDetalhe(false);
    const { data, error } = await supabase.functions.invoke("sancet-criar-pagamento", {
      body: {
        protocolo: ped.protocolo,
        valor_centavos: ped.valor_total_centavos,
        descricao: `Pedido Sancet ${ped.protocolo}`,
        metodo: metodoEscolhido,
      },
    });
    setGerando(false);

    let errMsg = (data as any)?.error;
    let errDetail = (data as any)?.detalhe;
    let errCampo = (data as any)?.campo;
    if (!errMsg && (error as any)?.context) {
      try {
        const body = await (error as any).context.clone().json();
        errMsg = body?.error;
        errDetail = body?.detalhe;
        errCampo = body?.campo;
      } catch {
        try { errMsg = await (error as any).context.clone().text(); } catch {}
      }
    }
    if (!errMsg && error) errMsg = "Não conseguimos gerar o pagamento agora. Tente novamente em instantes.";

    if (errMsg) {
      setErroMsg(errMsg);
      setErroDetalhe(errDetail || "");
      setErroCampo(errCampo || "");
      setDados(null);
      setEtapa("pronto");
      toast.error("Não foi possível gerar o pagamento", { description: errMsg });
      return;
    }
    setErroMsg("");
    setErroDetalhe("");
    setErroCampo("");
    setDados(data as PagamentoData);
    setEtapa("pronto");
  }, []);

  useEffect(() => {
    if (!protocolo || !paciente?.id) return;
    supabase
      .rpc("pedido_por_protocolo_auth", { p_protocolo: protocolo })
      .then(({ data, error }) => {
        const row = data as any;
        if (error || !row) {
          setErroMsg("Pedido não encontrado.");
          setEtapa("erro");
          return;
        }
        setPedido(row as Pedido);
        if (row.status_pagamento === "pago") {
          navigate(`/pronto/${protocolo}`, { replace: true });
          return;
        }
        gerar("pix", row as Pedido);
      });
  }, [protocolo, navigate, paciente?.id, gerar]);

  useEffect(() => {
    if (etapa !== "pronto" || !protocolo || !paciente?.id) return;
    const timer = setInterval(async () => {
      const { data } = await supabase.rpc("pedido_por_protocolo_auth", { p_protocolo: protocolo });
      if ((data as any)?.status_pagamento === "pago") {
        clearInterval(timer);
        setEtapa("pago");
        setTimeout(() => navigate(`/pronto/${protocolo}`), 2000);
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [etapa, protocolo, navigate, paciente?.id]);

  const trocarMetodo = (m: string) => {
    const novo = m as Metodo;
    setMetodo(novo);
    if (pedido) gerar(novo, pedido);
  };

  const copiar = (valor: string, msg: string) => {
    navigator.clipboard.writeText(valor);
    setCopiado(true);
    toast.success(msg);
    setTimeout(() => setCopiado(false), 3000);
  };

  const confirmarManual = async () => {
    if (!protocolo || !paciente?.id) return;
    setConfirming(true);
    await supabase.rpc("confirmar_pagamento_manual_auth", { p_protocolo: protocolo });
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
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-brand" />
              <p className="text-sm font-medium text-secondary">Carregando pedido...</p>
            </div>
          )}

          {etapa === "erro" && (
            <div className="flex flex-col items-center py-10 text-center">
              <AlertCircle className="mb-3 h-12 w-12 text-brand" />
              <h2 className="text-lg font-bold text-secondary">Não foi possível gerar o pagamento</h2>
              <p className="mt-2 text-sm text-muted-foreground">{erroMsg}</p>
              <Button onClick={() => window.location.reload()} className="mt-5 bg-brand text-white hover:bg-brand-hover">
                Tentar novamente
              </Button>
            </div>
          )}

          {(etapa === "pronto") && pedido && (
            <>
              <div className="text-center">
                <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                  Aguardando pagamento
                </Badge>
                <h1 className="mt-3 text-2xl font-bold text-secondary">Escolha como pagar</h1>
                <p className="mt-1 text-3xl font-bold text-brand">{formatarPreco(pedido.valor_total_centavos)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Protocolo: {pedido.protocolo}</p>
              </div>

              <Tabs value={metodo} onValueChange={trocarMetodo} className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pix" className="gap-1.5"><QrCode className="h-4 w-4" />PIX</TabsTrigger>
                  <TabsTrigger value="boleto" className="gap-1.5"><FileText className="h-4 w-4" />Boleto</TabsTrigger>
                  <TabsTrigger value="cartao" className="gap-1.5"><CreditCard className="h-4 w-4" />Cartão</TabsTrigger>
                </TabsList>

                {gerando && (
                  <div className="mt-6 flex flex-col items-center py-6">
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-brand" />
                    <p className="text-sm text-muted-foreground">Gerando cobrança...</p>
                    <Skeleton className="mt-3 h-40 w-40" />
                  </div>
                )}

                {!gerando && !dados && erroMsg && (
                  <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand">Não foi possível gerar o pagamento</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-secondary">{erroMsg}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {camposPaciente.has(erroCampo) && (
                            <Link to="/agendamentos?aba=perfil">
                              <Button size="sm" className="bg-brand text-white hover:bg-brand-hover">
                                <UserCog className="mr-1.5 h-3.5 w-3.5" /> Atualizar cadastro
                              </Button>
                            </Link>
                          )}
                          <Button size="sm" variant={camposPaciente.has(erroCampo) ? "outline" : "default"} onClick={() => pedido && gerar(metodo, pedido)} className={camposPaciente.has(erroCampo) ? "" : "bg-brand text-white hover:bg-brand-hover"}>
                            Tentar novamente
                          </Button>
                        </div>

                        {erroDetalhe && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setMostrarDetalhe(v => !v)}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-secondary"
                            >
                              <ChevronDown className={`h-3 w-3 transition-transform ${mostrarDetalhe ? "rotate-180" : ""}`} />
                              {mostrarDetalhe ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos"}
                            </button>
                            {mostrarDetalhe && (
                              <div className="mt-2 flex items-start gap-2">
                                <code className="flex-1 whitespace-pre-wrap break-words rounded border border-red-100 bg-white px-2 py-1.5 text-[11px] text-muted-foreground">
                                  {erroDetalhe}
                                </code>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copiar(erroDetalhe, "Detalhe técnico copiado")}>
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="mt-3 text-xs text-muted-foreground">
                          Precisa de ajuda? Entre em contato com a recepção informando o protocolo <strong>{pedido.protocolo}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!gerando && dados && (
                  <>
                    <TabsContent value="pix" className="mt-6">
                      {dados.pix && (
                        <>
                          <div className="flex justify-center">
                            {dados.pix.qr_code_base64 ? (
                              <img
                                src={`data:image/png;base64,${dados.pix.qr_code_base64}`}
                                alt="QR Code PIX"
                                className="h-56 w-56 rounded-lg border border-border bg-white p-2"
                              />
                            ) : (
                              <div className="flex h-56 w-56 items-center justify-center rounded-lg border border-dashed border-border bg-muted">
                                <QrCode className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="mt-4 mb-2 text-sm font-medium text-secondary">Ou copie o código PIX:</p>
                          <div className="flex items-stretch gap-2">
                            <code className="flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 text-xs">
                              {dados.pix.pix_code}
                            </code>
                            <Button onClick={() => copiar(dados.pix!.pix_code, "Código PIX copiado!")} variant="outline" size="icon">
                              {copiado ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="boleto" className="mt-6">
                      {dados.boleto && (
                        <>
                          <p className="mb-2 text-sm font-medium text-secondary">Linha digitável:</p>
                          <div className="flex items-stretch gap-2">
                            <code className="flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 text-xs">
                              {dados.boleto.linha_digitavel}
                            </code>
                            <Button onClick={() => copiar(dados.boleto!.linha_digitavel, "Linha digitável copiada!")} variant="outline" size="icon">
                              {copiado ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          {dados.boleto.pdf_url && (
                            <a href={dados.boleto.pdf_url} target="_blank" rel="noopener noreferrer" className="mt-4 block">
                              <Button variant="outline" className="w-full gap-2">
                                <ExternalLink className="h-4 w-4" /> Abrir boleto (PDF)
                              </Button>
                            </a>
                          )}
                          <p className="mt-3 text-xs text-muted-foreground">
                            A compensação do boleto pode levar até 3 dias úteis.
                          </p>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="cartao" className="mt-6">
                      {dados.invoice_url ? (
                        <>
                          <p className="mb-4 text-sm text-muted-foreground">
                            O pagamento com cartão é feito em ambiente seguro do processador de pagamentos.
                          </p>
                          <a href={dados.invoice_url} target="_blank" rel="noopener noreferrer">
                          <Button className="w-full gap-2 bg-green-600 text-white hover:bg-green-700">
                            <CreditCard className="h-4 w-4" /> Pagar com cartão
                          </Button>
                          </a>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Cartão indisponível para este gateway.</p>
                      )}
                    </TabsContent>
                  </>
                )}
              </Tabs>

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
