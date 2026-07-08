import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RenderBloco } from "@/components/landing/RenderBloco";
import type { Bloco } from "@/components/landing/tipos";
import NotFound from "./NotFound";

type Pagina = {
  titulo: string;
  conteudo_html: string;
  meta_title: string | null;
  meta_description: string | null;
  blocos: Bloco[];
};

const PaginaPublica = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get("preview") === "true";
  const [estado, setEstado] = useState<
    { tipo: "loading" } | { tipo: "ok"; pagina: Pagina } | { tipo: "404" }
  >({ tipo: "loading" });

  useEffect(() => {
    if (!slug) return;
    let ativo = true;
    setEstado({ tipo: "loading" });
    (async () => {
      let query = supabase
        .from("paginas")
        .select("titulo, conteudo_html, meta_title, meta_description, blocos")
        .eq("slug", slug);
      if (!preview) query = query.eq("ativa", true);
      const { data, error } = await query.maybeSingle();
      if (!ativo) return;
      if (error || !data) {
        setEstado({ tipo: "404" });
        return;
      }
      setEstado({
        tipo: "ok",
        pagina: {
          ...(data as any),
          blocos: ((data as any).blocos as Bloco[]) ?? [],
        },
      });
    })();
    return () => {
      ativo = false;
    };
  }, [slug, preview]);

  if (estado.tipo === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (estado.tipo === "404") return <NotFound />;

  const { pagina } = estado;
  const title = pagina.meta_title || pagina.titulo;
  const url = `https://sancet.magnificodigital.com/${slug}`;
  const temBlocos = pagina.blocos && pagina.blocos.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`${title} · Sancet`}</title>
        {pagina.meta_description && (
          <meta name="description" content={pagina.meta_description} />
        )}
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:url" content={url} />
      </Helmet>
      <Header />
      <main className="flex-1">
        {temBlocos ? (
          <article style={{ fontFamily: "Inter, sans-serif" }}>
            {pagina.blocos.map((b) => (
              <RenderBloco key={b.id} bloco={b} />
            ))}
          </article>
        ) : (
          <div className="pt-24 pb-16">
            <article className="container max-w-4xl mx-auto px-4">
              <h1 className="text-4xl font-bold text-secondary mb-8">{pagina.titulo}</h1>
              <div
                className="prose prose-lg max-w-none prose-headings:text-secondary prose-a:text-primary"
                dangerouslySetInnerHTML={{ __html: pagina.conteudo_html }}
              />
            </article>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PaginaPublica;
