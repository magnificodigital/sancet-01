import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { useStaffPerfil } from "@/hooks/useStaffPerfil";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModalPedidoStaff } from "@/components/staff/ModalPedidoStaff";
import { Pedido } from "@/components/staff/utils";

const StaffCheckin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useStaffPerfil();

  useEffect(() => {
    let active = true;
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      if (!session) navigate("/staff/login", { replace: true });
      else setEmail(session.user.email ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) navigate("/staff/login", { replace: true });
      else {
        setEmail(data.session.user.email ?? null);
        setCarregandoAuth(false);
      }
    });
    return () => {
      active = false;
      sub.data.subscription.unsubscribe();
    };
  }, [navigate]);

  const buscarProtocolo = async (proto: string) => {
    const limpo = proto.trim().toUpperCase();
    if (!limpo) return;
    setBuscando(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .eq("protocolo", limpo)
      .maybeSingle();
    setBuscando(false);
    if (error || !data) {
      toast.error("Protocolo não encontrado");
      focar();
      return;
    }
    setPedido(data as Pedido);
  };

  // Auto-busca via querystring ?protocolo=...
  useEffect(() => {
    if (carregandoAuth) return;
    const qp = searchParams.get("protocolo");
    if (qp && !pedido) {
      setProtocolo(qp);
      buscarProtocolo(qp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregandoAuth]);

  const focar = () => {
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buscarProtocolo(protocolo);
  };

  const fecharModal = () => {
    setPedido(null);
    setProtocolo("");
    if (searchParams.get("protocolo")) {
      searchParams.delete("protocolo");
      setSearchParams(searchParams, { replace: true });
    }
    focar();
  };

  const iniciarAtendimento = async () => {
    if (!pedido) return;
    setIniciando(true);
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "em_atendimento" })
      .eq("id", pedido.id);
    setIniciando(false);
    if (error) {
      toast.error("Erro ao iniciar atendimento");
      return;
    }
    toast.success("Atendimento iniciado!");
    fecharModal();
  };

  if (carregandoAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StaffShell
      abaAtiva={"pedidos" as any}
      onTrocarAba={(t) => navigate(`/staff/dashboard?aba=${t}`)}
      emailUsuario={email}
      isAdmin={isAdmin}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center pt-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0B1F3A] text-white">
          <QrCode className="h-8 w-8" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Check-in de pedido</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Escaneie o QR do voucher ou digite o protocolo
        </p>

        <form onSubmit={onSubmit} className="w-full">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              autoFocus
              value={protocolo}
              onChange={(e) => setProtocolo(e.target.value)}
              placeholder="SAN-2026-XXXXXX"
              className="h-14 flex-1 text-center text-lg font-mono tracking-wider"
              disabled={buscando}
            />
            <Button
              type="submit"
              disabled={buscando || !protocolo.trim()}
              className="h-14 px-6 text-white"
              style={{ backgroundColor: "#C8102E" }}
            >
              {buscando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Compatível com leitor USB · Pressione Enter para confirmar
          </p>
        </form>

        {pedido && (
          <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white p-4 shadow-lg md:left-60">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold">{pedido.protocolo}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {pedido.paciente_nome ?? "—"} · {pedido.paciente_cpf}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fecharModal}>
                  Voltar
                </Button>
                {pedido.status !== "em_atendimento" &&
                  pedido.status !== "atendido" &&
                  pedido.status !== "concluido" &&
                  pedido.status !== "cancelado" && (
                    <Button
                      onClick={iniciarAtendimento}
                      disabled={iniciando}
                      className="bg-green-600 text-white hover:bg-green-700"
                      size="lg"
                    >
                      {iniciando ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : null}
                      Iniciar atendimento
                    </Button>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ModalPedidoStaff
        pedido={pedido}
        onClose={fecharModal}
        onSalvo={() => {
          // recarrega o pedido (status pode ter mudado)
          if (pedido) buscarProtocolo(pedido.protocolo);
        }}
      />
    </StaffShell>
  );
};

export default StaffCheckin;
