import { useState } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSacola, ItemSacola } from "@/stores/sacola";
import { formatarPreco } from "@/components/catalogo/types";

type Props = {
  onVerDetalhes: (item: ItemSacola) => void;
};

export const ListaItensSacola = ({ onVerDetalhes }: Props) => {
  const { itens, remover, limpar } = useSacola();
  const [expandido, setExpandido] = useState(false);

  const visiveis = expandido ? itens : itens.slice(0, 5);

  return (
    <div className="space-y-3">
      {visiveis.map((item) => {
        const primeiroOutro = item.outrosNomes?.split(",")[0]?.trim();
        return (
          <div
            key={item.codigoShift}
            className="rounded-xl border bg-card p-4 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-secondary">{item.nome}</p>
                {primeiroOutro && (
                  <p className="text-sm text-muted-foreground">
                    É igual a {primeiroOutro}
                  </p>
                )}
              </div>
              {item.precoCentavos != null && (
                <Badge className="bg-primary text-primary-foreground whitespace-nowrap">
                  {formatarPreco(item.precoCentavos)}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <button
                onClick={() => onVerDetalhes(item)}
                className="text-sm font-medium text-[#C8102E] hover:underline"
              >
                Ver detalhes
              </button>
              <button
                onClick={() => remover(item.codigoShift)}
                className="text-[#C8102E] p-1 hover:bg-[#C8102E]/10 rounded"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2">
        {itens.length > 5 ? (
          <button
            onClick={() => setExpandido((v) => !v)}
            className="text-sm text-[#C8102E] flex items-center gap-1 hover:underline"
          >
            <ChevronDown className={expandido ? "h-4 w-4 rotate-180" : "h-4 w-4"} />
            {expandido ? "Ver menos" : "Ver mais"}
          </button>
        ) : (
          <span />
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="text-sm text-[#C8102E] flex items-center gap-1 hover:underline">
              <Trash2 className="h-4 w-4" /> Limpar tudo
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar a sacola?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os itens adicionados serão removidos. Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => limpar()}
                className="bg-[#C8102E] hover:bg-[#a80d26]"
              >
                Limpar tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
