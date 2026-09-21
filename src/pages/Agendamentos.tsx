import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarX, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const { paciente, logado, carregando, logout } = usePaciente();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [aba, setAba] = useState<AbaKey>(() => {
    const p = searchParams.get("aba");
    if (p === "resultados" || p === "convenio" || p === "dados") return p as AbaKey;
    return "agendamentos";
  });
  const [detalhe, setDetalhe] = useState<Pedido | null>(null);

  useEffect(() => {
    if (!carregando && !logado) {
      // Preserva a URL completa (inclui ?token=PROTOCOLO) para, após o login,
      // voltar direto ao pedido e abrir o campo de token.
      const destino = location.pathname + location.search;
      navigate(`/entrar?redirect=${encodeURIComponent(destino)}`);
    }
  }, [logado, carregando, navigate, location]);
  

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos", paciente?.id],
    enabled: !!paciente?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pedidos_do_paciente_auth");
      if (error) throw error;
      return ((data as any) ?? []) as Pedido[];
    },
  });

  const { data: resultados } = useQuery({
    queryKey: ["resultados", paciente?.id],
    enabled: !!paciente?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resultados_do_paciente_auth");
      if (error) throw error;
      return ((data as any) ?? []) as Array<{
        id: string;
        pedido_protocolo: string;
        nome_arquivo: string;
        arquivo_url: string;
        created_at: string;
      }>;
    },
  });


  // Deep-link do e-mail de token: /agendamentos?token=PROTOCOLO abre o pedido direto.
  useEffect(() => {
    const alvo = searchParams.get("token");
    if (alvo && pedidos?.length) {
      const p = pedidos.find((x) => x.protocolo === alvo);
      if (p) setDetalhe(p);
    }
  }, [pedidos, searchParams]);

  const agendados = (pedidos ?? []).filter((p) => STATUS_AGENDADOS.includes(p.status));
  const cancelados = (pedidos ?? []).filter((p) => p.status === "cancelado");
  const concluidos = (pedidos ?? []).filter((p) => p.status === "concluido");

  const Vazio = () => (
    <div className="rounded-xl bg-[#F5F5F5] p-10 text-center space-y-4">
      <CalendarX className="h-12 w-12 text-muted-foreground mx-auto" />
      <p className="font-semibold text-secondary">Você ainda não tem agendamentos</p>
      <Button asChild className="bg-brand hover:bg-brand-hover text-white">
        <Link to="/exames">Buscar exames</Link>
      </Button>
    </div>
  );

  // Enquanto a sessão/perfil carregam.
  if (carregando) {
    return (
      <PageShell>
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <Skeleton className="h-40 w-full" />
        </div>
      </PageShell>
    );
  }

  // Sem sessão: o useEffect acima já redireciona para /entrar.
  if (!logado) return null;

  // Sessão válida, mas a conta não tem perfil de paciente (ex.: conta da
  // equipe). Evita mostrar formulários vazios — deixa claro e oferece troca.
  if (!paciente) {
    return (
      <PageShell>
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <h1 className="text-2xl font-bold text-secondary mb-2">
            Esta conta não tem perfil de paciente
          </h1>
          <p className="text-muted-foreground mb-6">
            Você está conectado com uma conta sem cadastro de paciente (por
            exemplo, uma conta da equipe). Entre com uma conta de paciente para
            ver agendamentos, resultados e dados pessoais.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={logout}
              className="bg-brand hover:bg-brand-hover text-white font-semibold"
            >
              Sair e entrar com outra conta
            </Button>
            <Button asChild variant="outline" className="font-semibold">
              <Link to="/">Ir para o início</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-8 max-w-6xl flex flex-col gap-6 lg:flex-row lg:gap-8">
        <SidebarAgendamentos ativa={aba} onMudar={setAba} />

        <section className="flex-1 min-w-0">
          {aba === "agendamentos" && (
            <>
              <h1 className="text-2xl font-bold text-secondary mb-4">Agendamentos</h1>
              <Tabs defaultValue="agendados">
                <TabsList>
                  <TabsTrigger value="agendados">Agendados</TabsTrigger>
                  <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
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

                <TabsContent value="concluidos" className="mt-4 space-y-3">
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : concluidos.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">
                      Nenhum exame concluído ainda.
                    </p>
                  ) : (
                    concluidos.map((p) => (
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

          {aba === "resultados" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-secondary mb-4">Resultados</h1>
              {!resultados || resultados.length === 0 ? (
                <div className="rounded-xl bg-[#F5F5F5] p-10 text-center space-y-2">
                  <p className="font-semibold text-secondary">Nenhum resultado disponível ainda</p>
                  <p className="text-sm text-muted-foreground">
                    Seus resultados aparecerão aqui quando estiverem prontos.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {resultados.map((r) => (
                    <li key={r.id} className="rounded-xl border bg-card p-5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-secondary truncate">{r.pedido_protocolo}</p>
                        <p className="text-sm text-muted-foreground truncate">{r.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 bg-brand-2 hover:bg-[#162f58] text-white gap-1.5"
                        onClick={() => window.open(r.arquivo_url, "_blank", "noopener,noreferrer")}
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      <ModalPedido pedido={detalhe} onClose={() => setDetalhe(null)} />
    </PageShell>
  );
};

export default Agendamentos;
