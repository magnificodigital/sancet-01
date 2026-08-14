import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Bell, Image as ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Aviso = {
  id: string;
  titulo: string;
  conteudo_html: string;
  imagem_url: string | null;
  link_url: string | null;
  link_texto: string | null;
  ativo: boolean;
  alvo: string[];
  frequencia: string;
  ordem: number;
};

type Edit = {
  id: string;
  titulo: string;
  conteudo_html: string;
  imagem_url: string;
  link_url: string;
  link_texto: string;
  ativo: boolean;
  frequencia: string;
  ordem: number;
  todas: boolean;
  areas: string[];
  outros: string;
};

const AREAS = [
  { path: "/", label: "Início (Home)" },
  { path: "/exames", label: "Exames" },
  { path: "/agendamentos", label: "Agendamentos / Resultados" },
  { path: "/unidades", label: "Unidades" },
  { path: "/sacola", label: "Sacola" },
];

const FREQ: Record<string, string> = {
  sempre: "Toda vez",
  sessao: "Uma vez por visita",
  dia: "Uma vez por dia",
};

const SELECT_COLS =
  "id, titulo, conteudo_html, imagem_url, link_url, link_texto, ativo, alvo, frequencia, ordem";

const normalizarAlvo = (a: any): string[] =>
  Array.isArray(a) ? a : ["*"];

export const AbaAvisos = () => {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Edit | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Aviso | null>(null);
  const [enviandoImg, setEnviandoImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setCarregando(true);
    const { data, error } = await (supabase as any)
      .from("avisos")
      .select(SELECT_COLS)
      .order("ordem", { ascending: true })
      .order("criado_em", { ascending: false });
    if (error) toast.error(error.message);
    setAvisos(
      ((data as any[]) ?? []).map((a) => ({ ...a, alvo: normalizarAlvo(a.alvo) })),
    );
    setCarregando(false);
  };
  useEffect(() => {
    carregar();
  }, []);

  const abrir = (a?: Aviso) => {
    if (!a) {
      setEditando({
        id: "", titulo: "", conteudo_html: "", imagem_url: "", link_url: "",
        link_texto: "", ativo: true, frequencia: "dia", ordem: 0,
        todas: true, areas: [], outros: "",
      });
      return;
    }
    const alvo = normalizarAlvo(a.alvo);
    setEditando({
      id: a.id,
      titulo: a.titulo,
      conteudo_html: a.conteudo_html,
      imagem_url: a.imagem_url ?? "",
      link_url: a.link_url ?? "",
      link_texto: a.link_texto ?? "",
      ativo: a.ativo,
      frequencia: a.frequencia,
      ordem: a.ordem,
      todas: alvo.includes("*"),
      areas: alvo.filter((p) => AREAS.some((x) => x.path === p)),
      outros: alvo
        .filter((p) => p !== "*" && !AREAS.some((x) => x.path === p))
        .join("\n"),
    });
  };

  const toggleArea = (path: string) =>
    setEditando((e) =>
      e
        ? {
            ...e,
            areas: e.areas.includes(path)
              ? e.areas.filter((p) => p !== path)
              : [...e.areas, path],
          }
        : e,
    );

  const onUploadImagem = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setEnviandoImg(true);
    try {
      const path = `avisos/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("imagens-exames")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("imagens-exames").getPublicUrl(path);
      setEditando((e) => (e ? { ...e, imagem_url: data.publicUrl } : e));
      toast.success("Imagem enviada.");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar imagem.");
    } finally {
      setEnviandoImg(false);
      ev.target.value = "";
    }
  };

  const salvar = async () => {
    if (!editando) return;
    let alvo: string[];
    if (editando.todas) {
      alvo = ["*"];
    } else {
      const extra = editando.outros
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      alvo = Array.from(new Set([...editando.areas, ...extra]));
      if (alvo.length === 0) alvo = ["*"];
    }
    setSalvando(true);
    const payload = {
      titulo: editando.titulo.trim(),
      conteudo_html: editando.conteudo_html ?? "",
      imagem_url: editando.imagem_url.trim() || null,
      link_url: editando.link_url.trim() || null,
      link_texto: editando.link_texto.trim() || null,
      ativo: editando.ativo,
      frequencia: editando.frequencia,
      ordem: Number(editando.ordem) || 0,
      alvo,
    };
    const { error } = editando.id
      ? await (supabase as any).from("avisos").update(payload).eq("id", editando.id)
      : await (supabase as any).from("avisos").insert(payload);
    setSalvando(false);
    if (error) return toast.error(error.message);
    toast.success("Aviso salvo.");
    setEditando(null);
    carregar();
  };

  const toggleAtivo = async (a: Aviso) => {
    const { error } = await (supabase as any)
      .from("avisos")
      .update({ ativo: !a.ativo })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    setAvisos((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, ativo: !x.ativo } : x)),
    );
  };

  const excluir = async () => {
    if (!paraExcluir) return;
    const { error } = await (supabase as any)
      .from("avisos")
      .delete()
      .eq("id", paraExcluir.id);
    if (error) return toast.error(error.message);
    toast.success("Aviso excluído.");
    setParaExcluir(null);
    carregar();
  };

  const alvoResumo = (alvo: string[]) =>
    alvo.includes("*")
      ? "Todas as páginas"
      : `${alvo.length} página(s)`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Bell className="h-5 w-5 text-brand" /> Avisos
          </h2>
          <p className="text-sm text-muted-foreground">
            Popups (lightbox) que aparecem nas áreas do site que você escolher.
          </p>
        </div>
        <Button onClick={() => abrir()} className="gap-1.5 bg-brand hover:bg-brand-hover text-white">
          <Plus className="h-4 w-4" /> Novo aviso
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Onde aparece</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {avisos.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-[280px] truncate font-medium">
                  {a.titulo || "(sem título)"}
                </TableCell>
                <TableCell className="text-muted-foreground">{alvoResumo(a.alvo)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {FREQ[a.frequencia] ?? a.frequencia}
                </TableCell>
                <TableCell>
                  <Switch checked={a.ativo} onCheckedChange={() => toggleAtivo(a)} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => abrir(a)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setParaExcluir(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!carregando && avisos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum aviso ainda. Clique em "Novo aviso" para criar um popup.
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
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editando?.id ? "Editar aviso" : "Novo aviso"}</SheetTitle>
          </SheetHeader>
          {editando && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editando.titulo}
                  onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  rows={5}
                  value={editando.conteudo_html}
                  onChange={(e) => setEditando({ ...editando, conteudo_html: e.target.value })}
                  className="font-mono text-xs"
                  placeholder="<p>Texto do aviso...</p> — aceita HTML simples."
                />
              </div>

              <div className="space-y-2">
                <Label>Imagem (opcional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={editando.imagem_url}
                    onChange={(e) => setEditando({ ...editando, imagem_url: e.target.value })}
                    placeholder="https://..."
                  />
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
                    className="shrink-0 gap-1.5"
                    disabled={enviandoImg}
                    onClick={() => imgInputRef.current?.click()}
                  >
                    {enviandoImg ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="h-3.5 w-3.5" />
                    )}
                    Enviar
                  </Button>
                </div>
                {editando.imagem_url && (
                  <img
                    src={editando.imagem_url}
                    alt=""
                    className="h-24 w-full rounded-md border object-cover"
                  />
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Link do botão (opcional)</Label>
                  <Input
                    value={editando.link_url}
                    onChange={(e) => setEditando({ ...editando, link_url: e.target.value })}
                    placeholder="/exames ou https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto do botão</Label>
                  <Input
                    value={editando.link_texto}
                    onChange={(e) => setEditando({ ...editando, link_texto: e.target.value })}
                    placeholder="Saiba mais"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <Label className="font-semibold">Onde aparece</Label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={editando.todas}
                    onCheckedChange={(v) => setEditando({ ...editando, todas: v })}
                  />
                  Em todas as páginas do site
                </label>
                {!editando.todas && (
                  <div className="space-y-2 pl-1">
                    {AREAS.map((ar) => (
                      <label key={ar.path} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[hsl(var(--brand))]"
                          checked={editando.areas.includes(ar.path)}
                          onChange={() => toggleArea(ar.path)}
                        />
                        {ar.label}
                        <span className="text-xs text-muted-foreground">({ar.path})</span>
                      </label>
                    ))}
                    <div className="space-y-1 pt-1">
                      <Label className="text-xs">Outros caminhos (um por linha)</Label>
                      <Textarea
                        rows={2}
                        value={editando.outros}
                        onChange={(e) => setEditando({ ...editando, outros: e.target.value })}
                        placeholder="/quem-somos"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={editando.frequencia}
                    onValueChange={(v) => setEditando({ ...editando, frequencia: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FREQ).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editando.ordem}
                    onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editando.ativo}
                  onCheckedChange={(v) => setEditando({ ...editando, ativo: v })}
                />
                Ativo (aparece no site)
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
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-xl">
          <SheetHeader><SheetTitle>Excluir aviso?</SheetTitle></SheetHeader>
          <p className="py-4 text-sm text-muted-foreground">
            "{paraExcluir?.titulo || "(sem título)"}" será removido permanentemente.
          </p>
          <SheetFooter>
            <Button variant="outline" onClick={() => setParaExcluir(null)}>Cancelar</Button>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={excluir}>
              Excluir
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
