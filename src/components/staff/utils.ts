export const STATUS_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "atendido", label: "Atendido" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const STATUS_CORES: Record<string, string> = {
  novo: "bg-orange-100 text-orange-800 border-orange-200",
  em_analise: "bg-blue-100 text-blue-800 border-blue-200",
  aguardando_pagamento: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmado: "bg-green-100 text-green-800 border-green-200",
  em_atendimento: "bg-cyan-100 text-cyan-800 border-cyan-200",
  atendido: "bg-teal-100 text-teal-800 border-teal-200",
  concluido: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
};

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label]),
);

export function formatarData(data: string | null) {
  if (!data) return "—";
  const d = new Date(data);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export function formatarPreco(centavos: number | null | undefined) {
  if (centavos == null) return "—";
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export type Pedido = {
  id: string;
  protocolo: string;
  paciente_id: string | null;
  paciente_cpf: string;
  paciente_nome: string | null;
  tipo_solicitacao: string;
  modalidade_coleta: string;
  unidade_codigo_shift: string | null;
  unidade_nome: string | null;
  endereco_coleta: any;
  itens: any;
  convenio_codigo_shift: string | null;
  convenio_nome: string | null;
  numero_carteirinha: string | null;
  url_receita: string | null;
  url_pedido_medico: string | null;
  url_carteirinha: string | null;
  url_identidade: string | null;
  observacoes: string | null;
  status: string;
  status_pagamento: string;
  valor_total_centavos: number | null;
  termos_aceitos: boolean;
  termos_aceitos_em: string | null;
  created_at: string | null;
  data_agendamento: string | null;
  periodo_agendamento: "manha" | "tarde" | null;
};

// ===== Agendamento helpers =====

function dataHoje(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDataAgendamento(iso: string | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export type StatusAgendamento = "hoje" | "amanha" | "futuro" | "atrasado" | "passado" | "sem";

export function statusAgendamento(
  data: string | null,
  status: string,
): StatusAgendamento {
  const d = parseDataAgendamento(data);
  if (!d) return "sem";
  const hoje = dataHoje();
  const diffMs = d.getTime() - hoje.getTime();
  const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanha";
  if (dias > 1) return "futuro";
  // passado
  if (status === "concluido" || status === "cancelado" || status === "atendido") return "passado";
  return "atrasado";
}

export function rotuloPeriodo(p: "manha" | "tarde" | null | undefined): string {
  if (p === "manha") return "Manhã";
  if (p === "tarde") return "Tarde";
  return "";
}

export function formatarAgendamentoCurto(
  data: string | null,
  periodo: "manha" | "tarde" | null,
): string {
  const d = parseDataAgendamento(data);
  if (!d) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const per = rotuloPeriodo(periodo);
  return per ? `${dd}/${mm} — ${per}` : `${dd}/${mm}`;
}
