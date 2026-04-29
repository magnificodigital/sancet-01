import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarX } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePaciente } from "@/hooks/usePaciente";
import {
  SidebarAgendamentos,
  AbaAgendamentos as AbaKey,
} from "@/components/agendamentos/SidebarAgendamentos";
import { CardPedido, Pedido } from "@/components/agendamentos/CardPedido";
import { ModalPedido } from "@/components/agendamentos/ModalPedido";
import { AbaConvenio } from "@/components/agendamentos/AbaConvenio";
import { AbaDadosPessoais } from "@/components/agendamentos/AbaDadosPessoais";

const STATUS_AGENDADOS = ["novo", "em_analise", "aguardando_pagamento", "confirmado"];

const Agendamentos = () => {
  const { paciente, logado } = usePaciente();
  const navigate = useNavigate();
  const [aba, setAba] = useState<AbaKey>("agendamentos");
  const [detalhe, setDetalhe] = useState<Pedido | null>(null);

  useEffect(() => {
    if (!logado) {
      navigate("/entrar?redirect=/agendamentos");
    }
  }, [logado, navigate]);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos", paciente?.cpf],
    enabled: !!paciente?.cpf,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select(
          "id,protocolo,status,created_at,itens,modalidade_coleta,unidade_nome,tipo_solicitacao,valor_total_centavos,endereco_coleta,convenio_nome,numero_carteirinha,url_carteirinha"
        )
        .eq("paciente_cpf", paciente!.cpf)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Pedido[];
    },
  });

  const agendados = (pedidos ?? []).filter((p) => STATUS_AGENDADOS.includes(p.status));
  const cancelados = (pedidos ?? []).filter((p) => p.status === "cancelado");

  const Vazio = () => (
    <div className="rounded-xl bg-[#F5F5F5] p-10 text-center space-y-4">
      <CalendarX className="h-12 w-12 text-muted-foreground mx-auto" />
      <p className="font-semibold text-secondary">Você ainda não tem agendamentos</p>
      <Button asChild className="bg-[#C8102E] hover:bg-[#a80d26] text-white">
        <Link to="/exames">Buscar exames e vacinas</Link>
      </Button>
    </div>
  );

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-8 max-w-6xl flex gap-8">
        <SidebarAgendamentos ativa={aba} onMudar={setAba} />

        <section className="flex-1 min-w-0">
          {aba === "agendamentos" && (
            <>
              <h1 className="text-2xl font-bold text-secondary mb-4">Agendamentos</h1>
              <Tabs defaultValue="agendados">
                <TabsList>
                  <TabsTrigger value="agendados">Agendados</TabsTrigger>
                  <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
                </TabsList>

                <TabsContent value="agendados" className="mt-4 space-y-3">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </>
                  ) : agendados.length === 0 ? (
                    <Vazio />
                  ) : (
                    agendados.map((p) => (
                      <CardPedido key={p.id} pedido={p} onVerDetalhes={setDetalhe} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="cancelados" className="mt-4 space-y-3">
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : cancelados.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">
                      Nenhum agendamento cancelado.
                    </p>
                  ) : (
                    cancelados.map((p) => (
                      <CardPedido key={p.id} pedido={p} onVerDetalhes={setDetalhe} />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}

          {aba === "convenio" && <AbaConvenio />}
          {aba === "dados" && <AbaDadosPessoais />}
        </section>
      </div>

      <ModalPedido pedido={detalhe} onClose={() => setDetalhe(null)} />
    </PageShell>
  );
};

export default Agendamentos;
