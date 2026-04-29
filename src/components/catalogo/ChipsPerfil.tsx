import { Baby, Plane, User, UserCheck, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const PERFIS: { id: string; label: string; faixa: string; icon: LucideIcon }[] = [
  { id: "Gestantes", label: "Gestantes", faixa: "Para você e seu bebê", icon: Baby },
  { id: "Bebês", label: "Bebês", faixa: "0 a 12 meses", icon: Baby },
  { id: "Crianças", label: "Crianças", faixa: "13 meses a 9 anos", icon: User },
  { id: "Adolescentes e Adultos", label: "Adolescentes e Adultos", faixa: "10 a 59 anos", icon: Users },
  { id: "Idosos", label: "Idosos", faixa: "60 anos ou mais", icon: UserCheck },
  { id: "Viajante", label: "Viajante", faixa: "Para onde você for", icon: Plane },
];

type Props = {
  selecionado: string | null;
  onSelect: (id: string | null) => void;
};

export const ChipsPerfil = ({ selecionado, onSelect }: Props) => {
  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-1">
      <div className="flex gap-3 min-w-max">
        {PERFIS.map((p) => {
          const ativo = selecionado === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(ativo ? null : p.id)}
              className={cn(
                "flex items-center gap-3 rounded-full border px-4 py-2.5 transition-colors text-left",
                ativo
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border hover:border-primary/40"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">{p.label}</span>
                <span className={cn("text-xs leading-tight", ativo ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {p.faixa}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
