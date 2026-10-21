import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, RotateCcw, Send, User, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Uso = { ferramenta: string; resultado?: string };
type Msg = { autor: "voce" | "ia"; texto: string; usos?: Uso[] };

const NOMES: Record<string, string> = {
  "base_conhecimento (automático)": "📚 Base de conhecimento",
  consultar_base_conhecimento: "📚 Pesquisou na base",
  buscar_exames: "🔎 Buscou exames",
  preparo_exames: "🧪 Preparo",
  listar_unidades: "📍 Unidades",
  buscar_convenios: "🏥 Convênios",
  datas_agendamento: "📅 Datas",
  meus_pedidos: "📋 Pedidos",
  meus_resultados: "📄 Resultados",
  reagendar_pedido: "📅 Reagendar",
  cancelar_pedido: "❌ Cancelar",
  link_pagamento: "💳 Pagamento",
  montar_carrinho: "🛒 Carrinho",
  qualificar_atendimento: "🙋 Qualificação",
  chamar_atendente: "👩‍💼 Chamou atendente",
  contato_atendimento: "☎️ Telefones",
  registrar_pergunta_sem_resposta: "❓ Registrou pergunta sem resposta",
};

/**
 * Chat de teste do agente (modo "sandbox"): usa a configuração e a base de
 * conhecimento reais, mas não aparece em Conversas nem chama a equipe.
 */
export const TestarAgente = ({ podeEditar }: { podeEditar: boolean }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [conv, setConv] = useState<{ id?: string; token?: string }>({});
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, enviando]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setTexto("");
    setMsgs((m) => [...m, { autor: "voce", texto: t }]);
    setEnviando(true);
    const { data, error } = await supabase.functions.invoke("sancet-assistente", {
      body: { mensagem: t, sandbox: true, debug: true, conversa_id: conv.id, token: conv.token },
    });
    setEnviando(false);
    if (error || data?.error) {
      const det = data?.error ?? (await (error as any)?.context?.json?.().catch(() => null))?.error;
      toast.error(det || "Não foi possível testar agora.");
      return;
    }
    setConv((c) => ({ id: data.conversa_id ?? c.id, token: data.token ?? c.token }));
    if (data.agrupada) return;
    setMsgs((m) => [
      ...m,
      {
        autor: "ia",
        texto: data.resposta ?? (data.aguardando_humano ? "(A conversa foi para a equipe.)" : "(sem resposta)"),
        usos: (data.debug?.trace ?? []).map((u: any) => ({ ferramenta: u.ferramenta, resultado: u.resultado })),
      },
    ]);
  };

  if (!podeEditar) {
    return <p className="rounded-xl border p-6 text-sm text-muted-foreground">Testar o agente exige permissão de edição do Agente de IA.</p>;
  }

  return (
    <div className="flex h-[min(70vh,680px)] flex-col overflow-hidden rounded-2xl border">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
        <Bot className="h-4 w-4 text-secondary" />
        <p className="flex-1 text-sm">
          <b>Conversa de teste</b> — usa as regras e a base de conhecimento atuais. Não aparece em Conversas e não chama a equipe.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMsgs([]);
            setConv({});
          }}
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Nova conversa
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f6f7f9] p-4">
        {msgs.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Escreva como se fosse um paciente. Ex.: "Oi, sou Ana, 11 99999-0000, unidade Matriz" e depois "aceitam pix?"
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.autor === "voce" ? "flex-row-reverse" : "")}>
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", m.autor === "voce" ? "bg-secondary text-white" : "bg-violet-100 text-violet-700")}>
              {m.autor === "voce" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className={cn("max-w-[78%] space-y-1.5", m.autor === "voce" && "items-end")}>
              <div className={cn("whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm shadow-sm", m.autor === "voce" ? "bg-secondary text-white" : "border bg-white")}>{m.texto}</div>
              {m.usos && m.usos.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {m.usos.map((u, j) => (
                    <span
                      key={j}
                      title={u.resultado}
                      className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] text-violet-800"
                    >
                      <Wrench className="h-2.5 w-2.5" />
                      {NOMES[u.ferramenta] ?? u.ferramenta}
                      {u.ferramenta.startsWith("base_conhecimento") && u.resultado ? `: ${u.resultado.slice(0, 60)}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {enviando && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> A IA está respondendo...
          </p>
        )}
        <div ref={fimRef} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Escreva como paciente..."
          className="min-h-[42px] resize-none"
        />
        <Button onClick={enviar} disabled={enviando || !texto.trim()} size="icon" aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
