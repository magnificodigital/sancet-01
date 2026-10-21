import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BellRing,
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Bot,
  ClipboardList,
  FileText,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  QrCode,
  Settings2,
  Shield,
  UserCircle,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/logo-sancet-light.png";
import { useLogos } from "@/lib/tema";
import { useStaffPerfil } from "@/hooks/useStaffPerfil";
import { pode } from "@/lib/permissoes";

export type StaffTab =
  | "visao"
  | "pedidos"
  | "conversas"
  | "pacientes"
  | "catalogo"
  | "unidades"
  | "convenios"
  | "shift"
  | "config"
  | "sites"
  | "equipe"
  | "recall"
  | "superadmin"
  | "agente"
  | "ajuda";

type ItemMenu = { id: StaffTab | "checkin"; label: string; icon: typeof LayoutDashboard; modulo?: string; superOnly?: boolean };

/** Menu organizado por assunto. Cada item aparece conforme a permissão "ver" da área. */
const GRUPOS: { titulo: string | null; itens: ItemMenu[] }[] = [
  { titulo: null, itens: [{ id: "visao", label: "Visão Geral", icon: LayoutDashboard, modulo: "visao" }] },
  {
    titulo: "Atendimento",
    itens: [
      { id: "pedidos", label: "Pedidos", icon: ClipboardList, modulo: "pedidos" },
      { id: "conversas", label: "Conversas", icon: MessageSquare, modulo: "conversas" },
      { id: "checkin", label: "Check-in", icon: QrCode, modulo: "checkin" },
      { id: "pacientes", label: "Pacientes", icon: Users, modulo: "pacientes" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { id: "catalogo", label: "Catálogo", icon: FlaskConical, modulo: "catalogo" },
      { id: "unidades", label: "Unidades", icon: Building2, modulo: "unidades" },
      { id: "convenios", label: "Convênios", icon: Shield, modulo: "convenios" },
    ],
  },
  {
    titulo: "Marketing",
    itens: [
      { id: "sites", label: "Sites e páginas", icon: FileText, modulo: "paginas" },
      { id: "recall", label: "Recall", icon: BellRing, modulo: "recall" },
    ],
  },
  {
    titulo: "Administração",
    itens: [
      { id: "agente", label: "Agente de IA", icon: Bot, modulo: "agente" },
      { id: "equipe", label: "Equipe", icon: UserCog, modulo: "equipe" },
      { id: "config", label: "Configurações", icon: Settings2, modulo: "config" },
      { id: "superadmin", label: "Super Admin", icon: Crown, superOnly: true },
    ],
  },
];

const SIDEBAR_BG = "hsl(var(--brand-sidebar))";

type Props = {
  children: ReactNode;
  abaAtiva: StaffTab;
  onTrocarAba: (t: StaffTab) => void;
  emailUsuario: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
};

export const StaffShell = ({ children, abaAtiva, onTrocarAba, emailUsuario }: Props) => {
  const perfil = useStaffPerfil();
  const visivel = (i: ItemMenu) => (i.superOnly ? perfil.isSuperAdmin : !i.modulo || pode(perfil.permissoes as any, i.modulo, "ver"));
  const grupos = GRUPOS.map((g) => ({ ...g, itens: g.itens.filter(visivel) })).filter((g) => g.itens.length);
  const navigate = useNavigate();
  const location = useLocation();
  const { claro } = useLogos();
  const checkinAtivo = location.pathname.startsWith("/staff/checkin");
  const [mobileAberto, setMobileAberto] = useState(false);
  // Conversas usa a tela toda: o menu recolhe sozinho ali (a escolha fica lembrada por tipo de tela).
  const telaCheia = abaAtiva === "conversas" && !checkinAtivo;
  const chavePref = telaCheia ? "sancet_menu_recolhido_conversas" : "sancet_menu_recolhido";
  const lerPref = (k: string, padrao: boolean) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? padrao : v === "1";
    } catch {
      return padrao;
    }
  };
  const [recolhido, setRecolhido] = useState(() => lerPref(chavePref, telaCheia));
  useEffect(() => {
    setRecolhido(lerPref(chavePref, telaCheia));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chavePref]);
  const alternarMenu = () =>
    setRecolhido((r) => {
      try {
        localStorage.setItem(chavePref, r ? "0" : "1");
      } catch {
        /* sem storage */
      }
      return !r;
    });
  const [pedidosNovos, setPedidosNovos] = useState<number>(0);
  const [conversasPendentes, setConversasPendentes] = useState<number>(0);

  useEffect(() => {
    let cancelado = false;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("status", "novo");
      if (!cancelado) setPedidosNovos(count ?? 0);
      // Conversas: fila (pediram atendente) + minhas com mensagem não lida.
      const uid = (await supabase.auth.getSession()).data.session?.user.id;
      if (!uid) return;
      const { count: conv } = await (supabase as any)
        .from("chat_conversas")
        .select("id", { count: "exact", head: true })
        .or(`status.eq.aguardando,and(responsavel_id.eq.${uid},nao_lidas.gt.0,status.neq.encerrada)`);
      if (!cancelado) setConversasPendentes(conv ?? 0);
    };
    fetchCount();
    const iv = setInterval(fetchCount, 15000);
    return () => {
      cancelado = true;
      clearInterval(iv);
    };
  }, []);

  const sair = async () => {
    await supabase.auth.signOut();
    navigate("/staff/login", { replace: true });
  };

  const renderSidebar = (compacto: boolean, comBotao = true) => (
    <aside
      className={cn("flex min-h-0 shrink-0 flex-col text-white transition-[width] duration-200", compacto ? "w-[68px]" : "w-60")}
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      {compacto ? (
        <div className="flex flex-col items-center gap-2 py-4">
          {comBotao && (
            <button onClick={alternarMenu} className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Abrir menu" title="Abrir menu">
              <ChevronsRight className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2 px-5 py-6">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <img src={claro || logoLight} alt="Sancet" className="h-14 w-auto" />
            <p className="text-xs text-white/60">Painel Interno</p>
          </div>
          {comBotao && (
            <button onClick={alternarMenu} className="-mr-2 rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Recolher menu" title="Recolher menu">
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      <hr className="border-white/15" />

      <nav className={cn("flex-1 overflow-y-auto", compacto ? "space-y-2 px-2 py-3" : "space-y-4 p-3")}>
        {grupos.map((g) => (
          <div key={g.titulo ?? "inicio"} className={cn("space-y-0.5", compacto && g.titulo && "border-t border-white/10 pt-2")}>
            {g.titulo && !compacto && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">{g.titulo}</p>}
            {g.itens.map((item) => {
              const ativo = item.id === "checkin" ? checkinAtivo : !checkinAtivo && abaAtiva === item.id;
              const Icon = item.icon;
              const contador = item.id === "conversas" ? conversasPendentes : item.id === "pedidos" ? pedidosNovos : 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "checkin") navigate("/staff/checkin");
                    else onTrocarAba(item.id as StaffTab);
                    setMobileAberto(false);
                  }}
                  title={compacto ? item.label : undefined}
                  className={cn(
                    "relative flex w-full items-center rounded-md text-sm transition",
                    compacto ? "justify-center py-2.5" : "gap-3 border-l-[3px] border-transparent px-3 py-1.5",
                    ativo ? (compacto ? "bg-white/20" : "border-white bg-white/15 font-medium") : "text-white/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className={compacto ? "h-5 w-5" : "h-4 w-4"} />
                  {!compacto && <span className="flex-1 text-left">{item.label}</span>}
                  {compacto && contador > 0 && (
                    <span className={cn("absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-[hsl(var(--brand-sidebar))]", item.id === "conversas" ? "bg-amber-400" : "bg-brand")} />
                  )}
                  {!compacto && contador > 0 && (
                    <span
                      className={cn(
                        "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white",
                        item.id === "conversas" ? "bg-amber-500" : "bg-brand",
                      )}
                    >
                      {contador > 99 ? "99+" : contador}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={compacto ? "px-2 pb-1" : "px-3 pb-1"}>
        <button
          onClick={() => {
            onTrocarAba("ajuda");
            setMobileAberto(false);
          }}
          title={compacto ? "Ajuda" : undefined}
          className={cn(
            "flex w-full items-center rounded-md text-sm transition",
            compacto ? "justify-center py-2.5" : "gap-3 px-3 py-1.5",
            !checkinAtivo && abaAtiva === "ajuda" ? "bg-white/15 font-medium" : "text-white/70 hover:bg-white/10 hover:text-white",
          )}
        >
          <LifeBuoy className={compacto ? "h-5 w-5" : "h-4 w-4"} /> {!compacto && "Ajuda"}
        </button>
      </div>

      <div className={cn("border-t border-white/15", compacto ? "p-2" : "p-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn("flex w-full items-center rounded-md py-2 text-left text-sm hover:bg-white/10", compacto ? "justify-center" : "gap-2 px-3")}
              aria-label="Minha conta"
              title={compacto ? emailUsuario ?? "Minha conta" : undefined}
            >
              <UserCircle className="h-5 w-5 shrink-0" />
              {!compacto && (
                <>
                  <span className="min-w-0 flex-1 truncate" title={emailUsuario ?? ""}>
                    {emailUsuario ?? "Minha conta"}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
              Minha conta
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate("/staff/alterar-senha")}
              className="cursor-pointer"
            >
              <KeyRound className="mr-2 h-4 w-4" /> Alterar senha
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={sair} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: "#F5F5F5" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{renderSidebar(recolhido)}</div>

      {/* Mobile sidebar (drawer) */}
      {mobileAberto && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileAberto(false)}
          />
          <div className="relative z-10">{renderSidebar(false, false)}</div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header
          className="flex items-center gap-3 border-b bg-white px-4 py-3 md:hidden"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileAberto((v) => !v)}
            aria-label="Abrir menu"
          >
            {mobileAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <p className="text-sm font-bold text-foreground">
            Sancet · Painel Interno
          </p>
        </header>

        <main className={telaCheia ? "min-h-0 flex-1 overflow-hidden p-2 md:p-4" : "flex-1 overflow-y-auto p-4 md:p-8"}>{children}</main>
      </div>
    </div>
  );
};
