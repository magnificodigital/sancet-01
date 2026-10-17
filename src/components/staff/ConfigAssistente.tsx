import { useEffect, useState } from "react";
import { Bot, Copy, Lock, Mic, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Modo = "desligado" | "teste" | "ligado";
type Config = {
  chat_modo: Modo;
  voz_liberada: boolean;
  voz_modelo: string;
  voz_nome: string;
  voz_max_minutos: number;
  voz_saudacao: string | null;
  instrucoes_extras: string | null;
  atualizado_em: string | null;
};

const COLUNAS = "chat_modo, voz_liberada, voz_modelo, voz_nome, voz_max_minutos, voz_saudacao, instrucoes_extras, atualizado_em";

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

const db = supabase as any;

/** Assistente virtual (chat + voz ao vivo). Liberar/desligar: só o admin master. */
export const ConfigAssistente = ({ podeEditar }: { podeEditar: boolean }) => {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [master, setMaster] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const [{ data, error }, { data: sou }] = await Promise.all([
      db.from("assistente_config").select(COLUNAS).eq("id", 1).maybeSingle(),
      db.rpc("is_super_admin"),
    ]);
    if (error) toast.error("Não foi possível carregar as configurações do assistente.");
    setCfg(data ?? null);
    setMaster(sou === true);
    if (sou === true) {
      const { data: c } = await db.rpc("assistente_codigo_teste", { _renovar: false });
      setCodigo(c ?? null);
    }
  };
  useEffect(() => {
    carregar();
  }, []);

  if (!cfg) return <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>;

  const atualizar = async (campos: Partial<Config>, msg = "Configuração salva.") => {
    setSalvando(true);
    const { error } = await db.from("assistente_config").update(campos).eq("id", 1);
    setSalvando(false);
    if (error) return toast.error(error.message || "Não foi possível salvar.");
    setCfg((c) => (c ? { ...c, ...campos } : c));
    toast.success(msg);
  };

  const linkTeste = codigo ? `${window.location.origin}/?assistente=${codigo}` : "";
  const renovarCodigo = async () => {
    if (!window.confirm("Gerar um novo link de teste? O link atual deixa de funcionar.")) return;
    const { data, error } = await db.rpc("assistente_codigo_teste", { _renovar: true });
    if (error) return toast.error(error.message);
    setCodigo(data);
    toast.success("Novo link de teste gerado.");
  };

  return (
    <div className="space-y-5">
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
              <Lock className="h-4 w-4 shrink-0" /> Somente o administrador master pode liberar ou desligar o
              assistente no site.
            </p>
          )}

          <div className="space-y-2">
            <Label>Chat do site</Label>
            <Select
              value={cfg.chat_modo}
              disabled={!master || salvando}
              onValueChange={(v) => atualizar({ chat_modo: v as Modo }, "Chat atualizado no site.")}
            >
              <SelectTrigger className="max-w-sm">
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
                <Mic className="h-4 w-4" /> Atendimento por voz ao vivo
              </p>
              <p className="text-xs text-muted-foreground">
                Botão de ligação dentro do chat (OpenAI Realtime). Só funciona com o chat liberado.
              </p>
            </div>
            <Switch
              checked={cfg.voz_liberada}
              disabled={!master || salvando}
              onCheckedChange={(v) => atualizar({ voz_liberada: v }, v ? "Voz liberada." : "Voz desligada.")}
            />
          </div>

          {master && codigo && (
            <div className="space-y-2">
              <Label>Link de teste</Label>
              <div className="flex gap-2">
                <Input readOnly value={linkTeste} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(linkTeste).then(() => toast.success("Link copiado."))}
                  aria-label="Copiar link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={renovarCodigo} aria-label="Gerar novo link">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                No modo Teste, o chat só aparece para quem abrir este link (fica salvo naquele navegador).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-secondary" /> Ajustes do assistente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Voz</Label>
              <Select value={cfg.voz_nome} disabled={!podeEditar} onValueChange={(v) => setCfg({ ...cfg, voz_nome: v })}>
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
              <Label>Modelo de voz</Label>
              <Select value={cfg.voz_modelo} disabled={!podeEditar} onValueChange={(v) => setCfg({ ...cfg, voz_modelo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS_VOZ.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração máxima da ligação (minutos)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={cfg.voz_max_minutos}
                disabled={!podeEditar}
                onChange={(e) => setCfg({ ...cfg, voz_max_minutos: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Saudação da ligação (opcional)</Label>
            <Input
              value={cfg.voz_saudacao ?? ""}
              disabled={!podeEditar}
              maxLength={300}
              placeholder="Ex.: Olá, aqui é a assistente da Sancet. Como posso ajudar?"
              onChange={(e) => setCfg({ ...cfg, voz_saudacao: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Orientações extras para o assistente (chat e voz)</Label>
            <Textarea
              rows={5}
              maxLength={3000}
              value={cfg.instrucoes_extras ?? ""}
              disabled={!podeEditar}
              placeholder="Ex.: Em dezembro as unidades fecham dia 25. Sempre lembrar do estacionamento conveniado na Matriz."
              onChange={(e) => setCfg({ ...cfg, instrucoes_extras: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Avisos e informações do laboratório. Não substituem as regras de segurança (sem orientação médica, sem
              inventar preços).
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            A voz usa a chave <code>OPENAI_API_KEY</code> cadastrada nos Secrets do Supabase.
          </p>
          <Button
            disabled={!podeEditar || salvando}
            onClick={() => {
              const min = Math.min(Math.max(Math.round(cfg.voz_max_minutos) || 8, 1), 30);
              atualizar({
                voz_nome: cfg.voz_nome,
                voz_modelo: cfg.voz_modelo,
                voz_max_minutos: min,
                voz_saudacao: cfg.voz_saudacao?.trim() || null,
                instrucoes_extras: cfg.instrucoes_extras?.trim() || null,
              });
            }}
          >
            <Save className="mr-2 h-4 w-4" /> Salvar ajustes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
