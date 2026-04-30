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
  };

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary">Visão Geral</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card Icon={LayoutDashboard} cor="#1B3A6B" valor={metricas.total} label="Total de pedidos" />
        <Card Icon={Clock} cor="#F97316" valor={metricas.novos} label="Novos" />
        <Card Icon={CheckCircle2} cor="#16A34A" valor={metricas.confirmados} label="Confirmados" />
        <Card Icon={XCircle} cor="#DC2626" valor={metricas.cancelados} label="Cancelados" />
      </div>

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
