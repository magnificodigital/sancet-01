import { CheckCircle2, Mail } from "lucide-react";
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

type Modo = "convenio" | "particular_pagar" | "particular_pago";

const PASSOS: Record<Modo, string[]> = {
  convenio: [
    "Nossa equipe vai analisar o seu pedido e a autorização do convênio.",
    "Se precisarmos de algo (token do convênio, foto mais nítida ou outro documento), vamos pedir por e-mail — é só responder pelo link do e-mail ou em Meus agendamentos.",
    "Com tudo certo, você recebe o e-mail de confirmação com a data e a unidade.",
    "Junto com a confirmação vem o preparo dos exames (como o jejum). Siga as orientações antes de ir.",
  ],
  particular_pagar: [
    "Finalize o pagamento nesta tela (Pix, boleto ou cartão).",
    "Assim que o pagamento for confirmado, seu pedido segue para a nossa equipe.",
    "Você recebe por e-mail a confirmação com a data e a unidade.",
    "Junto com a confirmação vem o preparo dos exames (como o jejum). Siga as orientações antes de ir.",
  ],
  particular_pago: [
    "Pagamento confirmado — seu pedido já está com a nossa equipe.",
    "Se precisarmos de algo, vamos pedir por e-mail — é só responder pelo link do e-mail ou em Meus agendamentos.",
    "Você recebe por e-mail a confirmação com a data e a unidade.",
    "Junto com a confirmação vem o preparo dos exames (como o jejum). Siga as orientações antes de ir.",
  ],
};

/** Lightbox de próximos passos exibido logo após o paciente finalizar o pedido. */
export const AvisoPedidoEnviado = ({
  aberto,
  onFechar,
  protocolo,
  email,
  modo,
}: {
  aberto: boolean;
  onFechar: () => void;
  protocolo?: string;
  email?: string | null;
  modo: Modo;
}) => {
  const navigate = useNavigate();
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
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-left text-sm">
          <p className="font-semibold text-secondary">Próximos passos</p>
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

          <div className="flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-amber-900">
              <p className="font-semibold">Fique de olho no seu e-mail</p>
              <p className="text-xs leading-relaxed">
                Todas as informações serão enviadas para{" "}
                <b className="break-all">{email || "o e-mail do seu cadastro"}</b>. Confira também a caixa de
                spam e as promoções.
              </p>
            </div>
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
