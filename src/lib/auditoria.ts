import { supabase } from "@/integrations/supabase/client";

/**
 * Registra, para auditoria/LGPD, um acesso da equipe a dados de paciente.
 * Não bloqueia a UI se falhar (ex.: RPC ainda não criada no banco).
 */
export async function registrarAcesso(
  pacienteId: string | null,
  acao: "ver_paciente" | "ver_pedido" | "ver_resultado" | string,
  detalhe?: string,
) {
  try {
    await (supabase as any).rpc("registrar_acesso", {
      p_paciente_id: pacienteId,
      p_acao: acao,
      p_detalhe: detalhe ?? null,
    });
  } catch {
    /* silencioso — auditoria não pode quebrar o fluxo */
  }
}
