import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSacola } from "@/stores/sacola";

export const ListaNaoAdicionados = () => {
  const { naoAdicionados } = useSacola();
  const navigate = useNavigate();

  if (naoAdicionados.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Todos os procedimentos foram identificados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {naoAdicionados.map((termo) => (
        <div
          key={termo}
          className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3"
        >
          <div>
            <p className="font-bold text-secondary">{termo}</p>
            <p className="text-sm text-muted-foreground">Não encontrado no catálogo</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/exames?q=${encodeURIComponent(termo)}`)}
          >
            Buscar manualmente
          </Button>
        </div>
      ))}
    </div>
  );
};
