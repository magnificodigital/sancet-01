import { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  etapaAtual: number;
  totalEtapas: number;
  onAnterior: () => void;
  onProximo: () => void;
  podeAvancar?: boolean;
  carregando?: boolean;
  children: ReactNode;
};

export const WizardStep = ({
  etapaAtual,
  totalEtapas,
  onAnterior,
  onProximo,
  podeAvancar = true,
  carregando = false,
  children,
}: Props) => {
  const ultima = etapaAtual === totalEtapas;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAnterior}
          disabled={etapaAtual === 1 || carregando}
          aria-label="Etapa anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm font-semibold text-secondary">
          {etapaAtual}/{totalEtapas}
        </span>

        <Button
          type="button"
          size="icon"
          onClick={onProximo}
          disabled={!podeAvancar || carregando}
          className={cn(
            "bg-[#C8102E] hover:bg-[#a80d26] text-white",
            ultima && "w-auto px-4"
          )}
          aria-label={ultima ? "Finalizar cadastro" : "Próxima etapa"}
        >
          {carregando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : ultima ? (
            "OK"
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div>{children}</div>
    </div>
  );
};
