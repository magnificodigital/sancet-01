import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePaciente } from "@/hooks/usePaciente";

export const CardEscolhaTipo = () => {
  const navigate = useNavigate();
  const { logado } = usePaciente();
  const [_, setEscolha] = useState<"convenio" | "particular" | null>(null);

  const handle = (tipo: "convenio" | "particular") => {
    setEscolha(tipo);
    const destino = `/enviar-pedido?tipo=${tipo}`;
    if (!logado) {
      navigate(`/entrar?redirect=${encodeURIComponent(destino)}`);
      return;
    }
    navigate(destino);
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h3 className="font-semibold text-secondary">
        Como prefere agendar os procedimentos adicionados?
      </h3>
      <Button
        onClick={() => handle("convenio")}
        className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
      >
        Agendar com convênio
      </Button>
      <Button
        onClick={() => handle("particular")}
        variant="outline"
        className="w-full border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E]/5 hover:text-[#C8102E]"
      >
        Agendar particular
      </Button>
    </div>
  );
};
