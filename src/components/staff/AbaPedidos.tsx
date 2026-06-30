import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabelaPedidos } from "./TabelaPedidos";
import { KanbanPedidos } from "./KanbanPedidos";
import { ModalPedidoStaff } from "./ModalPedidoStaff";
import { Pedido, STATUS_OPTIONS, statusAgendamento } from "./utils";
import { useStaffPerfil } from "@/hooks/useStaffPerfil";
import { cn } from "@/lib/utils";

const POR_PAGINA = 20;

type Props = {
  permissoes?: { pedidos: { ver: boolean; editar: boolean; excluir: boolean } } | null;
};

type UnidadeOpt = { codigo_shift: string; nome: string };

type FiltroAgendamento =
  | "todos"
  | "hoje"
  | "amanha"
  | "proximos7"
  | "atrasados"
  | "sem";

export const AbaPedidos = ({ permissoes }: Props = {}) => {
  if (permissoes?.pedidos?.ver === false) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Você não tem permissão para ver esta seção.
      </div>
    );
  }
  const podeEditar = permissoes?.pedidos?.editar !== false;
  const { nome: nomeStaff, isAdmin } = useStaffPerfil();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [unidades, setUnidades] = useState<UnidadeOpt[]>([]);
  const [pedidoAberto, setPedidoAberto] = useState<Pedido | null>(null);

  const [vista, setVista] = useState<"lista" | "kanban">(() => {
    if (typeof window === "undefined") return "kanban";
    const salvo = localStorage.getItem("sancet-vista-pedidos");
    return salvo === "lista" || salvo === "kanban" ? salvo : "kanban";
  });
  const [largo, setLargo] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  useEffect(() => {
    const onResize = () => setLargo(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    localStorage.setItem("sancet-vista-pedidos", vista);
  }, [vista]);
  const vistaEfetiva: "lista" | "kanban" = largo ? vista : "lista";

  const [status, setStatus] = useState<string>("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [modalidade, setModalidade] = useState<string>("todos");
  const [unidade, setUnidade] = useState<string>("todos");
  const [agendamento, setAgendamento] = useState<FiltroAgendamento>("todos");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const carregar = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("*")
      .order("data_agendamento", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);
    setPedidos((data as Pedido[]) ?? []);
  };

  // isAdmin já vem do hook acima
  const [semUnidades, setSemUnidades] = useState(false);

  const carregarUnidades = async () => {
    if (isAdmin) {
      const { data } = await supabase
        .from("unidades_cache")
        .select("codigo_shift, nome")
        .order("nome");
      setUnidades((data as UnidadeOpt[]) ?? []);
      setSemUnidades(false);
      return;
    }
    // staff: só as unidades atribuídas
    const { data } = await supabase
      .from("user_unidades")
      .select("unidades_cache(codigo_shift, nome)");
    const lista = ((data as any[]) ?? [])
      .map((r) => r.unidades_cache)
      .filter(Boolean) as UnidadeOpt[];
    lista.sort((a, b) => a.nome.localeCompare(b.nome));
    setUnidades(lista);
    setSemUnidades(lista.length === 0);
  };

  useEffect(() => {
    carregar();
    carregarUnidades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em7 = new Date(hoje);
    em7.setDate(em7.getDate() + 7);

    return pedidos.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      if (tipo !== "todos" && p.tipo_solicitacao !== tipo) return false;
      if (modalidade !== "todos" && p.modalidade_coleta !== modalidade) return false;
      if (unidade !== "todos" && p.unidade_codigo_shift !== unidade) return false;

      if (agendamento !== "todos") {
        const sa = statusAgendamento(p.data_agendamento, p.status);
        if (agendamento === "hoje" && sa !== "hoje") return false;
        if (agendamento === "amanha" && sa !== "amanha") return false;
        if (agendamento === "atrasados" && sa !== "atrasado") return false;
        if (agendamento === "sem" && sa !== "sem") return false;
        if (agendamento === "proximos7") {
          if (!p.data_agendamento) return false;
          const d = new Date(p.data_agendamento + "T00:00:00");
          if (d < hoje || d > em7) return false;
        }
      }

      if (q) {
        const matchProtocolo = p.protocolo.toLowerCase().includes(q);
        const matchCpf = (p.paciente_cpf ?? "").toLowerCase().includes(q);
        if (!matchProtocolo && !matchCpf) return false;
      }
      return true;
    });
  }, [pedidos, status, tipo, modalidade, unidade, agendamento, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const fatia = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const limpar = () => {
    setStatus("todos");
    setTipo("todos");
    setModalidade("todos");
    setUnidade("todos");
    setAgendamento("todos");
    setBusca("");
    setPagina(1);
  };

  const contadores = useMemo(() => {
    let hoje = 0, atrasados = 0, novos = 0;
    for (const p of pedidos) {
      const sa = statusAgendamento(p.data_agendamento, p.status);
      if (sa === "hoje") hoje++;
      if (sa === "atrasado") atrasados++;
      if (p.status === "novo") novos++;
    }
    return { total: pedidos.length, hoje, atrasados, novos };
  }, [pedidos]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-secondary">Pedidos</h1>
        {largo && (
          <div className="inline-flex rounded-md border bg-white p-0.5 shadow-sm">
            <button
              onClick={() => setVista("lista")}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition",
                vistaEfetiva === "lista"
                  ? "bg-[#C8102E] text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Lista
            </button>
            <button
              onClick={() => setVista("kanban")}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition",
                vistaEfetiva === "kanban"
                  ? "bg-[#C8102E] text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Kanban
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Total", value: contadores.total, onClick: limpar, cls: "border-border bg-white text-foreground hover:bg-muted" },
          { label: "Hoje", value: contadores.hoje, onClick: () => { setAgendamento("hoje"); setPagina(1); }, cls: "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100" },
          { label: "Atrasados", value: contadores.atrasados, onClick: () => { setAgendamento("atrasados"); setPagina(1); }, cls: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100" },
          { label: "Novos", value: contadores.novos, onClick: () => { setStatus("novo"); setPagina(1); }, cls: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" },
        ].map((c) => (
          <button
            key={c.label}
            onClick={c.onClick}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition", c.cls)}
          >
            <span className="text-xs uppercase tracking-wide opacity-75">{c.label}</span>
            <span className="text-base font-bold">{c.value}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
        {vistaEfetiva === "lista" && (
          <div className="min-w-[160px]">
            <p className="mb-1 text-xs text-muted-foreground">Status</p>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPagina(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="min-w-[140px]">
          <p className="mb-1 text-xs text-muted-foreground">Tipo</p>
          <Select value={tipo} onValueChange={(v) => { setTipo(v); setPagina(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="particular">Particular</SelectItem>
              <SelectItem value="convenio">Convênio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <p className="mb-1 text-xs text-muted-foreground">Modalidade</p>
          <Select value={modalidade} onValueChange={(v) => { setModalidade(v); setPagina(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="unidade">Na unidade</SelectItem>
              <SelectItem value="domicilio">Em domicílio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <p className="mb-1 text-xs text-muted-foreground">Unidade</p>
          <Select value={unidade} onValueChange={(v) => { setUnidade(v); setPagina(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u.codigo_shift} value={u.codigo_shift}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[170px]">
          <p className="mb-1 text-xs text-muted-foreground">Agendamento</p>
          <Select value={agendamento} onValueChange={(v) => { setAgendamento(v as FiltroAgendamento); setPagina(1); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="amanha">Amanhã</SelectItem>
              <SelectItem value="proximos7">Próximos 7 dias</SelectItem>
              <SelectItem value="atrasados">Atrasados</SelectItem>
              <SelectItem value="sem">Sem agendamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative min-w-[240px] flex-1">
          <p className="mb-1 text-xs text-muted-foreground">Buscar</p>
          <Search className="absolute left-3 top-[34px] h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar por protocolo ou CPF..."
            className="pl-9"
          />
        </div>
        <Button variant="link" onClick={limpar} className="px-0">
          Limpar filtros
        </Button>
      </div>

      {vistaEfetiva === "kanban" ? (
        <KanbanPedidos
          pedidos={filtrados}
          onAbrir={podeEditar ? setPedidoAberto : () => {}}
          onAtualizado={carregar}
          nomeStaff={nomeStaff}
          podeEditar={podeEditar}
        />
      ) : (
        <>
          <TabelaPedidos pedidos={fatia} onAbrir={podeEditar ? setPedidoAberto : () => {}} />

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Página {paginaAtual} de {totalPaginas} · {filtrados.length} pedidos
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual === 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual === totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ModalPedidoStaff
        pedido={pedidoAberto}
        onClose={() => setPedidoAberto(null)}
        onSalvo={carregar}
      />
    </div>
  );
};
