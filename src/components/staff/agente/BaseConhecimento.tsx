import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Globe,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Type,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const db = supabase as any;

type Documento = {
  id: string;
  titulo: string;
  categoria: string;
  tipo: "arquivo" | "texto" | "url";
  arquivo_path: string | null;
  arquivo_nome: string | null;
  arquivo_mime: string | null;
  url: string | null;
  texto_original: string | null;
  status: "processando" | "pronto" | "erro";
  erro: string | null;
  ativo: boolean;
  unidades: string[] | null;
  caracteres: number;
  trechos: number;
  atualizado_em: string;
};
type Unidade = { codigo_shift: string; nome: string };
type Edicao = { id?: string; tipo: Documento["tipo"]; titulo: string; categoria: string; texto: string; url: string; unidades: string[] };

const CATEGORIAS_SUGERIDAS = ["Geral", "Exames e preparo", "Resultados", "Financeiro", "Convênios", "Unidades", "Atendimento", "Políticas", "Coleta domiciliar"];
const ACEITOS = ".pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp";
const MIME_EXT: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const MAX_BYTES = 20 * 1024 * 1024;

const tamanho = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} mil caracteres` : `${n} caracteres`);

const IconeTipo = ({ d }: { d: Documento }) => {
  const Icone = d.tipo === "url" ? Globe : d.tipo === "texto" ? Type : FileText;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
      <Icone className="h-4 w-4" />
    </div>
  );
};

const BadgeStatus = ({ d }: { d: Documento }) =>
  d.status === "pronto" ? (
    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
      <CheckCircle2 className="h-3 w-3" /> Pronto
    </Badge>
  ) : d.status === "processando" ? (
    <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800">
      <Loader2 className="h-3 w-3 animate-spin" /> Processando
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1 bg-red-100 text-red-800" title={d.erro ?? ""}>
      <AlertCircle className="h-3 w-3" /> Erro
    </Badge>
  );

/** Base de conhecimento do Agente de IA: arquivos, textos e páginas que a IA consulta. */
export const BaseConhecimento = ({ podeEditar }: { podeEditar: boolean }) => {
  const [docs, setDocs] = useState<Documento[] | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [enviando, setEnviando] = useState<string[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [vendo, setVendo] = useState<{ doc: Documento; trechos: { ordem: number; texto: string }[] } | null>(null);
  const [teste, setTeste] = useState({ pergunta: "", carregando: false, trechos: null as any[] | null });
  const [semantico, setSemantico] = useState<{ semantico_disponivel: boolean; trechos: number; sem_indice: number } | null>(null);
  const [indexando, setIndexando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    const { data, error } = await db.from("ia_documentos").select("*").order("atualizado_em", { ascending: false });
    if (error) toast.error("Não foi possível carregar a base de conhecimento.");
    setDocs(data ?? []);
    supabase.functions.invoke("sancet-conhecimento", { body: { acao: "status" } }).then(({ data: st }) => st && !st.error && setSemantico(st));
  };
  useEffect(() => {
    carregar();
    db.from("unidades_cache").select("codigo_shift, nome").eq("ativo", true).order("nome").then(({ data }: any) => setUnidades(data ?? []));
  }, []);
  // Enquanto houver material processando, atualiza sozinho.
  useEffect(() => {
    if (!docs?.some((d) => d.status === "processando")) return;
    const t = window.setTimeout(carregar, 4000);
    return () => window.clearTimeout(t);
  }, [docs]);

  const categorias = useMemo(() => {
    const set = new Set([...(docs ?? []).map((d) => d.categoria), ...CATEGORIAS_SUGERIDAS]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [docs]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (docs ?? []).filter(
      (d) => (categoria === "todas" || d.categoria === categoria) && (!q || `${d.titulo} ${d.categoria} ${d.arquivo_nome ?? ""} ${d.url ?? ""}`.toLowerCase().includes(q)),
    );
  }, [docs, busca, categoria]);

  const processar = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("sancet-conhecimento", { body: { acao: "processar", documento_id: id } });
    if (error || data?.error) {
      const det = data?.error ?? (await (error as any)?.context?.json?.().catch(() => null))?.error;
      toast.error(det || "Falha ao processar o material.");
    }
    carregar();
    return data;
  };

  // ---------- envio de arquivos ----------
  const enviarArquivos = async (lista: FileList | File[]) => {
    if (!podeEditar) return;
    const arquivos = [...lista];
    for (const f of arquivos) {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      const mime = MIME_EXT[ext];
      if (!mime) {
        toast.error(`${f.name}: formato não aceito (use PDF, Word .docx, TXT, CSV ou imagem).`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: maior que 20 MB.`);
        continue;
      }
      setEnviando((e) => [...e, f.name]);
      try {
        const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
        const up = await db.storage.from("ia-conhecimento").upload(path, f, { contentType: mime });
        if (up.error) throw new Error(up.error.message);
        const { data: doc, error } = await db
          .from("ia_documentos")
          .insert({
            titulo: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120) || f.name,
            categoria: categoria !== "todas" ? categoria : "Geral",
            tipo: "arquivo",
            arquivo_path: path,
            arquivo_nome: f.name,
            arquivo_mime: mime,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        carregar();
        const r = await processar(doc.id);
        if (r?.ok) toast.success(`${f.name}: pronto (${r.trechos} trecho${r.trechos === 1 ? "" : "s"}).`);
      } catch (e: any) {
        toast.error(`${f.name}: ${e?.message ?? "falha no envio"}`);
      } finally {
        setEnviando((e) => e.filter((n) => n !== f.name));
      }
    }
  };

  // ---------- texto / página ----------
  const salvarEdicao = async () => {
    if (!edicao) return;
    const titulo = edicao.titulo.trim();
    if (!titulo) return toast.error("Dê um título.");
    if (edicao.tipo === "texto" && edicao.texto.trim().length < 20) return toast.error("Escreva o conteúdo (mínimo 20 caracteres).");
    if (edicao.tipo === "url" && !/^https?:\/\/.+\..+/.test(edicao.url.trim())) return toast.error("Informe um endereço válido (https://...).");
    setSalvando(true);
    const campos: any = {
      titulo: titulo.slice(0, 120),
      categoria: edicao.categoria.trim() || "Geral",
      unidades: edicao.unidades.length ? edicao.unidades : null,
    };
    if (edicao.tipo === "texto") campos.texto_original = edicao.texto.trim().slice(0, 400000);
    if (edicao.tipo === "url") campos.url = edicao.url.trim();
    let id = edicao.id;
    const anterior = id ? docs?.find((d) => d.id === id) : null;
    if (id) {
      const { error } = await db.from("ia_documentos").update(campos).eq("id", id);
      if (error) {
        setSalvando(false);
        return toast.error(error.message);
      }
    } else {
      const { data, error } = await db.from("ia_documentos").insert({ ...campos, tipo: edicao.tipo }).select("id").single();
      if (error) {
        setSalvando(false);
        return toast.error(error.message);
      }
      id = data.id;
    }
    setSalvando(false);
    setEdicao(null);
    // Conteúdo mudou (ou é novo): reprocessa. Só título/categoria/unidades: não precisa.
    const mudouConteudo = !anterior || (edicao.tipo === "texto" && anterior.texto_original !== campos.texto_original) || (edicao.tipo === "url" && anterior.url !== campos.url);
    if (mudouConteudo) {
      carregar();
      const r = await processar(id!);
      if (r?.ok) toast.success(`"${titulo}" pronto para a IA.`);
    } else {
      toast.success("Material atualizado.");
      carregar();
    }
  };

  const alternarAtivo = async (d: Documento, v: boolean) => {
    setDocs((ds) => ds?.map((x) => (x.id === d.id ? { ...x, ativo: v } : x)) ?? null);
    const { error } = await db.from("ia_documentos").update({ ativo: v }).eq("id", d.id);
    if (error) {
      toast.error("Não foi possível alterar.");
      carregar();
    } else toast.success(v ? "A IA voltou a usar este material." : "A IA deixou de usar este material.");
  };

  const excluir = async (d: Documento) => {
    if (!window.confirm(`Excluir "${d.titulo}"? A IA deixa de usar este conteúdo.`)) return;
    const { error } = await db.from("ia_documentos").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    if (d.arquivo_path) await db.storage.from("ia-conhecimento").remove([d.arquivo_path]);
    toast.success("Material excluído.");
    carregar();
  };

  const baixar = async (d: Documento) => {
    if (d.tipo === "url" && d.url) return window.open(d.url, "_blank", "noopener");
    if (!d.arquivo_path) return;
    const { data } = await db.storage.from("ia-conhecimento").createSignedUrl(d.arquivo_path, 300, { download: d.arquivo_nome ?? true });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  const verConteudo = async (d: Documento) => {
    const { data } = await db.from("ia_trechos").select("ordem, texto").eq("documento_id", d.id).order("ordem").limit(300);
    setVendo({ doc: d, trechos: data ?? [] });
  };

  const testarBusca = async () => {
    if (teste.pergunta.trim().length < 3) return;
    setTeste((t) => ({ ...t, carregando: true }));
    const { data } = await supabase.functions.invoke("sancet-conhecimento", { body: { acao: "buscar", pergunta: teste.pergunta, limite: 5 } });
    setTeste((t) => ({ ...t, carregando: false, trechos: data?.trechos ?? [] }));
  };

  const indexar = async () => {
    setIndexando(true);
    let restantes = 1;
    while (restantes > 0) {
      const { data, error } = await supabase.functions.invoke("sancet-conhecimento", { body: { acao: "indexar" } });
      if (error || data?.error) {
        toast.error(data?.error ?? "Falha ao indexar.");
        break;
      }
      restantes = data.restantes ?? 0;
      if (!data.indexados) break;
    }
    setIndexando(false);
    carregar();
  };

  const nomeUnidade = (cod: string) => unidades.find((u) => u.codigo_shift === cod)?.nome ?? cod;

  return (
    <div className="space-y-5">
      {/* Enviar */}
      {podeEditar && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            if (e.dataTransfer.files?.length) enviarArquivos(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed p-6 text-center transition",
            arrastando ? "border-secondary bg-secondary/5" : "border-muted-foreground/25",
          )}
        >
          <UploadCloud className="mx-auto h-8 w-8 text-secondary/70" />
          <p className="mt-2 font-medium">Arraste arquivos aqui ou escolha uma opção</p>
          <p className="text-xs text-muted-foreground">PDF, Word (.docx), TXT, CSV ou imagens — até 20 MB cada. PDFs escaneados e fotos são lidos pela IA.</p>
          <input
            ref={arquivoRef}
            type="file"
            multiple
            accept={ACEITOS}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) enviarArquivos(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => arquivoRef.current?.click()}>
              <UploadCloud className="mr-1.5 h-4 w-4" /> Enviar arquivos
            </Button>
            <Button variant="outline" onClick={() => setEdicao({ tipo: "texto", titulo: "", categoria: "Geral", texto: "", url: "", unidades: [] })}>
              <Type className="mr-1.5 h-4 w-4" /> Escrever um texto
            </Button>
            <Button variant="outline" onClick={() => setEdicao({ tipo: "url", titulo: "", categoria: "Geral", texto: "", url: "", unidades: [] })}>
              <Globe className="mr-1.5 h-4 w-4" /> Importar página de site
            </Button>
          </div>
          {enviando.length > 0 && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-blue-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando e processando: {enviando.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Busca por significado */}
      {semantico && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm",
            semantico.semantico_disponivel ? (semantico.sem_indice ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50") : "bg-muted/40",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0 text-secondary" />
          <p className="flex-1">
            {!semantico.semantico_disponivel ? (
              <>
                Busca <b>por palavras</b> ativa. Para a IA entender sinônimos (ex.: "resultado" = "laudo"), cadastre a chave da OpenAI em{" "}
                <b>Super Admin → Integrações</b>.
              </>
            ) : semantico.sem_indice ? (
              <>
                Busca por significado disponível: <b>{semantico.sem_indice}</b> de {semantico.trechos} trechos ainda sem índice.
              </>
            ) : (
              <>Busca por palavras + por significado ativa em todos os {semantico.trechos} trechos.</>
            )}
          </p>
          {semantico.semantico_disponivel && semantico.sem_indice > 0 && podeEditar && (
            <Button size="sm" onClick={indexar} disabled={indexando}>
              {indexando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Indexar agora
            </Button>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar material" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {(docs ?? []).filter((d) => d.ativo && d.status === "pronto").length} em uso · {(docs ?? []).length} no total
        </span>
      </div>

      {/* Lista */}
      {!docs ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
          {docs.length ? "Nenhum material com esse filtro." : "Nenhum material ainda. Envie o manual de preparo, tabela de convênios, políticas de pagamento, prazos de resultado..."}
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border">
          {filtrados.map((d) => (
            <div key={d.id} className={cn("flex items-center gap-3 p-3", !d.ativo && "bg-muted/40 opacity-70")}>
              <IconeTipo d={d} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{d.titulo}</p>
                  <BadgeStatus d={d} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {d.categoria}
                  {" · "}
                  {d.unidades?.length ? d.unidades.map(nomeUnidade).join(", ") : "todas as unidades"}
                  {d.status === "pronto" && ` · ${d.trechos} trecho${d.trechos === 1 ? "" : "s"} · ${tamanho(d.caracteres)}`}
                  {d.tipo === "arquivo" && d.arquivo_nome && ` · ${d.arquivo_nome}`}
                  {d.tipo === "url" && d.url && ` · ${d.url}`}
                </p>
                {d.status === "erro" && d.erro && <p className="text-xs text-red-700">{d.erro}</p>}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="A IA usa este material?">
                <Switch checked={d.ativo} disabled={!podeEditar} onCheckedChange={(v) => alternarAtivo(d, v)} />
                <span className="hidden sm:inline">{d.ativo ? "Em uso" : "Pausado"}</span>
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Ações">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => verConteudo(d)} disabled={d.status !== "pronto"}>
                    <Eye className="mr-2 h-4 w-4" /> Ver o que a IA lê
                  </DropdownMenuItem>
                  {podeEditar && (
                    <DropdownMenuItem
                      onClick={() =>
                        setEdicao({
                          id: d.id,
                          tipo: d.tipo,
                          titulo: d.titulo,
                          categoria: d.categoria,
                          texto: d.texto_original ?? "",
                          url: d.url ?? "",
                          unidades: d.unidades ?? [],
                        })
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                  )}
                  {podeEditar && (
                    <DropdownMenuItem onClick={() => processar(d.id).then((r) => r?.ok && toast.success("Reprocessado."))}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Reprocessar
                    </DropdownMenuItem>
                  )}
                  {(d.arquivo_path || d.url) && (
                    <DropdownMenuItem onClick={() => baixar(d)}>
                      <Download className="mr-2 h-4 w-4" /> {d.tipo === "url" ? "Abrir página" : "Baixar original"}
                    </DropdownMenuItem>
                  )}
                  {podeEditar && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => excluir(d)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Testar busca */}
      <div className="space-y-2 rounded-xl border p-4">
        <p className="flex items-center gap-1.5 font-medium">
          <Search className="h-4 w-4" /> Testar: o que a IA encontra para uma pergunta?
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Ex.: vocês aceitam pix? / quando sai o resultado?"
            value={teste.pergunta}
            onChange={(e) => setTeste((t) => ({ ...t, pergunta: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && testarBusca()}
          />
          <Button variant="outline" onClick={testarBusca} disabled={teste.carregando}>
            {teste.carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </div>
        {teste.trechos &&
          (teste.trechos.length === 0 ? (
            <p className="text-sm text-amber-700">Nada encontrado. A IA vai dizer que não tem essa informação — envie um material sobre isso.</p>
          ) : (
            <div className="space-y-2">
              {teste.trechos.map((t: any, i: number) => (
                <div key={i} className="rounded-lg bg-muted/50 p-2.5 text-sm">
                  <p className="mb-0.5 text-xs font-semibold text-secondary">
                    {i + 1}. {t.titulo} <span className="font-normal text-muted-foreground">· {t.categoria}</span>
                  </p>
                  <p className="line-clamp-4 whitespace-pre-line text-muted-foreground">{t.texto}</p>
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Criar / editar */}
      <Dialog open={!!edicao} onOpenChange={(o) => !o && setEdicao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {edicao?.id ? "Editar material" : edicao?.tipo === "url" ? "Importar página de site" : edicao?.tipo === "texto" ? "Novo texto" : "Material"}
            </DialogTitle>
          </DialogHeader>
          {edicao && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input value={edicao.titulo} maxLength={120} onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })} placeholder="Ex.: Política de pagamentos" />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Input list="categorias-ia" value={edicao.categoria} maxLength={40} onChange={(e) => setEdicao({ ...edicao, categoria: e.target.value })} />
                  <datalist id="categorias-ia">
                    {categorias.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
              {edicao.tipo === "url" && (
                <div className="space-y-1.5">
                  <Label>Endereço da página</Label>
                  <Input value={edicao.url} onChange={(e) => setEdicao({ ...edicao, url: e.target.value })} placeholder="https://..." />
                  <p className="text-xs text-muted-foreground">A IA lê o texto da página no momento da importação. Use "Reprocessar" quando a página mudar.</p>
                </div>
              )}
              {edicao.tipo === "texto" && (
                <div className="space-y-1.5">
                  <Label>Conteúdo</Label>
                  <Textarea rows={12} value={edicao.texto} onChange={(e) => setEdicao({ ...edicao, texto: e.target.value })} placeholder="Escreva ou cole o conteúdo. Separe assuntos com linhas em branco." />
                  <p className="text-right text-[11px] text-muted-foreground">{edicao.texto.length.toLocaleString("pt-BR")} caracteres</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Vale para quais unidades?</Label>
                <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2">
                  <button
                    type="button"
                    onClick={() => setEdicao({ ...edicao, unidades: [] })}
                    className={cn("rounded-full border px-2.5 py-1 text-xs", !edicao.unidades.length ? "border-secondary bg-secondary text-white" : "hover:bg-muted")}
                  >
                    Todas
                  </button>
                  {unidades.map((u) => {
                    const sel = edicao.unidades.includes(u.codigo_shift);
                    return (
                      <button
                        key={u.codigo_shift}
                        type="button"
                        onClick={() =>
                          setEdicao({ ...edicao, unidades: sel ? edicao.unidades.filter((x) => x !== u.codigo_shift) : [...edicao.unidades, u.codigo_shift] })
                        }
                        className={cn("rounded-full border px-2.5 py-1 text-xs", sel ? "border-secondary bg-secondary/10 font-medium text-secondary" : "hover:bg-muted")}
                      >
                        {u.nome}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Ex.: o horário especial de uma unidade só é usado nas conversas daquela unidade.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdicao(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao} disabled={salvando}>
              {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              {edicao?.id ? "Salvar" : edicao?.tipo === "url" ? "Importar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ver conteúdo extraído */}
      <Dialog open={!!vendo} onOpenChange={(o) => !o && setVendo(null)}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle>O que a IA lê em "{vendo?.doc.titulo}"</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {vendo?.trechos.length} trecho(s). Se algo estiver errado ou faltando, corrija o original e use "Reprocessar".
          </p>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {vendo?.trechos.map((t) => (
              <div key={t.ordem} className="rounded-lg border p-3 text-sm">
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">Trecho {t.ordem + 1}</p>
                <p className="whitespace-pre-line">{t.texto}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
