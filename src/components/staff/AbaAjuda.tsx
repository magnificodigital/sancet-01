import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
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
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  Pencil,
  Plug,
  Plus,
  QrCode,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  Rocket,
  Trash2,
  UserCog,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

type Tutorial = {
  id: string;
  slug: string;
  titulo: string;
  categoria: string | null;
  ordem: number;
  resumo: string | null;
  conteudo_html: string;
  publicado: boolean;
};

const SEM_CATEGORIA = "Outros";

const CATEGORIAS_SUGERIDAS = [
  "Primeiros passos",
  "Visão Geral",
  "Pedidos & CRM",
  "Check-in",
  "Pacientes",
  "Catálogo",
  "Unidades",
  "Convênios",
  "Site & páginas",
  "Configurações",
  "Integrações",
  "Equipe",
  "Segurança & LGPD",
];

// Ícone por categoria — espelha os ícones do menu lateral para leitura rápida.
const ICONE_CATEGORIA: Record<string, LucideIcon> = {
  "Primeiros passos": Rocket,
  "Visão Geral": LayoutDashboard,
  "Pedidos & CRM": ClipboardList,
  "Check-in": QrCode,
  Pacientes: Users,
  Catálogo: FlaskConical,
  Unidades: Building2,
  Convênios: Shield,
  "Site & páginas": FileText,
  Configurações: Settings2,
  Integrações: Plug,
  Equipe: UserCog,
  "Segurança & LGPD": ShieldAlert,
};
const iconeDe = (cat: string): LucideIcon => ICONE_CATEGORIA[cat] ?? BookOpen;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const SELECT_COLS =
  "id, slug, titulo, categoria, ordem, resumo, conteudo_html, publicado";

type Props = { isAdmin: boolean };

export const AbaAjuda = ({ isAdmin }: Props) => {
  const [tutoriais, setTutoriais] = useState<Tutorial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [lendo, setLendo] = useState<Tutorial | null>(null);
  const [editando, setEditando] = useState<Tutorial | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Tutorial | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await (supabase as any)
      .from("tutoriais")
      .select(SELECT_COLS)
      .order("ordem", { ascending: true })
      .order("categoria", { ascending: true })
      .order("titulo", { ascending: true });
    if (error) toast.error(error.message);
    setTutoriais((data as Tutorial[]) ?? []);
    setCarregando(false);
  };
  useEffect(() => {
    carregar();
  }, []);

  // Deep-link: /staff?aba=ajuda&artigo=slug abre o tutorial direto (para o "?" contextual).
  useEffect(() => {
    const alvo = searchParams.get("artigo");
    if (alvo && tutoriais.length) {
      const t = tutoriais.find((x) => x.slug === alvo);
      if (t) setLendo(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutoriais]);

  // Staff vê só publicados; admin vê tudo.
  const visiveis = useMemo(
    () => (isAdmin ? tutoriais : tutoriais.filter((t) => t.publicado)),
    [tutoriais, isAdmin],
  );

  // Categorias na ordem de aparição (já vem por "ordem"), com seus tutoriais.
  const categorias = useMemo(() => {
    const mapa = new Map<string, Tutorial[]>();
    for (const t of visiveis) {
      const cat = t.categoria?.trim() || SEM_CATEGORIA;
      if (!mapa.has(cat)) mapa.set(cat, []);
      mapa.get(cat)!.push(t);
    }
    return Array.from(mapa.entries()).map(([nome, itens]) => ({ nome, itens }));
  }, [visiveis]);

  const resultadosBusca = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return null;
    return visiveis.filter((t) =>
      [t.titulo, t.resumo ?? "", t.categoria ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [visiveis, busca]);

  const novo = (categoria = "") =>
    setEditando({
      id: "",
      slug: "",
      titulo: "",
      categoria,
      ordem: 0,
      resumo: "",
      conteudo_html: "",
      publicado: true,
    });

  const salvar = async () => {
    if (!editando) return;
    if (!editando.titulo.trim()) return toast.error("Título obrigatório.");
    const slug = editando.slug.trim()
      ? slugify(editando.slug)
      : slugify(editando.titulo);
    setSalvando(true);
    const payload = {
      slug,
      titulo: editando.titulo.trim(),
      categoria: editando.categoria?.trim() || null,
      ordem: Number(editando.ordem) || 0,
      resumo: editando.resumo?.trim() || null,
      conteudo_html: editando.conteudo_html ?? "",
      publicado: editando.publicado,
      atualizado_em: new Date().toISOString(),
    };
    const { error } = editando.id
      ? await (supabase as any)
          .from("tutoriais")
          .update(payload)
          .eq("id", editando.id)
      : await (supabase as any).from("tutoriais").insert(payload);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Tutorial salvo.");
    setEditando(null);
    carregar();
  };

  const excluir = async () => {
    if (!paraExcluir) return;
    const { error } = await (supabase as any)
      .from("tutoriais")
      .delete()
      .eq("id", paraExcluir.id);
    if (error) return toast.error(error.message);
    toast.success("Tutorial excluído.");
    if (lendo?.id === paraExcluir.id) fecharLeitura();
    setParaExcluir(null);
    carregar();
  };

  const abrirLeitura = (t: Tutorial) => {
    setLendo(t);
    const p = new URLSearchParams(searchParams);
    p.set("artigo", t.slug);
    setSearchParams(p, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const fecharLeitura = () => {
    setLendo(null);
    const p = new URLSearchParams(searchParams);
    p.delete("artigo");
    setSearchParams(p, { replace: true });
  };

  // ---- Inserção de imagem/vídeo no conteúdo do editor ----
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [enviandoImg, setEnviandoImg] = useState(false);

  // Insere o trecho no ponto do cursor (ou no fim) e reposiciona o cursor.
  const inserirConteudo = (trecho: string) => {
    setEditando((prev) => {
      if (!prev) return prev;
      const ta = contentRef.current;
      const atual = prev.conteudo_html ?? "";
      if (!ta) return { ...prev, conteudo_html: atual + trecho };
      const start = ta.selectionStart ?? atual.length;
      const end = ta.selectionEnd ?? atual.length;
      const novo = atual.slice(0, start) + trecho + atual.slice(end);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + trecho.length;
        ta.setSelectionRange(pos, pos);
      });
      return { ...prev, conteudo_html: novo };
    });
  };

  const onUploadImagem = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoImg(true);
    try {
      const path = `tutoriais/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("imagens-exames")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage
        .from("imagens-exames")
        .getPublicUrl(path);
      inserirConteudo(`\n<img src="${data.publicUrl}" alt="">\n`);
      toast.success("Imagem inserida no conteúdo.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar imagem.");
    } finally {
      setEnviandoImg(false);
      e.target.value = "";
    }
  };

  const urlParaEmbed = (url: string): string | null => {
    const yt = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
    );
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const lo = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
    if (lo) return `https://www.loom.com/embed/${lo[1]}`;
    return null;
  };

  const inserirVideo = () => {
    const url = window.prompt("Cole o link do vídeo (YouTube ou Loom):");
    if (!url) return;
    const embed = urlParaEmbed(url.trim());
    if (!embed) {
      toast.error("Link não reconhecido. Use um link do YouTube ou do Loom.");
      return;
    }
    inserirConteudo(
      `\n<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:1.5rem 0"><iframe src="${embed}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe></div>\n`,
    );
    toast.success("Vídeo inserido no conteúdo.");
  };

  // ---------- LEITURA DO ARTIGO (página inteira, estilo documentação) ----------
  if (lendo) {
    const Icon = iconeDe(lendo.categoria?.trim() || SEM_CATEGORIA);
    return (
      <>
        <div className="mx-auto max-w-3xl">
          <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
            <button
              onClick={fecharLeitura}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Central de Ajuda
            </button>
            {lendo.categoria && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground/70">{lendo.categoria}</span>
              </>
            )}
          </nav>

          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            {isAdmin && !lendo.publicado && (
              <Badge variant="outline" className="text-[10px]">
                Rascunho
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold leading-tight text-foreground">
            {lendo.titulo}
          </h1>
          {lendo.resumo && (
            <p className="mt-2 text-lg text-muted-foreground">{lendo.resumo}</p>
          )}

          <div
            className="prose prose-slate mt-8 max-w-none prose-headings:font-semibold prose-headings:text-secondary prose-h2:mt-10 prose-h2:mb-3 prose-h2:text-xl prose-h3:text-lg prose-p:my-4 prose-p:leading-relaxed prose-a:font-medium prose-a:text-brand prose-strong:text-foreground prose-ol:my-4 prose-ul:my-4 prose-li:my-1.5 prose-li:marker:text-brand prose-img:my-6 prose-img:w-full prose-img:rounded-xl prose-img:border prose-img:shadow-sm prose-blockquote:rounded-r-lg prose-blockquote:border-l-brand prose-blockquote:bg-brand/5 prose-blockquote:py-0.5 prose-blockquote:not-italic prose-blockquote:text-foreground/80"
            dangerouslySetInnerHTML={{ __html: lendo.conteudo_html }}
          />

          {isAdmin && (
            <div className="mt-10 flex items-center gap-2 border-t pt-5">
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => setEditando(lendo)}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                variant="ghost"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setParaExcluir(lendo)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </div>
          )}
        </div>

        {renderEditor()}
        {renderExcluir()}
      </>
    );
  }

  // ---------- HOME (banner de busca + diretório) ----------
  return (
    <div className="space-y-6">
      {/* Banner com busca */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-hover px-6 py-11 text-center shadow-sm">
        {isAdmin && (
          <Button
            onClick={() => novo()}
            size="sm"
            className="absolute right-4 top-4 gap-1.5 border border-white/30 bg-white/15 text-white hover:bg-white/25"
          >
            <Plus className="h-4 w-4" /> Novo tutorial
          </Button>
        )}
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          <LifeBuoy className="h-3.5 w-3.5" /> Central de Ajuda
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
          Como podemos ajudar?
        </h2>
        <p className="mt-1.5 text-sm text-white/85">
          Guias de uso da plataforma para a equipe da Sancet.
        </p>
        <div className="relative mx-auto mt-6 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por um tutorial..."
            className="h-12 rounded-xl border-0 bg-white pl-12 text-base text-foreground shadow-lg focus-visible:ring-2 focus-visible:ring-white/60"
          />
        </div>
      </div>

      {carregando ? (
        <div className="flex min-h-[24vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : resultadosBusca ? (
        /* ---- Resultados de busca ---- */
        <div className="mx-auto max-w-3xl space-y-3">
          <p className="text-sm text-muted-foreground">
            {resultadosBusca.length}{" "}
            {resultadosBusca.length === 1 ? "resultado" : "resultados"} para “
            {busca}”
          </p>
          {resultadosBusca.length === 0 ? (
            <div className="rounded-xl border bg-white py-14 text-center text-muted-foreground">
              Nenhum tutorial encontrado. Tente outras palavras.
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-white">
              {resultadosBusca.map((t) => (
                <button
                  key={t.id}
                  onClick={() => abrirLeitura(t)}
                  className="group flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.categoria ?? SEM_CATEGORIA}
                    </span>
                    <div className="font-medium text-foreground">
                      {t.titulo}
                    </div>
                    {t.resumo && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                        {t.resumo}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-brand" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : categorias.length === 0 ? (
        <div className="rounded-xl border bg-white py-14 text-center text-muted-foreground">
          Nenhum tutorial ainda.
        </div>
      ) : (
        /* ---- Diretório: categorias com seus artigos ---- */
        <div className="grid items-start gap-4 md:grid-cols-2">
          {categorias.map(({ nome, itens }) => {
            const Icon = iconeDe(nome);
            return (
              <section
                key={nome}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="mb-1 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{nome}</h3>
                    <p className="text-xs text-muted-foreground">
                      {itens.length}{" "}
                      {itens.length === 1 ? "tutorial" : "tutoriais"}
                    </p>
                  </div>
                </div>
                <ul className="mt-2 divide-y">
                  {itens.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => abrirLeitura(t)}
                        className="group flex w-full items-center justify-between gap-2 py-2.5 text-left"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm text-foreground/90 group-hover:text-brand">
                          <span className="truncate">{t.titulo}</span>
                          {isAdmin && !t.publicado && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-[10px]"
                            >
                              Rascunho
                            </Badge>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-brand" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {renderEditor()}
      {renderExcluir()}
    </div>
  );

  // ---------- Sheets compartilhados (editor + exclusão) ----------
  function renderEditor() {
    return (
      <Sheet open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {editando?.id ? "Editar tutorial" : "Novo tutorial"}
            </SheetTitle>
          </SheetHeader>
          {editando && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editando.titulo}
                  onChange={(e) =>
                    setEditando({ ...editando, titulo: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Categoria</Label>
                  <Input
                    list="cats-ajuda"
                    value={editando.categoria ?? ""}
                    onChange={(e) =>
                      setEditando({ ...editando, categoria: e.target.value })
                    }
                    placeholder="Ex.: Pedidos & CRM"
                  />
                  <datalist id="cats-ajuda">
                    {CATEGORIAS_SUGERIDAS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editando.ordem}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        ordem: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input
                  value={editando.slug}
                  onChange={(e) =>
                    setEditando({ ...editando, slug: e.target.value })
                  }
                  placeholder="gerado do título"
                />
              </div>
              <div className="space-y-2">
                <Label>Resumo</Label>
                <Textarea
                  rows={2}
                  value={editando.resumo ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, resumo: e.target.value })
                  }
                  placeholder="Uma frase sobre o que este tutorial ensina."
                />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onUploadImagem}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={enviandoImg}
                    onClick={() => imgInputRef.current?.click()}
                  >
                    {enviandoImg ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                    Inserir imagem
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={inserirVideo}
                  >
                    <Video className="h-3.5 w-3.5" /> Inserir vídeo
                  </Button>
                </div>
                <Textarea
                  ref={contentRef}
                  rows={14}
                  value={editando.conteudo_html}
                  onChange={(e) =>
                    setEditando({ ...editando, conteudo_html: e.target.value })
                  }
                  className="font-mono text-xs"
                  placeholder="Escreva o passo a passo. Use os botões acima para inserir prints e vídeos — o conteúdo entra no ponto do cursor."
                />
                <p className="text-xs text-muted-foreground">
                  Escreva em HTML simples (&lt;p&gt;, &lt;ol&gt;&lt;li&gt;,
                  &lt;strong&gt;) ou use os botões para inserir imagem/vídeo.
                  Para uma dica em destaque, use &lt;blockquote&gt;.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editando.publicado}
                  onCheckedChange={(v) =>
                    setEditando({ ...editando, publicado: v })
                  }
                />
                Publicado (visível para a equipe)
              </label>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={salvando}
              className="bg-brand hover:bg-brand-hover text-white"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  function renderExcluir() {
    return (
      <Sheet
        open={!!paraExcluir}
        onOpenChange={(o) => !o && setParaExcluir(null)}
      >
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Excluir tutorial?</SheetTitle>
          </SheetHeader>
          <p className="py-4 text-sm text-muted-foreground">
            "{paraExcluir?.titulo}" será removido permanentemente.
          </p>
          <SheetFooter>
            <Button variant="outline" onClick={() => setParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={excluir}
            >
              Excluir
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }
};
