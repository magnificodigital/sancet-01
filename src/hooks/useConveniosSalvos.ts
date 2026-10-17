import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePaciente } from "@/hooks/usePaciente";

export type ConvenioSalvo = {
  id: string;
  convenio_id: string | null;
  convenio_nome: string;
  convenio_codigo_shift: string | null;
  plano_codigo: string | null;
  plano_descricao: string | null;
  numero_carteirinha: string;
  validade: string | null;
  url_carteirinha: string | null;
  principal: boolean;
};

/** Convênios que o paciente salvou na conta (o principal primeiro). */
export function useConveniosSalvos() {
  const { paciente } = usePaciente();
  return useQuery({
    queryKey: ["convenios-salvos", paciente?.id],
    enabled: !!paciente?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("paciente_convenios")
        .select("*")
        .eq("paciente_id", paciente!.id)
        .order("principal", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ConvenioSalvo[];
    },
  });
}
