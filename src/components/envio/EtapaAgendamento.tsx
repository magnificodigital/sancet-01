import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Sun, Sunset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dispDoDia, temManha, temTarde, type DispDia } from "@/lib/agendamento";
import type { Unidade } from "./ListaUnidades";

export type Periodo = "manha" | "tarde";

export type Agendamento = {
  data: Date;
  periodo: Periodo;
};

type Props = {
  onConfirmar: (a: Agendamento) => void;
  unidade?: Unidade | null;
};

const hoje = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Antecedência mínima de agendamento (bloqueia o mesmo dia):
// - Solicitado até 11h00 → pode agendar a partir do dia seguinte (24h).
// - Solicitado após 11h00 → próxima disponibilidade em 48h (2 dias).
const minData = () => {
  const dias = new Date().getHours() < 11 ? 1 : 2;
  const d = hoje();
  d.setDate(d.getDate() + dias);
  return d;
};

const maxData = () => {
  const d = hoje();
  d.setDate(d.getDate() + 30);
  return d;
};

export const EtapaAgendamento = ({ onConfirmar, unidade }: Props) => {
  const [data, setData] = useState<Date | undefined>(undefined);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);

  // Agenda da unidade escolhida (por dia da semana). Sem config → fallback padrão.
  const dias = (unidade?.horarios?.dias ?? null) as Record<string, DispDia> | null;
  const dispData: DispDia = data ? dispDoDia(dias, data.getDay()) : "ambos";
  const manhaOk = temManha(dispData);
  const tardeOk = temTarde(dispData);

  const periodoInvalido =
    (!!periodo && periodo === "manha" && !manhaOk) ||
    (!!periodo && periodo === "tarde" && !tardeOk);
  const podeAvancar = !!data && !!periodo && !periodoInvalido;

  const escolherData = (d: Date | undefined) => {
    setData(d);
    if (d) {
      const disp = dispDoDia(dias, d.getDay());
      if (periodo === "tarde" && !temTarde(disp)) setPeriodo(null);
      if (periodo === "manha" && !temManha(disp)) setPeriodo(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Agendar atendimento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o dia e o período para comparecer à unidade.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-secondary">Data</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !data && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data
                  ? format(data, "EEE, dd 'de' MMM 'de' yyyy", { locale: ptBR })
                  : "Selecione uma data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data}
                onSelect={escolherData}
                locale={ptBR}
                disabled={(d) => {
                  if (d < minData()) return true; // bloqueia mesmo dia / antecedência mínima
                  if (d > maxData()) return true;
                  if (dispDoDia(dias, d.getDay()) === "fechado") return true; // unidade fechada
                  return false;
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <p className="mt-2 text-xs text-muted-foreground">
            Agende com no mínimo 24h de antecedência (pedidos após as 11h só a partir de 48h),
            até 30 dias à frente.
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-secondary">Período</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!!data && !manhaOk}
              onClick={() => setPeriodo("manha")}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                periodo === "manha"
                  ? "border-brand bg-brand/5 ring-2 ring-brand/30"
                  : "border-border hover:border-brand/40",
                !!data && !manhaOk && "cursor-not-allowed opacity-50 hover:border-border",
              )}
            >
              <Sun className="mb-2 h-5 w-5 text-brand" />
              <p className="font-semibold text-secondary">Manhã</p>
              <p className="text-xs text-muted-foreground">7h às 11h</p>
            </button>

            <button
              type="button"
              disabled={!!data && !tardeOk}
              onClick={() => setPeriodo("tarde")}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                periodo === "tarde"
                  ? "border-brand bg-brand/5 ring-2 ring-brand/30"
                  : "border-border hover:border-brand/40",
                !!data && !tardeOk && "cursor-not-allowed opacity-50 hover:border-border",
              )}
            >
              <Sunset className="mb-2 h-5 w-5 text-brand" />
              <p className="font-semibold text-secondary">Tarde</p>
              <p className="text-xs text-muted-foreground">12h às 16h</p>
            </button>
          </div>
          {data && !manhaOk && !tardeOk && (
            <p className="mt-2 text-xs text-muted-foreground">
              A unidade não atende nesse dia. Escolha outra data.
            </p>
          )}
          {data && (manhaOk !== tardeOk) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Nesse dia a unidade atende somente pela {manhaOk ? "manhã" : "tarde"}.
            </p>
          )}
        </div>
      </div>

      <Button
        disabled={!podeAvancar}
        onClick={() => onConfirmar({ data: data!, periodo: periodo! })}
        className="w-full bg-brand hover:bg-brand-hover text-white"
      >
        Continuar
      </Button>
    </div>
  );
};
