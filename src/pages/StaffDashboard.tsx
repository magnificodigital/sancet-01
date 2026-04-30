import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StaffShell, StaffTab } from "@/components/staff/StaffShell";
import { AbaVisaoGeral } from "@/components/staff/AbaVisaoGeral";
import { AbaPedidos } from "@/components/staff/AbaPedidos";
import { AbaPacientes } from "@/components/staff/AbaPacientes";
import { AbaCatalogo } from "@/components/staff/AbaCatalogo";
import { AbaUnidades } from "@/components/staff/AbaUnidades";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [aba, setAba] = useState<StaffTab>("visao");

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

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StaffShell abaAtiva={aba} onTrocarAba={setAba} emailUsuario={email}>
      {aba === "visao" && <AbaVisaoGeral />}
      {aba === "pedidos" && <AbaPedidos />}
      {aba === "pacientes" && <AbaPacientes />}
      {aba === "catalogo" && <AbaCatalogo />}
      {aba === "unidades" && <AbaUnidades />}
    </StaffShell>
  );
};

export default StaffDashboard;
