import { useEffect, useState } from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODELOS_OPENROUTER = [
  { value: "google/gemini-2.5-flash-preview:free", label: "Gemini Flash 2.5 (gratuito — padrão)" },
  { value: "anthropic/claude-3-5-haiku", label: "Claude 3.5 Haiku (pago — melhor para receitas)" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (pago — econômico)" },
  { value: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro (pago)" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek V3 (pago — sem visão, não usar para imagens)" },
];

type Configs = Record<string, string>;

const CHAVES = [
  "SHIFT_ENDPOINT",
  "SHIFT_USER_ID",
  "SHIFT_SENHA",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODELO",
  "GATEWAY_ATIVO",
  "ASAAS_API_KEY",
  "MERCADOPAGO_ACCESS_TOKEN",
  "PAGHIPER_API_KEY",
  "PAGHIPER_TOKEN",
];

const SENSIVEIS = new Set([
  "SHIFT_SENHA",
  "OPENROUTER_API_KEY",
  "SHIFT_USER_ID",
  "ASAAS_API_KEY",
  "MERCADOPAGO_ACCESS_TOKEN",
  "PAGHIPER_API_KEY",
  "PAGHIPER_TOKEN",
]);

export const AbaConfiguracoes = () => {
  const [configs, setConfigs] = useState<Configs>({});
  const [revelados, setRevelados] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase
      .from("configuracoes")
      .select("chave, valor")
      .then(({ data }) => {
        const map: Configs = {};
        (data ?? []).forEach((r: any) => {
          map[r.chave] = r.valor;
        });
        setConfigs(map);
      });
  }, []);

  const set = (chave: string, valor: string) =>
    setConfigs((prev) => ({ ...prev, [chave]: valor }));

  const toggleRevelar = (chave: string) =>
    setRevelados((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });

  const salvar = async () => {
    setSalvando(true);
    const rows = CHAVES.map((chave) => ({
      chave,
      valor: configs[chave] ?? "",
      atualizado_em: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("configuracoes")
      .upsert(rows, { onConflict: "chave" });
    setSalvando(false);
    if (error) toast.error("Erro ao salvar configurações");
    else toast.success("Configurações salvas!");
  };

  const campo = (chave: string, label: string, placeholder = "") => {
    const sensivel = SENSIVEIS.has(chave);
    const revelado = revelados.has(chave);
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="relative">
          <Input
            type={sensivel && !revelado ? "password" : "text"}
            value={configs[chave] ?? ""}
            onChange={(e) => set(chave, e.target.value)}
            placeholder={placeholder}
            className="pr-10 font-mono text-sm"
          />
          {sensivel && (
            <button
              type="button"
              onClick={() => toggleRevelar(chave)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={revelado ? "Ocultar" : "Revelar"}
            >
              {revelado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-secondary">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Integração Shift LIS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campo("SHIFT_ENDPOINT", "Endpoint SOAP", "https://sancet.shiftcloud.com.br/...")}
          {campo("SHIFT_USER_ID", "Usuário (pUserId)", "Fornecido pelo TI da Sancet")}
          {campo("SHIFT_SENHA", "Senha", "Fornecido pelo TI da Sancet")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelo de IA (via OpenRouter)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Um único API key dá acesso a Claude, GPT-4o, Gemini e DeepSeek.{" "}
            Crie sua chave em{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              openrouter.ai/keys
            </a>
            .
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {campo("OPENROUTER_API_KEY", "OpenRouter API Key", "sk-or-...")}
          <div className="space-y-1.5">
            <Label>Modelo para leitura de receitas</Label>
            <Select
              value={configs["OPENROUTER_MODELO"] ?? "google/gemini-2.5-flash-preview:free"}
              onValueChange={(v) => set("OPENROUTER_MODELO", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo..." />
              </SelectTrigger>
              <SelectContent>
                {MODELOS_OPENROUTER.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gateway de Pagamento</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecione o gateway ativo e preencha as chaves correspondentes. O cliente deverá inserir suas próprias credenciais.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label>Gateway ativo</Label>
            <Select
              value={configs["GATEWAY_ATIVO"] ?? ""}
              onValueChange={(v) => set("GATEWAY_ATIVO", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o gateway..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asaas">Asaas</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                <SelectItem value="paghiper">Paghiper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Asaas</p>
            {campo("ASAAS_API_KEY", "API Key", "$aact_...")}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Mercado Pago</p>
            {campo("MERCADOPAGO_ACCESS_TOKEN", "Access Token", "APP_USR-...")}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Paghiper</p>
            {campo("PAGHIPER_API_KEY", "API Key", "apk_...")}
            {campo("PAGHIPER_TOKEN", "Token", "...")}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={salvar}
        disabled={salvando}
        className="gap-2 text-white hover:opacity-90"
        style={{ backgroundColor: "#C8102E" }}
      >
        <Save className="h-4 w-4" />
        {salvando ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
};
