import { useEffect, useState } from "react";
import {
  BookOpen,
  Bot,
  FlaskConical,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  MessageSquareQuote,
  Mic,
  Palette,
  ShieldCheck,
  Smile,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConfigAssistente } from "../ConfigAssistente";
import { PainelQualidade } from "../PainelQualidade";
import { BaseConhecimento } from "./BaseConhecimento";
import { TestarAgente } from "./TestarAgente";

const db = supabase as any;

type Secao =
  | "visao"
  | "conhecimento"
  | "faq"
  | "regras"
  | "habilidades"
  | "personalidade"
  | "testar"
  | "aparencia"
  | "qualificacao"
  | "voz"
  | "humano"
  | "rapidas";

const GRUPOS: { titulo: string; itens: { id: Secao; label: string; icone: typeof Bot; desc: string }[] }[] = [
  { titulo: "", itens: [{ id: "visao", label: "Visão geral", icone: LayoutDashboard, desc: "Liberação no site e resumo do agente" }] },
  {
    titulo: "Conhecimento",
    itens: [
      { id: "conhecimento", label: "Base de conhecimento", icone: BookOpen, desc: "Arquivos, textos e páginas que a IA consulta" },
      { id: "faq", label: "Perguntas frequentes", icone: MessageSquareQuote, desc: "Respostas oficiais prontas" },
    ],
  },
  {
    titulo: "Comportamento",
    itens: [
      { id: "regras", label: "Regras e limites", icone: ShieldCheck, desc: "O que a IA pode e não pode fazer" },
      { id: "habilidades", label: "Habilidades", icone: ListChecks, desc: "Preços, agendamento, pedidos, anexos..." },
      { id: "personalidade", label: "Personalidade", icone: Smile, desc: "Tom, tamanho das respostas, tarefas" },
      { id: "testar", label: "Testar o agente", icone: FlaskConical, desc: "Converse e veja o que a IA usou" },
    ],
  },
  {
    titulo: "Canal do site",
    itens: [
      { id: "aparencia", label: "Aparência do chat", icone: Palette, desc: "Nome, cor, boas-vindas, sugestões" },
      { id: "qualificacao", label: "Qualificação", icone: UserCheck, desc: "Dados pedidos antes de atender" },
      { id: "voz", label: "Voz e áudio", icone: Mic, desc: "Ligação, mensagens de áudio" },
    ],
  },
  {
    titulo: "Equipe",
    itens: [
      { id: "humano", label: "Atendimento humano", icone: Users, desc: "Horário, fila, avaliação, avisos" },
      { id: "rapidas", label: "Respostas rápidas", icone: Zap, desc: "Textos prontos da equipe" },
    ],
  },
];

// Seções que vêm da tela de configuração do assistente.
const SECAO_CONFIG: Partial<Record<Secao, string>> = {
  visao: "liberacao",
  faq: "conhecimento",
  regras: "regras",
  habilidades: "habilidades",
  personalidade: "ia",
  aparencia: "aparencia",
  qualificacao: "qualificacao",
  voz: "voz",
  humano: "humano",
  rapidas: "rapidas",
};

const Resumo = ({ onIr, onLacunas }: { onIr: (s: Secao) => void; onLacunas: () => void }) => {
  const [r, setR] = useState<{ materiais: number; pausados: number; erros: number; faq: number; lacunas: number } | null>(null);
  useEffect(() => {
    Promise.all([
      db.from("ia_documentos").select("ativo, status"),
      db.from("assistente_config").select("faq").eq("id", 1).maybeSingle(),
      db.from("ia_lacunas").select("pergunta_norm").eq("status", "aberta").limit(500),
    ]).then(([d, c, l]: any[]) => {
      const docs = d.data ?? [];
      setR({
        materiais: docs.filter((x: any) => x.ativo && x.status === "pronto").length,
        pausados: docs.filter((x: any) => !x.ativo).length,
        erros: docs.filter((x: any) => x.status === "erro").length,
        faq: Array.isArray(c.data?.faq) ? c.data.faq.length : 0,
        lacunas: new Set((l.data ?? []).map((x: any) => x.pergunta_norm)).size,
      });
    });
  }, []);
  const card = (titulo: string, valor: string | number, sub: string, acao: () => void, alerta = false) => (
    <button onClick={acao} className={cn("rounded-xl border p-4 text-left transition hover:shadow-sm", alerta && "border-amber-300 bg-amber-50")}>
      <p className="text-2xl font-bold text-secondary">{valor}</p>
      <p className="text-sm font-medium">{titulo}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </button>
  );
  if (!r) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {card("Materiais em uso", r.materiais, `${r.pausados} pausado(s)${r.erros ? ` · ${r.erros} com erro` : ""}`, () => onIr("conhecimento"), r.erros > 0)}
      {card("Perguntas frequentes", r.faq, "respostas oficiais", () => onIr("faq"))}
      {card("IA não soube responder", r.lacunas, r.lacunas ? "ensine a IA com um clique" : "nada pendente", onLacunas, r.lacunas > 0)}
      {card("Testar o agente", "▶", "converse como um paciente", () => onIr("testar"))}
    </div>
  );
};

/** Agente de IA: tudo que o assistente sabe, pode fazer e como atende — num só lugar. */
export const AbaAgenteIA = ({ podeEditar, userId }: { podeEditar: boolean; userId: string | null }) => {
  const [secao, setSecao] = useState<Secao>(() => {
    try {
      return (localStorage.getItem("sancet_agente_secao") as Secao) || "visao";
    } catch {
      return "visao";
    }
  });
  const [lacunasAbertas, setLacunasAbertas] = useState(false);
  const ir = (s: Secao) => {
    setSecao(s);
    try {
      localStorage.setItem("sancet_agente_secao", s);
    } catch {
      /* sem storage */
    }
  };
  const atual = GRUPOS.flatMap((g) => g.itens).find((i) => i.id === secao) ?? GRUPOS[0].itens[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-secondary">Agente de IA</h1>
          <p className="text-sm text-muted-foreground">O que o assistente sabe, o que pode fazer e como atende os pacientes.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-4">
          {GRUPOS.map((g) => (
            <div key={g.titulo || "inicio"} className="space-y-0.5">
              {g.titulo && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.titulo}</p>}
              {g.itens.map((i) => (
                <button
                  key={i.id}
                  onClick={() => ir(i.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
                    secao === i.id ? "bg-secondary text-white shadow-sm" : "hover:bg-muted",
                  )}
                >
                  <i.icone className="h-4 w-4 shrink-0" />
                  <span className="truncate">{i.label}</span>
                </button>
              ))}
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={() => setLacunasAbertas(true)}>
            <HelpCircle className="mr-1.5 h-4 w-4" /> IA não soube responder
          </Button>
        </nav>

        <div className="min-w-0 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{atual.label}</h2>
            <p className="text-sm text-muted-foreground">{atual.desc}</p>
          </div>
          {secao === "visao" && <Resumo onIr={ir} onLacunas={() => setLacunasAbertas(true)} />}
          {secao === "conhecimento" && <BaseConhecimento podeEditar={podeEditar} />}
          {secao === "testar" && <TestarAgente podeEditar={podeEditar} />}
          {SECAO_CONFIG[secao] && <ConfigAssistente podeEditar={podeEditar} secao={SECAO_CONFIG[secao]} />}
        </div>
      </div>

      <PainelQualidade
        aberto={lacunasAbertas}
        onFechar={() => setLacunasAbertas(false)}
        nomeAtendente={(uid) => (uid === userId ? "Você" : uid ? "Atendente" : null)}
        podeEditarIA={podeEditar}
        onAbrirConversa={() => setLacunasAbertas(false)}
      />
    </div>
  );
};
