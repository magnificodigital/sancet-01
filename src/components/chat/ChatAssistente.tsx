import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSacola, type ItemSacola } from "@/stores/sacola";
import { cn } from "@/lib/utils";

type Acao = { tipo: "carrinho"; tipo_compra: "particular" | "convenio"; itens: ItemSacola[] };
type Msg = { autor: "paciente" | "assistente"; texto: string; acoes?: Acao[] };

const CHAVE = "sancet_chat_v1";
const MAX_BYTES = 10 * 1024 * 1024;
const SAUDACAO: Msg = {
  autor: "assistente",
  texto:
    "Olá! Sou a assistente virtual da Sancet. 😊\nPosso tirar dúvidas sobre exames, preços, preparo e unidades, ou ajudar você a agendar.\nSe tiver o pedido médico, é só mandar a foto pelo clipe 📎.",
};

type Estado = { conversa_id?: string; token?: string; mensagens: Msg[] };
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
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => gravar(estado), [estado]);
  useEffect(() => {
    if (aberto) setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [aberto, estado.mensagens.length, enviando]);

  // Painel da equipe não mostra o chat.
  if (location.pathname.startsWith("/staff")) return null;

  const enviar = async (mensagem: string, anexo?: File) => {
    if ((!mensagem.trim() && !anexo) || enviando) return;
    const minha: Msg = { autor: "paciente", texto: anexo ? `📎 ${anexo.name}${mensagem ? `\n${mensagem}` : ""}` : mensagem };
    setEstado((s) => ({ ...s, mensagens: [...s.mensagens, minha] }));
    setTexto("");
    setEnviando(true);
    try {
      const corpo: any = { mensagem, conversa_id: estado.conversa_id, token: estado.token };
      if (anexo) corpo.anexo = { base64: await paraBase64(anexo), mime: anexo.type, nome: anexo.name };
      const { data, error } = await supabase.functions.invoke("sancet-assistente", { body: corpo });
      if (error || data?.error) throw new Error(data?.error ?? "erro");
      setEstado((s) => ({
        conversa_id: data.conversa_id ?? s.conversa_id,
        token: data.token ?? s.token,
        mensagens: data.resposta
          ? [...s.mensagens, { autor: "assistente", texto: data.resposta, acoes: data.acoes ?? [] }]
          : data.aguardando_humano
            ? [...s.mensagens, { autor: "assistente", texto: "Sua mensagem foi encaminhada para a nossa equipe. 🙂" }]
            : s.mensagens,
      }));
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
    limpar();
    setTipo(a.tipo_compra);
    a.itens.forEach((it) => adicionar(it));
    setAberto(false);
    navigate(a.tipo_compra === "convenio" ? "/exames/convenio/escolher-convenio" : "/sacola");
    toast.success(`${a.itens.length} exame(s) no seu carrinho. Vamos continuar!`);
  };

  const novaConversa = () => {
    if (!window.confirm("Começar uma nova conversa?")) return;
    setEstado({ mensagens: [SAUDACAO] });
  };

  return (
    <>
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-hover md:bottom-6"
          aria-label="Abrir assistente virtual"
        >
          <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">Fale com a Sancet</span>
        </button>
      )}

      {aberto && (
        <div className="fixed inset-x-2 bottom-2 top-16 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:inset-x-auto sm:right-4 sm:top-auto sm:h-[600px] sm:w-[380px]">
          <div className="flex items-center gap-2 bg-brand px-4 py-3 text-white">
            <MessageCircle className="h-5 w-5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Assistente Sancet</p>
              <p className="text-[11px] opacity-90">Respostas automáticas · não substitui orientação médica</p>
            </div>
            <button onClick={novaConversa} className="text-[11px] underline opacity-90 hover:opacity-100">
              Nova conversa
            </button>
            <button onClick={() => setAberto(false)} aria-label="Fechar" className="ml-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3 text-sm">
            {estado.mensagens.map((m, i) => (
              <div key={i} className={cn("flex", m.autor === "paciente" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2",
                    m.autor === "paciente" ? "bg-brand text-white" : "border bg-white text-secondary",
                  )}
                >
                  <Formatado texto={m.texto} />
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
            ))}
            {enviando && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> digitando...
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <div className="border-t bg-background p-2">
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
              <button
                type="button"
                onClick={() => arquivoRef.current?.click()}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                aria-label="Enviar foto do pedido médico"
                disabled={enviando}
              >
                <Paperclip className="h-5 w-5" />
              </button>
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
