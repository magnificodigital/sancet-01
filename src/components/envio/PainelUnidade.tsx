import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Unidade } from "./ListaUnidades";

type Props = {
  unidade: Unidade | null;
  onClose: () => void;
  onConfirmar: (u: Unidade) => void;
};

export const PainelUnidade = ({ unidade, onClose, onConfirmar }: Props) => {
  return (
    <Sheet open={!!unidade} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 flex flex-col">
        {unidade && (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="text-xl text-secondary text-left">{unidade.nome}</SheetTitle>
              <p className="text-sm text-muted-foreground text-left">
                {[unidade.endereco, unidade.bairro, unidade.cidade, unidade.uf].filter(Boolean).join(" · ")}
              </p>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold mb-2">Horários de atendimento</h4>
                <p className="text-sm text-muted-foreground">
                  Seg–Sex 07h–18h · Sáb 07h–13h
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Procedimentos</h4>
                <p className="text-sm text-muted-foreground">
                  Coleta de exames laboratoriais e aplicação de vacinas.
                </p>
              </div>
            </div>

            <div className="p-6 border-t space-y-2">
              <Button
                variant="outline"
                onClick={() => toast.success("Instruções enviadas!")}
                className="w-full border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E]/5 hover:text-[#C8102E]"
              >
                <Mail className="h-4 w-4" /> Receber instruções por e-mail
              </Button>
              <Button
                onClick={() => onConfirmar(unidade)}
                className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
              >
                Confirmar esta unidade
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
