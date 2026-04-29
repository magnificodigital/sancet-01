import { Link, NavLink } from "react-router-dom";
import { ShoppingBag, Menu, ChevronDown, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePaciente } from "@/hooks/usePaciente";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSacola } from "@/stores/sacola";
import { cn } from "@/lib/utils";

const Logo = () => (
  <Link to="/" className="flex items-center gap-3 shrink-0">
    <span className="text-2xl font-extrabold italic text-white tracking-tight drop-shadow">
      Sancet
    </span>
    <span className="hidden sm:inline text-white/40">|</span>
    <span className="hidden sm:inline text-sm font-medium text-white/90">
      Atendimento Digital
    </span>
  </Link>
);

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "px-3 py-2 text-sm font-semibold rounded-md transition-colors",
    isActive
      ? "text-white"
      : "text-white/85 hover:text-white"
  );

const agendamentosItens = [
  { label: "Reagendar", to: "/agendamentos?aba=reagendar" },
  { label: "Ver agendamentos", to: "/agendamentos" },
  { label: "Cancelar agendamento", to: "/agendamentos?aba=cancelar" },
];

export const Header = () => {
  const quantidade = useSacola((s) => s.quantidade());
  const { paciente, logado, logout } = usePaciente();
  const iniciais = (paciente?.nome ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("") || "??";

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b border-border">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/exames" className={navLinkClass}>
            Exames
          </NavLink>
          <NavLink to="/vacinas" className={navLinkClass}>
            Vacinas
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {/* Sacola */}
          <Link
            to="/sacola"
            aria-label="Ver sacola"
            className="relative p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ShoppingBag className="h-5 w-5 text-secondary" />
            {quantidade > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {quantidade}
              </span>
            )}
          </Link>

          {/* Agendamentos dropdown - desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hidden md:inline-flex text-secondary font-semibold gap-1"
              >
                Agendamentos
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {agendamentosItens.map((it) => (
                <DropdownMenuItem key={it.to} asChild>
                  <Link to={it.to}>{it.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Entrar / Conta */}
          {!logado ? (
            <Button
              asChild
              className="hidden md:inline-flex rounded-pill bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
            >
              <Link to="/entrar">Entrar</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden md:inline-flex rounded-pill font-semibold gap-2 px-4"
                >
                  <UserCircle className="h-5 w-5" />
                  <span>{iniciais}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  Olá,{" "}
                  <span className="font-semibold">
                    {paciente?.nome?.split(" ")[0] ?? ""}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left text-secondary">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                <Link
                  to="/exames"
                  className="px-3 py-3 rounded-md font-semibold text-secondary hover:bg-muted"
                >
                  Exames
                </Link>
                <Link
                  to="/vacinas"
                  className="px-3 py-3 rounded-md font-semibold text-secondary hover:bg-muted"
                >
                  Vacinas
                </Link>
                <div className="mt-4 mb-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Agendamentos
                </div>
                {agendamentosItens.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    className="px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-muted"
                  >
                    {it.label}
                  </Link>
                ))}
                <Button
                  asChild
                  className="mt-6 rounded-pill bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  <Link to="/entrar">Entrar</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
