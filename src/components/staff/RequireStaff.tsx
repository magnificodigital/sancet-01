import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useStaffPerfil } from "@/hooks/useStaffPerfil";

/**
 * Guarda as rotas /staff: só entra quem tem papel de equipe (admin/staff).
 * SEGURANÇA: paciente logado (ou visitante) NUNCA acessa o painel — os dados
 * já são barrados por RLS, e este guard impede até o painel de aparecer.
 */
export const RequireStaff = ({ children }: { children: ReactNode }) => {
  const { role, carregando } = useStaffPerfil();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role !== "admin" && role !== "staff") {
    return <Navigate to="/staff/login" replace />;
  }

  return <>{children}</>;
};
