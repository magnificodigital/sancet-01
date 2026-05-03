import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { RenderBloco } from "@/components/landing/RenderBloco";
import type { Bloco } from "@/components/landing/tipos";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "ok"; titulo: string; meta: string | null; blocos: Bloco[] }
  | { tipo: "nao-encontrada" }
  | { tipo: "erro"; mensagem: string };

const setMetaDescription = (descricao: string | null) => {
  let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = "description";
    document.head.appendChild(tag);
  }
  tag.content = descricao ?? "";
};

const LandingPublica = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get("preview") === "true";
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  useEffect(() => {
    if (!slug) return;
    let ativo = true;
    setEstado({ tipo: "carregando" });
    (async () => {
      // Em modo preview, exigir admin autenticado e bypassar filtro de publicado
      if (preview) {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user.id;
        if (!uid) {
          if (ativo) setEstado({ tipo: "nao-encontrada" });
          return;
        }
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: uid,
          _role: "admin",
        });
        if (!isAdmin) {
          if (ativo) setEstado({ tipo: "nao-encontrada" });
          return;
        }
      }

      let query = supabase
        .from("landing_pages")
        .select("titulo, meta_descricao, blocos, publicado")
        .eq("slug", slug);
      if (!preview) query = query.eq("publicado", true);

      const { data, error } = await query.maybeSingle();
      if (!ativo) return;
      if (error) {
        setEstado({ tipo: "erro", mensagem: error.message });
        return;
      }
      if (!data) {
        setEstado({ tipo: "nao-encontrada" });
        return;
      }
      setEstado({
        tipo: "ok",
        titulo: data.titulo,
        meta: data.meta_descricao,
        blocos: (data.blocos as any) ?? [],
      });
    })();
    return () => {
      ativo = false;
    };
  }, [slug, preview]);

  useEffect(() => {
    if (estado.tipo === "ok") {
      document.title = `${estado.titulo} · Sancet`;
      setMetaDescription(estado.meta);
    } else if (estado.tipo === "nao-encontrada") {
      document.title = "Página não encontrada · Sancet";
    }
  }, [estado]);

  return (
    <PageShell>
      {estado.tipo === "carregando" && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {estado.tipo === "erro" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-2xl font-semibold">Não foi possível carregar a página</h1>
          <p className="text-muted-foreground text-sm">{estado.mensagem}</p>
          <Button asChild className="bg-[#C8102E] hover:bg-[#a30d25] text-white">
            <Link to="/">Voltar para o início</Link>
          </Button>
        </div>
      )}

      {estado.tipo === "nao-encontrada" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-3xl font-bold">Página não encontrada</h1>
          <p className="text-muted-foreground">
            A página que você procura não existe ou ainda não foi publicada.
          </p>
          <Button asChild className="bg-[#C8102E] hover:bg-[#a30d25] text-white">
            <Link to="/">Voltar para o início</Link>
          </Button>
        </div>
      )}

      {estado.tipo === "ok" && (
        <article style={{ fontFamily: "Inter, sans-serif" }}>
          {estado.blocos.map((b) => (
            <RenderBloco key={b.id} bloco={b} />
          ))}
        </article>
      )}
    </PageShell>
  );
};

export default LandingPublica;
