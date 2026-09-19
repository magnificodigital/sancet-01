import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoDark from "@/assets/logo-sancet-dark.png";

const RecallSair = () => {
  const { token } = useParams<{ token: string }>();
  const [estado, setEstado] = useState<"carregando" | "ok" | "erro">("carregando");

  useEffect(() => {
    if (!token) {
      setEstado("erro");
      return;
    }
    supabase.rpc("recall_optout", { p_token: token }).then(({ data, error }) => {
      setEstado(error || (data as any)?.error ? "erro" : "ok");
    });
  }, [token]);

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border text-center">
        <img src={logoDark} alt="Sancet" className="mx-auto h-10 w-auto mb-6" />
        {estado === "carregando" && (
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
        )}
        {estado === "ok" && (
          <>
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <h1 className="text-xl font-bold text-secondary">Pronto!</h1>
            <p className="mt-2 text-muted-foreground">
              Você não receberá mais lembretes de retorno da Sancet. Você continua
              podendo agendar exames normalmente quando quiser.
            </p>
          </>
        )}
        {estado === "erro" && (
          <>
            <XCircle className="mx-auto mb-3 h-12 w-12 text-destructive" />
            <h1 className="text-xl font-bold text-secondary">Link inválido</h1>
            <p className="mt-2 text-muted-foreground">
              Não foi possível processar o descadastro. O link pode ter expirado.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default RecallSair;
