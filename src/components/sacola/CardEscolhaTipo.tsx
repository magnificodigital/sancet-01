import { useNavigate } from "react-router-dom";
import { ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSacola } from "@/stores/sacola";
import { usePaciente } from "@/hooks/usePaciente";

export const CardEscolhaTipo = () => {
  const navigate = useNavigate();
  const { logado } = usePaciente();
  const { tipo, convenio_nome, plano_descricao, total } = useSacola();

  const ehConvenio = tipo === "convenio";

  const irCheckout = () => {
    if (!logado) {
      navigate(`/entrar?redirect=${encodeURIComponent("/enviar-pedido")}`);
      return;
    }
    navigate("/enviar-pedido");
  };

  const trocar = () => navigate("/exames");

  if (!tipo) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-secondary">Escolha o tipo</h3>
        <p className="text-sm text-muted-foreground">
          Você ainda não escolheu como deseja realizar seus exames.
        </p>
        <Button
          onClick={() => navigate("/exames")}
          className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
        >
          Escolher tipo
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      {ehConvenio ? (
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-700 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-blue-900 text-sm">Convênio</p>
            <p className="text-xs text-blue-900/80 truncate">
              {convenio_nome}
              {plano_descricao && ` — ${plano_descricao}`}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
          <Wallet className="h-5 w-5 shrink-0 text-[#C8102E] mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-[#C8102E] text-sm">Particular</p>
            <p className="text-xs text-muted-foreground">
              Total estimado:{" "}
              <strong>
                {(total() / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={irCheckout}
        className="w-full bg-[#C8102E] hover:bg-[#a80d26] text-white"
      >
        Ir para o checkout
      </Button>
      <Button onClick={trocar} variant="outline" className="w-full">
        Trocar tipo
      </Button>
    </div>
  );
};
