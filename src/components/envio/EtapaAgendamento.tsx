import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Sun, Sunset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Periodo = "manha" | "tarde";

export type Agendamento = {
  data: Date;
  periodo: Periodo;
};

type Props = {
  onConfirmar: (a: Agendamento) => void;
};

const hoje = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const maxData = () => {
  const d = hoje();
  d.setDate(d.getDate() + 30);
  return d;
};

export const EtapaAgendamento = ({ onConfirmar }: Props) => {
  const [data, setData] = useState<Date | undefined>(undefined);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);

  const isSabado = data ? data.getDay() === 6 : false;
  const periodoInvalido = isSabado && periodo === "tarde";
  const podeAvancar = !!data && !!periodo && !periodoInvalido;

  const escolherData = (d: Date | undefined) => {
    setData(d);
    if (d && d.getDay() === 6 && periodo === "tarde") {
      setPeriodo(null);
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
                  if (d < hoje()) return true;
                  if (d > maxData()) return true;
                  if (d.getDay() === 0) return true; // domingo
                  return false;
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <p className="mt-2 text-xs text-muted-foreground">
            Segunda a sábado, até 30 dias à frente.
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-secondary">Período</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPeriodo("manha")}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                periodo === "manha"
                  ? "border-[#C8102E] bg-[#C8102E]/5 ring-2 ring-[#C8102E]/30"
                  : "border-border hover:border-[#C8102E]/40",
              )}
            >
              <Sun className="mb-2 h-5 w-5 text-[#C8102E]" />
              <p className="font-semibold text-secondary">Manhã</p>
              <p className="text-xs text-muted-foreground">7h às 11h</p>
            </button>

            <button
              type="button"
              disabled={isSabado}
              onClick={() => setPeriodo("tarde")}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                periodo === "tarde"
                  ? "border-[#C8102E] bg-[#C8102E]/5 ring-2 ring-[#C8102E]/30"
                  : "border-border hover:border-[#C8102E]/40",
                isSabado && "cursor-not-allowed opacity-50 hover:border-border",
              )}
            >
              <Sunset className="mb-2 h-5 w-5 text-[#C8102E]" />
              <p className="font-semibold text-secondary">Tarde</p>
              <p className="text-xs text-muted-foreground">12h às 16h</p>
            </button>
          </div>
          {isSabado && (
            <p className="mt-2 text-xs text-muted-foreground">
              Aos sábados a unidade atende somente pela manhã.
            </p>
          )}
        </div>
      </div>

      <Button
        disabled={!podeAvancar}
        onClick={() => onConfirmar({ data: data!, periodo: periodo! })}
        className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
      >
        Continuar
      </Button>
    </div>
  );
};
