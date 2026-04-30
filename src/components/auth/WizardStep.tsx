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
      <div>{children}</div>

      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="button"
          onClick={onProximo}
          disabled={!podeAvancar || carregando}
          className={cn(
            "w-full h-12 text-base font-bold bg-[#C8102E] hover:bg-[#a80d26] text-white shadow-lg shadow-[#C8102E]/30 transition-transform hover:scale-[1.02]"
          )}
        >
          {carregando ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : ultima ? (
            "Finalizar cadastro"
          ) : (
            <>
              Próximo
              <ChevronRight className="h-5 w-5 ml-1" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAnterior}
            disabled={etapaAtual === 1 || carregando}
            className="text-muted-foreground hover:text-secondary"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <span className="text-sm font-semibold text-secondary">
            Etapa {etapaAtual} de {totalEtapas}
          </span>
        </div>
      </div>
    </div>
  );
};
