import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  GripVertical,
  Loader2,
  Save,
  X,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import {
  BIBLIOTECA,
  Bloco,
  criarBloco,
  TipoBloco,
} from "@/components/landing/tipos";
import { RenderBloco } from "@/components/landing/RenderBloco";
import { FormBloco } from "@/components/landing/FormBloco";
import { cn } from "@/lib/utils";

type EstadoSalvar = "ocioso" | "salvando" | "salvo";

const BlocoSortavel = ({
  bloco,
  selecionado,
  onSelecionar,
  onRemover,
}: {
  bloco: Bloco;
  selecionado: boolean;
  onSelecionar: () => void;
  onRemover: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bloco.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={onSelecionar}
      className={cn(
        "relative group cursor-pointer outline outline-2 outline-transparent",
        selecionado && "outline-[#1B3A6B]",
      )}
    >
      <RenderBloco bloco={bloco} />
      <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="h-7 w-7 flex items-center justify-center rounded bg-white/90 border shadow-sm cursor-grab active:cursor-grabbing"
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition">
        <Button
          size="icon"
          variant="destructive"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onRemover();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

const StaffPaginaEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [estadoSalvar, setEstadoSalvar] = useState<EstadoSalvar>("ocioso");
  const [horaSalvo, setHoraSalvo] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [snapshot, setSnapshot] = useState<string>("");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  // modais de publicação
  const [modalPublicar, setModalPublicar] = useState(false);
  const [modalDespublicar, setModalDespublicar] = useState(false);

  const debounceRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("titulo, slug, publicado, blocos")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Página não encontrada");
        navigate("/staff/dashboard");
        return;
      }
      const bs = (data.blocos as any) ?? [];
      setTitulo(data.titulo);
      setSlug(data.slug);
      setPublicado(data.publicado);
      setBlocos(bs);
      setSnapshot(JSON.stringify({ titulo: data.titulo, publicado: data.publicado, blocos: bs }));
      setCarregando(false);
    })();
  }, [id, navigate]);

  const estadoAtual = useMemo(
    () => JSON.stringify({ titulo, publicado, blocos }),
    [titulo, publicado, blocos],
  );
  const sujo = snapshot !== estadoAtual;

  const salvar = async (silencioso = false) => {
    if (!id) return;
    setEstadoSalvar("salvando");
    const payload = { titulo, publicado, blocos: blocos as any };
    const { error } = await supabase.from("landing_pages").update(payload).eq("id", id);
    if (error) {
      setEstadoSalvar("ocioso");
      toast.error(error.message);
      return false;
    }
    setSnapshot(JSON.stringify({ titulo, publicado, blocos }));
    setEstadoSalvar("salvo");
    setHoraSalvo(
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    );
    if (!silencioso) toast.success("Página salva");
    return true;
  };

  // Auto-save com debounce de 3s
  useEffect(() => {
    if (carregando || !sujo) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      salvar(true);
    }, 3000);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoAtual, carregando]);

  const adicionar = (tipo: TipoBloco) => {
    const novo = criarBloco(tipo);
    setBlocos((prev) => [...prev, novo]);
    setSelecionado(novo.id);
  };

  const remover = (idBloco: string) => {
    setBlocos((prev) => prev.filter((b) => b.id !== idBloco));
    if (selecionado === idBloco) setSelecionado(null);
  };

  const atualizarConfig = (idBloco: string, novaCfg: any) => {
    setBlocos((prev) =>
      prev.map((b) => (b.id === idBloco ? ({ ...b, config: novaCfg } as Bloco) : b)),
    );
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocos((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const previsualizar = () => {
    const url = publicado ? `/p/${slug}` : `/p/${slug}?preview=true`;
    window.open(url, "_blank");
  };

  const togglePublicado = () => {
    if (publicado) setModalDespublicar(true);
    else setModalPublicar(true);
  };

  const confirmarPublicar = async () => {
    setPublicado(true);
    setModalPublicar(false);
    // salvar imediatamente após mudança de estado
    setTimeout(() => salvar(false), 0);
  };

  const confirmarDespublicar = async () => {
    setPublicado(false);
    setModalDespublicar(false);
    setTimeout(() => salvar(false), 0);
  };

  const urlPublica = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}`;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(urlPublica);
      toast.success("Link copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const blocoSelecionado = blocos.find((b) => b.id === selecionado) ?? null;

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const indicadorSalvar = () => {
    if (estadoSalvar === "salvando") return <span className="text-xs text-muted-foreground">Salvando...</span>;
    if (sujo) return <span className="text-xs text-amber-600">• alterações não salvas</span>;
    if (horaSalvo) return <span className="text-xs text-muted-foreground">Salvo às {horaSalvo}</span>;
    return null;
  };

  return (
    <div className="flex h-screen flex-col bg-[#F5F5F5]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-white px-4 py-2.5 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/staff/dashboard")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="max-w-md font-medium"
        />
        <span className="text-xs text-muted-foreground">/{slug}</span>
        {indicadorSalvar()}
        <div className="ml-auto flex items-center gap-3">
          {/* Toggle Rascunho/Publicado */}
          <button
            onClick={togglePublicado}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              publicado
                ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                publicado ? "bg-green-500 animate-pulse" : "bg-gray-400",
              )}
            />
            {publicado ? "Ao vivo" : "Rascunho"}
          </button>

          <Button variant="outline" size="sm" onClick={previsualizar} className="gap-1.5">
            <Eye className="h-4 w-4" /> Pré-visualizar
          </Button>
          <Button
            size="sm"
            onClick={() => salvar(false)}
            disabled={estadoSalvar === "salvando"}
            className="gap-1.5 bg-[#C8102E] hover:bg-[#a30d25] text-white"
          >
            {estadoSalvar === "salvando" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Esquerda: Biblioteca */}
        <aside className="w-[260px] shrink-0 border-r bg-white overflow-y-auto p-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground px-1 py-2">
            Adicionar bloco
          </p>
          {BIBLIOTECA.map((b) => (
            <button
              key={b.tipo}
              onClick={() => adicionar(b.tipo)}
              className="w-full text-left rounded-lg border p-3 hover:border-[#1B3A6B] hover:bg-[#F5F5F5] transition"
            >
              <p className="text-sm font-medium">{b.label}</p>
              <p className="text-xs text-muted-foreground">{b.descricao}</p>
            </button>
          ))}
        </aside>

        {/* Centro: Preview */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
            {blocos.length === 0 && (
              <div className="flex h-[400px] items-center justify-center text-muted-foreground text-sm">
                Adicione blocos pela coluna à esquerda
              </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocos.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {blocos.map((b) => (
                  <BlocoSortavel
                    key={b.id}
                    bloco={b}
                    selecionado={selecionado === b.id}
                    onSelecionar={() => setSelecionado(b.id)}
                    onRemover={() => remover(b.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </main>

        {/* Direita: Config */}
        <aside className="w-[340px] shrink-0 border-l bg-white overflow-y-auto p-4">
          {blocoSelecionado ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Editando</p>
                <p className="text-sm font-medium capitalize">{blocoSelecionado.tipo.replace("-", " + ")}</p>
              </div>
              <FormBloco
                bloco={blocoSelecionado}
                onChange={(cfg) => atualizarConfig(blocoSelecionado.id, cfg)}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Selecione um bloco para editar
            </div>
          )}
        </aside>
      </div>

      {/* Modal: Publicar */}
      <AlertDialog open={modalPublicar} onOpenChange={setModalPublicar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" /> Publicar página
            </AlertDialogTitle>
            <AlertDialogDescription>
              A página ficará visível publicamente neste link:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-muted/40 p-3 flex items-center gap-2">
            <code className="text-xs flex-1 truncate">{urlPublica}</code>
            <Button size="sm" variant="outline" onClick={copiarLink} className="gap-1.5 shrink-0">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarPublicar}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Publicar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Despublicar */}
      <AlertDialog open={modalDespublicar} onOpenChange={setModalDespublicar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Despublicar página?</AlertDialogTitle>
            <AlertDialogDescription>
              A página ficará indisponível para visitantes. Você pode publicá-la novamente a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDespublicar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Despublicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffPaginaEditor;
