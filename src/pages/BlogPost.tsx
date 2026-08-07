import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, CalendarDays, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";

type Post = {
  titulo: string;
  categoria: string | null;
  capa_url: string | null;
  conteudo_html: string;
  autor: string | null;
  resumo: string | null;
  publicado_em: string;
};

const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "404">("carregando");

  useEffect(() => {
    if (!slug) return;
    setEstado("carregando");
    (supabase as any)
      .from("posts")
      .select("titulo, categoria, capa_url, conteudo_html, autor, resumo, publicado_em")
      .eq("slug", slug)
      .eq("publicado", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPost(data as Post);
          setEstado("ok");
        } else {
          setEstado("404");
        }
      });
  }, [slug]);

  return (
    <PageShell>
      <article className="container max-w-3xl py-10">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar ao blog
        </Link>

        {estado === "carregando" && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {estado === "404" && (
          <div className="py-16 text-center">
            <h1 className="text-2xl font-bold text-secondary">Post não encontrado</h1>
            <p className="text-muted-foreground mt-2">O conteúdo que você procura não existe ou saiu do ar.</p>
          </div>
        )}

        {estado === "ok" && post && (
          <>
            <Helmet>
              <title>{`${post.titulo} · Sancet`}</title>
              {post.resumo && <meta name="description" content={post.resumo} />}
            </Helmet>

            {post.categoria && (
              <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {post.categoria}
              </span>
            )}
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-secondary leading-tight">
              {post.titulo}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {fmtData(post.publicado_em)}
              </span>
              {post.autor && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" /> {post.autor}
                </span>
              )}
            </div>

            {post.capa_url && (
              <img
                src={post.capa_url}
                alt={post.titulo}
                className="mt-6 w-full rounded-xl object-cover"
              />
            )}

            <div
              className="prose prose-lg max-w-none mt-6 prose-headings:text-secondary prose-a:text-brand prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: post.conteudo_html }}
            />
          </>
        )}
      </article>
    </PageShell>
  );
};

export default BlogPost;
