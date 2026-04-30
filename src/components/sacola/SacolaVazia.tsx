import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const SacolaVazia = () => (
  <div className="flex flex-col items-center justify-center text-center py-20 px-4 max-w-md mx-auto">
    <ShoppingBag size={64} className="text-[#C8102E] mb-6" />
    <h2 className="text-2xl font-bold text-secondary mb-2">A sacola está vazia</h2>
    <p className="text-muted-foreground mb-8">
      Os exames e vacinas que você adicionar vão aparecer aqui. Envie o pedido médico ou busque manualmente.
    </p>
    <div className="flex flex-col gap-3 w-full">
      <Button asChild className="bg-[#C8102E] hover:bg-[#a80d26] text-white">
        <Link to="/receita">Enviar pedido médico</Link>
      </Button>
      <Button asChild variant="outline">
        <Link to="/exames">Buscar exames e vacinas</Link>
      </Button>
    </div>
  </div>
);
