export const STATUS_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "confirmado", label: "Confirmado" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const STATUS_CORES: Record<string, string> = {
  novo: "bg-orange-100 text-orange-800 border-orange-200",
  em_analise: "bg-blue-100 text-blue-800 border-blue-200",
  aguardando_pagamento: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmado: "bg-green-100 text-green-800 border-green-200",
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
};
