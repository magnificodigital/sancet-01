import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Permissoes = {
  pedidos:   { ver: boolean; editar: boolean; excluir: boolean };
  pacientes: { ver: boolean; editar: boolean; excluir: boolean };
  catalogo:  { ver: boolean; editar: boolean; excluir: boolean };
  unidades:  { ver: boolean; editar: boolean; excluir: boolean };
  sync:      { ver: boolean };
  config:    { ver: boolean; editar: boolean };
  paginas:   { ver: boolean; editar: boolean; excluir: boolean };
};

type StaffPerfil = {
  role: "admin" | "staff" | null;
  nome: string | null;
  permissoes: Permissoes | null;
  isAdmin: boolean;
  carregando: boolean;
};

const PERMISSOES_ADMIN: Permissoes = {
  pedidos:   { ver: true, editar: true, excluir: true },
  pacientes: { ver: true, editar: true, excluir: true },
  catalogo:  { ver: true, editar: true, excluir: true },
  unidades:  { ver: true, editar: true, excluir: true },
  sync:      { ver: true },
  config:    { ver: true, editar: true },
};

export const useStaffPerfil = (): StaffPerfil => {
  const [perfil, setPerfil] = useState<StaffPerfil>({
    role: null, nome: null, permissoes: null, isAdmin: false, carregando: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) { setPerfil((p) => ({ ...p, carregando: false })); return; }

      const { data: row } = await supabase
        .from("user_roles")
        .select("role, nome, permissoes")
        .eq("user_id", uid)
        .maybeSingle();

      const role = (row?.role ?? "staff") as "admin" | "staff";
      const isAdmin = role === "admin";

      setPerfil({
        role,
        nome: row?.nome ?? null,
        permissoes: isAdmin ? PERMISSOES_ADMIN : (row?.permissoes as Permissoes) ?? null,
        isAdmin,
        carregando: false,
      });
    });
  }, []);

  return perfil;
};
