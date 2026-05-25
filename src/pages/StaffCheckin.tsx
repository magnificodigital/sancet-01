import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, Loader2, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell } from "@/components/staff/StaffShell";
import { useStaffPerfil } from "@/hooks/useStaffPerfil";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ModalPedidoStaff } from "@/components/staff/ModalPedidoStaff";
import { ScannerQR } from "@/components/staff/ScannerQR";
import { Pedido } from "@/components/staff/utils";

const StaffCheckin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [scannerAberto, setScannerAberto] = useState(false);
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

  const extrairProtocolo = (input: string): string => {
    const txt = input.trim();
    if (!txt) return "";
    // Tenta extrair de URL (ex: https://.../staff/checkin?protocolo=SAN-...)
    try {
      const url = new URL(txt);
      const qp = url.searchParams.get("protocolo");
      if (qp) return qp.trim().toUpperCase();
    } catch {
      // não é URL, segue
    }
    // Regex de fallback: captura SAN-AAAA-XXXXXX em qualquer lugar
    const match = txt.match(/SAN-\d{4}-[A-Z0-9]+/i);
    if (match) return match[0].toUpperCase();
    return txt.toUpperCase();
  };

  const buscarProtocolo = async (proto: string) => {
    const limpo = extrairProtocolo(proto);
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
