import { useEffect, useMemo, useState } from "react";
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
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);
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

  // Categorias na ordem de aparição (que já vem por "ordem"), com contagem.
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

  const itensCategoriaAberta = useMemo(
    () => categorias.find((c) => c.nome === categoriaAberta)?.itens ?? [],
    [categorias, categoriaAberta],
  );

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
    setParaExcluir(null);
    carregar();
  };

  const abrirLeitura = (t: Tutorial) => {
    setLendo(t);
    const p = new URLSearchParams(searchParams);
    p.set("artigo", t.slug);
    setSearchParams(p, { replace: true });
  };

  const fecharLeitura = () => {
    setLendo(null);
    const p = new URLSearchParams(searchParams);
    p.delete("artigo");
    setSearchParams(p, { replace: true });
  };

  // ---- Cartão de tutorial (reutilizado na busca e dentro da categoria) ----
  const CardTutorial = ({
    t,
    mostrarCategoria = false,
  }: {
    t: Tutorial;
    mostrarCategoria?: boolean;
  }) => (
    <div className="group relative flex items-start gap-3 rounded-lg border bg-white p-4 transition hover:border-brand/40 hover:shadow-sm">
      <button
        onClick={() => abrirLeitura(t)}
        className="min-w-0 flex-1 text-left"
      >
        {mostrarCategoria && t.categoria && (
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.categoria}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{t.titulo}</span>
          {isAdmin && !t.publicado && (
            <Badge variant="outline" className="text-[10px]">
              Rascunho
            </Badge>
          )}
        </div>
        {t.resumo && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {t.resumo}
          </p>
        )}
      </button>
      {isAdmin ? (
        <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setEditando(t)}
            aria-label="Editar tutorial"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            onClick={() => setParaExcluir(t)}
            aria-label="Excluir tutorial"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-brand" />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <LifeBuoy className="h-5 w-5 text-brand" /> Central de Ajuda
          </h2>
          <p className="text-sm text-muted-foreground">
            Tutoriais de uso da plataforma para a equipe.
            {isAdmin && " Você pode criar e editar (somente administradores)."}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => novo(categoriaAberta ?? "")}
            className="gap-1.5 bg-brand hover:bg-brand-hover text-white"
          >
            <Plus className="h-4 w-4" /> Novo tutorial
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar tutorial..."
          className="pl-9"
        />
      </div>

      {carregando ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : resultadosBusca ? (
        /* ---- Resultados de busca (achatado) ---- */
        resultadosBusca.length === 0 ? (
          <div className="rounded-md border bg-white py-14 text-center text-muted-foreground">
            Nenhum tutorial encontrado para “{busca}”.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {resultadosBusca.length}{" "}
              {resultadosBusca.length === 1
                ? "resultado"
                : "resultados"}{" "}
              para “{busca}”
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {resultadosBusca.map((t) => (
                <CardTutorial key={t.id} t={t} mostrarCategoria />
              ))}
            </div>
          </div>
        )
      ) : categoriaAberta ? (
        /* ---- Dentro de uma categoria ---- */
        <div className="space-y-4">
          <button
            onClick={() => setCategoriaAberta(null)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Todas as categorias
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              {(() => {
                const Icon = iconeDe(categoriaAberta);
                return <Icon className="h-5 w-5" />;
              })()}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {categoriaAberta}
              </h3>
              <p className="text-sm text-muted-foreground">
                {itensCategoriaAberta.length}{" "}
                {itensCategoriaAberta.length === 1 ? "tutorial" : "tutoriais"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {itensCategoriaAberta.map((t) => (
              <CardTutorial key={t.id} t={t} />
            ))}
          </div>
        </div>
      ) : categorias.length === 0 ? (
        <div className="rounded-md border bg-white py-14 text-center text-muted-foreground">
          Nenhum tutorial ainda.
        </div>
      ) : (
        /* ---- Índice de categorias ---- */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map(({ nome, itens }) => {
            const Icon = iconeDe(nome);
            return (
              <button
                key={nome}
                onClick={() => setCategoriaAberta(nome)}
                className="group flex items-center gap-4 rounded-xl border bg-white p-5 text-left transition hover:border-brand/40 hover:shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    {nome}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {itens.length}{" "}
                    {itens.length === 1 ? "tutorial" : "tutoriais"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-brand" />
              </button>
            );
          })}
        </div>
      )}

      {/* Leitura do tutorial */}
      <Sheet open={!!lendo} onOpenChange={(o) => !o && fecharLeitura()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {lendo && (
            <>
              <SheetHeader>
                <button
                  onClick={fecharLeitura}
                  className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                {lendo.categoria && (
                  <span className="inline-block w-fit rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                    {lendo.categoria}
                  </span>
                )}
                <SheetTitle className="text-2xl leading-tight">
                  {lendo.titulo}
                </SheetTitle>
              </SheetHeader>
              <div
                className="prose prose-sm mt-5 max-w-none prose-headings:text-secondary prose-a:text-brand prose-img:rounded-lg"
                dangerouslySetInnerHTML={{ __html: lendo.conteudo_html }}
              />
              {isAdmin && (
                <div className="mt-6 border-t pt-4">
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      const t = lendo;
                      setLendo(null);
                      setEditando(t);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar este tutorial
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor (admin) */}
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
                <Label>Conteúdo (HTML)</Label>
                <Textarea
                  rows={14}
                  value={editando.conteudo_html}
                  onChange={(e) =>
                    setEditando({ ...editando, conteudo_html: e.target.value })
                  }
                  className="font-mono text-xs"
                  placeholder="<p>Passo a passo...</p> — aceita listas <ol>, imagens <img> e vídeos (embed do YouTube/Loom)."
                />
                <p className="text-xs text-muted-foreground">
                  Dica: use <code>&lt;ol&gt;&lt;li&gt;</code> para o passo a
                  passo e cole o embed do YouTube/Loom para vídeos de tela.
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

      {/* Confirmar exclusão */}
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
    </div>
  );
};
