import { useEffect, useState } from "react";
import { Bot, Copy, Lock, Mic, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Modo = "desligado" | "teste" | "ligado";
type Faq = { pergunta: string; resposta: string };
type RespostaRapida = { titulo: string; texto: string };
type Horario = Record<string, { inicio: string; fim: string } | null>;
type Config = {
  chat_modo: Modo;
  voz_liberada: boolean;
  voz_modelo: string;
  voz_nome: string;
  voz_max_minutos: number;
  voz_saudacao: string | null;
  voz_velocidade: number;
  voz_paciencia: "low" | "medium" | "high" | "auto";
  instrucoes_extras: string | null;
  nome_assistente: string;
  boas_vindas: string | null;
  texto_botao: string;
  posicao: "direita" | "esquerda";
  cor_widget: string | null;
  abrir_auto_seg: number;
  sugestoes: string[];
  paginas_ocultas: string[];
  chat_modelo: string;
  tom: "acolhedor" | "formal" | "descontraido";
  tamanho_resposta: "curta" | "media" | "detalhada";
  usar_emojis: boolean;
  faq: Faq[];
  habilidades: Record<string, boolean>;
  limite_msgs_hora: number;
  humano_horario: Horario;
  fora_horario_acao: "fila" | "ia";
  msg_chamar_atendente: string | null;
  msg_fora_horario: string | null;
  msg_encerramento: string | null;
  notificar_email: boolean;
  emails_notificacao: string | null;
  respostas_rapidas: RespostaRapida[];
  qualificar_obrigatorio: boolean;
  qualificar_campos: Record<string, boolean>;
  fila_distribuir: boolean;
  fila_incluir_admins: boolean;
  fila_max_por_atendente: number;
  fila_prazo_min: number;
  fila_sem_resposta_min: number;
  fila_sem_resposta_acao: "avisar" | "ia" | "nada";
  msg_fila_demora: string | null;
  atualizado_em: string | null;
};

const COLUNAS_EDITAVEIS = [
  "voz_nome", "voz_max_minutos", "voz_saudacao", "voz_velocidade", "voz_paciencia", "instrucoes_extras",
  "nome_assistente", "boas_vindas", "texto_botao", "posicao", "cor_widget", "abrir_auto_seg", "sugestoes", "paginas_ocultas",
  "qualificar_obrigatorio", "qualificar_campos", "tom",
  "fila_distribuir", "fila_incluir_admins", "fila_max_por_atendente", "fila_prazo_min", "fila_sem_resposta_min",
  "fila_sem_resposta_acao", "msg_fila_demora", "tamanho_resposta", "usar_emojis", "faq", "habilidades", "limite_msgs_hora",
  "humano_horario", "fora_horario_acao", "msg_chamar_atendente", "msg_fora_horario", "msg_encerramento",
  "notificar_email", "emails_notificacao", "respostas_rapidas",
] as const;
const COLUNAS = ["chat_modo", "voz_liberada", "atualizado_em", ...COLUNAS_EDITAVEIS].join(", ");

const MODOS: { value: Modo; label: string; desc: string }[] = [
  { value: "desligado", label: "Desligado", desc: "O chat não aparece no site." },
  { value: "teste", label: "Teste (só com link)", desc: "Aparece apenas para quem abrir o link de teste." },
  { value: "ligado", label: "Ligado para todos", desc: "Aparece para todos os visitantes do site." },
];

const VOZES = [
  { value: "marin", label: "Marin — feminina, natural (recomendada)" },
  { value: "cedar", label: "Cedar — masculina, natural" },
  { value: "coral", label: "Coral — feminina, calorosa" },
  { value: "shimmer", label: "Shimmer — feminina, suave" },
  { value: "sage", label: "Sage — feminina, calma" },
  { value: "alloy", label: "Alloy — neutra" },
  { value: "ash", label: "Ash — masculina, clara" },
  { value: "ballad", label: "Ballad — masculina, expressiva" },
  { value: "echo", label: "Echo — masculina, firme" },
  { value: "verse", label: "Verse — masculina, dinâmica" },
];

const MODELOS_VOZ = [
  { value: "gpt-realtime", label: "GPT Realtime (melhor qualidade)" },
  { value: "gpt-realtime-mini", label: "GPT Realtime Mini (mais econômico)" },
];

const MODELOS_CHAT = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — rápido e econômico (padrão)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — mais inteligente" },
  { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini — econômico" },
  { value: "openai/gpt-4.1", label: "GPT-4.1 — mais inteligente" },
  { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 — rápido" },
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5 — mais inteligente" },
];

const HABILIDADES: { id: string; label: string; desc: string }[] = [
  { id: "precos", label: "Informar preços", desc: "Valores dos exames particulares." },
  { id: "preparo", label: "Preparo e jejum", desc: "Orientações de preparo cadastradas." },
  { id: "unidades", label: "Unidades e horários", desc: "Endereços, telefones e dias de funcionamento." },
  { id: "convenios", label: "Convênios aceitos", desc: "Consulta a lista de convênios." },
  { id: "datas", label: "Datas de agendamento", desc: "Primeiro dia disponível e próximos dias." },
  { id: "pedidos", label: "Andamento dos pedidos", desc: "Só para paciente logado." },
  { id: "agendar", label: "Montar carrinho / agendar", desc: "Coloca os exames no carrinho do site." },
  { id: "anexos", label: "Receber fotos e PDFs", desc: "Paciente envia pedido médico pelo chat (com leitura automática)." },
  { id: "atendente", label: "Transferir para atendente", desc: "Botão “Falar com um atendente” e transferência pela IA." },
];

const DIAS = [
  { d: "1", label: "Segunda" },
  { d: "2", label: "Terça" },
  { d: "3", label: "Quarta" },
  { d: "4", label: "Quinta" },
  { d: "5", label: "Sexta" },
  { d: "6", label: "Sábado" },
  { d: "0", label: "Domingo" },
];

const db = supabase as any;

/** Lista editável de textos curtos (sugestões, páginas ocultas). */
const ListaTextos = ({
  itens,
  onChange,
  placeholder,
  max = 12,
  disabled,
}: {
  itens: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  max?: number;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    {itens.map((t, i) => (
      <div key={i} className="flex gap-2">
        <Input
          value={t}
          disabled={disabled}
          maxLength={120}
          onChange={(e) => onChange(itens.map((x, j) => (j === i ? e.target.value : x)))}
        />
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => onChange(itens.filter((_, j) => j !== i))} aria-label="Remover">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
    {itens.length < max && (
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange([...itens, ""])}>
        <Plus className="mr-1 h-4 w-4" /> {placeholder}
      </Button>
    )}
  </div>
);

/** Assistente virtual (chat + voz). Liberar/desligar: só o admin master. */
export const ConfigAssistente = ({ podeEditar }: { podeEditar: boolean }) => {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [master, setMaster] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);

  const carregar = async () => {
    const [{ data, error }, { data: sou }] = await Promise.all([
      db.from("assistente_config").select(COLUNAS).eq("id", 1).maybeSingle(),
      db.rpc("is_super_admin"),
    ]);
    if (error) toast.error("Não foi possível carregar as configurações do assistente.");
    setCfg(data ?? null);
    setMaster(sou === true);
    setAlterado(false);
    if (sou === true) {
      const { data: c } = await db.rpc("assistente_codigo_teste", { _renovar: false });
      setCodigo(c ?? null);
    }
  };
  useEffect(() => {
    carregar();
  }, []);

  if (!cfg) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;

  const mudar = <K extends keyof Config>(k: K, v: Config[K]) => {
    setCfg((c) => (c ? { ...c, [k]: v } : c));
    setAlterado(true);
  };

  // Liberação (só master): salva na hora.
  const liberar = async (campos: Partial<Config>, msg: string) => {
    setSalvando(true);
    const { error } = await db.from("assistente_config").update(campos).eq("id", 1);
    setSalvando(false);
    if (error) return toast.error(error.message || "Não foi possível salvar.");
    setCfg((c) => (c ? { ...c, ...campos } : c));
    toast.success(msg);
  };

  const salvarTudo = async () => {
    const limpo = (t: string | null) => (t ?? "").trim() || null;
    const cor = (cfg.cor_widget ?? "").trim();
    if (cor && !/^#[0-9a-fA-F]{6}$/.test(cor)) return toast.error("Cor inválida. Use o formato #RRGGBB.");
    const campos: Record<string, unknown> = {};
    COLUNAS_EDITAVEIS.forEach((k) => (campos[k] = (cfg as any)[k]));
    Object.assign(campos, {
      voz_saudacao: limpo(cfg.voz_saudacao),
      instrucoes_extras: limpo(cfg.instrucoes_extras),
      boas_vindas: limpo(cfg.boas_vindas),
      msg_chamar_atendente: limpo(cfg.msg_chamar_atendente),
      msg_fora_horario: limpo(cfg.msg_fora_horario),
      msg_encerramento: limpo(cfg.msg_encerramento),
      emails_notificacao: limpo(cfg.emails_notificacao),
      cor_widget: cor || null,
      nome_assistente: cfg.nome_assistente.trim() || "Assistente Sancet",
      texto_botao: cfg.texto_botao.trim() || "Fale com a Sancet",
      voz_max_minutos: Math.min(Math.max(Math.round(cfg.voz_max_minutos) || 8, 1), 30),
      abrir_auto_seg: Math.min(Math.max(Math.round(cfg.abrir_auto_seg) || 0, 0), 600),
      limite_msgs_hora: Math.min(Math.max(Math.round(cfg.limite_msgs_hora) || 60, 5), 500),
      fila_max_por_atendente: Math.min(Math.max(Math.round(cfg.fila_max_por_atendente) || 6, 1), 50),
      fila_prazo_min: Math.min(Math.max(Math.round(cfg.fila_prazo_min) || 5, 1), 240),
      fila_sem_resposta_min: Math.min(Math.max(Math.round(cfg.fila_sem_resposta_min) || 15, 1), 1440),
      msg_fila_demora: limpo(cfg.msg_fila_demora),
      voz_velocidade: Math.min(Math.max(Number(cfg.voz_velocidade) || 1, 0.5), 1.5),
      sugestoes: cfg.sugestoes.map((s) => s.trim()).filter(Boolean),
      paginas_ocultas: cfg.paginas_ocultas.map((s) => s.trim()).filter(Boolean).map((s) => (s.startsWith("/") ? s : `/${s}`)),
      faq: cfg.faq.filter((f) => f.pergunta.trim() && f.resposta.trim()),
      respostas_rapidas: cfg.respostas_rapidas.filter((r) => r.titulo.trim() && r.texto.trim()),
    });
    setSalvando(true);
    const { error } = await db.from("assistente_config").update(campos).eq("id", 1);
    setSalvando(false);
    if (error) return toast.error(error.message || "Não foi possível salvar.");
    toast.success("Configurações do assistente salvas.");
    carregar();
  };

  const linkTeste = codigo ? `${window.location.origin}/?assistente=${codigo}` : "";
  const renovarCodigo = async () => {
    if (!window.confirm("Gerar um novo link de teste? O link atual deixa de funcionar.")) return;
    const { data, error } = await db.rpc("assistente_codigo_teste", { _renovar: true });
    if (error) return toast.error(error.message);
    setCodigo(data);
    toast.success("Novo link de teste gerado.");
  };

  const d = !podeEditar;

  return (
    <div className="space-y-5">
      {/* ---------------- Liberação ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-secondary" /> Liberação no site
            <Badge variant={cfg.chat_modo === "ligado" ? "default" : "secondary"} className="ml-auto">
              {MODOS.find((m) => m.value === cfg.chat_modo)?.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!master && (
            <p className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" /> Somente o administrador master pode liberar ou desligar o assistente no site.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Chat do site</Label>
              <Select value={cfg.chat_modo} disabled={!master || salvando} onValueChange={(v) => liberar({ chat_modo: v as Modo }, "Chat atualizado no site.")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{MODOS.find((m) => m.value === cfg.chat_modo)?.desc}</p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Mic className="h-4 w-4" /> Voz ao vivo
                </p>
                <p className="text-xs text-muted-foreground">Botão de ligação dentro do chat.</p>
              </div>
              <Switch checked={cfg.voz_liberada} disabled={!master || salvando} onCheckedChange={(v) => liberar({ voz_liberada: v }, v ? "Voz liberada." : "Voz desligada.")} />
            </div>
          </div>
          {master && codigo && (
            <div className="space-y-2">
              <Label>Link de teste</Label>
              <div className="flex gap-2">
                <Input readOnly value={linkTeste} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(linkTeste).then(() => toast.success("Link copiado."))} aria-label="Copiar link">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={renovarCodigo} aria-label="Gerar novo link">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">No modo Teste, o chat só aparece para quem abrir este link (fica salvo naquele navegador).</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Ajustes ---------------- */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="aparencia">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="aparencia">Aparência</TabsTrigger>
              <TabsTrigger value="qualificacao">Qualificação</TabsTrigger>
              <TabsTrigger value="ia">Comportamento</TabsTrigger>
              <TabsTrigger value="conhecimento">Perguntas frequentes</TabsTrigger>
              <TabsTrigger value="habilidades">Habilidades</TabsTrigger>
              <TabsTrigger value="humano">Atendimento humano</TabsTrigger>
              <TabsTrigger value="rapidas">Respostas rápidas</TabsTrigger>
              <TabsTrigger value="voz">Voz</TabsTrigger>
            </TabsList>

            {/* Aparência */}
            <TabsContent value="aparencia" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome do assistente</Label>
                  <Input value={cfg.nome_assistente} disabled={d} maxLength={40} onChange={(e) => mudar("nome_assistente", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Texto do botão</Label>
                  <Input value={cfg.texto_botao} disabled={d} maxLength={40} onChange={(e) => mudar("texto_botao", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Posição na tela</Label>
                  <Select value={cfg.posicao} disabled={d} onValueChange={(v) => mudar("posicao", v as Config["posicao"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direita">Canto inferior direito</SelectItem>
                      <SelectItem value="esquerda">Canto inferior esquerdo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cor do chat</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={cfg.cor_widget || "#c8102e"}
                      disabled={d}
                      onChange={(e) => mudar("cor_widget", e.target.value)}
                      className="h-10 w-12 cursor-pointer rounded border"
                      aria-label="Escolher cor"
                    />
                    <Input value={cfg.cor_widget ?? ""} disabled={d} placeholder="Cor do site (padrão)" onChange={(e) => mudar("cor_widget", e.target.value)} className="font-mono" />
                    {cfg.cor_widget && (
                      <Button type="button" variant="ghost" size="sm" disabled={d} onClick={() => mudar("cor_widget", null)}>
                        Padrão
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Abrir o chat sozinho após (segundos)</Label>
                  <Input type="number" min={0} max={600} value={cfg.abrir_auto_seg} disabled={d} onChange={(e) => mudar("abrir_auto_seg", Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">0 = nunca. Abre uma vez por visitante.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mensagem de boas-vindas</Label>
                <Textarea
                  rows={3}
                  maxLength={600}
                  value={cfg.boas_vindas ?? ""}
                  disabled={d}
                  placeholder="Olá! Sou a assistente virtual da Sancet. 😊 Posso tirar dúvidas sobre exames, preços, preparo e unidades, ou ajudar você a agendar."
                  onChange={(e) => mudar("boas_vindas", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sugestões de perguntas (botões no início da conversa)</Label>
                <ListaTextos itens={cfg.sugestoes} disabled={d} max={8} placeholder="Adicionar sugestão" onChange={(v) => mudar("sugestoes", v)} />
              </div>
              <div className="space-y-2">
                <Label>Esconder o chat nestas páginas</Label>
                <ListaTextos itens={cfg.paginas_ocultas} disabled={d} max={20} placeholder="Adicionar página (ex.: /pagamento)" onChange={(v) => mudar("paginas_ocultas", v)} />
                <p className="text-xs text-muted-foreground">Vale para a página e tudo abaixo dela. O painel da equipe nunca mostra o chat.</p>
              </div>
            </TabsContent>

            {/* Qualificação */}
            <TabsContent value="qualificacao" className="space-y-4 pt-4">
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Qualificar antes de atender</p>
                  <p className="text-xs text-muted-foreground">
                    A IA pede os dados e a unidade antes de responder. A conversa vai para a equipe daquela unidade (mesma regra dos pedidos).
                  </p>
                </div>
                <Switch checked={cfg.qualificar_obrigatorio} disabled={d} onCheckedChange={(v) => mudar("qualificar_obrigatorio", v)} />
              </div>
              <div className="space-y-2">
                <Label>Dados pedidos</Label>
                {[
                  { id: "nome", label: "Nome completo" },
                  { id: "telefone", label: "Celular / WhatsApp" },
                  { id: "email", label: "E-mail" },
                  { id: "unidade", label: "Unidade onde quer fazer os exames" },
                ].map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm">{c.label}</span>
                    <Switch
                      checked={c.id === "email" ? cfg.qualificar_campos?.email === true : cfg.qualificar_campos?.[c.id] !== false}
                      disabled={d || !cfg.qualificar_obrigatorio}
                      onCheckedChange={(v) => mudar("qualificar_campos", { ...cfg.qualificar_campos, [c.id]: v })}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Paciente logado não precisa repetir nome, celular e e-mail: a IA já usa os dados da conta.</p>
              </div>
            </TabsContent>

            {/* Comportamento */}
            <TabsContent value="ia" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tom de voz</Label>
                  <Select value={cfg.tom} disabled={d} onValueChange={(v) => mudar("tom", v as Config["tom"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acolhedor">Acolhedor (padrão)</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="descontraido">Descontraído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho das respostas</Label>
                  <Select value={cfg.tamanho_resposta} disabled={d} onValueChange={(v) => mudar("tamanho_resposta", v as Config["tamanho_resposta"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curta">Curtas (padrão)</SelectItem>
                      <SelectItem value="media">Médias</SelectItem>
                      <SelectItem value="detalhada">Detalhadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Limite de mensagens por conversa (por hora)</Label>
                  <Input type="number" min={5} max={500} value={cfg.limite_msgs_hora} disabled={d} onChange={(e) => mudar("limite_msgs_hora", Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Protege contra abuso e custo excessivo.</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Usar emojis</p>
                  <p className="text-xs text-muted-foreground">Na voz a IA nunca usa emojis.</p>
                </div>
                <Switch checked={cfg.usar_emojis} disabled={d} onCheckedChange={(v) => mudar("usar_emojis", v)} />
              </div>
              <div className="space-y-2">
                <Label>Orientações extras (chat e voz)</Label>
                <Textarea
                  rows={6}
                  maxLength={3000}
                  value={cfg.instrucoes_extras ?? ""}
                  disabled={d}
                  placeholder="Ex.: Em dezembro as unidades fecham dia 25. Sempre lembrar do estacionamento conveniado na Matriz. Ofereça a coleta domiciliar (Sancet em Casa) quando o paciente tiver dificuldade de locomoção."
                  onChange={(e) => mudar("instrucoes_extras", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Avisos e regras do laboratório. Não substituem as regras de segurança (sem orientação médica, sem inventar preços). {(cfg.instrucoes_extras ?? "").length}/3000
                </p>
              </div>
            </TabsContent>

            {/* Perguntas frequentes */}
            <TabsContent value="conhecimento" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Respostas oficiais que a IA usa quando o paciente perguntar o mesmo assunto (estacionamento, formas de pagamento, entrega de resultado, etc.).
              </p>
              {cfg.faq.map((f, i) => (
                <div key={i} className="space-y-2 rounded-md border p-3">
                  <div className="flex gap-2">
                    <Input
                      value={f.pergunta}
                      disabled={d}
                      maxLength={300}
                      placeholder="Pergunta"
                      onChange={(e) => mudar("faq", cfg.faq.map((x, j) => (j === i ? { ...x, pergunta: e.target.value } : x)))}
                    />
                    <Button type="button" variant="ghost" size="icon" disabled={d} onClick={() => mudar("faq", cfg.faq.filter((_, j) => j !== i))} aria-label="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    rows={3}
                    value={f.resposta}
                    disabled={d}
                    maxLength={1500}
                    placeholder="Resposta"
                    onChange={(e) => mudar("faq", cfg.faq.map((x, j) => (j === i ? { ...x, resposta: e.target.value } : x)))}
                  />
                </div>
              ))}
              {cfg.faq.length < 80 && (
                <Button type="button" variant="outline" size="sm" disabled={d} onClick={() => mudar("faq", [...cfg.faq, { pergunta: "", resposta: "" }])}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar pergunta
                </Button>
              )}
            </TabsContent>

            {/* Habilidades */}
            <TabsContent value="habilidades" className="space-y-2 pt-4">
              <p className="pb-2 text-sm text-muted-foreground">Escolha o que o assistente pode fazer. O que estiver desligado, ele orienta o paciente a buscar no site ou com a equipe.</p>
              {HABILIDADES.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{h.label}</p>
                    <p className="text-xs text-muted-foreground">{h.desc}</p>
                  </div>
                  <Switch
                    checked={cfg.habilidades?.[h.id] !== false}
                    disabled={d}
                    onCheckedChange={(v) => mudar("habilidades", { ...cfg.habilidades, [h.id]: v })}
                  />
                </div>
              ))}
            </TabsContent>

            {/* Atendimento humano */}
            <TabsContent value="humano" className="space-y-4 pt-4">
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-semibold">Fila e distribuição</p>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Distribuir automaticamente (rodízio)</p>
                    <p className="text-xs text-muted-foreground">
                      Quem pede atendente vai direto para um atendente Online da unidade, o que estiver com menos conversas.
                    </p>
                  </div>
                  <Switch checked={cfg.fila_distribuir} disabled={d} onCheckedChange={(v) => mudar("fila_distribuir", v)} />
                </div>
                {cfg.fila_distribuir && (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Incluir admins no rodízio</p>
                      <p className="text-xs text-muted-foreground">Desligado: só atendentes (staff) recebem conversas automaticamente.</p>
                    </div>
                    <Switch checked={cfg.fila_incluir_admins} disabled={d} onCheckedChange={(v) => mudar("fila_incluir_admins", v)} />
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Máx. conversas por atendente</Label>
                    <Input type="number" min={1} max={50} value={cfg.fila_max_por_atendente} disabled={d} onChange={(e) => mudar("fila_max_por_atendente", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Alerta de espera (min)</Label>
                    <Input type="number" min={1} max={240} value={cfg.fila_prazo_min} disabled={d} onChange={(e) => mudar("fila_prazo_min", Number(e.target.value))} />
                    <p className="text-[11px] text-muted-foreground">O tempo fica vermelho na tela Conversas.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ninguém assumiu em (min)</Label>
                    <Input type="number" min={1} max={1440} value={cfg.fila_sem_resposta_min} disabled={d} onChange={(e) => mudar("fila_sem_resposta_min", Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Então...</Label>
                  <Select value={cfg.fila_sem_resposta_acao} disabled={d} onValueChange={(v) => mudar("fila_sem_resposta_acao", v as Config["fila_sem_resposta_acao"])}>
                    <SelectTrigger className="max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avisar">Avisa o paciente que está na fila (uma vez)</SelectItem>
                      <SelectItem value="ia">Devolve para a IA continuar atendendo</SelectItem>
                      <SelectItem value="nada">Não faz nada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {cfg.fila_sem_resposta_acao === "avisar" && (
                  <Textarea
                    rows={2}
                    maxLength={400}
                    value={cfg.msg_fila_demora ?? ""}
                    disabled={d}
                    placeholder="Nossa equipe está com bastante movimento agora, mas sua conversa está na fila e será respondida assim que possível. Obrigado pela paciência! 🙏"
                    onChange={(e) => mudar("msg_fila_demora", e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Horário de atendimento da equipe no chat</Label>
                <div className="space-y-1.5">
                  {DIAS.map(({ d: dia, label }) => {
                    const h = cfg.humano_horario?.[dia] ?? null;
                    return (
                      <div key={dia} className="flex flex-wrap items-center gap-2">
                        <Switch
                          checked={!!h}
                          disabled={d}
                          onCheckedChange={(v) => mudar("humano_horario", { ...cfg.humano_horario, [dia]: v ? { inicio: "08:00", fim: "18:00" } : null })}
                        />
                        <span className="w-20 text-sm">{label}</span>
                        {h ? (
                          <>
                            <Input type="time" className="w-28" value={h.inicio} disabled={d} onChange={(e) => mudar("humano_horario", { ...cfg.humano_horario, [dia]: { ...h, inicio: e.target.value } })} />
                            <span className="text-xs text-muted-foreground">até</span>
                            <Input type="time" className="w-28" value={h.fim} disabled={d} onChange={(e) => mudar("humano_horario", { ...cfg.humano_horario, [dia]: { ...h, fim: e.target.value } })} />
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">sem atendimento humano</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fora do horário, quando pedirem atendente</Label>
                <Select value={cfg.fora_horario_acao} disabled={d} onValueChange={(v) => mudar("fora_horario_acao", v as Config["fora_horario_acao"])}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fila">Entra na fila e a equipe responde quando voltar</SelectItem>
                    <SelectItem value="ia">Avisa o horário e a IA continua atendendo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mensagem ao chamar atendente</Label>
                  <Textarea rows={3} maxLength={400} value={cfg.msg_chamar_atendente ?? ""} disabled={d} placeholder="Chamamos um atendente da equipe Sancet. Assim que possível, alguém responde por aqui. 🙂" onChange={(e) => mudar("msg_chamar_atendente", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem fora do horário</Label>
                  <Textarea rows={3} maxLength={400} value={cfg.msg_fora_horario ?? ""} disabled={d} placeholder="Nossa equipe está fora do horário de atendimento agora. Deixe sua mensagem que respondemos assim que voltarmos." onChange={(e) => mudar("msg_fora_horario", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem ao encerrar atendimento</Label>
                  <Textarea rows={3} maxLength={400} value={cfg.msg_encerramento ?? ""} disabled={d} placeholder="Atendimento encerrado. Se precisar de algo, é só escrever aqui. 😊" onChange={(e) => mudar("msg_encerramento", e.target.value)} />
                </div>
              </div>
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Avisar por e-mail quando um paciente pedir atendente</p>
                    <p className="text-xs text-muted-foreground">Usa o Resend configurado no painel.</p>
                  </div>
                  <Switch checked={cfg.notificar_email} disabled={d} onCheckedChange={(v) => mudar("notificar_email", v)} />
                </div>
                {cfg.notificar_email && (
                  <Input value={cfg.emails_notificacao ?? ""} disabled={d} placeholder="emails separados por vírgula (vazio = e-mails de admin do Resend)" onChange={(e) => mudar("emails_notificacao", e.target.value)} />
                )}
              </div>
            </TabsContent>

            {/* Respostas rápidas */}
            <TabsContent value="rapidas" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Textos prontos para a equipe. Na tela Conversas, digite <b>/</b> no campo de mensagem para buscar. Variáveis:{" "}
                <code>{"{nome}"}</code>, <code>{"{primeiro_nome}"}</code>, <code>{"{unidade}"}</code>, <code>{"{protocolo}"}</code>, <code>{"{atendente}"}</code>.
              </p>
              {cfg.respostas_rapidas.map((r, i) => (
                <div key={i} className="space-y-2 rounded-md border p-3">
                  <div className="flex gap-2">
                    <Input
                      value={r.titulo}
                      disabled={d}
                      maxLength={60}
                      placeholder="Título (ex.: Saudação)"
                      onChange={(e) => mudar("respostas_rapidas", cfg.respostas_rapidas.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))}
                    />
                    <Button type="button" variant="ghost" size="icon" disabled={d} onClick={() => mudar("respostas_rapidas", cfg.respostas_rapidas.filter((_, j) => j !== i))} aria-label="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    rows={3}
                    value={r.texto}
                    disabled={d}
                    maxLength={2000}
                    placeholder="Texto da resposta"
                    onChange={(e) => mudar("respostas_rapidas", cfg.respostas_rapidas.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))}
                  />
                </div>
              ))}
              {cfg.respostas_rapidas.length < 60 && (
                <Button type="button" variant="outline" size="sm" disabled={d} onClick={() => mudar("respostas_rapidas", [...cfg.respostas_rapidas, { titulo: "", texto: "" }])}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar resposta rápida
                </Button>
              )}
            </TabsContent>

            {/* Voz */}
            <TabsContent value="voz" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Voz</Label>
                  <Select value={cfg.voz_nome} disabled={d} onValueChange={(v) => mudar("voz_nome", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOZES.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Velocidade da fala: {Number(cfg.voz_velocidade).toFixed(2)}x</Label>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={cfg.voz_velocidade}
                    disabled={d}
                    onChange={(e) => mudar("voz_velocidade", Number(e.target.value))}
                    className="w-full accent-[hsl(var(--brand))]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Espera o paciente terminar de falar</Label>
                  <Select value={cfg.voz_paciencia} disabled={d} onValueChange={(v) => mudar("voz_paciencia", v as Config["voz_paciencia"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático (recomendado)</SelectItem>
                      <SelectItem value="low">Com paciência (bom para idosos)</SelectItem>
                      <SelectItem value="medium">Equilibrado</SelectItem>
                      <SelectItem value="high">Responde rápido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duração máxima da ligação (minutos)</Label>
                  <Input type="number" min={1} max={30} value={cfg.voz_max_minutos} disabled={d} onChange={(e) => mudar("voz_max_minutos", Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Saudação da ligação (opcional)</Label>
                <Input value={cfg.voz_saudacao ?? ""} disabled={d} maxLength={300} placeholder="Ex.: Olá, aqui é a assistente da Sancet. Como posso ajudar?" onChange={(e) => mudar("voz_saudacao", e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                A chave da OpenAI e o modelo de voz ficam em Super Admin → Integrações.
              </p>
            </TabsContent>
          </Tabs>

          <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t bg-background pt-4">
            {alterado && <span className="text-xs text-amber-600">Alterações não salvas</span>}
            <Button disabled={d || salvando || !alterado} onClick={salvarTudo}>
              <Save className="mr-2 h-4 w-4" /> Salvar configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
