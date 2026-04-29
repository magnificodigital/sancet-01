import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Clock, ClipboardList, Home, Trash2 } from "lucide-react";
import { ItemSacola, useSacola } from "@/stores/sacola";
import { formatarPreco } from "@/components/catalogo/types";

type Props = {
  item: ItemSacola | null;
  onClose: () => void;
};

export const DetalheItemDrawer = ({ item, onClose }: Props) => {
  const { remover } = useSacola();

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 flex flex-col">
        {item && (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="text-2xl text-secondary text-left">{item.nome}</SheetTitle>
              {item.outrosNomes && (
                <p className="text-sm text-muted-foreground text-left">
                  Outros nomes: {item.outrosNomes}
                </p>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {item.precoCentavos != null && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Valor</h4>
                  <Badge className="bg-primary text-primary-foreground text-base px-3 py-1">
                    {formatarPreco(item.precoCentavos)}
                  </Badge>
                </div>
              )}

              {item.prazoResultado && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-secondary" />
                    Prazo do resultado
                  </h4>
                  <p className="text-sm text-muted-foreground">{item.prazoResultado}</p>
                </div>
              )}

              {item.preparo && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-secondary" />
                    Instrução de preparo
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {item.preparo}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Opções de atendimento</h4>
                <div className="flex flex-wrap gap-2">
                  {item.disponivelNaUnidade && (
                    <Badge variant="secondary" className="gap-1.5">
                      <Building2 className="h-3 w-3" /> Na unidade
                    </Badge>
                  )}
                  {item.disponivelEmCasa && (
                    <Badge variant="secondary" className="gap-1.5">
                      <Home className="h-3 w-3" /> Em casa
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t space-y-2">
              <Button
                onClick={() => {
                  remover(item.codigoShift);
                  onClose();
                }}
                variant="outline"
                className="w-full border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E]/5 hover:text-[#C8102E]"
              >
                <Trash2 className="h-4 w-4" /> Remover da sacola
              </Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
