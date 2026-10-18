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
import { AbaRecall } from "@/components/staff/AbaRecall";
import { AbaConversas, lerStatusAtendente } from "@/components/staff/AbaConversas";
import { AbaSuperAdmin } from "@/components/staff/AbaSuperAdmin";
import { MODULOS, pode } from "@/lib/permissoes";
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

  // Presença no chat: enquanto o painel está aberto, avisa a cada minuto que o
  // atendente está disponível (Online/Ausente) — é o que permite o rodízio.
  useEffect(() => {
    const ping = () => (supabase as any).rpc("chat_ping", { _status: lerStatusAtendente() }).then(() => {}, () => {});
    ping();
    const iv = window.setInterval(ping, 60_000);
    return () => window.clearInterval(iv);
  }, []);

  // Alerta ao vivo: paciente informou o token do convênio ou enviou documentos (som + notificação na tela).
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
    const avisados = new Set<string>();
    // Evita alertar várias vezes pelo mesmo evento (ex.: vários anexos seguidos).
    const avisar = (chave: string, msg: string) => {
      if (avisados.has(chave)) return;
      avisados.add(chave);
      beep();
      toast.success(msg, { duration: 12000 });
    };
    const channel = supabase
      .channel("alerta-token-convenio")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos" },
        (payload) => {
          const novo = payload.new as any;
          const recente = (ts?: string | null) => !!ts && Date.now() - new Date(ts).getTime() < 15000;
          if (recente(novo?.convenio_token_preenchido_em)) {
            avisar(
              `token:${novo.id}:${novo.convenio_token_preenchido_em}`,
              `🔔 Paciente informou o token do convênio — pedido ${novo.protocolo}`,
            );
          }
          if (recente(novo?.reagendado_em)) {
            avisar(
              `reag:${novo.id}:${novo.reagendado_em}`,
              `📅 Paciente reagendou — pedido ${novo.protocolo}`,
            );
          }
          if (recente(novo?.anexo_paciente_em)) {
            avisar(
              `anexo:${novo.id}:${String(novo.anexo_paciente_em).slice(0, 16)}`,
              `📎 Paciente enviou documento(s) — pedido ${novo.protocolo}`,
            );
          }
        },
      )
      .subscribe();

    // Chat: paciente pediu atendente, conversa transferida para mim, ou
    // mensagem nova em conversa que está comigo.
    const canalChat = (supabase as any)
      .channel("alerta-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensagens" }, async (payload: any) => {
        const m = payload.new;
        const meuId = (await supabase.auth.getSession()).data.session?.user.id;
        if (!meuId) return;
        if (m.autor === "sistema" && m.meta?.evento === "pediu_humano") {
          avisar(`fila:${m.id}`, "💬 Paciente pediu atendimento no chat — veja em Conversas");
        } else if (m.autor === "sistema" && m.meta?.evento === "avaliacao_baixa") {
          avisar(`aval:${m.id}`, `⚠️ Avaliação baixa no chat (${m.meta?.nota ?? "?"}/5) — veja em Conversas`);
        } else if (m.autor === "sistema" && m.meta?.evento === "atribuida" && m.meta?.para === meuId) {
          avisar(`atrib:${m.id}`, "💬 Uma conversa do chat foi direcionada para você — veja em Conversas");
        } else if (m.autor === "sistema" && m.meta?.evento === "transferida" && m.meta?.para === meuId) {
          avisar(`transf:${m.id}`, "💬 Uma conversa do chat foi transferida para você");
        } else if (m.autor === "paciente") {
          const { data: c } = await (supabase as any)
            .from("chat_conversas")
            .select("responsavel_id, ia_ativa")
            .eq("id", m.conversa_id)
            .maybeSingle();
          if (c && c.responsavel_id === meuId && !c.ia_ativa) avisar(`msg:${m.id}`, "💬 Nova mensagem do paciente no chat");
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(canalChat);
    };
  }, []);

  // Área liberada? (mesma regra do menu e do banco)
  const MODULO_DA_ABA: Record<string, string> = { sites: "paginas" };
  const podeAba = (a: StaffTab) => {
    if (a === "ajuda") return true;
    if (a === "superadmin") return staffPerfil.isSuperAdmin;
    if (staffPerfil.carregando) return true;
    const m = MODULO_DA_ABA[a] ?? a;
    return !MODULOS.some((x) => x.id === m) || pode(staffPerfil.permissoes as any, m, "ver");
  };
  // Sem acesso à Visão Geral: abre na primeira área liberada.
  useEffect(() => {
    if (staffPerfil.carregando || podeAba(aba)) return;
    const primeira = (["visao", "pedidos", "conversas", "pacientes", "catalogo", "unidades", "convenios", "sites", "recall", "equipe", "config"] as StaffTab[]).find(podeAba);
    if (primeira) trocarAba(primeira);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffPerfil.carregando, aba]);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StaffShell abaAtiva={aba} onTrocarAba={trocarAba} emailUsuario={email} isAdmin={staffPerfil.isAdmin} isSuperAdmin={staffPerfil.isSuperAdmin}>
      {!podeAba(aba) ? (
        <div className="py-20 text-center text-muted-foreground">Você não tem acesso a esta área. Fale com o administrador.</div>
      ) : (
        <>
          {aba === "visao" && <AbaVisaoGeral />}
          {aba === "pedidos" && <AbaPedidos permissoes={staffPerfil.permissoes} />}
          {aba === "conversas" && <AbaConversas userId={staffPerfil.userId} isAdmin={staffPerfil.isAdmin} />}
          {aba === "pacientes" && <AbaPacientes permissoes={staffPerfil.permissoes} />}
          {aba === "catalogo" && <AbaCatalogo permissoes={staffPerfil.permissoes} />}
          {aba === "unidades" && <AbaUnidades permissoes={staffPerfil.permissoes} />}
          {aba === "convenios" && <AbaConvenios />}
          {aba === "config" && (
            <AbaConfiguracoes permissoes={staffPerfil.permissoes} isAdmin={staffPerfil.isAdmin} isSuperAdmin={staffPerfil.isSuperAdmin} />
          )}
          {aba === "superadmin" && <AbaSuperAdmin userId={staffPerfil.userId} />}
          {aba === "sites" && <AbaSites />}
          {aba === "equipe" && <AbaEquipe isSuperAdmin={staffPerfil.isSuperAdmin} />}
          {aba === "recall" && <AbaRecall />}
          {aba === "ajuda" && <AbaAjuda isAdmin={staffPerfil.isAdmin} />}
        </>
      )}
    </StaffShell>
  );
};

export default StaffDashboard;
