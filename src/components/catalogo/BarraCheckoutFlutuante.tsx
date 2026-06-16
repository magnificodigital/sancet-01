import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";

const ROTAS_OCULTAS = [
  "/sacola",
  "/enviar-pedido",
  "/pagamento",
  "/pronto",
  "/cadastro",
  "/entrar",
  "/staff",
  "/p/",
];
import { Button } from "@/components/ui/button";
import { useSacola } from "@/stores/sacola";
import { formatBRL } from "@/lib/preco";

/**
 * Barra fixa no rodapé que aparece quando há itens na sacola.
 * Mostra contagem + total (ou "Coberto pelo convênio") + CTA pro checkout.
 */
export const BarraCheckoutFlutuante = () => {
  const navigate = useNavigate();
  const { itens, total, tipo } = useSacola();

  if (itens.length === 0) return null;

  const ehConvenio = tipo === "convenio";
  const valor = total() / 100;

  return (
    <>
      {/* Espaçador pra conteúdo não ficar atrás da barra */}
      <div aria-hidden className="h-24" />

      <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="container py-3 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="h-11 w-11 rounded-full bg-[#C8102E]/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-[#C8102E]" />
            </div>
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[#C8102E] text-white text-[11px] font-bold flex items-center justify-center">
              {itens.length}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground leading-tight">
              {itens.length === 1 ? "1 exame adicionado" : `${itens.length} exames adicionados`}
            </p>
            {ehConvenio ? (
              <p className="text-sm font-semibold text-blue-700 flex items-center gap-1 truncate">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Coberto pelo convênio
              </p>
            ) : (
              <p className="text-base md:text-lg font-bold text-secondary leading-tight">
                {formatBRL(valor)}
              </p>
            )}
          </div>

          <Button
            onClick={() => navigate("/sacola")}
            className="h-12 px-4 md:px-6 bg-[#C8102E] hover:bg-[#a80d26] text-white gap-2 shrink-0"
          >
            <span className="hidden sm:inline">Ir para sacola</span>
            <span className="sm:hidden">Sacola</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
};
