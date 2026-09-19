import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  LayoutDashboard,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TabelaPedidos } from "./TabelaPedidos";
import { ModalPedidoStaff } from "./ModalPedidoStaff";
import { Pedido } from "./utils";

type Metricas = { total: number; novos: number; confirmados: number; cancelados: number };

const Card = ({
  Icon,
  cor,
  valor,
  label,
}: {
  Icon: typeof LayoutDashboard;
  cor: string;
  valor: number;
  label: string;
}) => (
  <div className="rounded-xl bg-white p-6 shadow-sm">
    <Icon size={32} style={{ color: cor }} />
    <p className="mt-3 text-3xl font-bold text-secondary">{valor}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export const AbaVisaoGeral = ({ onAtualizar }: { onAtualizar?: () => void }) => {
  const [metricas, setMetricas] = useState<Metricas>({
    total: 0,
    novos: 0,
    confirmados: 0,
    cancelados: 0,
  });
  const [recentes, setRecentes] = useState<Pedido[]>([]);
  const [pedidoAberto, setPedidoAberto] = useState<Pedido | null>(null);
  const [nps, setNps] = useState<any>(null);

  const carregar = async () => {
    const [tot, nov, conf, canc, rec] = await Promise.all([
      supabase.from("pedidos").select("*", { count: "exact", head: true }),
      supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("status", "novo"),
      supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmado"),
      supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelado"),
      supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    setMetricas({
      total: tot.count ?? 0,
      novos: nov.count ?? 0,
      confirmados: conf.count ?? 0,
      cancelados: canc.count ?? 0,
    });
    setRecentes((rec.data as Pedido[]) ?? []);

    const { data: npsData } = await supabase.rpc("nps_resumo");
    setNps(npsData && !(npsData as any).error ? npsData : null);
  };

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary">Visão Geral</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card Icon={LayoutDashboard} cor="hsl(var(--brand-2))" valor={metricas.total} label="Total de pedidos" />
        <Card Icon={Clock} cor="#F97316" valor={metricas.novos} label="Novos" />
        <Card Icon={CheckCircle2} cor="#16A34A" valor={metricas.confirmados} label="Confirmados" />
        <Card Icon={XCircle} cor="#DC2626" valor={metricas.cancelados} label="Cancelados" />
      </div>

      {nps && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-secondary">
              Satisfação (NPS)
            </h2>
            <span className="text-sm text-muted-foreground">
              {nps.total} avaliação(ões)
            </span>
          </div>

          {nps.total > 0 ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-3xl font-bold text-secondary">{nps.nps ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Score NPS (-100 a 100)</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-secondary">{nps.media ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Nota média (0-10)</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{nps.promotores}</p>
                  <p className="text-xs text-muted-foreground">Promotores (9-10)</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">{nps.detratores}</p>
                  <p className="text-xs text-muted-foreground">Detratores (0-6)</p>
                </div>
              </div>

              {Array.isArray(nps.recentes) && nps.recentes.some((r: any) => r.comentario) && (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-secondary">Comentários recentes</p>
                  <ul className="space-y-2">
                    {nps.recentes
                      .filter((r: any) => r.comentario)
                      .slice(0, 6)
                      .map((r: any, i: number) => (
                        <li key={i} className="rounded-lg bg-muted/40 p-3 text-sm">
                          <span
                            className={
                              "mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white " +
                              (r.nota <= 6 ? "bg-red-600" : r.nota <= 8 ? "bg-amber-500" : "bg-green-600")
                            }
                          >
                            {r.nota}
                          </span>
                          {r.comentario}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Ainda não há avaliações. Elas aparecem aqui conforme os pacientes respondem
              o link enviado no e-mail de resultado.
            </p>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-secondary">Pedidos recentes</h2>
        <TabelaPedidos pedidos={recentes} onAbrir={setPedidoAberto} />
      </div>

      <ModalPedidoStaff
        pedido={pedidoAberto}
        onClose={() => setPedidoAberto(null)}
        onSalvo={() => {
          carregar();
          onAtualizar?.();
        }}
      />
    </div>
  );
};
