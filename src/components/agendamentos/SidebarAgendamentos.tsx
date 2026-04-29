import { CalendarDays, CreditCard, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaciente } from "@/hooks/usePaciente";

export type AbaAgendamentos = "agendamentos" | "convenio" | "dados";

const ITENS: { key: AbaAgendamentos; label: string; icon: any }[] = [
  { key: "agendamentos", label: "Agendamentos", icon: CalendarDays },
  { key: "convenio", label: "Convênio", icon: CreditCard },
  { key: "dados", label: "Dados pessoais", icon: UserCircle },
];

type Props = {
  ativa: AbaAgendamentos;
  onMudar: (a: AbaAgendamentos) => void;
};

export const SidebarAgendamentos = ({ ativa, onMudar }: Props) => {
  const { paciente } = usePaciente();
  const primeiroNome = paciente?.nome?.split(" ")[0] ?? "";

  return (
    <aside className="hidden lg:flex flex-col w-[280px] shrink-0 gap-6">
      <div>
        <h2 className="text-xl font-bold text-secondary">Olá, {primeiroNome}</h2>
        <p className="text-sm text-muted-foreground">Consulte os agendamentos</p>
      </div>

      <nav className="flex flex-col">
        {ITENS.map((it) => {
          const Icon = it.icon;
          const isAtiva = ativa === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onMudar(it.key)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm text-left border-l-[3px] transition",
                isAtiva
                  ? "bg-[#F5F5F5] border-[#C8102E] font-semibold text-secondary"
                  : "border-transparent text-muted-foreground hover:bg-muted/40"
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </button>
          );
        })}
      </nav>

      <div className="rounded-xl bg-[#F5F5F5] p-4 space-y-2 mt-auto">
        <p className="text-sm font-bold text-secondary">Acesse pelo celular!</p>
        <div className="w-20 h-20 bg-[#1B3A6B] rounded-lg flex items-center justify-center text-white font-bold">
          QR
        </div>
        <p className="text-xs text-muted-foreground">
          Agendamentos, resultados e muito mais em um só lugar.
        </p>
      </div>
    </aside>
  );
};
