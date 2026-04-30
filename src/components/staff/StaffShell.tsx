import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StaffTab =
  | "visao"
  | "pedidos"
  | "pacientes"
  | "catalogo"
  | "unidades"
  | "sync";

const ITENS: { id: StaffTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "visao", label: "Visão Geral", icon: LayoutDashboard },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { id: "pacientes", label: "Pacientes", icon: Users },
  { id: "catalogo", label: "Catálogo", icon: FlaskConical },
  { id: "unidades", label: "Unidades", icon: Building2 },
  { id: "sync", label: "Sync Shift", icon: RefreshCw },
];

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
      style={{ backgroundColor: "#1B3A6B" }}
    >
      <div className="px-5 py-6">
        <p className="text-xl font-bold">Sancet</p>
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

      <div className="border-t border-white/15 p-4">
        {emailUsuario && (
          <p className="mb-2 truncate text-xs text-white/70" title={emailUsuario}>
            {emailUsuario}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={sair}
          className="w-full justify-start gap-2 text-white hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sair
        </Button>
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
          <p className="text-sm font-bold" style={{ color: "#1B3A6B" }}>
            Sancet · Painel Interno
          </p>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
};
