import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Colega = { user_id: string; nome: string };

/**
 * Transfere um pedido (pedidoId) ou TODOS os pedidos em andamento do usuário
 * (sem pedidoId — troca de turno) para um colega. Regras no servidor:
 * transferir_pedido / transferir_meus_pedidos.
 */
export const TransferirPedido = ({
  aberto,
  onFechar,
  pedidoId,
  protocolo,
  onFeito,
}: {
  aberto: boolean;
  onFechar: () => void;
  pedidoId?: string;
  protocolo?: string;
  onFeito?: () => void;
}) => {
  const [colegas, setColegas] = useState<Colega[]>([]);
  const [para, setPara] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setPara("");
    (supabase as any)
      .rpc("colegas_para_transferir", { p_pedido_id: pedidoId ?? null })
      .then(({ data }: { data: Colega[] | null }) => setColegas(Array.isArray(data) ? data : []));
  }, [aberto, pedidoId]);

  const transferir = async () => {
    if (!para) return toast.error("Escolha o colega.");
    setSalvando(true);
    const { data, error } = pedidoId
      ? await (supabase as any).rpc("transferir_pedido", { p_pedido_id: pedidoId, p_para: para })
      : await (supabase as any).rpc("transferir_meus_pedidos", { p_para: para });
    setSalvando(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Não foi possível transferir.");
    if (pedidoId) {
      toast.success(`Pedido ${protocolo ?? ""} transferido para ${data?.para ?? "o colega"}.`);
    } else {
      const n = data?.transferidos ?? 0;
      toast.success(
        n === 0
          ? "Você não tinha pedidos em andamento para transferir."
          : `${n} ${n === 1 ? "pedido transferido" : "pedidos transferidos"} para ${data?.para}.` +
              (data?.pulados ? ` ${data.pulados} ficaram com você (o colega não atende a unidade).` : ""),
      );
    }
    onFeito?.();
    onFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !salvando && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{pedidoId ? "Transferir pedido" : "Passar meus pedidos"}</DialogTitle>
          <DialogDescription>
            {pedidoId
              ? `O pedido ${protocolo ?? ""} passa a ser responsabilidade do colega escolhido e sai da sua lista.`
              : "Todos os pedidos em andamento sob sua responsabilidade passam para o colega escolhido (ex.: troca de turno)."}
          </DialogDescription>
        </DialogHeader>
        {colegas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum colega ativo disponível para receber.</p>
        ) : (
          <Select value={para} onValueChange={setPara}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha o colega" />
            </SelectTrigger>
            <SelectContent>
              {colegas.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={transferir}
            disabled={salvando || !para}
            className="bg-brand-2 text-white hover:bg-[#162f58]"
          >
            {salvando ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Bloco no detalhe do pedido: quem é o responsável + transferir / devolver à fila. */
export const ResponsavelPedido = ({
  pedido,
  meuId,
  isAdmin,
  onAlterado,
}: {
  pedido: { id: string; protocolo: string; status: string; responsavel_id?: string | null; responsavel_nome?: string | null; responsavel_em?: string | null };
  meuId: string | null;
  isAdmin: boolean;
  onAlterado?: () => void;
}) => {
  const [transferindo, setTransferindo] = useState(false);
  const [devolvendo, setDevolvendo] = useState(false);
  const meu = !!meuId && pedido.responsavel_id === meuId;
  const pode = !!pedido.responsavel_id && (meu || isAdmin);

  const devolver = async () => {
    if (!window.confirm("Devolver este pedido para a fila? Ele volta a aparecer para toda a equipe da unidade.")) return;
    setDevolvendo(true);
    const { data, error } = await (supabase as any).rpc("transferir_pedido", {
      p_pedido_id: pedido.id,
      p_para: null,
    });
    setDevolvendo(false);
    if (error || data?.error) return toast.error(data?.error ?? error?.message ?? "Não foi possível devolver.");
    toast.success("Pedido devolvido para a fila.");
    onAlterado?.();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3 text-sm">
      <span className="flex-1">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Responsável: </span>
        {pedido.responsavel_id ? (
          <b className="text-secondary">{meu ? "Você" : pedido.responsavel_nome ?? "—"}</b>
        ) : (
          <span className="text-muted-foreground">ninguém ainda — quem tirar de "Novo" assume</span>
        )}
      </span>
      {pode && (
        <>
          <Button size="sm" variant="outline" onClick={() => setTransferindo(true)}>
            Transferir
          </Button>
          <Button size="sm" variant="ghost" onClick={devolver} disabled={devolvendo}>
            {devolvendo ? "Devolvendo..." : "Devolver à fila"}
          </Button>
        </>
      )}
      <TransferirPedido
        aberto={transferindo}
        onFechar={() => setTransferindo(false)}
        pedidoId={pedido.id}
        protocolo={pedido.protocolo}
        onFeito={onAlterado}
      />
    </div>
  );
};
