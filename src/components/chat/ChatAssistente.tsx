import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileText, Headset, Loader2, MessageCircle, Mic, MicOff, Paperclip, Phone, PhoneOff, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSacola, type ItemSacola } from "@/stores/sacola";
import { cn } from "@/lib/utils";
import { useLigacaoVoz, type SessaoVoz } from "./useLigacaoVoz";

type Acao = { tipo: "carrinho"; tipo_compra: "particular" | "convenio"; itens: ItemSacola[] };
type Msg = {
  id?: string;
  autor: "paciente" | "assistente" | "equipe" | "sistema";
  texto: string;
  acoes?: Acao[];
  voz?: boolean;
  autor_nome?: string | null;
  anexo?: { nome: string; mime: string; url: string | null } | null;
};
type Atendimento = { status: "ia" | "aguardando" | "humano" | "encerrada"; ia_ativa: boolean; atendente: string | null };
type Status = {
  chat: "desligado" | "teste" | "ligado";
  voz: boolean;
  nome?: string;
  boas_vindas?: string | null;
  texto_botao?: string;
  posicao?: "direita" | "esquerda";
  cor?: string | null;
  abrir_auto_seg?: number;
  sugestoes?: string[];
  paginas_ocultas?: string[];
  anexos?: boolean;
  atendente?: boolean;
};

const CHAVE = "sancet_chat_v1";
const CHAVE_TESTE = "sancet_chat_teste";
const MAX_BYTES = 10 * 1024 * 1024;
const CHAVE_AUTO = "sancet_chat_auto_aberto";
const SAUDACAO: Msg = {
  id: "saudacao",
  autor: "assistente",
  texto:
    "Olá! Sou a assistente virtual da Sancet. 😊\nPosso tirar dúvidas sobre exames, preços, preparo e unidades, ou ajudar você a agendar.\nSe tiver o pedido médico, é só mandar a foto pelo clipe 📎.",
};

type Estado = {
  conversa_id?: string;
  token?: string;
  canal?: string | null;
  ultimo?: string | null; // última novidade da equipe já recebida
  atendimento?: Atendimento;
  nao_lidas?: number;
  mensagens: Msg[];
};
const ler = (): Estado => {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (s && Array.isArray(s.mensagens)) return s;
  } catch {
    /* sem storage */
  }
  return { mensagens: [SAUDACAO] };
};
const gravar = (e: Estado) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...e, mensagens: e.mensagens.slice(-60) }));
  } catch {
    /* sem storage */
  }
};

/** Texto simples com **negrito** e quebras de linha. */
const Formatado = ({ texto }: { texto: string }) => (
  <span className="whitespace-pre-line">
    {texto.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>,
    )}
  </span>
);

/** Código do link de teste (?assistente=...), guardado neste navegador. */
const lerCodigoTeste = (): string | null => {
  try {
    const url = new URL(window.location.href);
    const c = url.searchParams.get("assistente");
    if (c) {
      localStorage.setItem(CHAVE_TESTE, c);
      url.searchParams.delete("assistente");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      return c;
    }
    return localStorage.getItem(CHAVE_TESTE);
  } catch {
    return null;
  }
};

const fmtTempo = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const paraBase64 = (f: File) =>
  new Promise<string>((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = erro;
    r.readAsDataURL(f);
  });

export const ChatAssistente = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setTipo, adicionar, limpar } = useSacola();
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<Estado>(ler);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [codigoTeste] = useState(lerCodigoTeste);
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  useEffect(() => {
    (supabase as any)
      .rpc("assistente_status")
      .then(({ data }: any) => setStatus(data ?? { chat: "desligado", voz: false }));
  }, []);

  /** Chama a edge function com conversa + código de teste; atualiza id/token. */
  const chamar = useCallback(
    async (corpo: Record<string, unknown>) => {
      const { conversa_id, token } = estadoRef.current;
      const { data, error } = await supabase.functions.invoke("sancet-assistente", {
        body: { ...corpo, conversa_id, token, teste: codigoTeste ?? undefined },
      });
      if (error) {
        const st = (error as any)?.context?.status;
        const det = await (error as any)?.context?.json?.().catch(() => null);
        if (st === 403 && det?.indisponivel) setStatus({ chat: "desligado", voz: false });
        throw new Error(det?.error ?? "erro");
      }
      if (data?.error) throw new Error(data.error);
      if (data?.conversa_id) {
        const extra: Partial<Estado> = { conversa_id: data.conversa_id };
        if (data.token) extra.token = data.token;
        if (data.canal) extra.canal = data.canal;
        if (data.status) extra.atendimento = { status: data.status, ia_ativa: data.ia_ativa, atendente: data.atendente ?? null };
        setEstado((s) => ({ ...s, ...extra }));
        estadoRef.current = { ...estadoRef.current, ...extra };
      }
      return data;
    },
    [codigoTeste],
  );

  const addMsg = (m: Msg) => setEstado((s) => ({ ...s, mensagens: [...s.mensagens, m] }));

  const abertoRef = useRef(aberto);
  abertoRef.current = aberto;
  const sincronizando = useRef(false);
  /** Busca respostas da equipe e avisos (o servidor valida o token da conversa). */
  const sincronizar = useCallback(async () => {
    if (!estadoRef.current.conversa_id || sincronizando.current) return;
    sincronizando.current = true;
    try {
      const d = await chamar({ acao: "sincronizar", desde: estadoRef.current.ultimo ?? undefined });
      const novas: Msg[] = (d?.mensagens ?? []).map((m: any) => ({
        id: m.id,
        autor: m.autor,
        autor_nome: m.autor_nome,
        texto: m.texto ?? "",
        anexo: m.anexo,
      }));
      setEstado((s) => {
        const ids = new Set(s.mensagens.map((m) => m.id).filter(Boolean));
        const add = novas.filter((m) => !ids.has(m.id));
        const daEquipe = add.filter((m) => m.autor === "equipe").length;
        return {
          ...s,
          ultimo: d?.ultimo ?? s.ultimo,
          mensagens: add.length ? [...s.mensagens, ...add] : s.mensagens,
          nao_lidas: abertoRef.current ? 0 : (s.nao_lidas ?? 0) + daEquipe,
        };
      });
      estadoRef.current = { ...estadoRef.current, ultimo: d?.ultimo ?? estadoRef.current.ultimo };
    } catch {
      /* tenta de novo no próximo ciclo */
    } finally {
      sincronizando.current = false;
    }
  }, [chamar]);

  // Aviso instantâneo (canal secreto da conversa) + conferência periódica.
  useEffect(() => {
    if (!estado.canal || !status || status.chat === "desligado") return;
    const ch = supabase
      .channel(`chat-${estado.canal}`)
      .on("broadcast", { event: "nova" }, () => sincronizar())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [estado.canal, status, sincronizar]);
  useEffect(() => {
    if (!estado.conversa_id || !status || status.chat === "desligado") return;
    sincronizar();
    const iv = window.setInterval(sincronizar, aberto ? 15_000 : 60_000);
    return () => window.clearInterval(iv);
  }, [estado.conversa_id, aberto, status, sincronizar]);
  useEffect(() => {
    if (aberto && estado.nao_lidas) setEstado((s) => ({ ...s, nao_lidas: 0 }));
  }, [aberto, estado.nao_lidas]);

  const ligacao = useLigacaoVoz({
    obterSessao: useCallback(async () => (await chamar({ acao: "voz_iniciar" })) as SessaoVoz, [chamar]),
    executarFerramenta: async (nome, args) => {
      const r = await chamar({ acao: "ferramenta", nome, args });
      if (Array.isArray(r?.acoes) && r.acoes.length) {
        addMsg({ autor: "assistente", texto: "Montei o seu carrinho pela ligação. 👇", acoes: r.acoes, voz: true });
      }
      return r?.resultado ?? {};
    },
    salvarTranscricao: async (itens, fim) => {
      if (itens.length || fim) await chamar({ acao: "transcricao", itens, fim });
    },
    onFala: (f) => addMsg({ ...f, voz: true }),
    onErro: (msg) => toast.error(msg),
  });

  useEffect(() => gravar(estado), [estado]);
  useEffect(() => {
    const seg = status?.abrir_auto_seg ?? 0;
    if (!seg || status?.chat === "desligado") return;
    try {
      if (localStorage.getItem(CHAVE_AUTO)) return;
    } catch {
      return;
    }
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(CHAVE_AUTO, "1");
      } catch {
        /* sem storage */
      }
      setAberto(true);
    }, seg * 1000);
    return () => window.clearTimeout(t);
  }, [status]);
  // Saiu para o painel da equipe ou o admin desligou: encerra a ligação.
  const desligar = ligacao.encerrar;
  useEffect(() => {
    if (location.pathname.startsWith("/staff") || !status?.voz) desligar();
  }, [location.pathname, status?.voz, desligar]);
  useEffect(() => {
    if (aberto) setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [aberto, estado.mensagens.length, enviando]);

  // Painel da equipe não mostra o chat; e só aparece se o admin master liberou.
  const visivel = status && (status.chat === "ligado" || (status.chat === "teste" && !!codigoTeste));
  const oculta = (status?.paginas_ocultas ?? []).some((p) => p && location.pathname.startsWith(p));
  if (location.pathname.startsWith("/staff") || !visivel || oculta) return null;
  const cor = status.cor || undefined;
  const lado = status.posicao === "esquerda" ? "left-4" : "right-4";
  const ladoSm = status.posicao === "esquerda" ? "sm:left-4" : "sm:right-4";
  const semConversa = !estado.mensagens.some((m) => m.autor === "paciente");
  const emLigacao = ligacao.estado !== "inativa";
  const atend = estado.atendimento;
  const comHumano = !!atend && !atend.ia_ativa;

  const enviar = async (mensagem: string, anexo?: File) => {
    if ((!mensagem.trim() && !anexo) || enviando) return;
    const minha: Msg = { autor: "paciente", texto: anexo ? `📎 ${anexo.name}${mensagem ? `\n${mensagem}` : ""}` : mensagem };
    setEstado((s) => ({ ...s, mensagens: [...s.mensagens, minha] }));
    setTexto("");
    setEnviando(true);
    try {
      const corpo: any = { mensagem };
      if (anexo) corpo.anexo = { base64: await paraBase64(anexo), mime: anexo.type, nome: anexo.name };
      const data = await chamar(corpo);
      if (data.resposta) {
        setEstado((s) => ({ ...s, mensagens: [...s.mensagens, { autor: "assistente", texto: data.resposta, acoes: data.acoes ?? [] }] }));
      }
      sincronizar();
    } catch (e: any) {
      setEstado((s) => ({
        ...s,
        mensagens: [...s.mensagens, { autor: "assistente", texto: "Não consegui responder agora. Pode tentar de novo em instantes?" }],
      }));
    } finally {
      setEnviando(false);
    }
  };

  const continuarAgendamento = (a: Acao) => {
    if (emLigacao) ligacao.encerrar();
    limpar();
    setTipo(a.tipo_compra);
    a.itens.forEach((it) => adicionar(it));
    setAberto(false);
    navigate(a.tipo_compra === "convenio" ? "/exames/convenio/escolher-convenio" : "/sacola");
    toast.success(`${a.itens.length} exame(s) no seu carrinho. Vamos continuar!`);
  };

  const pedirAtendente = async () => {
    try {
      await chamar({ acao: "pedir_humano" });
      await sincronizar();
    } catch {
      toast.error("Não foi possível chamar um atendente agora.");
    }
  };

  const novaConversa = () => {
    if (emLigacao) return toast.info("Encerre a ligação antes de começar outra conversa.");
    if (!window.confirm("Começar uma nova conversa?")) return;
    setEstado({ mensagens: [SAUDACAO] });
  };

  return (
    <>
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className={cn(
            "fixed bottom-24 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 md:bottom-6",
            lado,
          )}
          style={cor ? { backgroundColor: cor } : undefined}
          aria-label="Abrir assistente virtual"
        >
          <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">{status.texto_botao || "Fale com a Sancet"}</span>
          {!!estado.nao_lidas && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold">
              {estado.nao_lidas}
            </span>
          )}
        </button>
      )}

      {aberto && (
        <div className={cn(
            "fixed inset-x-2 bottom-2 top-16 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:inset-x-auto sm:top-auto sm:h-[600px] sm:w-[380px]",
            ladoSm,
          )}>
          <div className="flex items-center gap-2 bg-brand px-4 py-3 text-white" style={cor ? { backgroundColor: cor } : undefined}>
            <MessageCircle className="h-5 w-5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{comHumano && atend?.atendente ? atend.atendente : status.nome || "Assistente Sancet"}</p>
              <p className="text-[11px] opacity-90">
                {atend?.status === "aguardando"
                  ? "Aguardando um atendente da equipe..."
                  : comHumano
                    ? "Equipe Sancet · atendimento humano"
                    : "Respostas automáticas · não substitui orientação médica"}
              </p>
            </div>
            {status.voz && !emLigacao && !comHumano && (
              <button
                onClick={ligacao.iniciar}
                className="rounded-full bg-white/15 p-1.5 hover:bg-white/25"
                aria-label="Falar por voz com a assistente"
                title="Falar por voz"
              >
                <Phone className="h-4 w-4" />
              </button>
            )}
            <button onClick={novaConversa} className="text-[11px] underline opacity-90 hover:opacity-100">
              Nova conversa
            </button>
            <button
              onClick={() => {
                if (emLigacao) ligacao.encerrar();
                setAberto(false);
              }}
              aria-label="Fechar"
              className="ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {emLigacao && (
            <div className="flex items-center gap-3 border-b bg-brand-2 px-4 py-2.5 text-white">
              <span className={cn("relative flex h-3 w-3", ligacao.estado === "ativa" && "animate-pulse")}>
                <span className={cn("h-3 w-3 rounded-full", ligacao.falando ? "bg-green-400" : "bg-white/70")} />
              </span>
              <div className="flex-1 text-xs">
                {ligacao.estado === "conectando" && "Conectando a ligação..."}
                {ligacao.estado === "ativa" && (ligacao.falando ? "Assistente falando..." : ligacao.mudo ? "Microfone desligado" : "Pode falar 🎤")}
                {ligacao.estado === "encerrando" && "Encerrando..."}
                {ligacao.estado === "ativa" && <span className="ml-2 opacity-70">{fmtTempo(ligacao.restante)}</span>}
              </div>
              <button
                onClick={ligacao.alternarMudo}
                disabled={ligacao.estado !== "ativa"}
                className="rounded-full bg-white/15 p-2 hover:bg-white/25 disabled:opacity-40"
                aria-label={ligacao.mudo ? "Ligar microfone" : "Desligar microfone"}
              >
                {ligacao.mudo ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                onClick={ligacao.encerrar}
                className="rounded-full bg-red-600 p-2 hover:bg-red-700"
                aria-label="Encerrar ligação"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3 text-sm">
            {estado.mensagens.map((m, i) =>
              m.autor === "sistema" ? (
                <div key={m.id ?? i} className="flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">{m.texto}</span>
                </div>
              ) : (
              <div key={m.id ?? i} className={cn("flex", m.autor === "paciente" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2",
                    m.autor === "paciente" ? "bg-brand text-white" : m.autor === "equipe" ? "bg-brand-2 text-white" : "border bg-white text-secondary",
                  )}
                >
                  {m.autor === "equipe" && (
                    <p className="mb-0.5 text-[11px] font-semibold opacity-80">{m.autor_nome ?? "Atendente"} · Equipe Sancet</p>
                  )}
                  {m.voz && <Mic className="mr-1 inline h-3 w-3 opacity-60" aria-label="por voz" />}
                  {m.texto && (
                    <Formatado texto={(m.id === "saudacao" || (i === 0 && !m.id && m.autor === "assistente")) && status.boas_vindas ? status.boas_vindas : m.texto} />
                  )}
                  {m.anexo?.url &&
                    (m.anexo.mime.startsWith("image/") ? (
                      <a href={m.anexo.url} target="_blank" rel="noreferrer" className="mt-1 block">
                        <img src={m.anexo.url} alt={m.anexo.nome} className="max-h-48 rounded-lg" />
                      </a>
                    ) : (
                      <a href={m.anexo.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 text-xs underline">
                        <FileText className="h-4 w-4" /> {m.anexo.nome}
                      </a>
                    ))}
                  {(m.acoes ?? []).map((a, j) =>
                    a.tipo === "carrinho" ? (
                      <button
                        key={j}
                        onClick={() => continuarAgendamento(a)}
                        className="mt-2 block w-full rounded-lg bg-brand-2 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-[#162f58]"
                      >
                        Continuar agendamento ({a.itens.length} exame{a.itens.length > 1 ? "s" : ""})
                      </button>
                    ) : null,
                  )}
                </div>
              </div>
              ),
            )}
            {semConversa && !enviando && (status.sugestoes ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(status.sugestoes ?? []).map((sug) => (
                  <button
                    key={sug}
                    onClick={() => enviar(sug)}
                    className="rounded-full border border-brand/40 bg-white px-3 py-1.5 text-xs text-secondary hover:bg-brand/5"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
            {enviando && !comHumano && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> digitando...
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <div className="border-t bg-background p-2">
            {!comHumano && status.atendente !== false && (
              <button
                onClick={pedirAtendente}
                className="mb-1 flex items-center gap-1 px-1 text-[11px] font-medium text-brand-2 hover:underline"
              >
                <Headset className="h-3.5 w-3.5" /> Falar com um atendente
              </button>
            )}
            <p className="px-1 pb-1 text-[10px] text-muted-foreground">
              Não envie senha nem dados de cartão. As conversas ficam registradas para atendimento (LGPD).
            </p>
            <form
              className="flex items-end gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                enviar(texto);
              }}
            >
              <input
                ref={arquivoRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (f.size > MAX_BYTES) return toast.error("Arquivo muito grande (máx. 10 MB).");
                  enviar(texto, f);
                }}
              />
              {status.anexos !== false && (
                <button
                  type="button"
                  onClick={() => arquivoRef.current?.click()}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                  aria-label="Enviar foto do pedido médico"
                  disabled={enviando}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              )}
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar(texto);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Digite sua mensagem..."
                className="max-h-28 min-h-[40px] flex-1 resize-none rounded-2xl border px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                className="rounded-full bg-brand p-2 text-white disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
