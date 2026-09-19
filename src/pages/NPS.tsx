import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logoDark from "@/assets/logo-sancet-dark.png";

const NOTAS = Array.from({ length: 11 }, (_, i) => i); // 0..10

const corNota = (n: number) =>
  n <= 6 ? "bg-red-600" : n <= 8 ? "bg-amber-500" : "bg-green-600";

const NPS = () => {
  const { token } = useParams<{ token: string }>();
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async () => {
    if (nota === null || !token) return;
    setEnviando(true);
    setErro(null);
    const { data, error } = await supabase.rpc("responder_nps", {
      p_token: token,
      p_nota: nota,
      p_comentario: comentario.trim() || null,
    });
    setEnviando(false);
    if (error || (data as any)?.error) {
      setErro((data as any)?.error || "Não foi possível registrar sua avaliação.");
      return;
    }
    setPronto(true);
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 md:p-8 shadow-sm border">
        <img src={logoDark} alt="Sancet" className="h-10 w-auto mb-6" />

        {pronto ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <h1 className="text-2xl font-bold text-secondary">Obrigado pela avaliação!</h1>
            <p className="mt-2 text-muted-foreground">
              Sua opinião nos ajuda a melhorar o atendimento da Sancet.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-secondary">Avalie seu atendimento</h1>
            <p className="mt-1 text-muted-foreground">
              De 0 a 10, o quanto você recomendaria a Sancet a um amigo ou familiar?
            </p>

            <div className="mt-6 grid grid-cols-6 gap-2 sm:grid-cols-11">
              {NOTAS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(n)}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-semibold transition",
                    nota === n
                      ? cn(corNota(n), "text-white border-transparent")
                      : "bg-background text-secondary border-border hover:bg-muted",
                  )}
                  aria-label={`Nota ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Não recomendaria</span>
              <span>Recomendaria muito</span>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium text-secondary">
                Quer deixar um comentário? (opcional)
              </label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Conte pra gente o que achou..."
                rows={3}
              />
            </div>

            {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}

            <Button
              onClick={enviar}
              disabled={nota === null || enviando}
              className="mt-6 w-full bg-brand hover:bg-brand-hover text-white font-semibold h-11 disabled:opacity-50"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar avaliação"
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default NPS;
