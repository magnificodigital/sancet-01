import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Clock,
  PanelRight,
  RefreshCw,
  Sparkles,
  ClipboardList,
  MapPin,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  Paperclip,
  Search,
  Send,
  ShoppingCart,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FichaPacienteChat } from "./FichaPacienteChat";
import { ModalPedidoStaff } from "./ModalPedidoStaff";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const db = supabase as any;

type Conversa = {
  id: string;
  status: "ia" | "aguardando" | "humano" | "encerrada";
  ia_ativa: boolean;
  responsavel_id: string | null;
  paciente_id: string | null;
  canal: string;
  ultima_msg_em: string | null;
  ultima_msg_texto: string | null;
  ultima_msg_autor: string | null;
  nao_lidas: number;
  created_at: string;
  pacientes: { nome: string | null; nome_social: string | null; celular: string | null; email: string | null } | null;
  lead_nome: string | null;
  lead_telefone: string | null;
  lead_email: string | null;
  unidade_codigo_shift: string | null;
  unidade_nome: string | null;
  pedido_protocolo: string | null;
  fila_desde: string | null;
  resumo: string | null;
  resumo_em: string | null;
};
type Mensagem = {
  id: string;
  autor: "paciente" | "assistente" | "equipe" | "nota" | "sistema";
  autor_id: string | null;
  autor_nome: string | null;
  texto: string | null;
  anexo_path: string | null;
  anexo_nome: string | null;
  anexo_mime: string | null;
  meta: any;
  created_at: string;
};
type Atendente = { user_id: string; nome: string; role: string };
type Filtro = "fila" | "minhas" | "ia" | "todas" | "encerradas";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "fila", label: "Fila" },
  { id: "minhas", label: "Minhas" },
  { id: "ia", label: "Com a IA" },
  { id: "todas", label: "Abertas" },
  { id: "encerradas", label: "Encerradas" },
];

const STATUS_LABEL: Record<Conversa["status"], { label: string; cls: string }> = {
  ia: { label: "IA atendendo", cls: "bg-violet-100 text-violet-700" },
  aguardando: { label: "Aguardando atendente", cls: "bg-amber-100 text-amber-800" },
  humano: { label: "Em atendimento", cls: "bg-blue-100 text-blue-700" },
  encerrada: { label: "Encerrada", cls: "bg-muted text-muted-foreground" },
};

const COLS_CONVERSA =
  "id, status, ia_ativa, responsavel_id, paciente_id, canal, ultima_msg_em, ultima_msg_texto, ultima_msg_autor, nao_lidas, created_at, pacientes(nome, nome_social, celular, email), lead_nome, lead_telefone, lead_email, unidade_codigo_shift, unidade_nome, pedido_protocolo, fila_desde, resumo, resumo_em";

const nomeConversa = (c: Conversa) =>
  c.pacientes?.nome_social || c.pacientes?.nome || c.lead_nome || `Visitante ${c.id.slice(0, 4).toUpperCase()}`;
const telefone = (c: Conversa) => {
  const t = (c.pacientes?.celular || c.lead_telefone || "").replace(/\D/g, "");
  return t.length >= 10 ? `(${t.slice(0, 2)}) ${t.slice(2, -4)}-${t.slice(-4)}` : t || null;
};

const CHAVE_STATUS = "sancet_status_atendente";
export const lerStatusAtendente = (): "online" | "ausente" => {
  try {
    return localStorage.getItem(CHAVE_STATUS) === "ausente" ? "ausente" : "online";
  } catch {
    return "online";
  }
};
const minutosDesde = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)) : null);
const fmtMin = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`);
/** Tempo que o paciente está esperando: na fila, ou sem resposta da equipe. */
const espera = (c: Conversa) => {
  if (c.status === "aguardando") return minutosDesde(c.fila_desde ?? c.ultima_msg_em);
  if (c.status === "humano" && c.ultima_msg_autor === "paciente") return minutosDesde(c.ultima_msg_em);
  return null;
};

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const quando = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return hora(iso);
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};
const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

/** Link temporário para anexos privados do chat (com cache). */
const useAnexoUrl = () => {
  const cache = useRef(new Map<string, string>());
  const [, forcar] = useState(0);
  const url = (path: string | null) => {
    if (!path) return null;
    if (cache.current.has(path)) return cache.current.get(path)!;
    cache.current.set(path, "");
    db.storage
      .from("chat-anexos")
      .createSignedUrl(path, 3600)
      .then(({ data }: any) => {
        if (data?.signedUrl) {
          cache.current.set(path, data.signedUrl);
          forcar((n) => n + 1);
        }
      });
    return "";
  };
  return url;
};

const Anexo = ({ m, url }: { m: Mensagem; url: string | null }) => {
  if (!m.anexo_path) return null;
  const nome = m.anexo_nome ?? "anexo";
  if (!url) return <p className="mt-1 text-xs opacity-70">📎 {nome} (carregando...)</p>;
  if ((m.anexo_mime ?? "").startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        <img src={url} alt={nome} className="max-h-56 rounded-lg border object-contain" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-md bg-black/5 px-2 py-1.5 text-xs underline">
      <FileText className="h-4 w-4" /> {nome}
    </a>
  );
};

export const AbaConversas = ({ userId, isAdmin }: { userId: string | null; isAdmin: boolean }) => {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("fila");
  const [busca, setBusca] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>("todas");
  const [selId, setSelId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [texto, setTexto] = useState("");
  const [interna, setInterna] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [transferir, setTransferir] = useState<{ para: string; obs: string } | null>(null);
  const [rapidas, setRapidas] = useState<{ titulo: string; texto: string }[]>([]);
  const [rapidasAberto, setRapidasAberto] = useState(false);
  const [filaCfg, setFilaCfg] = useState<{ prazo_min: number; sem_resposta_min: number } | null>(null);
  const [, setTick] = useState(0);
  const [meuStatus, setMeuStatus] = useState<"online" | "ausente">(lerStatusAtendente);
  const [fichaAberta, setFichaAberta] = useState(false);
  const [pedidoModal, setPedidoModal] = useState<any | null>(null);
  const [resumo, setResumo] = useState<{ texto: string | null; carregando: boolean }>({ texto: null, carregando: false });
  const [sugerindo, setSugerindo] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const anexoUrl = useAnexoUrl();

  const nomeAtendente = useCallback(
    (uid: string | null) => atendentes.find((a) => a.user_id === uid)?.nome ?? (uid ? "Atendente" : null),
    [atendentes],
  );

  const carregarConversas = useCallback(async () => {
    const { data, error } = await db
      .from("chat_conversas")
      .select(COLS_CONVERSA)
      .not("ultima_msg_em", "is", null)
      .order("ultima_msg_em", { ascending: false })
      .limit(300);
    if (error) toast.error("Não foi possível carregar as conversas.");
    setConversas(data ?? []);
    setCarregando(false);
  }, []);

  const carregarMensagens = useCallback(async (id: string) => {
    setCarregandoMsgs(true);
    const { data } = await db
      .from("chat_mensagens")
      .select("id, autor, autor_id, autor_nome, texto, anexo_path, anexo_nome, anexo_mime, meta, created_at")
      .eq("conversa_id", id)
      .order("created_at", { ascending: true })
      .limit(1000);
    setMensagens(data ?? []);
    setCarregandoMsgs(false);
  }, []);

  useEffect(() => {
    carregarConversas();
    db.rpc("chat_atendentes").then(({ data }: any) => setAtendentes(data ?? []));
    db.rpc("chat_respostas_rapidas").then(({ data }: any) => setRapidas(Array.isArray(data) ? data : []));
    db.rpc("chat_fila_config").then(({ data }: any) => data && setFilaCfg(data));
    const iv = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(iv);
  }, [carregarConversas]);

  // Tempo real: lista de conversas + mensagens da conversa aberta.
  useEffect(() => {
    let t: number | null = null;
    const ch = db
      .channel("staff-conversas")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversas" }, () => {
        if (t) window.clearTimeout(t);
        t = window.setTimeout(carregarConversas, 400);
      })
      .subscribe();
    const iv = window.setInterval(carregarConversas, 60_000);
    return () => {
      if (t) window.clearTimeout(t);
      window.clearInterval(iv);
      db.removeChannel(ch);
    };
  }, [carregarConversas]);

  useEffect(() => {
    if (!selId) return;
    carregarMensagens(selId);
    db.rpc("chat_marcar_lida", { _conversa: selId });
    const ch = db
      .channel(`staff-msgs-${selId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensagens", filter: `conversa_id=eq.${selId}` },
        (p: any) => {
          setMensagens((ms) => (ms.some((m) => m.id === p.new.id) ? ms : [...ms, p.new as Mensagem]));
          if (p.new.autor === "paciente") db.rpc("chat_marcar_lida", { _conversa: selId });
        },
      )
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
  }, [selId, carregarMensagens]);

  useEffect(() => {
    setTimeout(() => fimRef.current?.scrollIntoView({ block: "end" }), 30);
  }, [mensagens.length, selId]);

  const sel = conversas.find((c) => c.id === selId) ?? null;
  const ehMinha = !!sel && sel.responsavel_id === userId;
  const podeMexer = !!sel && (!sel.responsavel_id || ehMinha || isAdmin);

  const contagem = useMemo(() => {
    const c: Record<Filtro, number> = { fila: 0, minhas: 0, ia: 0, todas: 0, encerradas: 0 };
    conversas.forEach((x) => {
      if (x.status === "aguardando") c.fila++;
      if (x.responsavel_id === userId && x.status !== "encerrada" && x.nao_lidas > 0) c.minhas++;
      if (x.status === "ia") c.ia++;
    });
    return c;
  }, [conversas, userId]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversas.filter((c) => {
      const ok =
        filtro === "fila"
          ? c.status === "aguardando"
          : filtro === "minhas"
            ? c.responsavel_id === userId && c.status !== "encerrada"
            : filtro === "ia"
              ? c.status === "ia"
              : filtro === "todas"
                ? c.status !== "encerrada"
                : c.status === "encerrada";
      if (!ok) return false;
      if (unidadeFiltro !== "todas" && (c.unidade_codigo_shift ?? "_sem") !== unidadeFiltro) return false;
      if (!q) return true;
      return [nomeConversa(c), c.ultima_msg_texto ?? "", c.pacientes?.celular ?? "", c.pacientes?.email ?? "", c.lead_telefone ?? "", c.pedido_protocolo ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [conversas, filtro, busca, userId, unidadeFiltro]);
  const listaOrdenada = useMemo(
    () =>
      filtro === "fila"
        ? [...lista].sort((a, b) => (a.fila_desde ?? a.ultima_msg_em ?? "").localeCompare(b.fila_desde ?? b.ultima_msg_em ?? ""))
        : lista,
    [lista, filtro],
  );

  const unidadesNaLista = useMemo(() => {
    const m = new Map<string, string>();
    conversas.forEach((c) => m.set(c.unidade_codigo_shift ?? "_sem", c.unidade_nome ?? "Sem unidade (não qualificado)"));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [conversas]);

  // ---------- copiloto ----------
  const gerarResumo = useCallback(async (id: string, forcar = false) => {
    setResumo((r) => ({ ...r, carregando: true }));
    const { data } = await supabase.functions.invoke("sancet-copiloto", { body: { acao: "resumo", conversa_id: id, forcar } });
    setResumo({ texto: data?.resumo ?? null, carregando: false });
  }, []);
  const qtdTextos = mensagens.filter((m) => m.texto && (m.autor === "paciente" || m.autor === "assistente" || m.autor === "equipe")).length;
  useEffect(() => {
    setResumo({ texto: null, carregando: false });
  }, [selId]);
  useEffect(() => {
    if (selId && !carregandoMsgs && qtdTextos >= 3) gerarResumo(selId);
  }, [selId, carregandoMsgs, qtdTextos >= 3, gerarResumo]);

  const sugerirResposta = async () => {
    if (!sel) return;
    setSugerindo(true);
    const { data, error } = await supabase.functions.invoke("sancet-copiloto", {
      body: { acao: "sugerir", conversa_id: sel.id, instrucao: texto.trim() || undefined },
    });
    setSugerindo(false);
    if (error || !data?.sugestao) return toast.error("Não foi possível sugerir agora.");
    setTexto(data.sugestao);
  };

  // Variáveis das respostas rápidas.
  const aplicarVariaveis = (t: string) => {
    if (!sel) return t;
    const nome = nomeConversa(sel);
    return t
      .replace(/\{nome\}/g, nome)
      .replace(/\{primeiro_nome\}/g, nome.split(" ")[0])
      .replace(/\{unidade\}/g, sel.unidade_nome ?? "")
      .replace(/\{protocolo\}/g, sel.pedido_protocolo ?? "")
      .replace(/\{atendente\}/g, (nomeAtendente(userId) ?? "").split(" ")[0]);
  };
  const atalho = texto.startsWith("/") && !texto.includes("\n") ? texto.slice(1).toLowerCase() : null;
  const rapidasFiltradas = atalho === null ? [] : rapidas.filter((r) => r.titulo.toLowerCase().includes(atalho) || r.texto.toLowerCase().includes(atalho)).slice(0, 6);
  const usarRapida = (r: { texto: string }) => {
    setTexto((t) => {
      const base = t.startsWith("/") ? "" : t.trim();
      return base ? `${base}\n${aplicarVariaveis(r.texto)}` : aplicarVariaveis(r.texto);
    });
    setRapidasAberto(false);
  };

  const mudarMeuStatus = async (st: "online" | "ausente") => {
    setMeuStatus(st);
    try {
      localStorage.setItem(CHAVE_STATUS, st);
    } catch {
      /* sem storage */
    }
    await db.rpc("chat_ping", { _status: st });
    toast.success(st === "online" ? "Você está online: novas conversas podem ser direcionadas a você." : "Você está ausente: não recebe novas conversas.");
  };

  const abrirPedido = async (id: string) => {
    const { data, error } = await db.from("pedidos").select("*").eq("id", id).maybeSingle();
    if (error || !data) return toast.error("Não foi possível abrir o pedido.");
    setPedidoModal(data);
  };

  const rpc = async (fn: string, args: Record<string, unknown>, ok?: string) => {
    const { error } = await db.rpc(fn, args);
    if (error) {
      toast.error(error.message || "Não foi possível concluir.");
      return false;
    }
    if (ok) toast.success(ok);
    carregarConversas();
    return true;
  };

  const enviar = async (arquivo?: File) => {
    if (!sel || enviando) return;
    const t = texto.trim();
    if (!t && !arquivo) return;
    setEnviando(true);
    try {
      let anexo: { path: string; nome: string; mime: string } | null = null;
      if (arquivo) {
        if (arquivo.size > 10 * 1024 * 1024) throw new Error("Arquivo muito grande (máx. 10 MB).");
        const ext = (arquivo.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
        const path = `${sel.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await db.storage.from("chat-anexos").upload(path, arquivo, { contentType: arquivo.type });
        if (error) throw new Error("Não foi possível enviar o arquivo (use imagem ou PDF).");
        anexo = { path, nome: arquivo.name, mime: arquivo.type };
      }
      const { error } = await db.rpc("chat_enviar", {
        _conversa: sel.id,
        _texto: t || null,
        _anexo_path: anexo?.path ?? null,
        _anexo_nome: anexo?.nome ?? null,
        _anexo_mime: anexo?.mime ?? null,
        _interna: interna,
      });
      if (error) throw new Error(error.message);
      setTexto("");
      carregarConversas();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  };

  const confirmarTransferencia = async () => {
    if (!sel || !transferir?.para) return;
    const ok = await rpc(
      "chat_transferir",
      { _conversa: sel.id, _para: transferir.para, _obs: transferir.obs || null },
      `Conversa transferida para ${nomeAtendente(transferir.para)}.`,
    );
    if (ok) setTransferir(null);
  };

  // ---------- render ----------
  const bolha = (m: Mensagem, idx: number) => {
    const ant = mensagens[idx - 1];
    const sep = !ant || new Date(ant.created_at).toDateString() !== new Date(m.created_at).toDateString();
    const voz = m.meta?.canal === "voz";
    const acoes: any[] = Array.isArray(m.meta?.acoes) ? m.meta.acoes : [];
    let corpo: JSX.Element | null = null;

    if (m.autor === "sistema") {
      if (!m.texto && !acoes.length) return sep ? <Separador iso={m.created_at} /> : null;
      corpo = (
        <div className="flex justify-center">
          <span className="rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
            {m.texto ?? `🛒 Carrinho montado pela voz: ${acoes.flatMap((a) => a.itens?.map((i: any) => i.nome) ?? []).join(", ")}`}
            <span className="ml-2 opacity-60">{hora(m.created_at)}</span>
          </span>
        </div>
      );
    } else if (m.autor === "nota") {
      corpo = (
        <div className="mx-auto max-w-[90%] rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold">
            <Lock className="h-3 w-3" /> Nota interna · {m.autor_nome} · {hora(m.created_at)}
          </p>
          <p className="whitespace-pre-line">{m.texto}</p>
          <Anexo m={m} url={anexoUrl(m.anexo_path)} />
        </div>
      );
    } else {
      const lado = m.autor === "paciente" ? "esq" : "dir";
      const rotulo =
        m.autor === "paciente" ? (sel ? nomeConversa(sel) : "Paciente") : m.autor === "assistente" ? "Assistente IA" : m.autor_nome ?? "Equipe";
      corpo = (
        <div className={cn("flex", lado === "esq" ? "justify-start" : "justify-end")}>
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
              m.autor === "paciente" && "border bg-white",
              m.autor === "assistente" && "bg-violet-50 text-violet-950",
              m.autor === "equipe" && "bg-brand-2 text-white",
            )}
          >
            <p className={cn("mb-0.5 flex items-center gap-1 text-[11px] font-semibold", m.autor === "equipe" ? "text-white/80" : "text-muted-foreground")}>
              {m.autor === "assistente" && <Bot className="h-3 w-3" />}
              {voz && <Mic className="h-3 w-3" />}
              {rotulo}
              <span className="font-normal opacity-70">· {hora(m.created_at)}</span>
            </p>
            {m.texto && <p className="whitespace-pre-line">{m.texto}</p>}
            <Anexo m={m} url={anexoUrl(m.anexo_path)} />
            {acoes.map((a, j) => (
              <p key={j} className="mt-1.5 flex items-start gap-1 rounded-md bg-white/70 px-2 py-1 text-[11px] text-secondary">
                <ShoppingCart className="mt-0.5 h-3 w-3 shrink-0" />
                Carrinho ({a.tipo_compra}): {(a.itens ?? []).map((i: any) => i.nome).join(", ")}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return (
      <>
        {sep && <Separador iso={m.created_at} />}
        {corpo}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-secondary/10 p-2 text-secondary">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-secondary">Conversas</h1>
          <p className="text-sm text-muted-foreground">Chat do site: veja a conversa com a IA, assuma, responda e transfira.</p>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-full border p-1 text-xs">
          {(["online", "ausente"] as const).map((st) => (
            <button
              key={st}
              onClick={() => mudarMeuStatus(st)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1",
                meuStatus === st ? (st === "online" ? "bg-green-600 text-white" : "bg-amber-500 text-white") : "hover:bg-muted",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", st === "online" ? "bg-green-300" : "bg-amber-200")} />
              {st === "online" ? "Online" : "Ausente"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid h-[calc(100vh-190px)] min-h-[520px] overflow-hidden rounded-xl border bg-background md:grid-cols-[340px_1fr] xl:grid-cols-[320px_1fr_300px]">
        {/* Lista */}
        <div className={cn("flex min-h-0 flex-col border-r", sel && "hidden md:flex")}>
          <div className="space-y-2 border-b p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, telefone, mensagem" className="pl-8" />
            </div>
            <div className="flex flex-wrap gap-1">
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    filtro === f.id ? "border-secondary bg-secondary text-white" : "hover:bg-muted",
                  )}
                >
                  {f.label}
                  {(f.id === "fila" || f.id === "minhas") && contagem[f.id] > 0 && (
                    <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">{contagem[f.id]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          {unidadesNaLista.length > 1 && (
            <div className="border-b px-3 py-2">
              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as unidades</SelectItem>
                  {unidadesNaLista.map(([cod, nome]) => (
                    <SelectItem key={cod} value={cod}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {carregando ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : lista.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma conversa aqui.</p>
            ) : (
              listaOrdenada.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelId(c.id)}
                  className={cn("flex w-full gap-3 border-b px-3 py-2.5 text-left hover:bg-muted/50", c.id === selId && "bg-secondary/5")}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold text-secondary">
                    {nomeConversa(c).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{nomeConversa(c)}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{quando(c.ultima_msg_em)}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.ultima_msg_autor === "assistente" && "🤖 "}
                      {c.ultima_msg_autor === "equipe" && "Você/equipe: "}
                      {c.ultima_msg_texto}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", STATUS_LABEL[c.status].cls)}>
                        {STATUS_LABEL[c.status].label}
                      </span>
                      {c.unidade_nome && (
                        <span className="flex items-center gap-0.5 truncate text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" /> {c.unidade_nome}
                        </span>
                      )}
                      {c.responsavel_id && (
                        <span className="truncate text-[10px] text-muted-foreground">
                          {c.responsavel_id === userId ? "com você" : `com ${nomeAtendente(c.responsavel_id)}`}
                        </span>
                      )}
                      {(() => {
                        const m = espera(c);
                        if (m === null) return null;
                        const atrasado = m >= (filaCfg?.prazo_min ?? 5);
                        return (
                          <span
                            className={cn("ml-auto flex shrink-0 items-center gap-0.5 rounded px-1 text-[10px] font-semibold", atrasado ? "bg-red-100 text-red-700" : "text-muted-foreground")}
                            title={c.status === "aguardando" ? "Esperando na fila" : "Paciente sem resposta"}
                          >
                            <Clock className="h-2.5 w-2.5" /> {fmtMin(m)}
                          </span>
                        );
                      })()}
                      {c.nao_lidas > 0 && (
                        <span className={cn("rounded-full bg-brand px-1.5 text-[10px] font-bold text-white", espera(c) === null && "ml-auto")}>{c.nao_lidas}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversa */}
        {!sel ? (
          <div className="hidden flex-col items-center justify-center gap-2 text-muted-foreground md:flex">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm">Selecione uma conversa.</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
              <button className="md:hidden" onClick={() => setSelId(null)} aria-label="Voltar">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{nomeConversa(sel)}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  {telefone(sel) && <span>{telefone(sel)}</span>}
                  {(sel.pacientes?.email || sel.lead_email) && <span>{sel.pacientes?.email || sel.lead_email}</span>}
                  {sel.unidade_nome ? (
                    <span className="flex items-center gap-0.5 font-medium text-secondary">
                      <MapPin className="h-3 w-3" /> {sel.unidade_nome}
                    </span>
                  ) : (
                    <span className="text-amber-700">Ainda sem unidade</span>
                  )}
                  {sel.pedido_protocolo && (
                    <span className="flex items-center gap-0.5 font-medium text-secondary">
                      <ClipboardList className="h-3 w-3" /> Pedido {sel.pedido_protocolo}
                    </span>
                  )}
                  {!sel.pacientes && <span>Visitante não logado</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {STATUS_LABEL[sel.status].label}
                  {sel.responsavel_id && ` · ${ehMinha ? "com você" : `com ${nomeAtendente(sel.responsavel_id)}`}`}
                </p>
              </div>
              <Button size="sm" variant="outline" className="xl:hidden" onClick={() => setFichaAberta(true)}>
                <PanelRight className="mr-1 h-4 w-4" /> Ficha
              </Button>
              <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs" title="Quando ligada, a IA responde o paciente">
                <Bot className="h-4 w-4" /> IA
                <Switch
                  checked={sel.ia_ativa}
                  disabled={!podeMexer}
                  onCheckedChange={(v) => rpc("chat_definir_ia", { _conversa: sel.id, _ativa: v }, v ? "IA ligada nesta conversa." : "IA desligada: você está atendendo.")}
                />
              </label>
              {(!ehMinha || sel.ia_ativa || sel.status !== "humano") && podeMexer && sel.status !== "encerrada" && (
                <Button size="sm" onClick={() => rpc("chat_assumir", { _conversa: sel.id }, "Você assumiu a conversa.")}>
                  <UserCheck className="mr-1 h-4 w-4" /> Assumir
                </Button>
              )}
              <Button size="sm" variant="outline" disabled={!podeMexer} onClick={() => setTransferir({ para: "", obs: "" })}>
                <Users className="mr-1 h-4 w-4" /> Transferir
              </Button>
              {sel.status !== "encerrada" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!podeMexer}
                  onClick={() => window.confirm("Encerrar este atendimento?") && rpc("chat_encerrar", { _conversa: sel.id }, "Atendimento encerrado.")}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Encerrar
                </Button>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-muted/30 p-3">
              {(resumo.texto || resumo.carregando) && (
                <div className="sticky top-0 z-10 rounded-lg border border-violet-200 bg-violet-50/95 p-2.5 text-xs text-violet-950 shadow-sm backdrop-blur">
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <Sparkles className="h-3.5 w-3.5" /> Resumo da IA
                    <button className="ml-auto opacity-70 hover:opacity-100" onClick={() => sel && gerarResumo(sel.id, true)} aria-label="Atualizar resumo" title="Atualizar">
                      <RefreshCw className={cn("h-3.5 w-3.5", resumo.carregando && "animate-spin")} />
                    </button>
                  </div>
                  {resumo.texto ? <p className="whitespace-pre-line">{resumo.texto}</p> : <p className="opacity-70">Resumindo a conversa...</p>}
                </div>
              )}
              {carregandoMsgs ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                mensagens.map((m, i) => <Fragment key={m.id}>{bolha(m, i)}</Fragment>)
              )}
              <div ref={fimRef} />
            </div>

            <div className="border-t p-2">
              {!podeMexer && !interna && (
                <p className="mb-1.5 flex items-center gap-1 px-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Conversa com {nomeAtendente(sel.responsavel_id)}. Você pode deixar uma nota interna.
                </p>
              )}
              {sel.ia_ativa && podeMexer && !interna && (
                <p className="mb-1.5 px-1 text-xs text-muted-foreground">Ao responder, você assume a conversa e a IA para de responder.</p>
              )}
              <div className="mb-1.5 flex gap-1 px-1">
                <button
                  onClick={() => setInterna(false)}
                  className={cn("rounded-full px-2.5 py-0.5 text-xs", !interna ? "bg-secondary text-white" : "hover:bg-muted")}
                >
                  Responder ao paciente
                </button>
                <button
                  onClick={() => setInterna(true)}
                  className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs", interna ? "bg-amber-500 text-white" : "hover:bg-muted")}
                >
                  <Lock className="h-3 w-3" /> Nota interna
                </button>
                {rapidas.length > 0 && (
                  <Popover open={rapidasAberto} onOpenChange={setRapidasAberto}>
                    <PopoverTrigger asChild>
                      <button className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs hover:bg-muted">
                        <Zap className="h-3 w-3" /> Respostas rápidas
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="max-h-80 w-80 overflow-y-auto p-1">
                      {rapidas.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            usarRapida(r);
                          }}
                          className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
                        >
                          <p className="text-sm font-medium">{r.titulo}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{r.texto}</p>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {rapidasFiltradas.length > 0 && (
                <div className="mb-1.5 max-h-48 overflow-y-auto rounded-md border bg-background p-1 shadow-sm">
                  {rapidasFiltradas.map((r, i) => (
                    <button key={i} onClick={() => usarRapida(r)} className="block w-full rounded px-2 py-1.5 text-left hover:bg-muted">
                      <span className="text-xs font-medium">/{r.titulo}</span>
                      <span className="ml-2 line-clamp-1 text-[11px] text-muted-foreground">{aplicarVariaveis(r.texto)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <input
                  ref={arquivoRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) enviar(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => arquivoRef.current?.click()}
                  disabled={enviando || (!podeMexer && !interna)}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-40"
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <Textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (rapidasFiltradas.length) return usarRapida(rapidasFiltradas[0]);
                      enviar();
                    }
                  }}
                  rows={2}
                  maxLength={4000}
                  disabled={!podeMexer && !interna}
                  placeholder={interna ? "Nota visível só para a equipe..." : "Escreva a resposta (Enter envia, Shift+Enter quebra linha)"}
                  className={cn("min-h-[44px] flex-1 resize-none", interna && "border-amber-300 bg-amber-50")}
                />
                {!interna && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={sugerirResposta}
                    disabled={sugerindo || !podeMexer}
                    title="Sugerir resposta com IA (se houver texto, ela usa como orientação)"
                    aria-label="Sugerir resposta"
                  >
                    {sugerindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                )}
                <Button onClick={() => enviar()} disabled={enviando || !texto.trim() || (!podeMexer && !interna)} size="icon" aria-label="Enviar">
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
        {sel && (
          <div className="hidden min-h-0 overflow-y-auto border-l xl:block">
            <FichaPacienteChat
              conversa={sel}
              anexosNaConversa={mensagens.filter((m) => m.anexo_path).length}
              onAbrirPedido={abrirPedido}
              onAbrirConversa={(id) => {
                setFiltro("todas");
                setSelId(id);
              }}
            />
          </div>
        )}
      </div>

      <Sheet open={fichaAberta} onOpenChange={setFichaAberta}>
        <SheetContent className="w-[340px] overflow-y-auto p-0 sm:max-w-[340px]">
          <SheetHeader className="border-b p-3">
            <SheetTitle>Ficha do paciente</SheetTitle>
          </SheetHeader>
          {sel && (
            <FichaPacienteChat
              conversa={sel}
              anexosNaConversa={mensagens.filter((m) => m.anexo_path).length}
              onAbrirPedido={(id) => {
                setFichaAberta(false);
                abrirPedido(id);
              }}
              onAbrirConversa={(id) => {
                setFichaAberta(false);
                setFiltro("todas");
                setSelId(id);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <ModalPedidoStaff pedido={pedidoModal} onClose={() => setPedidoModal(null)} />

      <Dialog open={!!transferir} onOpenChange={(o) => !o && setTransferir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Para</Label>
              <Select value={transferir?.para ?? ""} onValueChange={(v) => setTransferir((t) => (t ? { ...t, para: v } : t))}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o atendente" />
                </SelectTrigger>
                <SelectContent>
                  {atendentes
                    .filter((a) => a.user_id !== sel?.responsavel_id)
                    .map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.nome}
                        {a.user_id === userId ? " (você)" : ""}
                        {a.role === "admin" ? " · admin" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observação para o colega (nota interna, opcional)</Label>
              <Textarea
                rows={3}
                value={transferir?.obs ?? ""}
                onChange={(e) => setTransferir((t) => (t ? { ...t, obs: e.target.value } : t))}
                placeholder="Ex.: paciente quer reagendar, já conferi o pedido."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferir(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarTransferencia} disabled={!transferir?.para}>
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Separador = ({ iso }: { iso: string }) => (
  <div className="flex justify-center py-1">
    <span className="text-[11px] font-medium capitalize text-muted-foreground">{dia(iso)}</span>
  </div>
);
