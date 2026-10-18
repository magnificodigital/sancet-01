import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BellRing,
  Building2,
  ChevronDown,
  Crown,
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

  const Sidebar = (
    <aside
      className="flex min-h-0 w-60 shrink-0 flex-col text-white"
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      <div className="flex flex-col items-start gap-2 px-5 py-6">
        <img src={claro || logoLight} alt="Sancet" className="h-14 w-auto" />
        <p className="text-xs text-white/60">Painel Interno</p>
      </div>
      <hr className="border-white/15" />

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {grupos.map((g) => (
          <div key={g.titulo ?? "inicio"} className="space-y-0.5">
            {g.titulo && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">{g.titulo}</p>}
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
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-1.5 text-sm transition",
                    ativo ? "border-white bg-white/15 font-medium" : "text-white/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {contador > 0 && (
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

      <div className="px-3 pb-1">
        <button
          onClick={() => {
            onTrocarAba("ajuda");
            setMobileAberto(false);
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm transition",
            !checkinAtivo && abaAtiva === "ajuda" ? "bg-white/15 font-medium" : "text-white/70 hover:bg-white/10 hover:text-white",
          )}
        >
          <LifeBuoy className="h-4 w-4" /> Ajuda
        </button>
      </div>

      <div className="border-t border-white/15 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-white/10"
              aria-label="Minha conta"
            >
              <UserCircle className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 truncate" title={emailUsuario ?? ""}>
                {emailUsuario ?? "Minha conta"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
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
      <div className="hidden md:flex">{Sidebar}</div>

      {/* Mobile sidebar (drawer) */}
      {mobileAberto && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileAberto(false)}
          />
          <div className="relative z-10">{Sidebar}</div>
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

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
};
