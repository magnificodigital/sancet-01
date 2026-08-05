import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Building2, Home, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  formatarAgendamentoCurto,
  formatarPreco,
  Pedido,
  STATUS_LABELS,
  statusAgendamento,
} from "./utils";
import { cn } from "@/lib/utils";

type Props = {
  pedidos: Pedido[];
  onAbrir: (p: Pedido) => void;
  onAtualizado: () => void;
  nomeStaff: string | null;
  podeEditar: boolean;
};

const COLUNAS: { id: string; label: string; emoji: string; bg: string; header: string }[] = [
  { id: "novo", label: "Novo", emoji: "🆕", bg: "bg-red-50/60", header: "bg-red-100/70 text-red-900" },
  { id: "em_analise", label: "Em análise", emoji: "🔍", bg: "bg-blue-50/60", header: "bg-blue-100/70 text-blue-900" },
  { id: "confirmado", label: "Confirmado", emoji: "✅", bg: "bg-green-50/60", header: "bg-green-100/70 text-green-900" },
  { id: "atendido", label: "Atendido", emoji: "🏥", bg: "bg-purple-50/60", header: "bg-purple-100/70 text-purple-900" },
  { id: "concluido", label: "Concluído", emoji: "☑️", bg: "bg-slate-50/60", header: "bg-slate-200/70 text-slate-900" },
  { id: "cancelado", label: "Cancelado", emoji: "❌", bg: "bg-zinc-50/60", header: "bg-zinc-200/70 text-zinc-700" },
];

const TRANSICOES: Record<string, string[]> = {
  novo: ["em_analise", "confirmado", "cancelado"],
  em_analise: ["confirmado", "cancelado"],
  confirmado: ["atendido", "cancelado"],
  atendido: ["concluido", "cancelado"],
  concluido: [],
  cancelado: ["novo"],
};

function transicaoValida(de: string, para: string): boolean {
  if (de === para) return true;
  return (TRANSICOES[de] ?? []).includes(para);
}

// ---------- Card ----------

const CardPedido = ({
  p,
  onAbrir,
  arrastando,
}: {
  p: Pedido;
  onAbrir: (p: Pedido) => void;
  arrastando?: boolean;
}) => {
  const ag = statusAgendamento(p.data_agendamento, p.status);
  const nome = p.paciente_nome || p.paciente_cpf;

  return (
    <div
      onClick={() => !arrastando && onAbrir(p)}
      className={cn(
        "cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md",
        arrastando && "opacity-50",
      )}
    >
      <p className="truncate text-sm font-bold text-secondary" title={nome}>
        {nome}
      </p>
      <p className="font-mono text-[10px] text-muted-foreground">{p.protocolo}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            p.tipo_solicitacao === "convenio"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-blue-200 bg-blue-50 text-blue-800",
          )}
        >
          {p.tipo_solicitacao === "convenio" ? "Convênio" : "Particular"}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          {p.modalidade_coleta === "domicilio" ? (
            <Home className="h-3 w-3" />
          ) : (
            <Building2 className="h-3 w-3" />
          )}
          <span className="max-w-[110px] truncate">
            {p.modalidade_coleta === "domicilio" ? "Em casa" : p.unidade_nome ?? "Unidade"}
          </span>
        </span>
      </div>

      {p.data_agendamento && (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            ag === "atrasado"
              ? "text-red-700"
              : ag === "hoje"
                ? "text-orange-700"
                : "text-secondary",
          )}
        >
          <Calendar className="h-3 w-3" />
          {ag === "atrasado"
            ? `Atrasado · ${formatarAgendamentoCurto(p.data_agendamento, p.periodo_agendamento)}`
            : ag === "hoje"
              ? `Hoje · ${formatarAgendamentoCurto(p.data_agendamento, p.periodo_agendamento)}`
              : formatarAgendamentoCurto(p.data_agendamento, p.periodo_agendamento)}
        </p>
      )}

      {p.valor_total_centavos != null && p.valor_total_centavos > 0 && (
        <p className="mt-1.5 text-sm font-bold text-brand">
          {formatarPreco(p.valor_total_centavos)}
        </p>
      )}
    </div>
  );
};

// ---------- Draggable wrapper ----------

const DraggableCard = ({
  p,
  onAbrir,
  podeEditar,
}: {
  p: Pedido;
  onAbrir: (p: Pedido) => void;
  podeEditar: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: p.id,
    disabled: !podeEditar,
  });

  return (
    <div ref={setNodeRef} {...attributes} {...(podeEditar ? listeners : {})}>
      <CardPedido p={p} onAbrir={onAbrir} arrastando={isDragging} />
    </div>
  );
};

// ---------- Column ----------

const Coluna = ({
  id,
  label,
  emoji,
  bg,
  header,
  pedidos,
  onAbrir,
  podeEditar,
}: {
  id: string;
  label: string;
  emoji: string;
  bg: string;
  header: string;
  pedidos: Pedido[];
  onAbrir: (p: Pedido) => void;
  podeEditar: boolean;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className={cn("flex w-[280px] shrink-0 flex-col rounded-lg border", bg)}>
      <div className={cn("flex items-center justify-between rounded-t-lg border-b px-3 py-2", header)}>
        <p className="text-sm font-semibold">
          <span className="mr-1">{emoji}</span>
          {label} <span className="opacity-70">({pedidos.length})</span>
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition",
          "max-h-[75vh] min-h-[200px]",
          isOver && "bg-brand/5 ring-2 ring-brand/30",
        )}
      >
        {pedidos.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Nenhum pedido
          </p>
        )}
        {pedidos.map((p) => (
          <DraggableCard
            key={p.id}
            p={p}
            onAbrir={onAbrir}
            podeEditar={podeEditar}
          />
        ))}
      </div>
    </div>
  );
};

// ---------- Board ----------

export const KanbanPedidos = ({
  pedidos,
  onAbrir,
  onAtualizado,
  nomeStaff,
  podeEditar,
}: Props) => {
  // estado local pra otimistic UI
  const [override, setOverride] = useState<Record<string, string>>({});
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);

  useEffect(() => {
    setOverride({});
  }, [pedidos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const pedidosEfetivos = useMemo(
    () =>
      pedidos.map((p) =>
        override[p.id] ? { ...p, status: override[p.id] } : p,
      ),
    [pedidos, override],
  );

  const porColuna = useMemo(() => {
    const map: Record<string, Pedido[]> = {};
    for (const c of COLUNAS) map[c.id] = [];
    for (const p of pedidosEfetivos) {
      if (map[p.status]) map[p.status].push(p);
    }
    return map;
  }, [pedidosEfetivos]);

  const onDragStart = (e: DragStartEvent) => {
    setArrastandoId(String(e.active.id));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setArrastandoId(null);
    const cardId = String(e.active.id);
    const colunaDestino = e.over?.id ? String(e.over.id) : null;
    if (!colunaDestino) return;

    const p = pedidosEfetivos.find((x) => x.id === cardId);
    if (!p) return;
    if (p.status === colunaDestino) return;

    if (!transicaoValida(p.status, colunaDestino)) {
      toast.warning(
        `Transição não permitida: ${STATUS_LABELS[p.status]} → ${STATUS_LABELS[colunaDestino]}`,
      );
      return;
    }

    // otimistic
    const anterior = p.status;
    setOverride((m) => ({ ...m, [cardId]: colunaDestino }));

    const quando = new Date().toLocaleString("pt-BR");
    const autor = nomeStaff || "staff";
    const linha = `[${quando}] Status alterado para '${colunaDestino}' por ${autor}.`;
    const observacoes = p.observacoes ? `${p.observacoes}\n${linha}` : linha;

    const { error } = await supabase
      .from("pedidos")
      .update({ status: colunaDestino, observacoes })
      .eq("id", cardId);

    if (error) {
      // rollback
      setOverride((m) => {
        const c = { ...m };
        c[cardId] = anterior;
        return c;
      });
      toast.error("Não foi possível alterar status");
      return;
    }

    toast.success("Status atualizado!");
    onAtualizado();
  };

  const cardArrastando = arrastandoId
    ? pedidosEfetivos.find((p) => p.id === arrastandoId)
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUNAS.map((c) => (
          <Coluna
            key={c.id}
            id={c.id}
            label={c.label}
            emoji={c.emoji}
            bg={c.bg}
            header={c.header}
            pedidos={porColuna[c.id] ?? []}
            onAbrir={onAbrir}
            podeEditar={podeEditar}
          />
        ))}
      </div>
      <DragOverlay>
        {cardArrastando && (
          <div className="w-[260px] rotate-1">
            <CardPedido p={cardArrastando} onAbrir={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
