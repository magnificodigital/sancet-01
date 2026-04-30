import { ScanLine, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  busca: string;
  setBusca: (v: string) => void;
  placeholder?: string;
};

export const BarraBusca = ({ busca, setBusca, placeholder = "Buscar exame" }: Props) => {
  const navigate = useNavigate();
  return (
    <div className="flex gap-2 items-stretch">
      <div className="relative flex-1">
        <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={placeholder}
          className="pl-11 h-12 rounded-full bg-card"
        />
      </div>
      <Button
        onClick={() => navigate("/receita")}
        className="h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-5 hidden sm:inline-flex"
      >
        <ScanLine className="h-4 w-4" /> Ler pedido
      </Button>
      <Button
        onClick={() => navigate("/receita")}
        size="icon"
        className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground sm:hidden"
        aria-label="Ler pedido"
      >
        <ScanLine className="h-4 w-4" />
      </Button>
    </div>
  );
};
