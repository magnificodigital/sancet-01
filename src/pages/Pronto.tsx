import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePaciente } from "@/hooks/usePaciente";

const IMG = "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600";

const Pronto = () => {
  const { protocolo } = useParams();
  const { paciente } = usePaciente();
  const [emailPaciente, setEmailPaciente] = useState<string>("");

  const { data: pedido, isLoading, isError } = useQuery({
    queryKey: ["pedido", protocolo],
    enabled: !!protocolo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("protocolo,modalidade_coleta,paciente_cpf")
        .eq("protocolo", protocolo!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    (async () => {
      if (!pedido?.paciente_cpf) return;
      const { data } = await supabase
        .from("pacientes")
        .select("email")
        .eq("cpf", pedido.paciente_cpf)
        .maybeSingle();
      setEmailPaciente(data?.email ?? paciente?.nome ?? "");
    })();
  }, [pedido?.paciente_cpf, paciente?.nome]);

  const copiar = () => {
    if (!protocolo) return;
    navigator.clipboard.writeText(protocolo);
    toast.success("Protocolo copiado!");
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          to="/agendamentos"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div>
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {!isLoading && (isError || !pedido) && (
              <div className="text-center py-16 space-y-4">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-semibold text-secondary">
                  Protocolo não encontrado
                </p>
                <Button asChild className="bg-[#C8102E] hover:bg-[#a80d26] text-white">
                  <Link to="/agendamentos">Ir para agendamentos</Link>
                </Button>
              </div>
            )}

            {pedido && (
              <div className="space-y-5">
                <h1 className="text-4xl font-bold text-[#1B3A6B]">Pronto!</h1>
                <p className="text-muted-foreground">
                  {pedido.modalidade_coleta === "domicilio"
                    ? "Um profissional da Sancet irá até você. Aguarde a confirmação no seu e-mail."
                    : "Para fazer estes procedimentos, é só ir até a unidade no dia e hora que você preferir."}
                </p>

                <div className="rounded-xl bg-[#F5F5F5] p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-[#C8102E] shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Enviamos as instruções de preparo e a lista de documentos
                      necessários no e-mail:{" "}
                      <span className="font-bold text-[#C8102E]">{emailPaciente || "—"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t">
                    <span className="text-sm text-muted-foreground">Protocolo:</span>
                    <span className="font-bold text-secondary">{pedido.protocolo}</span>
                    <button
                      onClick={copiar}
                      className="text-[#C8102E] hover:bg-[#C8102E]/10 rounded p-1"
                      aria-label="Copiar protocolo"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button asChild className="bg-[#C8102E] hover:bg-[#a80d26] text-white">
                    <Link to="/agendamentos">Ver meus agendamentos</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.success("Obrigado pelo feedback!")}
                    className="border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E]/5 hover:text-[#C8102E]"
                  >
                    Avaliar experiência
                  </Button>
                </div>

                <div className="rounded-xl bg-[#F5F5F5] p-5 space-y-3">
                  <h3 className="font-semibold text-secondary">Próximos passos</h3>
                  {[
                    "Verifique seu e-mail com as instruções de preparo",
                    pedido.modalidade_coleta === "domicilio"
                      ? "Aguarde a visita do profissional Sancet"
                      : "Compareça à unidade no horário de coleta",
                    "Acompanhe o resultado pelo seu painel",
                  ].map((t) => (
                    <div key={t} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-[#C8102E] shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block">
            <div className="rounded-2xl overflow-hidden bg-[#F5F5F5] aspect-[4/5]">
              <img src={IMG} alt="Pedido confirmado" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Pronto;
