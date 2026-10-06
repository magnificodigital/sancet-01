import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EtapaAgendamento, Agendamento } from "@/components/envio/EtapaAgendamento";
import type { Unidade } from "@/components/envio/ListaUnidades";
import { formatarAgendamento } from "@/lib/agendamento";

const dataISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Paciente escolhe nova data/período para um pedido na unidade. Usa a mesma
 * agenda do pedido (antecedência mínima, corte das 16h, horário da unidade);
 * o servidor confere a antecedência de novo e avisa a equipe.
 */
export const ReagendarPedido = ({
  aberto,
  onFechar,
  protocolo,
  unidadeNome,
  dataAtual,
  periodoAtual,
}: {
  aberto: boolean;
  onFechar: (reagendou: boolean) => void;
  protocolo: string;
  unidadeNome: string | null;
  dataAtual: string | null;
  periodoAtual: "manha" | "tarde" | null;
}) => {
  const qc = useQueryClient();
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto || !unidadeNome) return;
    supabase
      .from("unidades_cache")
      .select("codigo_shift,nome,endereco,bairro,cidade,uf,horarios")
      .eq("nome", unidadeNome)
      .maybeSingle()
      .then(({ data }) => setUnidade((data as any) ?? null));
  }, [aberto, unidadeNome]);

  const confirmar = async (a: Agendamento) => {
    setSalvando(true);
    const { data, error } = await (supabase as any).rpc("reagendar_meu_pedido_auth", {
      p_protocolo: protocolo,
      p_data: dataISO(a.data),
      p_periodo: a.periodo,
    });
    setSalvando(false);
    if (error || data?.error) {
      toast.error(data?.error ?? "Não foi possível reagendar. Tente novamente.");
      return;
    }
    toast.success(`Reagendado para ${formatarAgendamento(a.data, a.periodo)}. A equipe foi avisada.`);
    qc.invalidateQueries({ queryKey: ["pedidos"] });
    onFechar(true);
  };

  const atual = dataAtual ? formatarAgendamento(dataAtual, periodoAtual) : null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !salvando && onFechar(false)}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reagendar atendimento</DialogTitle>
          <DialogDescription>
            {atual ? (
              <>
                Agendamento atual: <b>{atual}</b>
                {unidadeNome ? ` — ${unidadeNome}` : ""}.
              </>
            ) : (
              "Escolha a nova data e o período."
            )}{" "}
            Se o pedido já estava confirmado, ele volta para análise e a equipe confirma a nova data por e-mail.
          </DialogDescription>
        </DialogHeader>
        {salvando ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EtapaAgendamento unidade={unidade} onConfirmar={confirmar} textoBotao="Confirmar nova data" />
        )}
      </DialogContent>
    </Dialog>
  );
};
