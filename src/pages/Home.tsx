import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { RenderBloco } from "@/components/landing/RenderBloco";
import type { Bloco } from "@/components/landing/tipos";
import { setSobreHero } from "@/lib/headerHero";
import Index from "./Index";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "cms"; blocos: Bloco[] }
  | { tipo: "fallback" };

/**
 * Rota "/". Renderiza a página do site marcada como inicial (home = true e
 * ativa). Se nenhuma estiver marcada, cai na home funcional padrão (Index) —
 * assim o site nunca fica sem home. A escolha é feita em Sites → Páginas do site.
 */
const Home = () => {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    (async () => {
      // `home` é uma coluna nova; cast evita erro de TS enquanto os types não regeneram.
      const { data } = await (supabase as any)
        .from("paginas")
        .select("blocos, ativa, home")
        .eq("home", true)
        .eq("ativa", true)
        .maybeSingle();
      if (!ativo) return;
      const blocos = (data?.blocos as Bloco[] | undefined) ?? [];
      if (data && Array.isArray(blocos) && blocos.length > 0) {
        setEstado({ tipo: "cms", blocos });
        setSobreHero(blocos[0]?.tipo === "hero");
      } else {
        setEstado({ tipo: "fallback" }); // Index tem hero próprio
        setSobreHero(true);
      }
    })();
    return () => {
      ativo = false;
      setSobreHero(false);
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
