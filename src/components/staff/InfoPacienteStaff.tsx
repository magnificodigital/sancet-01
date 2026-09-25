import { useEffect, useState } from "react";
import { Loader2, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatarData, Pedido } from "./utils";

type Props = {
  pedido: Pedido;
  podeEditar: boolean;
  onSalvo?: () => void;
};

/**
 * Recado do operador para o paciente (ex.: "trazer a carteirinha física").
 * Aparece em destaque no detalhe do pedido na área do paciente e pode ser
 * enviado por e-mail.
 */
export const InfoPacienteStaff = ({ pedido, podeEditar, onSalvo }: Props) => {
  const [texto, setTexto] = useState("");
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<"salvar" | "email" | null>(null);

  useEffect(() => {
    setTexto((pedido as any).info_paciente ?? "");
    setSalvoEm((pedido as any).info_paciente_em ?? null);
  }, [pedido.id]);

  const salvar = async (avisar: boolean) => {
    const valor = texto.trim();
    if (avisar && !valor) {
      toast.error("Escreva a mensagem antes de enviar ao paciente.");
      return;
    }
    setSalvando(avisar ? "email" : "salvar");
    const agora = new Date().toISOString();
    const { data, error } = await supabase
      .from("pedidos")
      .update({ info_paciente: valor || null, info_paciente_em: valor ? agora : null } as any)
      .eq("id", pedido.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setSalvando(null);
      toast.error(error ? "Não foi possível salvar a mensagem." : "Sem permissão para alterar este pedido.");
      return;
    }
    setSalvoEm(valor ? agora : null);

    if (avisar) {
      const { data: r } = await supabase.functions.invoke("enviar-email-pedido", {
        body: { pedido_id: pedido.id, tipo: "informacao" },
      });
      if ((r as any)?.sent_paciente) {
        toast.success("Mensagem salva e enviada por e-mail ao paciente.");
      } else {
        toast.message("Mensagem salva. O e-mail não foi enviado (paciente sem e-mail?).");
      }
    } else {
      toast.success(valor ? "Mensagem salva — o paciente vê no pedido." : "Mensagem removida.");
    }
    setSalvando(null);
    onSalvo?.();
  };

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-sky-800">
        <MessageSquareText className="h-3.5 w-3.5" /> Informações para o paciente
      </p>
      <p className="mb-2 text-xs text-muted-foreground">
        Aparece em destaque no pedido, na área do paciente. Ex.: trazer a carteirinha
        física, coleta de urina em frasco próprio, ajuste de horário.
      </p>
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        disabled={!podeEditar || !!salvando}
        placeholder="Escreva aqui a informação para o paciente…"
        className="bg-white"
      />
      {podeEditar && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => salvar(false)} disabled={!!salvando}>
            {salvando === "salvar" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
          <Button
            size="sm"
            onClick={() => salvar(true)}
            disabled={!!salvando}
            className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700"
          >
            {salvando === "email" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Salvar e avisar por e-mail
              </>
            )}
          </Button>
          {salvoEm && (
            <span className="text-xs text-muted-foreground">Atualizado em {formatarData(salvoEm)}</span>
          )}
        </div>
      )}
    </div>
  );
};
