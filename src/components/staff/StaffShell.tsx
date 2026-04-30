import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Settings2,
  UserCircle,
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

export type StaffTab =
  | "visao"
  | "pedidos"
  | "pacientes"
  | "catalogo"
  | "unidades"
  | "sync"
  | "config";

const ITENS: { id: StaffTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "visao", label: "Visão Geral", icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { id: "pacientes", label: "Pacientes", icon: Users },
  { id: "catalogo", label: "Catálogo", icon: FlaskConical },
  { id: "unidades", label: "Unidades", icon: Building2 },
  { id: "sync", label: "Sync Shift", icon: RefreshCw },
  { id: "config", label: "Configurações", icon: Settings2 },
];

const SIDEBAR_BG = "#0B1F3A";

type Props = {
  children: ReactNode;
  abaAtiva: StaffTab;
  onTrocarAba: (t: StaffTab) => void;
  emailUsuario: string | null;
};

export const StaffShell = ({ children, abaAtiva, onTrocarAba, emailUsuario }: Props) => {
  const navigate = useNavigate();
  const [mobileAberto, setMobileAberto] = useState(false);

  const sair = async () => {
    await supabase.auth.signOut();
    navigate("/staff/login", { replace: true });
  };

  const Sidebar = (
    <aside
      className="flex w-60 shrink-0 flex-col text-white"
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      <div className="flex flex-col items-start gap-2 px-5 py-6">
        <img src={logoLight} alt="Sancet" className="h-10 w-auto" />
        <p className="text-xs text-white/60">Painel Interno</p>
      </div>
      <hr className="border-white/15" />

      <nav className="flex-1 space-y-1 p-3">
        {ITENS.map((item) => {
          const ativo = abaAtiva === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTrocarAba(item.id);
                setMobileAberto(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm transition",
                ativo ? "bg-white/15 border-white font-medium" : "hover:bg-white/10",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

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
    <div className="flex min-h-screen w-full" style={{ backgroundColor: "#F5F5F5" }}>
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

      <div className="flex min-w-0 flex-1 flex-col">
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

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
};
