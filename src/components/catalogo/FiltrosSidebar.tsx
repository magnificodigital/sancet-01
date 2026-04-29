import { Home } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  emCasa: boolean;
  setEmCasa: (v: boolean) => void;
  categorias: string[];
  categoriasSelecionadas: string[];
  toggleCategoria: (c: string) => void;
  limpar: () => void;
  totalResultados?: number;
  onAplicar?: () => void;
  mobile?: boolean;
};

export const FiltrosSidebar = ({
  emCasa,
  setEmCasa,
  categorias,
  categoriasSelecionadas,
  toggleCategoria,
  limpar,
  totalResultados,
  onAplicar,
  mobile,
}: Props) => {
  return (
    <div className={cn("flex flex-col h-full", mobile ? "" : "rounded-2xl border bg-card p-5 shadow-sm")}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-base">Filtros</h3>
        <button
          onClick={limpar}
          className="text-sm font-medium text-primary hover:underline"
        >
          Limpar tudo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        <div>
          <h4 className="font-semibold text-sm mb-3">Tipo de atendimento</h4>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={emCasa}
              onCheckedChange={(v) => setEmCasa(Boolean(v))}
            />
            <Home className="h-4 w-4 text-secondary" />
            <span className="text-sm">Sancet em Casa</span>
          </label>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Categorias</h4>
          <div className="space-y-2.5">
            {categorias.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={categoriasSelecionadas.includes(cat)}
                  onCheckedChange={() => toggleCategoria(cat)}
                />
                <span className="text-sm">{cat}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {mobile && (
        <div className="pt-4 border-t mt-4">
          <Button
            onClick={onAplicar}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Ver resultados {totalResultados !== undefined && `(${totalResultados})`}
          </Button>
        </div>
      )}
    </div>
  );
};
