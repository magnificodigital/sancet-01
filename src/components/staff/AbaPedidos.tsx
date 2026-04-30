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
import { ModalPedidoStaff } from "./ModalPedidoStaff";
import { Pedido, STATUS_OPTIONS } from "./utils";

const POR_PAGINA = 20;

export const AbaPedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoAberto, setPedidoAberto] = useState<Pedido | null>(null);

  const [status, setStatus] = useState<string>("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [modalidade, setModalidade] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const carregar = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setPedidos((data as Pedido[]) ?? []);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      if (tipo !== "todos" && p.tipo_solicitacao !== tipo) return false;
      if (modalidade !== "todos" && p.modalidade_coleta !== modalidade) return false;
      if (q) {
        const matchProtocolo = p.protocolo.toLowerCase().includes(q);
        const matchCpf = (p.paciente_cpf ?? "").toLowerCase().includes(q);
        if (!matchProtocolo && !matchCpf) return false;
      }
      return true;
    });
  }, [pedidos, status, tipo, modalidade, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const fatia = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const limpar = () => {
    setStatus("todos");
    setTipo("todos");
    setModalidade("todos");
    setBusca("");
    setPagina(1);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-secondary">Pedidos</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
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
        <div className="relative min-w-[260px] flex-1">
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

      <TabelaPedidos pedidos={fatia} onAbrir={setPedidoAberto} />

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

      <ModalPedidoStaff
        pedido={pedidoAberto}
        onClose={() => setPedidoAberto(null)}
        onSalvo={carregar}
      />
    </div>
  );
};
