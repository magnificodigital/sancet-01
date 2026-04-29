import { Home, Building2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = {
  onEscolher: (m: "domicilio" | "unidade") => void;
};

export const EtapaTipoAtendimento = ({ onEscolher }: Props) => (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold text-secondary">Tipo de atendimento</h1>

    <button
      onClick={() => onEscolher("domicilio")}
      className="relative w-full text-left rounded-xl border-2 border-[#C8102E] bg-card p-5 flex items-center gap-4 hover:bg-[#C8102E]/5 transition"
    >
      <Badge className="absolute -top-2 right-4 bg-[#C8102E] text-white">Recomendado</Badge>
      <Home className="h-8 w-8 text-[#C8102E] shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-secondary">Sancet em Casa</p>
        <p className="text-sm text-muted-foreground">
          Em casa ou onde preferir. Profissional vai até você!
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-[#C8102E]" />
    </button>

    <button
      onClick={() => onEscolher("unidade")}
      className="w-full text-left rounded-xl border bg-card p-5 flex items-center gap-4 hover:bg-muted/40 transition"
    >
      <Building2 className="h-8 w-8 text-[#1B3A6B] shrink-0" />
      <div className="flex-1">
        <p className="font-bold text-secondary">Na unidade</p>
        <p className="text-sm text-muted-foreground">
          Escolha o local mais perto de você.
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-[#1B3A6B]" />
    </button>
  </div>
);
