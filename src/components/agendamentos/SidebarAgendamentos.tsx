import { CalendarDays, CreditCard, UserCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaciente } from "@/hooks/usePaciente";

export type AbaAgendamentos = "agendamentos" | "convenio" | "dados" | "resultados";

const ITENS: { key: AbaAgendamentos; label: string; icon: any }[] = [
  { key: "agendamentos", label: "Agendamentos", icon: CalendarDays },
  { key: "resultados", label: "Resultados", icon: FileText },
  { key: "convenio", label: "Convênio", icon: CreditCard },
  { key: "dados", label: "Dados pessoais", icon: UserCircle },
];

type Props = {
  ativa: AbaAgendamentos;
  onMudar: (a: AbaAgendamentos) => void;
};

export const SidebarAgendamentos = ({ ativa, onMudar }: Props) => {
  const { paciente } = usePaciente();
  const primeiroNome = (paciente?.nomeSocial || paciente?.nome || "").split(" ")[0];

  return (
    <>
      {/* Desktop: sidebar vertical */}
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
                    ? "bg-[#F5F5F5] border-brand font-semibold text-secondary"
                    : "border-transparent text-muted-foreground hover:bg-muted/40"
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: título + navegação em chips roláveis */}
      <div className="lg:hidden">
        <h2 className="text-lg font-bold text-secondary mb-3">
          Olá, {primeiroNome}
        </h2>
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ITENS.map((it) => {
            const Icon = it.icon;
            const isAtiva = ativa === it.key;
            return (
              <button
                key={it.key}
                onClick={() => onMudar(it.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition",
                  isAtiva
                    ? "border-brand bg-brand font-semibold text-white"
                    : "border-border bg-background text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
