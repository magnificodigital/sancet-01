import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type Unidade = {
  codigo_shift: string;
  nome: string;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  horarios: any;
};

const MOCK: Unidade[] = [
  { codigo_shift: "u1", nome: "Unidade Centro", endereco: "Rua das Flores, 123", bairro: "Centro", cidade: "São Paulo", uf: "SP", horarios: null },
  { codigo_shift: "u2", nome: "Unidade Norte", endereco: "Av. Brasil, 456", bairro: "Santana", cidade: "São Paulo", uf: "SP", horarios: null },
  { codigo_shift: "u3", nome: "Unidade Sul", endereco: "Rua das Palmeiras, 789", bairro: "Ipiranga", cidade: "São Paulo", uf: "SP", horarios: null },
];

type Props = {
  onEscolher: (u: Unidade) => void;
};

export const ListaUnidades = ({ onEscolher }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["unidades_cache"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades_cache")
        .select("codigo_shift,nome,endereco,bairro,cidade,uf,horarios")
        .eq("ativo", true);
      if (error) throw error;
      return (data ?? []) as Unidade[];
    },
  });

  const unidades = data && data.length > 0 ? data : MOCK;

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando unidades...</p>;
  }

  return (
    <div className="space-y-3">
      {unidades.map((u) => (
        <div
          key={u.codigo_shift}
          className="rounded-xl border bg-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-bold text-secondary">{u.nome}</p>
            <p className="text-sm text-muted-foreground">
              {[u.endereco, u.bairro, u.cidade, u.uf].filter(Boolean).join(" · ")}
            </p>
            <Badge variant="secondary" className="mt-2">Corpo clínico</Badge>
          </div>
          <Button
            onClick={() => onEscolher(u)}
            className="bg-[#C8102E] hover:bg-[#a80d26] text-white whitespace-nowrap"
          >
            Escolher local
          </Button>
        </div>
      ))}
    </div>
  );
};
