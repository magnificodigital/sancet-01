import { useState } from "react";
import { Search, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mascaraCEP } from "@/lib/mascaras";
import { ListaUnidades, Unidade } from "./ListaUnidades";

type Props = {
  onConfirmar: (u: Unidade) => void;
};

export const EtapaUnidade = ({ onConfirmar }: Props) => {
  const [cep, setCep] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-secondary">
          Escolha o local, dia e hora do atendimento
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha a unidade mais perto de você com agenda mais próxima.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={cep}
            onChange={(e) => setCep(mascaraCEP(e.target.value))}
            placeholder="00000-000"
            className="pl-9"
          />
        </div>
        <Button variant="outline">Buscar</Button>
      </div>

      {/* "Escolher local" vai direto para a próxima etapa (sem abrir painel lateral). */}
      <ListaUnidades onEscolher={onConfirmar} />

      <Alert className="bg-muted/50 border-muted-foreground/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm text-muted-foreground">
          Os exames deste pedido só poderão ser realizados na unidade selecionada.
        </AlertDescription>
      </Alert>
    </div>
  );
};
