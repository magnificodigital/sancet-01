import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowDown, ArrowUp, Eye, Loader2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BIBLIOTECA, Bloco, criarBloco, TipoBloco } from "@/components/landing/tipos";
import { RenderBloco } from "@/components/landing/RenderBloco";
import { FormBloco } from "@/components/landing/FormBloco";
import { cn } from "@/lib/utils";

const StaffPaginaEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [snapshot, setSnapshot] = useState<string>("");
  const [selecionado, setSelecionado] = useState<string | null>(null);

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

  const sujo = useMemo(
    () => snapshot !== JSON.stringify({ titulo, publicado, blocos }),
    [snapshot, titulo, publicado, blocos],
  );

  const adicionar = (tipo: TipoBloco) => {
    const novo = criarBloco(tipo);
    setBlocos((prev) => [...prev, novo]);
    setSelecionado(novo.id);
  };

  const remover = (idBloco: string) => {
    setBlocos((prev) => prev.filter((b) => b.id !== idBloco));
    if (selecionado === idBloco) setSelecionado(null);
  };

  const mover = (idBloco: string, dir: -1 | 1) => {
    setBlocos((prev) => {
      const i = prev.findIndex((b) => b.id === idBloco);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const atualizarConfig = (idBloco: string, novaCfg: any) => {
    setBlocos((prev) =>
      prev.map((b) => (b.id === idBloco ? ({ ...b, config: novaCfg } as Bloco) : b)),
    );
  };

  const salvar = async () => {
    if (!id) return;
    setSalvando(true);
    const { error } = await supabase
      .from("landing_pages")
      .update({ titulo, publicado, blocos: blocos as any })
      .eq("id", id);
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSnapshot(JSON.stringify({ titulo, publicado, blocos }));
    toast.success("Página salva");
  };

  const previsualizar = () => {
    window.open(`/p/${slug}`, "_blank");
  };

  const blocoSelecionado = blocos.find((b) => b.id === selecionado) ?? null;

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        {sujo && <span className="text-xs text-amber-600">• alterações não salvas</span>}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="pub" className="text-sm">Publicado</Label>
            <Switch id="pub" checked={publicado} onCheckedChange={setPublicado} />
          </div>
          <Button variant="outline" size="sm" onClick={previsualizar} className="gap-1.5">
            <Eye className="h-4 w-4" /> Pré-visualizar
          </Button>
          <Button
            size="sm"
            onClick={salvar}
            disabled={salvando}
            className="gap-1.5 bg-[#C8102E] hover:bg-[#a30d25] text-white"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
            {blocos.map((b, i) => {
              const ativo = selecionado === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelecionado(b.id)}
                  className={cn(
                    "relative group cursor-pointer outline outline-2 outline-transparent",
                    ativo && "outline-[#1B3A6B]",
                  )}
                >
                  <RenderBloco bloco={b} />
                  <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); mover(b.id, -1); }}
                      disabled={i === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); mover(b.id, 1); }}
                      disabled={i === blocos.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); remover(b.id); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
};

export default StaffPaginaEditor;
