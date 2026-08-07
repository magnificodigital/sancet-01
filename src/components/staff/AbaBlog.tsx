import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { DownloadCloud, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Post = {
  id: string;
  slug: string;
  titulo: string;
  categoria: string | null;
  capa_url: string | null;
  resumo: string | null;
  conteudo_html: string;
  publicado: boolean;
  publicado_em: string;
};

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

export const AbaBlog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);
  const [editando, setEditando] = useState<Post | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Post | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await (supabase as any)
      .from("posts")
      .select("id, slug, titulo, categoria, capa_url, resumo, conteudo_html, publicado, publicado_em")
      .order("publicado_em", { ascending: false });
    if (error) toast.error(error.message);
    setPosts((data as Post[]) ?? []);
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const importar = async () => {
    setImportando(true);
    try {
      const { data, error } = await supabase.functions.invoke("sancet-importar-blog", { body: {} });
      if (error || (data as any)?.ok === false) {
        let msg = (data as any)?.reason as string | undefined;
        if (!msg && error) {
          try { msg = (await (error as any).context?.json?.())?.reason; } catch { /* */ }
        }
        throw new Error(msg || "Falha na importação.");
      }
      toast.success(`Importados ${(data as any)?.importados ?? 0} posts.`);
      carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na importação.");
    } finally {
      setImportando(false);
    }
  };

  const novo = () =>
    setEditando({
      id: "", slug: "", titulo: "", categoria: "", capa_url: "", resumo: "",
      conteudo_html: "", publicado: false, publicado_em: new Date().toISOString(),
    });

  const salvar = async () => {
    if (!editando) return;
    if (!editando.titulo.trim()) return toast.error("Título obrigatório.");
    const slug = editando.slug.trim() ? slugify(editando.slug) : slugify(editando.titulo);
    setSalvando(true);
    const payload = {
      slug,
      titulo: editando.titulo.trim(),
      categoria: editando.categoria?.trim() || null,
      capa_url: editando.capa_url?.trim() || null,
      resumo: editando.resumo?.trim() || null,
      conteudo_html: editando.conteudo_html ?? "",
      publicado: editando.publicado,
    };
    const { error } = editando.id
      ? await (supabase as any).from("posts").update(payload).eq("id", editando.id)
      : await (supabase as any).from("posts").insert(payload);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Post salvo.");
    setEditando(null);
    carregar();
  };

  const togglePublicado = async (p: Post) => {
    const { error } = await (supabase as any).from("posts").update({ publicado: !p.publicado }).eq("id", p.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, publicado: !x.publicado } : x)));
  };

  const excluir = async () => {
    if (!paraExcluir) return;
    const { error } = await (supabase as any).from("posts").delete().eq("id", paraExcluir.id);
    if (error) return toast.error(error.message);
    toast.success("Post excluído.");
    setParaExcluir(null);
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Blog</h2>
          <p className="text-sm text-muted-foreground">
            Posts do blog. Importe do site atual (WordPress) ou crie/edite aqui.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importar} disabled={importando} className="gap-1.5">
            {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
            {importando ? "Importando..." : "Importar do site atual"}
          </Button>
          <Button onClick={novo} className="gap-1.5 bg-brand hover:bg-brand-hover text-white">
            <Plus className="h-4 w-4" /> Novo post
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium max-w-[320px] truncate">{p.titulo}</TableCell>
                <TableCell className="text-muted-foreground">{p.categoria ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {new Date(p.publicado_em).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.publicado} onCheckedChange={() => togglePublicado(p)} />
                    {p.publicado && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(`/blog/${p.slug}`, "_blank")}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditando(p)} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => setParaExcluir(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!carregando && posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum post ainda. Clique em "Importar do site atual" para trazer os posts do WordPress.
                </TableCell>
              </TableRow>
            )}
            {carregando && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editando?.id ? "Editar post" : "Novo post"}</SheetTitle>
          </SheetHeader>
          {editando && (
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Título</Label><Input value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Categoria</Label><Input value={editando.categoria ?? ""} onChange={(e) => setEditando({ ...editando, categoria: e.target.value })} /></div>
                <div className="space-y-2"><Label>Slug (URL)</Label><Input value={editando.slug} onChange={(e) => setEditando({ ...editando, slug: e.target.value })} placeholder="gerado do título" /></div>
              </div>
              <div className="space-y-2"><Label>Imagem de capa (URL)</Label><Input value={editando.capa_url ?? ""} onChange={(e) => setEditando({ ...editando, capa_url: e.target.value })} placeholder="https://..." /></div>
              <div className="space-y-2"><Label>Resumo</Label><Textarea rows={2} value={editando.resumo ?? ""} onChange={(e) => setEditando({ ...editando, resumo: e.target.value })} /></div>
              <div className="space-y-2"><Label>Conteúdo (HTML)</Label><Textarea rows={12} value={editando.conteudo_html} onChange={(e) => setEditando({ ...editando, conteudo_html: e.target.value })} className="font-mono text-xs" /></div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={editando.publicado} onCheckedChange={(v) => setEditando({ ...editando, publicado: v })} /> Publicado
              </label>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando} className="bg-brand hover:bg-brand-hover text-white">
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!paraExcluir} onOpenChange={(o) => !o && setParaExcluir(null)}>
        <SheetContent side="bottom" className="max-w-md mx-auto rounded-t-xl">
          <SheetHeader><SheetTitle>Excluir post?</SheetTitle></SheetHeader>
          <p className="py-4 text-sm text-muted-foreground">"{paraExcluir?.titulo}" será removido permanentemente.</p>
          <SheetFooter>
            <Button variant="outline" onClick={() => setParaExcluir(null)}>Cancelar</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={excluir}>Excluir</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
