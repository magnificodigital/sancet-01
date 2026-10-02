import { CalendarCheck, CheckCircle2, Mail, MapPin, TestTube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatarAgendamento } from "@/lib/agendamento";

type Modo = "convenio" | "particular_pagar" | "particular_pago";

const PASSOS: Record<Modo, string[]> = {
  convenio: [
    "Nossa equipe vai analisar o seu pedido e a autorização do convênio.",
    "Se precisarmos de algo (token do convênio, foto mais nítida ou outro documento), vamos pedir por e-mail — é só responder pelo link do e-mail ou em Meus agendamentos.",
    "Com tudo certo, você recebe o e-mail de confirmação e o preparo dos exames.",
  ],
  particular_pagar: [
    "Finalize o pagamento nesta tela (Pix, boleto ou cartão).",
    "Assim que o pagamento for confirmado, seu pedido segue para a nossa equipe.",
    "Com tudo certo, você recebe o e-mail de confirmação e o preparo dos exames.",
  ],
  particular_pago: [
    "Pagamento confirmado — seu pedido já está com a nossa equipe.",
    "Se precisarmos de algo, vamos pedir por e-mail — é só responder pelo link do e-mail ou em Meus agendamentos.",
    "Com tudo certo, você recebe o e-mail de confirmação e o preparo dos exames.",
  ],
};

/**
 * E-mails que o paciente recebe ao longo do pedido. Os assuntos espelham os da
 * função enviar-email-pedido — para o paciente reconhecer na caixa de entrada.
 */
function emailsDoPedido(protocolo: string, modo: Modo) {
  const lista: { quando: string; assunto: string; seNecessario?: boolean }[] = [
    { quando: "Agora", assunto: `Sancet — Recebemos seu pedido ${protocolo}` },
  ];
  if (modo === "convenio") {
    lista.push({
      quando: "Se o convênio exigir",
      assunto: `Sancet — Informe o token do seu convênio (pedido ${protocolo})`,
      seNecessario: true,
    });
  }
  lista.push(
    {
      quando: "Se faltar algum documento",
      assunto: `Sancet — Precisamos de um documento (pedido ${protocolo})`,
      seNecessario: true,
    },
    { quando: "Na confirmação", assunto: `Sancet — Pedido ${protocolo} CONFIRMADO ✅` },
    { quando: "Na confirmação", assunto: `Sancet — Preparo dos seus exames (pedido ${protocolo})` },
    { quando: "Quando ficar pronto", assunto: `Sancet — Resultado do pedido ${protocolo} disponível ✅` },
  );
  return lista;
}

/** Lightbox de próximos passos exibido logo após o paciente finalizar o pedido. */
export const AvisoPedidoEnviado = ({
  aberto,
  onFechar,
  protocolo,
  email,
  modo,
  pedido,
}: {
  aberto: boolean;
  onFechar: () => void;
  protocolo?: string;
  email?: string | null;
  modo: Modo;
  /** Pedido (pedido_por_protocolo_auth) para o resumo: unidade, data e exames. */
  pedido?: any;
}) => {
  const navigate = useNavigate();
  const qtdExames = Array.isArray(pedido?.itens) ? pedido.itens.length : 0;
  const quando =
    pedido?.data_agendamento && pedido?.periodo_agendamento
      ? formatarAgendamento(pedido.data_agendamento, pedido.periodo_agendamento)
      : null;
  const emDomicilio = pedido?.modalidade_coleta === "domicilio";

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl text-secondary">
            {modo === "particular_pagar" ? "Pedido recebido!" : "Pedido enviado com sucesso!"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Protocolo {protocolo && <b className="font-mono text-secondary">{protocolo}</b>}
            <span className="block text-xs">Guarde este número: ele aparece em todos os e-mails.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-left text-sm">
          {pedido && (
            <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Resumo do pedido</p>
              {qtdExames > 0 && (
                <p className="flex items-center gap-2">
                  <TestTube className="h-4 w-4 shrink-0 text-brand" />
                  {qtdExames} {qtdExames === 1 ? "exame" : "exames"}
                  {pedido.convenio_nome && <span className="text-muted-foreground">· {pedido.convenio_nome}</span>}
                </p>
              )}
              {(pedido.unidade_nome || emDomicilio) && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-brand" />
                  {emDomicilio ? "Coleta em casa" : pedido.unidade_nome}
                </p>
              )}
              {quando && (
                <p className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 shrink-0 text-brand" />
                  {quando}
                  <span className="text-xs text-muted-foreground">(sujeito à confirmação)</span>
                </p>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 font-semibold text-secondary">Próximos passos</p>
            <ol className="space-y-2.5">
              {PASSOS[modo].map((texto, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{texto}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <p className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4 shrink-0 text-amber-700" /> Fique de olho no seu e-mail
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Tudo será enviado para <b className="break-all">{email || "o e-mail do seu cadastro"}</b>. Procure
              por estes assuntos (confira também o spam e a aba Promoções):
            </p>
            {protocolo && (
              <ul className="mt-2 space-y-1.5">
                {emailsDoPedido(protocolo, modo).map((e) => (
                  <li key={e.assunto} className="rounded-md bg-white/70 px-2 py-1.5 text-xs">
                    <span className="block text-[10px] font-semibold uppercase text-amber-700">
                      {e.quando}
                    </span>
                    <span className="font-medium text-secondary">{e.assunto}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-relaxed">
              Quando um e-mail pedir algo (token ou documento), clique no botão dele — ele abre o seu pedido
              direto no lugar certo.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={onFechar} className="w-full bg-brand text-white hover:bg-brand-hover">
            {modo === "particular_pagar" ? "Ir para o pagamento" : "Entendi"}
          </Button>
          {modo !== "particular_pagar" && (
            <Button
              variant="ghost"
              onClick={() => {
                onFechar();
                navigate("/agendamentos");
              }}
              className="w-full"
            >
              Ver meus agendamentos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
