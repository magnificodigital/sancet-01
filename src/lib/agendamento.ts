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
