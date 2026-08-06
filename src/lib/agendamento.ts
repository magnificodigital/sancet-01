import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatarAgendamento(
  data: Date | string | null,
  periodo: "manha" | "tarde" | null,
): string | null {
  if (!data || !periodo) return null;
  const d = typeof data === "string" ? parseDateOnly(data) : data;
  if (!d) return null;
  const txt = format(d, "EEE, dd 'de' MMM 'de' yyyy", { locale: ptBR });
  return `Atendimento agendado para ${txt} — período da ${periodo === "manha" ? "manhã" : "tarde"}`;
}

export function parseDateOnly(iso: string): Date | null {
  // "YYYY-MM-DD" → Date local (sem timezone shift)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ---- Agenda por dia da semana da unidade ----
// Guardado em unidades_cache.horarios.dias = { "0": "fechado", "1": "ambos", ... }
// Chaves 0..6 = domingo..sábado (getDay()).
export type DispDia = "fechado" | "manha" | "tarde" | "ambos";

export const DIAS_SEMANA: { n: number; label: string; curto: string }[] = [
  { n: 1, label: "Segunda-feira", curto: "Seg" },
  { n: 2, label: "Terça-feira", curto: "Ter" },
  { n: 3, label: "Quarta-feira", curto: "Qua" },
  { n: 4, label: "Quinta-feira", curto: "Qui" },
  { n: 5, label: "Sexta-feira", curto: "Sex" },
  { n: 6, label: "Sábado", curto: "Sáb" },
  { n: 0, label: "Domingo", curto: "Dom" },
];

// Fallback quando a unidade não tem agenda configurada.
export const AGENDA_PADRAO: Record<string, DispDia> = {
  "0": "fechado",
  "1": "ambos",
  "2": "ambos",
  "3": "ambos",
  "4": "ambos",
  "5": "ambos",
  "6": "manha",
};

/** Disponibilidade de períodos para um dia da semana, segundo a agenda da unidade. */
export function dispDoDia(
  dias: Record<string, DispDia> | undefined | null,
  weekday: number,
): DispDia {
  const cfg = dias && dias[String(weekday)];
  return (cfg as DispDia) || AGENDA_PADRAO[String(weekday)] || "fechado";
}

export const temManha = (d: DispDia) => d === "manha" || d === "ambos";
export const temTarde = (d: DispDia) => d === "tarde" || d === "ambos";
