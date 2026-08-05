import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, FileText, Link2, Pencil, Plus, Star, Trash2 } from "lucide-react";

type Pagina = {
  id: string;
  slug: string;
  titulo: string;
  meta_description: string | null;
  ativa: boolean;
  no_menu: boolean;
  ordem_menu: number | null;
  home: boolean;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const AbaPaginasCMS = () => {
  const navigate = useNavigate();
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [metaDescription, setMetaDescription] = useState("");
  const [paraExcluir, setParaExcluir] = useState<Pagina | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await (supabase as any)
      .from("paginas")
      .select("id, slug, titulo, meta_description, ativa, no_menu, ordem_menu, home")
      .order("titulo", { ascending: true });
    if (error) toast.error(error.message);
    setPaginas((data as any) ?? []);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNova = () => {
    setTitulo("");
    setSlug("");
    setSlugManual(false);
    setMetaDescription("");
    setSheetAberto(true);
  };

  const onTituloChange = (v: string) => {
    setTitulo(v);
    if (!slugManual) setSlug(slugify(v));
  };

  const criar = async () => {
    if (!titulo.trim() || !slug.trim()) {
      toast.error("Preencha título e slug");
      return;
    }
    setSalvando(true);
    const { data, error } = await supabase
      .from("paginas")
      .insert({
        titulo: titulo.trim(),
        slug: slug.trim(),
        meta_description: metaDescription.trim() || null,
        conteudo_html: "",
        blocos: [] as any,
        ativa: false,
      })
      .select("id")
      .single();
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Página criada!");
    setSheetAberto(false);
    navigate(`/staff/paginas-cms/${data!.id}`);
  };

  const definirHome = async (p: Pagina) => {
    // Desmarca a home atual e marca esta (índice único garante só uma).
    await (supabase as any).from("paginas").update({ home: false }).eq("home", true);
    const { error } = await (supabase as any)
      .from("paginas")
      .update({ home: true })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`"${p.titulo}" agora é a página inicial (/)`);
    carregar();
  };

  const removerHome = async (p: Pagina) => {
    const { error } = await (supabase as any)
      .from("paginas")
      .update({ home: false })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Página inicial voltou para a home padrão");
    carregar();
  };

  const copiarLink = async (p: Pagina) => {
    const url = `${window.location.origin}/${p.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const excluir = async () => {
    if (!paraExcluir) return;
    const { error } = await supabase.from("paginas").delete().eq("id", paraExcluir.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Página excluída");
    setParaExcluir(null);
    carregar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Páginas do site
          </h2>
          <p className="text-sm text-muted-foreground">
            Páginas fixas (Sobre, Contato…) editáveis por blocos. Marque uma com a
            estrela para ser a <b>página inicial</b> (/); sem nenhuma marcada, vale a home padrão.
          </p>
        </div>
        <Button onClick={abrirNova} className="gap-1.5 bg-brand hover:bg-[#a30d25] text-white">
          <Plus className="h-4 w-4" /> Nova página
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>No menu</TableHead>
              <TableHead className="w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginas.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.titulo}</TableCell>
                <TableCell className="text-muted-foreground">/{p.slug}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {p.ativa ? (
                      <Badge className="bg-green-600 hover:bg-green-600 text-white">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Rascunho</Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={!p.ativa}
                      onClick={() => window.open(`/${p.slug}`, "_blank")}
                      title={p.ativa ? "Abrir página" : "Ative para abrir"}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => copiarLink(p)}
                      title="Copiar link público"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {p.home ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removerHome(p)}
                      className="gap-1 border-brand text-brand hover:text-brand"
                      title="Deixar de ser a página inicial"
                    >
                      <Star className="h-3.5 w-3.5 fill-current" /> Inicial
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!p.ativa}
                      onClick={() => definirHome(p)}
                      className="gap-1 text-muted-foreground"
                      title={p.ativa ? "Definir como página inicial (/)" : "Ative a página primeiro"}
                    >
                      <Star className="h-3.5 w-3.5" /> Definir
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.no_menu}
                      disabled={!p.ativa}
                      onCheckedChange={async (v) => {
                        const { error } = await supabase
                          .from("paginas")
                          .update({ no_menu: v })
                          .eq("id", p.id);
                        if (error) return toast.error(error.message);
                        setPaginas((prev) =>
                          prev.map((x) => (x.id === p.id ? { ...x, no_menu: v } : x)),
                        );
                      }}
                    />
                    {p.no_menu && (
                      <Input
                        type="number"
                        defaultValue={p.ordem_menu ?? 0}
                        onBlur={async (e) => {
                          const v = parseInt(e.target.value) || 0;
                          await supabase.from("paginas").update({ ordem_menu: v }).eq("id", p.id);
                        }}
                        className="h-7 w-16"
                        title="Ordem no menu"
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/staff/paginas-cms/${p.id}`)}
                      className="gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParaExcluir(p)}
                      className="gap-1 text-destructive hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!carregando && paginas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma página do site criada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nova página do site</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={titulo}
                onChange={(e) => onTituloChange(e.target.value)}
                placeholder="Ex: Sobre nós"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="sobre-nos"
              />
              <p className="text-xs text-muted-foreground">
                A página ficará em <code>/{slug || "seu-slug"}</code>.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Meta descrição (opcional)</Label>
              <Textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={3}
                placeholder="Descrição curta para SEO"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={criar}
              disabled={salvando}
              className="bg-brand hover:bg-[#a30d25] text-white"
            >
              {salvando ? "Criando..." : "Criar e editar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!paraExcluir} onOpenChange={(o) => !o && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página?</AlertDialogTitle>
            <AlertDialogDescription>
              A página "{paraExcluir?.titulo}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={excluir}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
