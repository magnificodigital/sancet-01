import { Home, Building2, ChevronRight, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ItemSacola } from "@/stores/sacola";
import { useAtendimento } from "@/lib/tema";

type Props = {
  onEscolher: (m: "domicilio" | "unidade") => void;
  itens: ItemSacola[];
};

export const EtapaTipoAtendimento = ({ onEscolher, itens }: Props) => {
  const { sancetCasa } = useAtendimento();
  const examesSemDomicilio = itens.filter((i) => i.disponivelEmCasa !== true);
  const todosPermitemDomicilio =
    sancetCasa && itens.length > 0 && examesSemDomicilio.length === 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-secondary">Tipo de atendimento</h1>

      {sancetCasa && !todosPermitemDomicilio && examesSemDomicilio.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
          <div className="space-y-1">
            <p>
              <strong>Alguns exames do seu pedido só podem ser coletados na unidade:</strong>
            </p>
            <ul className="list-disc pl-5">
              {examesSemDomicilio.map((i) => (
                <li key={i.codigoShift}>{i.nome}</li>
              ))}
            </ul>
            <p>Por isso, a opção de coleta em casa não está disponível.</p>
          </div>
        </div>
      )}

      {todosPermitemDomicilio && (
        <button
          onClick={() => onEscolher("domicilio")}
          className="relative w-full text-left rounded-xl border-2 border-brand bg-card p-5 flex items-center gap-4 hover:bg-brand/5 transition"
        >
          <Badge className="absolute -top-2 right-4 bg-brand text-white">Recomendado</Badge>
          <Home className="h-8 w-8 text-brand shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-secondary">Sancet em Casa</p>
            <p className="text-sm text-muted-foreground">
              Em casa ou onde preferir. Profissional vai até você!
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-brand" />
        </button>
      )}

      <button
        onClick={() => onEscolher("unidade")}
        className="w-full text-left rounded-xl border bg-card p-5 flex items-center gap-4 hover:bg-muted/40 transition"
      >
        <Building2 className="h-8 w-8 text-brand-2 shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-secondary">Na unidade</p>
          <p className="text-sm text-muted-foreground">
            Escolha o local mais perto de você.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-brand-2" />
      </button>
    </div>
  );
};
