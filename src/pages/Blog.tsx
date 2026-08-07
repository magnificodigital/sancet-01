import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Post = {
  slug: string;
  titulo: string;
  categoria: string | null;
  capa_url: string | null;
  resumo: string | null;
  publicado_em: string;
};

const POR_PAGINA = 9;
const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const Blog = () => {
  const [params, setParams] = useSearchParams();
  const categoria = params.get("categoria");
  const page = Math.max(1, parseInt(params.get("p") ?? "1") || 1);

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (supabase as any)
      .from("posts")
      .select("categoria")
      .eq("publicado", true)
      .limit(1000)
      .then(({ data }) => {
        const set = new Set<string>();
        (data ?? []).forEach((r: any) => r.categoria && set.add(r.categoria));
        setCategorias(Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR")));
      });
  }, []);

  useEffect(() => {
    setCarregando(true);
    const from = (page - 1) * POR_PAGINA;
    let q = (supabase as any)
      .from("posts")
      .select("slug, titulo, categoria, capa_url, resumo, publicado_em", { count: "exact" })
      .eq("publicado", true)
      .order("publicado_em", { ascending: false })
      .range(from, from + POR_PAGINA - 1);
    if (categoria) q = q.eq("categoria", categoria);
    q.then(({ data, count }) => {
      setPosts((data as Post[]) ?? []);
      setTotal(count ?? 0);
      setCarregando(false);
      window.scrollTo({ top: 0 });
    });
  }, [categoria, page]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const irPara = (p: number, cat?: string | null) => {
    const np = new URLSearchParams();
    if (cat ?? categoria) np.set("categoria", (cat ?? categoria)!);
    if (p > 1) np.set("p", String(p));
    setParams(np);
  };

  return (
    <PageShell>
      <section className="container py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-secondary">Blog</h1>
          <p className="text-muted-foreground mt-1">
            Conteúdos sobre saúde, exames e bem-estar.
          </p>
        </header>

        <div className="grid md:grid-cols-[1fr_260px] gap-8">
          {/* Lista */}
          <div>
            {carregando ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-muted-foreground py-16 text-center">Nenhum post encontrado.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {posts.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="group rounded-xl border bg-card overflow-hidden shadow-sm transition hover:shadow-md"
                  >
                    <div className="h-44 w-full bg-gray-100">
                      {p.capa_url && (
                        <img src={p.capa_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      {p.categoria && (
                        <span className="inline-block rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                          {p.categoria}
                        </span>
                      )}
                      <h2 className="font-bold text-secondary leading-snug group-hover:text-brand transition line-clamp-2">
                        {p.titulo}
                      </h2>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" /> {fmtData(p.publicado_em)}
                      </p>
                      {p.resumo && <p className="text-sm text-gray-600 line-clamp-3">{p.resumo}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPaginas > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => irPara(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPaginas}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPaginas} onClick={() => irPara(page + 1)}>
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar categorias */}
          <aside>
            <div className="sticky top-24 rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-secondary mb-3">Categorias</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => irPara(1, null)}
                    className={cn(
                      "w-full text-left rounded px-2 py-1.5 text-sm transition hover:bg-muted",
                      !categoria && "font-semibold text-brand",
                    )}
                  >
                    Todas
                  </button>
                </li>
                {categorias.map((c) => (
                  <li key={c}>
                    <button
                      onClick={() => irPara(1, c)}
                      className={cn(
                        "w-full text-left rounded px-2 py-1.5 text-sm transition hover:bg-muted",
                        categoria === c && "font-semibold text-brand",
                      )}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  );
};

export default Blog;
