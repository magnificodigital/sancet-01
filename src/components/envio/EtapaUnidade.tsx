import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mascaraCEP } from "@/lib/mascaras";
import { ListaUnidades, Unidade } from "./ListaUnidades";
import { PainelUnidade } from "./PainelUnidade";

type Props = {
  onConfirmar: (u: Unidade) => void;
};

export const EtapaUnidade = ({ onConfirmar }: Props) => {
  const [cep, setCep] = useState("");
  const [selecionada, setSelecionada] = useState<Unidade | null>(null);

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

      <ListaUnidades onEscolher={setSelecionada} />

      <PainelUnidade
        unidade={selecionada}
        onClose={() => setSelecionada(null)}
        onConfirmar={(u) => {
          setSelecionada(null);
          onConfirmar(u);
        }}
      />
    </div>
  );
};
