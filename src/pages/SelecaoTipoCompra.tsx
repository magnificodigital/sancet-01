import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ShieldCheck, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useSacola } from "@/stores/sacola";
import { AlertTrocarTipo } from "@/components/catalogo/AlertTrocarTipo";
import { cn } from "@/lib/utils";
import { OCULTAR_PARTICULAR } from "@/config/testeConvenio";

const SelecaoTipoCompra = () => {
  const navigate = useNavigate();
  const { tipo, itens, limparContexto, setTipo } = useSacola();
  const [pendente, setPendente] = useState<"particular" | "convenio" | null>(null);

  const ir = (escolha: "particular" | "convenio") => {
    // Se já tem itens de outro tipo, confirma
    if (tipo && tipo !== escolha && itens.length > 0) {
      setPendente(escolha);
      return;
    }
    aplicar(escolha);
  };

  const aplicar = (escolha: "particular" | "convenio") => {
    if (tipo !== escolha) {
      limparContexto();
    }
    setTipo(escolha);
    if (escolha === "particular") {
      navigate("/exames/particular");
    } else {
      navigate("/exames/convenio/escolher-convenio");
    }
  };

  return (
    <PageShell>
      <section className="container py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-3">
            Como você quer fazer seu exame?
          </h1>
          <p className="text-muted-foreground">
            Escolha o tipo de atendimento para começar.
          </p>
        </div>

        <div
          className={cn(
            "grid gap-5",
            OCULTAR_PARTICULAR ? "max-w-md mx-auto" : "md:grid-cols-2 max-w-4xl mx-auto",
          )}
        >
          {!OCULTAR_PARTICULAR && (
            <button
              onClick={() => ir("particular")}
              className="text-left rounded-2xl border-2 border-brand bg-card p-6 hover:bg-brand/5 transition group"
            >
              <Wallet className="h-10 w-10 text-brand mb-3" />
              <h2 className="text-xl font-bold text-secondary mb-2">Particular</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Pague por exame. Preços fixos e transparentes. Resultado em até 3 dias úteis.
              </p>
              <Button className="w-full bg-brand hover:bg-brand-hover text-white gap-2">
                Começar Particular <ChevronRight className="h-4 w-4" />
              </Button>
            </button>
          )}

          <button
            onClick={() => ir("convenio")}
            className="text-left rounded-2xl border-2 border-brand-2 bg-card p-6 hover:bg-brand-2/5 transition group"
          >
            <ShieldCheck className="h-10 w-10 text-brand-2 mb-3" />
            <h2 className="text-xl font-bold text-secondary mb-2">
              Convênio / Plano de Saúde
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Realize seus exames pelo seu plano. Verificamos cobertura. Apresentação
              obrigatória de carteirinha e documentos.
            </p>
            <Button className="w-full bg-brand-2 hover:bg-[#16315a] text-white gap-2">
              Começar por Convênio <ChevronRight className="h-4 w-4" />
            </Button>
          </button>
        </div>

        {!OCULTAR_PARTICULAR && (
          <p className="text-center text-xs text-muted-foreground mt-6 max-w-2xl mx-auto">
            Você poderá trocar o tipo depois, mas perderá os itens já selecionados.
          </p>
        )}

        <AlertTrocarTipo
          open={pendente !== null}
          onOpenChange={(v) => !v && setPendente(null)}
          quantidade={itens.length}
          onConfirmar={() => {
            const e = pendente;
            setPendente(null);
            if (e) aplicar(e);
          }}
        />
      </section>
    </PageShell>
  );
};

export default SelecaoTipoCompra;
