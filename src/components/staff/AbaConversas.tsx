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
  MoreVertical,
  Star,
  Gauge,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { PainelQualidade } from "./PainelQualidade";
import { useStaffPerfil } from "@/hooks/useStaffPerfil";
import { pode } from "@/lib/permissoes";
import { PlayerAudio } from "@/components/audio/PlayerAudio";
import { BarraGravando, BotaoMicrofone, gravacaoSuportada, useGravadorAudio } from "@/components/audio/useGravadorAudio";
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
  avaliacao_nota: number | null;
  avaliacao_comentario: string | null;
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

const STATUS_LABEL: Record<Conversa["status"], { label: string; cls: string; dot: string }> = {
  ia: { label: "IA atendendo", cls: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  aguardando: { label: "Aguardando atendente", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  humano: { label: "Em atendimento", cls: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  encerrada: { label: "Encerrada", cls: "bg-muted text-muted-foreground", dot: "bg-gray-400" },
};

const COLS_CONVERSA =
  "id, status, ia_ativa, responsavel_id, paciente_id, canal, ultima_msg_em, ultima_msg_texto, ultima_msg_autor, nao_lidas, created_at, pacientes(nome, nome_social, celular, email), lead_nome, lead_telefone, lead_email, unidade_codigo_shift, unidade_nome, pedido_protocolo, fila_desde, resumo, resumo_em, avaliacao_nota, avaliacao_comentario";

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

const Anexo = ({ m, url, claro = false }: { m: Mensagem; url: string | null; claro?: boolean }) => {
  if (!m.anexo_path) return null;
  const nome = m.anexo_nome ?? "anexo";
  if (!url) return <p className="mt-1 text-xs opacity-70">📎 {nome} (carregando...)</p>;
  if ((m.anexo_mime ?? "").startsWith("audio/")) return <PlayerAudio src={url} claro={claro} />;
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
  const [qualidadeAberta, setQualidadeAberta] = useState(false);
  const [lacunasAbertas, setLacunasAbertas] = useState(0);
  const perfilStaff = useStaffPerfil();
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const enviarRef = useRef<(f?: File) => void>(() => {});
  const gravador = useGravadorAudio({ onPronto: (f) => enviarRef.current(f), onErro: (m) => toast.error(m) });
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
    db.from("ia_lacunas").select("pergunta_norm").eq("status", "aberta").limit(500).then(({ data }: any) =>
      setLacunasAbertas(new Set((data ?? []).map((x: any) => x.pergunta_norm)).size),
    );
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
  const podeResponder = isAdmin || pode(perfilStaff.permissoes as any, "conversas", "editar");
  const podeMexer = !!sel && podeResponder && (!sel.responsavel_id || ehMinha || isAdmin);

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

  enviarRef.current = (f?: File) => void enviar(f);

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
    // Agrupa mensagens seguidas do mesmo autor (até 3 min): mostra rótulo só na primeira.
    const continua =
      !sep && !!ant && ant.autor === m.autor && ant.autor_nome === m.autor_nome &&
      new Date(m.created_at).getTime() - new Date(ant.created_at).getTime() < 3 * 60_000;
    let corpo: JSX.Element | null = null;

    if (m.autor === "sistema") {
      if (!m.texto && !acoes.length) return sep ? <Separador iso={m.created_at} /> : null;
      corpo = (
        <div className="flex justify-center py-0.5">
          <span
            className={cn(
              "max-w-[85%] rounded-full border px-3 py-1 text-center text-[11px] shadow-sm",
              m.meta?.evento === "avaliacao_baixa"
                ? "border-red-200 bg-red-50 font-medium text-red-700"
                : m.meta?.evento === "avaliacao_recebida"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : m.meta?.evento === "tarefa"
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "bg-white/80 text-muted-foreground",
            )}
          >
            {m.texto ?? `🛒 Carrinho montado pela voz: ${acoes.flatMap((a) => a.itens?.map((i: any) => i.nome) ?? []).join(", ")}`}
            <span className="ml-2 opacity-60">{hora(m.created_at)}</span>
          </span>
        </div>
      );
    } else if (m.autor === "nota") {
      corpo = (
        <div className="mx-auto w-full max-w-[85%] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 shadow-sm">
          <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <Lock className="h-3 w-3" /> Nota interna · {m.autor_nome} · {hora(m.created_at)}
          </p>
          <p className="whitespace-pre-line">{m.texto}</p>
          <Anexo m={m} url={anexoUrl(m.anexo_path)} />
        </div>
      );
    } else {
      const doPaciente = m.autor === "paciente";
      const rotulo = doPaciente ? (sel ? nomeConversa(sel) : "Paciente") : m.autor === "assistente" ? "Assistente IA" : m.autor_nome ?? "Equipe";
      const avatar = doPaciente ? (
        <Avatar nome={rotulo} />
      ) : m.autor === "assistente" ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <Bot className="h-4 w-4" />
        </div>
      ) : (
        <Avatar nome={rotulo} escuro />
      );
      corpo = (
        <div className={cn("flex items-end gap-2", doPaciente ? "justify-start" : "flex-row-reverse", continua && "-mt-1.5")}>
          <div className="w-7 shrink-0">{!continua && avatar}</div>
          <div className={cn("flex max-w-[75%] flex-col", doPaciente ? "items-start" : "items-end")}>
            {!continua && (
              <p className="mb-0.5 flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground">
                {voz && <Mic className="h-3 w-3" />}
                {rotulo}
              </p>
            )}
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                doPaciente && "rounded-bl-md border bg-white text-foreground",
                m.autor === "assistente" && "rounded-br-md border border-violet-100 bg-violet-50 text-violet-950",
                m.autor === "equipe" && "rounded-br-md bg-brand-2 text-white",
              )}
            >
              {(m.anexo_mime ?? "").startsWith("audio/") && <Anexo m={m} url={anexoUrl(m.anexo_path)} claro={m.autor === "equipe"} />}
              {m.texto &&
                (m.meta?.audio && doPaciente ? (
                  <p className="mt-1 border-t pt-1 text-xs italic text-muted-foreground">
                    <span className="not-italic font-medium">Transcrição: </span>
                    {m.texto}
                  </p>
                ) : (
                  <p className="whitespace-pre-line">{m.texto}</p>
                ))}
              {m.meta?.audio && doPaciente && !m.texto && <p className="mt-1 text-[11px] italic text-muted-foreground">Sem transcrição (chave da OpenAI não configurada).</p>}
              {!(m.anexo_mime ?? "").startsWith("audio/") && <Anexo m={m} url={anexoUrl(m.anexo_path)} />}
              {acoes.map((a, j) => (
                <p key={j} className="mt-1.5 flex items-start gap-1 rounded-lg bg-white/80 px-2 py-1 text-[11px] text-secondary">
                  <ShoppingCart className="mt-0.5 h-3 w-3 shrink-0" />
                  Carrinho ({a.tipo_compra}{a.unidade_nome ? ` · ${a.unidade_nome}` : ""}): {(a.itens ?? []).map((i: any) => i.nome).join(", ")}
                </p>
              ))}
            </div>
            <span className="mt-0.5 px-1 text-[10px] text-muted-foreground/80">{hora(m.created_at)}</span>
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

  const kpis = [
    { id: "fila" as Filtro, label: "Na fila", valor: contagem.fila, cls: "text-amber-700 bg-amber-50 border-amber-200" },
    { id: "minhas" as Filtro, label: "Minhas não lidas", valor: contagem.minhas, cls: "text-blue-700 bg-blue-50 border-blue-200" },
    { id: "ia" as Filtro, label: "Com a IA", valor: contagem.ia, cls: "text-violet-700 bg-violet-50 border-violet-200" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Cabeçalho da página (compacto: a conversa ocupa a tela) */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="rounded-xl bg-secondary/10 p-2 text-secondary">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="mr-auto">
          <h1 className="text-xl font-bold leading-tight text-secondary">Conversas</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">Atendimento do chat do site: IA, fila e equipe no mesmo lugar.</p>
        </div>
        <div className="hidden gap-2 lg:flex">
          {kpis.map((k) => (
            <button
              key={k.id}
              onClick={() => setFiltro(k.id)}
              className={cn("rounded-xl border px-3 py-1.5 text-left transition hover:shadow-sm", k.cls, filtro === k.id && "ring-2 ring-current/20")}
            >
              <p className="text-base font-bold leading-none">{k.valor}</p>
              <p className="text-[11px]">{k.label}</p>
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="relative rounded-full" onClick={() => setQualidadeAberta(true)}>
          <Gauge className="mr-1 h-4 w-4" /> Qualidade
          {lacunasAbertas > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white" title="Perguntas que a IA não soube responder">
              {lacunasAbertas}
            </span>
          )}
        </Button>
        <div className="flex items-center gap-1 rounded-full border bg-background p-1 text-xs shadow-sm">
          {(["online", "ausente"] as const).map((st) => (
            <button
              key={st}
              onClick={() => mudarMeuStatus(st)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition",
                meuStatus === st ? (st === "online" ? "bg-green-600 text-white shadow" : "bg-amber-500 text-white shadow") : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", st === "online" ? "bg-green-300" : "bg-amber-200", meuStatus === st && st === "online" && "animate-pulse")} />
              {st === "online" ? "Online" : "Ausente"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-2xl border bg-background shadow-sm md:grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr_320px] 2xl:grid-cols-[380px_1fr_360px]">
        {/* Lista */}
        <div className={cn("flex min-h-0 flex-col border-r bg-muted/20", sel && "hidden md:flex")}>
          <div className="space-y-2.5 border-b bg-background p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nome, telefone, protocolo..."
                className="rounded-full border-0 bg-muted/60 pl-9 focus-visible:ring-1"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {FILTROS.map((f) => {
                const n = f.id === "fila" ? contagem.fila : f.id === "minhas" ? contagem.minhas : 0;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFiltro(f.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
                      filtro === f.id ? "bg-secondary text-white shadow-sm" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {f.label}
                    {n > 0 && (
                      <span className={cn("rounded-full px-1.5 text-[10px] font-bold", filtro === f.id ? "bg-white/25" : "bg-brand text-white")}>{n}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {unidadesNaLista.length > 1 && (
              <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
                <SelectTrigger className="h-8 rounded-full text-xs">
                  <MapPin className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
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
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {carregando ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : lista.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 opacity-30" />
                <p className="text-sm">{filtro === "fila" ? "Ninguém esperando. 🎉" : "Nenhuma conversa aqui."}</p>
              </div>
            ) : (
              listaOrdenada.map((c) => {
                const m = espera(c);
                const atrasado = m !== null && m >= (filaCfg?.prazo_min ?? 5);
                const ativa = c.id === selId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelId(c.id)}
                    className={cn(
                      "flex w-full gap-3 border-b border-l-[3px] px-3 py-3 text-left transition",
                      ativa ? "border-l-secondary bg-background" : "border-l-transparent hover:bg-background/70",
                    )}
                  >
                    <div className="relative">
                      <Avatar nome={nomeConversa(c)} grande />
                      <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", STATUS_LABEL[c.status].dot)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("truncate text-sm", c.nao_lidas > 0 ? "font-bold" : "font-medium")}>{nomeConversa(c)}</span>
                        <span className={cn("ml-auto shrink-0 text-[10px]", c.nao_lidas > 0 ? "font-semibold text-brand" : "text-muted-foreground")}>
                          {quando(c.ultima_msg_em)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={cn("min-w-0 flex-1 truncate text-xs", c.nao_lidas > 0 ? "text-foreground" : "text-muted-foreground")}>
                          {c.ultima_msg_autor === "assistente" && <Bot className="mr-0.5 inline h-3 w-3" />}
                          {c.ultima_msg_autor === "equipe" && <span className="text-muted-foreground">Equipe: </span>}
                          {c.ultima_msg_texto}
                        </p>
                        {c.nao_lidas > 0 && (
                          <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                            {c.nao_lidas}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_LABEL[c.status].cls)}>{STATUS_LABEL[c.status].label}</span>
                        {c.avaliacao_nota && (
                          <span
                            className={cn(
                              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              c.avaliacao_nota <= 2 ? "bg-red-100 text-red-700" : "bg-amber-50 text-amber-700",
                            )}
                            title={c.avaliacao_comentario ?? "Avaliação do paciente"}
                          >
                            <Star className="h-2.5 w-2.5 fill-current" /> {c.avaliacao_nota}
                          </span>
                        )}
                        {c.unidade_nome && (
                          <span className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" /> {c.unidade_nome}
                          </span>
                        )}
                        {c.responsavel_id && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {c.responsavel_id === userId ? "com você" : nomeAtendente(c.responsavel_id)?.split(" ")[0]}
                          </span>
                        )}
                        {m !== null && (
                          <span
                            className={cn(
                              "ml-auto flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              atrasado ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground",
                            )}
                            title={c.status === "aguardando" ? "Esperando na fila" : "Paciente sem resposta"}
                          >
                            <Clock className="h-2.5 w-2.5" /> {fmtMin(m)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversa */}
        {!sel ? (
          <div className="hidden flex-col items-center justify-center gap-3 bg-muted/10 text-muted-foreground md:flex">
            <div className="rounded-full bg-secondary/5 p-6">
              <MessageSquare className="h-10 w-10 text-secondary/40" />
            </div>
            <p className="text-sm font-medium">Selecione uma conversa</p>
            <p className="max-w-xs text-center text-xs">
              Fique <b>Online</b> para receber conversas automaticamente. A ficha do paciente e o resumo da IA aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <button className="md:hidden" onClick={() => setSelId(null)} aria-label="Voltar">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar nome={nomeConversa(sel)} grande />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{nomeConversa(sel)}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_LABEL[sel.status].cls)}>
                    {STATUS_LABEL[sel.status].label}
                    {sel.responsavel_id && ` · ${ehMinha ? "com você" : nomeAtendente(sel.responsavel_id)}`}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {telefone(sel) && <span>{telefone(sel)}</span>}
                  {sel.unidade_nome ? (
                    <span className="flex items-center gap-0.5 font-medium text-secondary">
                      <MapPin className="h-3 w-3" /> {sel.unidade_nome}
                    </span>
                  ) : (
                    <span className="text-amber-700">Sem unidade ainda</span>
                  )}
                  {sel.pedido_protocolo && (
                    <span className="flex items-center gap-0.5 font-medium text-secondary">
                      <ClipboardList className="h-3 w-3" /> {sel.pedido_protocolo}
                    </span>
                  )}
                  {!sel.pacientes && <span>Visitante</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                    sel.ia_ativa ? "border-violet-200 bg-violet-50 text-violet-700" : "text-muted-foreground",
                  )}
                  title="Quando ligada, a IA responde o paciente"
                >
                  <Bot className="h-3.5 w-3.5" /> IA
                  <Switch
                    checked={sel.ia_ativa}
                    disabled={!podeMexer}
                    className="scale-75"
                    onCheckedChange={(v) => rpc("chat_definir_ia", { _conversa: sel.id, _ativa: v }, v ? "IA ligada nesta conversa." : "IA desligada: você está atendendo.")}
                  />
                </label>
                {(!ehMinha || sel.ia_ativa || sel.status !== "humano") && podeMexer && sel.status !== "encerrada" && (
                  <Button size="sm" className="rounded-full" onClick={() => rpc("chat_assumir", { _conversa: sel.id }, "Você assumiu a conversa.")}>
                    <UserCheck className="mr-1 h-4 w-4" /> Assumir
                  </Button>
                )}
                <Button size="sm" variant="outline" className="rounded-full xl:hidden" onClick={() => setFichaAberta(true)} aria-label="Ficha do paciente">
                  <PanelRight className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="rounded-full" aria-label="Mais ações">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem disabled={!podeMexer} onClick={() => setTransferir({ para: "", obs: "" })}>
                      <Users className="mr-2 h-4 w-4" /> Transferir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => gerarResumo(sel.id, true)}>
                      <Sparkles className="mr-2 h-4 w-4" /> Atualizar resumo da IA
                    </DropdownMenuItem>
                    {sel.status !== "encerrada" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={!podeMexer}
                          className="text-destructive focus:text-destructive"
                          onClick={() => window.confirm("Encerrar este atendimento?") && rpc("chat_encerrar", { _conversa: sel.id }, "Atendimento encerrado.")}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Encerrar atendimento
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f6f7f9] px-4 py-3">
              {(resumo.texto || resumo.carregando) && (
                <div className="sticky top-0 z-10 rounded-xl border border-violet-200 bg-white/95 p-3 text-xs shadow-sm backdrop-blur">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-violet-700">
                    <Sparkles className="h-3.5 w-3.5" /> Resumo da IA
                    <button className="ml-auto opacity-60 hover:opacity-100" onClick={() => gerarResumo(sel.id, true)} aria-label="Atualizar resumo" title="Atualizar">
                      <RefreshCw className={cn("h-3.5 w-3.5", resumo.carregando && "animate-spin")} />
                    </button>
                  </div>
                  {resumo.texto ? <p className="whitespace-pre-line text-foreground/80">{resumo.texto}</p> : <p className="text-muted-foreground">Resumindo a conversa...</p>}
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

            {/* Escrever */}
            <div className="border-t bg-background p-3">
              {!podeMexer && !interna && (
                <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Conversa com {nomeAtendente(sel.responsavel_id)}. Você pode deixar uma nota interna.
                </p>
              )}
              {rapidasFiltradas.length > 0 && (
                <div className="mb-2 max-h-48 overflow-y-auto rounded-xl border bg-background p-1 shadow-md">
                  {rapidasFiltradas.map((r, i) => (
                    <button key={i} onClick={() => usarRapida(r)} className={cn("block w-full rounded-lg px-2.5 py-1.5 text-left hover:bg-muted", i === 0 && "bg-muted/60")}>
                      <span className="text-xs font-semibold">/{r.titulo}</span>
                      <span className="ml-2 line-clamp-1 text-[11px] text-muted-foreground">{aplicarVariaveis(r.texto)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className={cn("rounded-2xl border shadow-sm focus-within:ring-2", interna ? "border-amber-300 bg-amber-50/60 focus-within:ring-amber-200" : "focus-within:ring-secondary/20")}>
                <div className="flex items-center gap-1 border-b px-2 py-1.5">
                  <button
                    onClick={() => setInterna(false)}
                    className={cn("rounded-full px-3 py-1 text-xs font-medium transition", !interna ? "bg-secondary text-white" : "text-muted-foreground hover:bg-muted")}
                  >
                    Responder
                  </button>
                  <button
                    onClick={() => setInterna(true)}
                    className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition", interna ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted")}
                  >
                    <Lock className="h-3 w-3" /> Nota interna
                  </button>
                  {rapidas.length > 0 && (
                    <Popover open={rapidasAberto} onOpenChange={setRapidasAberto}>
                      <PopoverTrigger asChild>
                        <button className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                          <Zap className="h-3 w-3" /> Respostas rápidas
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="max-h-80 w-80 overflow-y-auto p-1">
                        {rapidas.map((r, i) => (
                          <button key={i} onClick={() => usarRapida(r)} className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-muted">
                            <p className="text-sm font-medium">{r.titulo}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{aplicarVariaveis(r.texto)}</p>
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
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
                  placeholder={
                    interna
                      ? "Nota visível só para a equipe..."
                      : sel.ia_ativa && podeMexer
                        ? "Ao responder, você assume a conversa e a IA para. Digite / para respostas rápidas."
                        : "Escreva a resposta... (/ para respostas rápidas)"
                  }
                  className="min-h-[56px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center gap-1 px-2 pb-2">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => arquivoRef.current?.click()}
                    disabled={enviando || (!podeMexer && !interna)}
                    className="h-8 rounded-full px-2 text-muted-foreground"
                    aria-label="Anexar arquivo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  {!interna && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={sugerirResposta}
                      disabled={sugerindo || !podeMexer}
                      className="h-8 rounded-full px-2.5 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
                      title="A IA escreve uma resposta; se houver texto no campo, ela usa como orientação"
                    >
                      {sugerindo ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />} Sugerir
                    </Button>
                  )}
                  {gravador.gravando ? (
                    <div className="ml-auto flex min-w-0 flex-1 sm:max-w-sm">
                      <BarraGravando segundos={gravador.segundos} onCancelar={gravador.cancelar} onEnviar={gravador.enviar} />
                    </div>
                  ) : (
                    <>
                      <span className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">Enter envia · Shift+Enter quebra linha</span>
                      {!texto.trim() && gravacaoSuportada() ? (
                        <BotaoMicrofone
                          onClick={gravador.iniciar}
                          disabled={enviando || (!podeMexer && !interna)}
                          className={cn("h-8 w-8", interna && "bg-amber-500 hover:bg-amber-600")}
                        />
                      ) : (
                        <Button
                          onClick={() => enviar()}
                          disabled={enviando || !texto.trim() || (!podeMexer && !interna)}
                          size="sm"
                          className={cn("h-8 rounded-full px-4", interna && "bg-amber-500 hover:bg-amber-600")}
                        >
                          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                          {!enviando && (interna ? "Salvar nota" : "Enviar")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
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

      <PainelQualidade
        aberto={qualidadeAberta}
        onFechar={() => {
          setQualidadeAberta(false);
          db.from("ia_lacunas").select("pergunta_norm").eq("status", "aberta").limit(500).then(({ data }: any) =>
            setLacunasAbertas(new Set((data ?? []).map((x: any) => x.pergunta_norm)).size),
          );
        }}
        nomeAtendente={nomeAtendente}
        podeEditarIA={pode(perfilStaff.permissoes as any, "agente", "editar")}
        onAbrirConversa={(id) => {
          setQualidadeAberta(false);
          setFiltro(conversas.find((c) => c.id === id)?.status === "encerrada" ? "encerradas" : "todas");
          setSelId(id);
        }}
      />

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
  <div className="flex items-center gap-3 py-2">
    <div className="h-px flex-1 bg-border" />
    <span className="text-[11px] font-medium capitalize text-muted-foreground">{dia(iso)}</span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const CORES_AVATAR = ["bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-800", "bg-indigo-100 text-indigo-700", "bg-teal-100 text-teal-700", "bg-fuchsia-100 text-fuchsia-700"];
/** Avatar com iniciais e cor fixa por nome. */
const Avatar = ({ nome, grande = false, escuro = false }: { nome: string; grande?: boolean; escuro?: boolean }) => {
  const partes = nome.trim().split(/\s+/);
  const ini = ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase() || "?";
  const cor = escuro ? "bg-brand-2 text-white" : CORES_AVATAR[[...nome].reduce((a, ch) => a + ch.charCodeAt(0), 0) % CORES_AVATAR.length];
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", grande ? "h-10 w-10 text-sm" : "h-7 w-7 text-[11px]", cor)}>
      {ini}
    </div>
  );
};
