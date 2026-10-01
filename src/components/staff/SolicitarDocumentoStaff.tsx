import { useEffect, useState } from "react";
import { CheckCircle2, FileQuestion, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatarData, Pedido } from "./utils";

type Props = { pedido: Pedido; podeEditar: boolean; onSalvo?: () => void };

/**
 * Equipe pede um documento ao paciente (foto ilegível, guia, relatório…).
 * O paciente recebe e-mail com link que abre o pedido no campo de envio.
 */
export const SolicitarDocumentoStaff = ({ pedido, podeEditar, onSalvo }: Props) => {
  const [texto, setTexto] = useState("");
  const [solicitadoEm, setSolicitadoEm] = useState<string | null>(null);
  const [respondidoEm, setRespondidoEm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setTexto((pedido as any).doc_solicitado_texto ?? "");
    setSolicitadoEm((pedido as any).doc_solicitado_em ?? null);
    setRespondidoEm((pedido as any).anexo_paciente_em ?? null);
  }, [pedido.id]);

  const respondeu =
    !!respondidoEm && (!solicitadoEm || Date.parse(respondidoEm) >= Date.parse(solicitadoEm));

  const solicitar = async () => {
    const valor = texto.trim();
    if (!valor) return toast.error("Descreva o que o paciente precisa enviar.");
    setEnviando(true);
    const agora = new Date().toISOString();
    const { data, error } = await supabase
      .from("pedidos")
      .update({ doc_solicitado_em: agora, doc_solicitado_texto: valor } as any)
      .eq("id", pedido.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setEnviando(false);
      return toast.error(error ? "Não foi possível solicitar." : "Sem permissão para alterar este pedido.");
    }
    setSolicitadoEm(agora);
    const { data: r } = await supabase.functions.invoke("enviar-email-pedido", {
      body: { pedido_id: pedido.id, tipo: "solicitar_documento" },
    });
    setEnviando(false);
    if ((r as any)?.sent_paciente) toast.success("Solicitação enviada por e-mail ao paciente.");
    else toast.message("Solicitação salva — o paciente vê no pedido (e-mail não enviado).");
    onSalvo?.();
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-violet-800">
        <FileQuestion className="h-3.5 w-3.5" /> Solicitar documento ao paciente
      </p>
      {solicitadoEm && (
        <p
          className={
            "mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs " +
            (respondeu ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900")
          }
        >
          {respondeu ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> Paciente enviou em {formatarData(respondidoEm)} — veja na aba Documentos.
            </>
          ) : (
            <>Solicitado em {formatarData(solicitadoEm)} — aguardando o paciente.</>
          )}
        </p>
      )}
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        disabled={!podeEditar || enviando}
        placeholder="Ex.: a foto do pedido médico ficou ilegível — envie outra mais nítida."
        className="bg-white"
      />
      {podeEditar && (
        <Button
          size="sm"
          onClick={solicitar}
          disabled={enviando}
          className="mt-2 gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
        >
          {enviando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> {solicitadoEm ? "Solicitar de novo" : "Solicitar ao paciente"}
            </>
          )}
        </Button>
      )}
    </div>
  );
};
