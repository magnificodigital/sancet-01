import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Cores categóricas validadas (par CVD-safe): particular=azul, convênio=laranja.
const COR_PARTICULAR = "#2a78d6";
const COR_CONVENIO = "#eb6834";
const COR_GRID = "#e1e0d9";
const COR_EIXO = "#898781";

type Metricas = {
  dias: number;
  total_periodo: number;
  receita_particular_centavos: number;
  ticket_medio_centavos: number;
  por_dia: { dia: string; particular: number; convenio: number }[];
  por_unidade: { unidade: string; total: number }[];
};

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ddmm = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

const PERIODOS = [
  { label: "7 dias", dias: 7 },
  { label: "30 dias", dias: 30 },
  { label: "90 dias", dias: 90 },
];

const Tile = ({ valor, label }: { valor: string; label: string }) => (
  <div className="rounded-xl bg-white p-5 shadow-sm">
    <p className="text-2xl font-bold text-secondary tabular-nums">{valor}</p>
    <p className="mt-1 text-sm text-muted-foreground">{label}</p>
  </div>
);

export const DashboardMetricas = () => {
  const [dias, setDias] = useState(30);
  const [m, setM] = useState<Metricas | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    supabase.rpc("dashboard_metricas", { p_dias: dias }).then(({ data }) => {
      if (!ativo) return;
      setM(data && !(data as any).error ? (data as any as Metricas) : null);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [dias]);

  const porDia = (m?.por_dia ?? []).map((r) => ({ ...r, label: ddmm(r.dia) }));
  const porUnidade = m?.por_unidade ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-secondary">Indicadores</h2>
        <div className="flex gap-1 rounded-lg border bg-white p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              onClick={() => setDias(p.dias)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                dias === p.dias
                  ? "bg-brand text-white"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando indicadores...
        </div>
      ) : !m ? (
        <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground shadow-sm">
          Sem permissão ou sem dados.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Tile valor={String(m.total_periodo)} label={`Pedidos (últimos ${m.dias} dias)`} />
            <Tile valor={reais(m.receita_particular_centavos)} label="Receita particular" />
            <Tile valor={reais(m.ticket_medio_centavos)} label="Ticket médio (particular)" />
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-secondary">
              Pedidos por dia — particular × convênio
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porDia} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={COR_GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: COR_EIXO, fontSize: 11 }} tickLine={false} axisLine={{ stroke: COR_GRID }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fill: COR_EIXO, fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: `1px solid ${COR_GRID}`, fontSize: 12 }}
                  labelStyle={{ color: "#52514e" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="particular" name="Particular" stackId="a" fill={COR_PARTICULAR} radius={[0, 0, 0, 0]} />
                <Bar dataKey="convenio" name="Convênio" stackId="a" fill={COR_CONVENIO} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {porUnidade.length > 0 && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-secondary">Pedidos por unidade</p>
              <ResponsiveContainer width="100%" height={Math.max(120, porUnidade.length * 44)}>
                <BarChart data={porUnidade} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={COR_GRID} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: COR_EIXO, fontSize: 11 }} tickLine={false} axisLine={{ stroke: COR_GRID }} />
                  <YAxis type="category" dataKey="unidade" width={120} tick={{ fill: COR_EIXO, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${COR_GRID}`, fontSize: 12 }} />
                  <Bar dataKey="total" name="Pedidos" fill={COR_PARTICULAR} radius={[0, 4, 4, 0]}>
                    {porUnidade.map((_, i) => (
                      <Cell key={i} fill={COR_PARTICULAR} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
};
