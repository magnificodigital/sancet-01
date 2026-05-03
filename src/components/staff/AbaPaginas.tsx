import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Copy, FileText, Pencil, Plus, Trash2 } from "lucide-react";

type LandingPage = {
  id: string;
  slug: string;
  titulo: string;
  meta_descricao: string | null;
  publicado: boolean;
  created_at: string;
  updated_at: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const AbaPaginas = () => {
  const navigate = useNavigate();
  const [paginas, setPaginas] = useState<LandingPage[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditadoManual, setSlugEditadoManual] = useState(false);
  const [metaDescricao, setMetaDescricao] = useState("");
  const [paraExcluir, setParaExcluir] = useState<LandingPage | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("landing_pages")
      .select("id, slug, titulo, meta_descricao, publicado, created_at, updated_at")
      .order("updated_at", { ascending: false });
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
    setSlugEditadoManual(false);
    setMetaDescricao("");
    setSheetAberto(true);
  };

  const onTituloChange = (v: string) => {
    setTitulo(v);
    if (!slugEditadoManual) setSlug(slugify(v));
  };

  const onSlugChange = (v: string) => {
    setSlugEditadoManual(true);
    setSlug(
      v
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-"),
    );
  };

  const criar = async () => {
    if (!titulo.trim() || !slug.trim()) {
      toast.error("Preencha título e slug");
      return;
    }
    setSalvando(true);
    const { data, error } = await supabase
      .from("landing_pages")
      .insert({
        titulo: titulo.trim(),
        slug: slug.trim(),
        meta_descricao: metaDescricao.trim() || null,
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
    navigate(`/staff/paginas/${data!.id}`);
  };

  const slugUnico = async (base: string): Promise<string> => {
    let candidato = base;
    let i = 2;
    // limita a 20 tentativas
    for (let tries = 0; tries < 20; tries++) {
      const { data } = await supabase
        .from("landing_pages")
        .select("id")
        .eq("slug", candidato)
        .maybeSingle();
      if (!data) return candidato;
      candidato = `${base}-${i}`;
      i++;
    }
    return `${base}-${Date.now().toString(36)}`;
  };

  const duplicar = async (p: LandingPage) => {
    const { data: full, error: e1 } = await supabase
      .from("landing_pages")
      .select("titulo, meta_descricao, blocos")
      .eq("id", p.id)
      .single();
    if (e1 || !full) {
      toast.error(e1?.message ?? "Erro ao duplicar");
      return;
    }
    const novoTitulo = `${full.titulo} (cópia)`;
    const baseSlug = slugify(novoTitulo);
    const novoSlug = await slugUnico(baseSlug);
    const { data: nova, error: e2 } = await supabase
      .from("landing_pages")
      .insert({
        titulo: novoTitulo,
        slug: novoSlug,
        meta_descricao: full.meta_descricao,
        blocos: full.blocos,
        publicado: false,
      })
      .select("id")
      .single();
    if (e2 || !nova) {
      toast.error(e2?.message ?? "Erro ao duplicar");
      return;
    }
    toast.success("Página duplicada!");
    navigate(`/staff/paginas/${nova.id}`);
  };

  const copiarLink = async (p: LandingPage) => {
    const url = `${window.location.origin}/p/${p.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const excluir = async () => {
    if (!paraExcluir) return;
    const { error } = await supabase
      .from("landing_pages")
      .delete()
      .eq("id", paraExcluir.id);
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
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" /> Páginas
        </h2>
        <Button
          onClick={abrirNova}
          className="gap-1.5 bg-[#C8102E] hover:bg-[#a30d25] text-white"
        >
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
              <TableHead>Criada em</TableHead>
              <TableHead className="w-48">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginas.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.titulo}</TableCell>
                <TableCell className="text-muted-foreground">/{p.slug}</TableCell>
                <TableCell>
                  {p.publicado ? (
                    <Badge className="bg-green-600 hover:bg-green-600 text-white">
                      Publicado
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Rascunho</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/staff/paginas/${p.id}`)}
                      className="gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicar(p)}
                      className="gap-1"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParaExcluir(p)}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!carregando && paginas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma página criada ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetAberto} onOpenChange={setSheetAberto}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nova página</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={titulo}
                onChange={(e) => onTituloChange(e.target.value)}
                placeholder="Ex: Check-up de inverno"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                placeholder="check-up-inverno"
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífen.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Meta descrição (opcional)</Label>
              <Textarea
                value={metaDescricao}
                onChange={(e) => setMetaDescricao(e.target.value)}
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
              className="bg-[#C8102E] hover:bg-[#a30d25] text-white"
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
              Esta ação não pode ser desfeita. A página "{paraExcluir?.titulo}" será removida permanentemente.
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
