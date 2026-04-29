import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, ClipboardList, Home, ShoppingBag, Trash2 } from "lucide-react";
import { ItemCatalogo, formatarPreco } from "./types";
import { useSacola } from "@/stores/sacola";
import { cn } from "@/lib/utils";

type Props = {
  item: ItemCatalogo | null;
  tipo: "exame" | "vacina";
  onClose: () => void;
};

export const ExameDrawer = ({ item, tipo, onClose }: Props) => {
  const { itens, adicionar, remover } = useSacola();
  const open = !!item;
  const jaAdicionado = item ? itens.some((i) => i.codigoShift === item.codigo_shift) : false;

  const handleToggle = () => {
    if (!item) return;
    if (jaAdicionado) {
      remover(item.codigo_shift);
    } else {
      adicionar({
        codigoShift: item.codigo_shift,
        tipo,
        nome: item.nome,
        outrosNomes: (item.outros_nomes ?? []).join(", "),
        precoCentavos: item.preco_centavos,
        prazoResultado: item.prazo_resultado,
        preparo: item.preparo,
        disponivelNaUnidade: item.disponivel_na_unidade,
        disponivelEmCasa: item.disponivel_em_casa,
      });
    }
  };

  const preco = item ? formatarPreco(item.preco_centavos) : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[400px] p-0 flex flex-col"
      >
        {item && (
          <>
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="text-2xl text-secondary text-left">
                {item.nome}
              </SheetTitle>
              {item.outros_nomes && item.outros_nomes.length > 0 && (
                <p className="text-sm text-muted-foreground text-left">
                  Outros nomes: {item.outros_nomes.join(", ")}
                </p>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {preco && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Valor</h4>
                  <Badge className="bg-primary text-primary-foreground text-base px-3 py-1">
                    {preco}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Este valor não inclui possíveis procedimentos adicionais.
                  </p>
                </div>
              )}

              {item.prazo_resultado && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-secondary" />
                    Prazo do resultado
                  </h4>
                  <p className="text-sm text-muted-foreground">{item.prazo_resultado}</p>
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
                  {item.disponivel_na_unidade && (
                    <Badge variant="secondary" className="gap-1.5">
                      <Building2 className="h-3 w-3" /> Na unidade
                    </Badge>
                  )}
                  {item.disponivel_em_casa && (
                    <Badge variant="secondary" className="gap-1.5">
                      <Home className="h-3 w-3" /> Em casa
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t space-y-2">
              <Button
                onClick={handleToggle}
                className={cn(
                  "w-full",
                  jaAdicionado
                    ? "bg-background border border-primary text-primary hover:bg-primary/5"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                {jaAdicionado ? (
                  <>
                    <Trash2 className="h-4 w-4" /> Remover da sacola
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" /> Adicionar à sacola
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
