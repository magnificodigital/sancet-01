import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell, StaffTab } from "@/components/staff/StaffShell";
import { AbaVisaoGeral } from "@/components/staff/AbaVisaoGeral";
import { AbaPedidos } from "@/components/staff/AbaPedidos";
import { AbaPacientes } from "@/components/staff/AbaPacientes";
import { AbaCatalogo } from "@/components/staff/AbaCatalogo";
import { AbaUnidades } from "@/components/staff/AbaUnidades";
import { AbaConvenios } from "@/components/staff/AbaConvenios";
import { AbaConfiguracoes } from "@/components/staff/AbaConfiguracoes";
import { AbaEquipe } from "@/components/staff/AbaEquipe";
import { AbaSites } from "@/components/staff/AbaSites";
import { AbaAjuda } from "@/components/staff/AbaAjuda";
import { useStaffPerfil } from "@/hooks/useStaffPerfil";
import { toast } from "sonner";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  // "Sync Shift" saiu do menu e virou parte das Configurações; redireciona links antigos.
  const abaParam = searchParams.get("aba");
  const abaInicial: StaffTab = abaParam === "shift" ? "config" : (abaParam as StaffTab) || "visao";
  const [aba, setAba] = useState<StaffTab>(abaInicial);
  const staffPerfil = useStaffPerfil();

  const trocarAba = (t: StaffTab) => {
    setAba(t);
    setSearchParams({ aba: t }, { replace: true });
  };

  useEffect(() => {
    let active = true;

    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) navigate("/staff/login", { replace: true });
      else setEmail(session.user.email ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        navigate("/staff/login", { replace: true });
      } else {
        setEmail(data.session.user.email ?? null);
        setCarregando(false);
      }
    });

    return () => {
      active = false;
      sub.data.subscription.unsubscribe();
    };
  }, [navigate]);

  // Alerta ao vivo: paciente informou o token do convênio (som + notificação na tela).
  useEffect(() => {
    const beep = () => {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch {
        /* som é best-effort */
      }
    };
    const channel = supabase
      .channel("alerta-token-convenio")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos" },
        (payload) => {
          const novo = payload.new as any;
          const ts = novo?.convenio_token_preenchido_em;
          if (ts && Date.now() - new Date(ts).getTime() < 15000) {
            beep();
            toast.success(
              `🔔 Paciente informou o token do convênio — pedido ${novo.protocolo}`,
              { duration: 12000 },
            );
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StaffShell abaAtiva={aba} onTrocarAba={trocarAba} emailUsuario={email} isAdmin={staffPerfil.isAdmin}>
      {aba === "visao" && <AbaVisaoGeral />}
      {aba === "pedidos" && <AbaPedidos permissoes={staffPerfil.permissoes} />}
      {aba === "pacientes" && <AbaPacientes permissoes={staffPerfil.permissoes} />}
      {aba === "catalogo" && <AbaCatalogo permissoes={staffPerfil.permissoes} />}
      {aba === "unidades" && <AbaUnidades permissoes={staffPerfil.permissoes} />}
      {aba === "convenios" && <AbaConvenios />}
      {aba === "config" && <AbaConfiguracoes permissoes={staffPerfil.permissoes} isAdmin={staffPerfil.isAdmin} />}
      {aba === "sites" && <AbaSites />}
      {aba === "equipe" && <AbaEquipe />}
      {aba === "ajuda" && <AbaAjuda isAdmin={staffPerfil.isAdmin} />}
    </StaffShell>
  );
};

export default StaffDashboard;
