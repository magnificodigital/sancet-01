import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Wallet, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSacola } from "@/stores/sacola";
import { AlertTrocarTipo } from "./AlertTrocarTipo";

type Props = {
  /** Se true, força destino para a tela de escolha; senão, alterna pra outro tipo. */
  destino?: string;
};

export const HeaderContexto = ({ destino = "/exames" }: Props) => {
  const navigate = useNavigate();
  const {
    tipo,
    convenio_nome,
    plano_descricao,
    numero_carteirinha,
    itens,
    limparContexto,
  } = useSacola();
  const [open, setOpen] = useState(false);

  if (!tipo) return null;

  const trocar = () => {
    if (itens.length === 0) {
      limparContexto();
      navigate(destino);
      return;
    }
    setOpen(true);
  };

  const confirmar = () => {
    limparContexto();
    setOpen(false);
    navigate(destino);
  };

  const ult4 =
    numero_carteirinha && numero_carteirinha.length >= 4
      ? numero_carteirinha.slice(-4)
      : numero_carteirinha ?? "";

  return (
    <>
      <div
        className={
          tipo === "convenio"
            ? "sticky top-0 z-30 -mx-4 px-4 py-2 bg-blue-50 border-b border-blue-200 mb-4"
            : "sticky top-0 z-30 -mx-4 px-4 py-2 bg-red-50 border-b border-red-200 mb-4"
        }
      >
        <div className="container mx-auto flex items-center justify-between gap-3 text-sm">
          {tipo === "convenio" ? (
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 shrink-0 text-blue-700" />
              <span className="truncate">
                <strong className="text-blue-900">{convenio_nome ?? "Convênio"}</strong>
                {plano_descricao && (
                  <span className="text-blue-900/80"> — {plano_descricao}</span>
                )}
                {ult4 && (
                  <span className="text-blue-900/70"> | Carteirinha: ****{ult4}</span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <Wallet className="h-4 w-4 shrink-0 text-brand" />
              <span className="font-semibold text-brand">Compra Particular</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={trocar}
            className="shrink-0 gap-1.5 h-7 px-2 text-xs"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {tipo === "convenio" ? "Trocar convênio" : "Trocar pra Convênio"}
          </Button>
        </div>
      </div>
      <AlertTrocarTipo
        open={open}
        onOpenChange={setOpen}
        quantidade={itens.length}
        onConfirmar={confirmar}
      />
    </>
  );
};
