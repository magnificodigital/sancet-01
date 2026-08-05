import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { RenderBloco } from "@/components/landing/RenderBloco";
import type { Bloco } from "@/components/landing/tipos";
import Index from "./Index";

// Slug da home institucional editável (Sites → Páginas do site → slug "home").
const HOME_SLUG = "home";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "cms"; blocos: Bloco[] }
  | { tipo: "fallback" };

/**
 * Rota "/". Se existir uma página do site ativa com slug "home", ela é a
 * home institucional (editável no painel em Sites → Páginas do site).
 * Caso contrário, cai no Index atual (a home funcional que já existe) —
 * assim o site nunca fica sem home.
 */
const Home = () => {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase
        .from("paginas")
        .select("blocos, ativa")
        .eq("slug", HOME_SLUG)
        .eq("ativa", true)
        .maybeSingle();
      if (!ativo) return;
      const blocos = (data?.blocos as Bloco[] | undefined) ?? [];
      if (data && Array.isArray(blocos) && blocos.length > 0) {
        setEstado({ tipo: "cms", blocos });
      } else {
        setEstado({ tipo: "fallback" });
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  if (estado.tipo === "carregando") {
    return (
      <PageShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (estado.tipo === "fallback") return <Index />;

  return (
    <PageShell>
      <article style={{ fontFamily: "Inter, sans-serif" }}>
        {estado.blocos.map((b) => (
          <RenderBloco key={b.id} bloco={b} />
        ))}
      </article>
    </PageShell>
  );
};

export default Home;
