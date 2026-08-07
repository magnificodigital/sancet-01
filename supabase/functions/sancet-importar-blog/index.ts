import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FONTE = "https://sancet.com.br/wp-json/wp/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Só admin/staff podem importar.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json(401, { ok: false, reason: "Não autenticado." });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const permitido = (roles ?? []).some(
      (r: any) => r.role === "admin" || r.role === "staff",
    );
    if (!permitido) return json(403, { ok: false, reason: "Sem permissão." });

    let page = 1;
    let importados = 0;
    const perPage = 50;
    const fetchHeaders = {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    };

    while (true) {
      const url = `${FONTE}/posts?per_page=${perPage}&page=${page}&_embed=1`;
      const r = await fetch(url, { headers: fetchHeaders });
      if (r.status === 400) break; // acabou as páginas
      if (!r.ok) {
        const corpo = await r.text().catch(() => "");
        return json(502, {
          ok: false,
          reason: `A fonte respondeu ${r.status} ao buscar os posts.`,
          detalhe: corpo.slice(0, 300),
          importados,
        });
      }
      const posts = await r.json().catch(() => null);
      if (!Array.isArray(posts)) {
        return json(502, { ok: false, reason: "Resposta inválida da fonte (não é lista de posts).", importados });
      }
      if (posts.length === 0) break;

      const rows = posts.map((p: any) => {
        const emb = p._embedded ?? {};
        const categoria =
          emb["wp:term"]?.[0]?.find((t: any) => t?.taxonomy === "category")?.name ??
          emb["wp:term"]?.[0]?.[0]?.name ??
          null;
        const capa = emb["wp:featuredmedia"]?.[0]?.source_url ?? null;
        const autor = emb["author"]?.[0]?.name ?? null;
        return {
          wp_id: p.id,
          slug: String(p.slug),
          titulo: (p.title?.rendered ?? "").replace(/<[^>]+>/g, "").trim(),
          categoria,
          capa_url: capa,
          resumo: (p.excerpt?.rendered ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 400),
          conteudo_html: p.content?.rendered ?? "",
          autor,
          publicado: p.status === "publish",
          publicado_em: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
        };
      });

      // Conflita por slug (unique garantido na tabela) — evita depender do índice de wp_id.
      const { error } = await supabase.from("posts").upsert(rows, { onConflict: "slug" });
      if (error) return json(500, { ok: false, reason: error.message, importados });
      importados += rows.length;

      const totalPages = Number(r.headers.get("x-wp-totalpages") ?? "0");
      if (totalPages && page >= totalPages) break;
      if (posts.length < perPage) break;
      page++;
      if (page > 60) break; // trava de segurança
    }

    return json(200, { ok: true, importados });
  } catch (e) {
    return json(500, { ok: false, reason: (e as Error)?.message ?? "Erro inesperado." });
  }
});
