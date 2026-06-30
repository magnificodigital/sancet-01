import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Eye, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

type Pagina = {
  id: string;
  slug: string;
  titulo: string;
  conteudo_html: string;
  meta_title: string | null;
  meta_description: string | null;
  no_menu: boolean;
  ordem_menu: number | null;
  ativa: boolean;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const vazia: Pagina = {
  id: "",
  slug: "",
  titulo: "",
  conteudo_html: "",
  meta_title: null,
  meta_description: null,
  no_menu: false,
  ordem_menu: 0,
  ativa: true,
};

type Filtro = "todas" | "menu" | "fora";

export const AbaPaginasCMS = () => {
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [editando, setEditando] = useState<Pagina | null>(null);
  const [excluindo, setExcluindo] = useState<Pagina | null>(null);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("paginas")
      .select("*")
      .order("ordem_menu", { ascending: true })
      .order("titulo", { ascending: true });
    setCarregando(false);
    if (error) {
      toast.error("Erro ao carregar páginas");
      return;
    }
    setPaginas((data as Pagina[]) ?? []);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = useMemo(() => {
    if (filtro === "menu") return paginas.filter((p) => p.no_menu);
    if (filtro === "fora") return paginas.filter((p) => !p.no_menu);
    return paginas;
  }, [paginas, filtro]);

  const toggleAtiva = async (p: Pagina) => {
    const { error } = await supabase
      .from("paginas")
      .update({ ativa: !p.ativa })
      .eq("id", p.id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    setPaginas((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, ativa: !p.ativa } : x)),
    );
  };

  const excluir = async () => {
    if (!excluindo) return;
    const { error } = await supabase.from("paginas").delete().eq("id", excluindo.id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Página excluída");
    setExcluindo(null);
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Páginas do site</h2>
          <p className="text-sm text-muted-foreground">
            Crie páginas estáticas e escolha quais aparecem no menu público.
          </p>
        </div>
        <Button onClick={() => setEditando({ ...vazia })} className="gap-2">
          <Plus className="h-4 w-4" /> Nova página
        </Button>
      </div>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList>
          <TabsTrigger value="todas">Todas ({paginas.length})</TabsTrigger>
          <TabsTrigger value="menu">
            No menu ({paginas.filter((p) => p.no_menu).length})
          </TabsTrigger>
          <TabsTrigger value="fora">
            Fora do menu ({paginas.filter((p) => !p.no_menu).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>No menu</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {!carregando && filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma página
                </TableCell>
              </TableRow>
            )}
            {filtradas.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.titulo}</TableCell>
                <TableCell>
                  <a
                    href={`/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                  >
                    /{p.slug}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
                <TableCell>
                  {p.no_menu ? (
                    <Badge>Sim</Badge>
                  ) : (
                    <Badge variant="secondary">Não</Badge>
                  )}
                </TableCell>
                <TableCell>{p.no_menu ? p.ordem_menu ?? 0 : "—"}</TableCell>
                <TableCell>
                  <Switch checked={p.ativa} onCheckedChange={() => toggleAtiva(p)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditando(p)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setExcluindo(p)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editando && (
        <EditorPagina
          inicial={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir a página <strong>"{excluindo?.titulo}"</strong>? Esta ação é
              irreversível.
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

type EditorProps = {
  inicial: Pagina;
  onClose: () => void;
  onSaved: () => void;
};

const EditorPagina = ({ inicial, onClose, onSaved }: EditorProps) => {
  const [pagina, setPagina] = useState<Pagina>(inicial);
  const [slugManual, setSlugManual] = useState(!!inicial.id);
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setCampo = <K extends keyof Pagina>(k: K, v: Pagina[K]) =>
    setPagina((p) => ({ ...p, [k]: v }));

  const onTitulo = (v: string) => {
    setCampo("titulo", v);
    if (!slugManual) setCampo("slug", slugify(v));
  };

  const inserir = (antes: string, depois = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = pagina.conteudo_html.slice(start, end);
    const novo =
      pagina.conteudo_html.slice(0, start) +
      antes +
      sel +
      depois +
      pagina.conteudo_html.slice(end);
    setCampo("conteudo_html", novo);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + antes.length;
      ta.selectionEnd = end + antes.length;
    }, 0);
  };

  const inserirLink = () => {
    const url = prompt("URL do link:");
    if (!url) return;
    inserir(`<a href="${url}" target="_blank" rel="noopener">`, "</a>");
  };

  const uploadImagem = async (file: File) => {
    setUploadando(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `paginas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("imagens-publicas")
      .upload(path, file, { contentType: file.type });
    setUploadando(false);
    if (error) {
      toast.error("Erro no upload: " + error.message);
      return;
    }
    const { data } = supabase.storage.from("imagens-publicas").getPublicUrl(path);
    inserir(`<img src="${data.publicUrl}" alt="" />`);
    toast.success("Imagem inserida");
  };

  const salvar = async () => {
    if (!pagina.titulo.trim() || !pagina.slug.trim()) {
      toast.error("Título e slug são obrigatórios");
      return;
    }
    setSalvando(true);
    const payload = {
      slug: pagina.slug,
      titulo: pagina.titulo,
      conteudo_html: pagina.conteudo_html,
      meta_title: pagina.meta_title || null,
      meta_description: pagina.meta_description || null,
      no_menu: pagina.no_menu,
      ordem_menu: pagina.ordem_menu ?? 0,
      ativa: pagina.ativa,
    };
    const { error } = pagina.id
      ? await supabase.from("paginas").update(payload).eq("id", pagina.id)
      : await supabase.from("paginas").insert(payload);
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Página salva");
    onSaved();
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{pagina.id ? "Editar página" : "Nova página"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={pagina.titulo} onChange={(e) => onTitulo(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Slug *</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/</span>
              <Input
                value={pagina.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setCampo("slug", slugify(e.target.value));
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minúsculas, hífens e sem acentos. Slugs reservados (exames, staff, etc.)
              são bloqueados.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>No menu principal</Label>
              <p className="text-xs text-muted-foreground">
                Aparece na navegação do site.
              </p>
            </div>
            <Switch
              checked={pagina.no_menu}
              onCheckedChange={(v) => setCampo("no_menu", v)}
            />
          </div>

          {pagina.no_menu && (
            <div className="space-y-2">
              <Label>Ordem no menu</Label>
              <Input
                type="number"
                value={pagina.ordem_menu ?? 0}
                onChange={(e) => setCampo("ordem_menu", parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 bg-muted/50 p-1">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => inserir("<strong>", "</strong>")}
              >
                <b>B</b>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => inserir("<em>", "</em>")}
              >
                <i>I</i>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => inserir("<h2>", "</h2>")}
              >
                H2
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => inserir("<h3>", "</h3>")}
              >
                H3
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => inserir("<ul>\n  <li>", "</li>\n</ul>")}
              >
                • Lista
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={inserirLink}>
                Link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadando}
              >
                <ImagePlus className="h-4 w-4 mr-1" />
                {uploadando ? "Enviando…" : "Imagem"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImagem(f);
                  e.target.value = "";
                }}
              />
            </div>
            <Tabs defaultValue="edit">
              <TabsList className="rounded-none border-x">
                <TabsTrigger value="edit">Editar (HTML)</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-3 w-3 mr-1" /> Pré-visualizar
                </TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-0">
                <Textarea
                  ref={textareaRef}
                  value={pagina.conteudo_html}
                  onChange={(e) => setCampo("conteudo_html", e.target.value)}
                  className="rounded-t-none min-h-[280px] font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-0">
                <div
                  className="prose prose-sm max-w-none min-h-[280px] rounded-b-md border border-t-0 p-4"
                  dangerouslySetInnerHTML={{ __html: pagina.conteudo_html }}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Ativa (visível ao público)</Label>
            <Switch
              checked={pagina.ativa}
              onCheckedChange={(v) => setCampo("ativa", v)}
            />
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="seo">
              <AccordionTrigger>SEO</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Meta title</Label>
                  <Input
                    value={pagina.meta_title ?? ""}
                    placeholder={pagina.titulo}
                    onChange={(e) => setCampo("meta_title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta description (até 160)</Label>
                  <Textarea
                    maxLength={160}
                    value={pagina.meta_description ?? ""}
                    onChange={(e) => setCampo("meta_description", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(pagina.meta_description ?? "").length}/160
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {pagina.id && (
            <Button
              variant="outline"
              onClick={() => window.open(`/${pagina.slug}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-1" /> Abrir
            </Button>
          )}
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
