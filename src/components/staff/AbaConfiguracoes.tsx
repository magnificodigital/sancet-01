import asaasLogo from "@/assets/asaas-logo.png.asset.json";
import openrouterLogo from "@/assets/openrouter-logo.png.asset.json";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  ChevronDown,
  Trash2,
  Database,
  CreditCard,
  Mail,
  Sparkles,
  Settings as SettingsIcon,
  CheckCircle2,
  CircleDashed,
  Palette,
  ShieldAlert,
} from "lucide-react";
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
import { AbaCatalogoShift } from "./AbaCatalogoShift";
import { AbaAuditoria } from "./AbaAuditoria";
import { aplicarTema, aplicarFavicon, setLogos, setFooter, parseFooterLinks, TEMA_PADRAO } from "@/lib/tema";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConfirmarExclusao } from "./ConfirmarExclusao";

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
  "SHIFT_ENDPOINT_MOBILE",
  "SHIFT_USER_ID",
  "SHIFT_SENHA",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODELO",
  "GATEWAY_ATIVO",
  "ASAAS_API_KEY",
  "ASAAS_WEBHOOK_TOKEN",
  "MERCADOPAGO_ACCESS_TOKEN",
  "PAGHIPER_API_KEY",
  "PAGHIPER_TOKEN",
  "RESEND_API_KEY",
  "RESEND_EMAIL_FROM",
  "RESEND_EMAILS_ADMIN",
  "TEMA_PRIMARIA",
  "TEMA_SECUNDARIA",
  "TEMA_SIDEBAR",
  "TEMA_RODAPE",
  "TEMA_RODAPE_TEXTO",
  "LOGO_CLARO",
  "LOGO_ESCURO",
  "FAVICON",
  "FOOTER_TEXTO",
  "FOOTER_LINKS",
];

const SENSIVEIS = new Set([
  "SHIFT_SENHA",
  "OPENROUTER_API_KEY",
  "SHIFT_USER_ID",
  "ASAAS_API_KEY",
  "MERCADOPAGO_ACCESS_TOKEN",
  "PAGHIPER_API_KEY",
  "PAGHIPER_TOKEN",
  "RESEND_API_KEY",
]);

type SecaoId = "shift" | "ia" | "pagamento" | "email" | "aparencia" | "auditoria" | "risco";

type Secao = {
  id: SecaoId;
  titulo: string;
  descricao: string;
  /** Lucide fallback */
  icone?: React.ComponentType<{ className?: string }>;
  /** brand logo via simpleicons CDN */
  brand?: string;
  /** chaves usadas para calcular se está "conectado" */
  chavesRequeridas?: string[];
  adminOnly?: boolean;
};

const SECOES: Secao[] = [
  {
    id: "shift",
    titulo: "Shift LIS",
    descricao: "Integração SOAP com o sistema laboratorial",
    icone: Database,
    chavesRequeridas: ["SHIFT_ENDPOINT", "SHIFT_USER_ID", "SHIFT_SENHA"],
  },
  {
    id: "ia",
    titulo: "OpenRouter",
    descricao: "Modelos de IA para leitura de receitas",
    brand: "openrouter",
    icone: Sparkles,
    chavesRequeridas: ["OPENROUTER_API_KEY"],
  },
  {
    id: "pagamento",
    titulo: "Pagamentos",
    descricao: "Asaas, Mercado Pago e Paghiper",
    icone: CreditCard,
    chavesRequeridas: ["GATEWAY_ATIVO"],
  },
  {
    id: "email",
    titulo: "Resend",
    descricao: "Notificações por email",
    brand: "resend",
    icone: Mail,
    chavesRequeridas: ["RESEND_API_KEY", "RESEND_EMAIL_FROM"],
  },
  {
    id: "aparencia",
    titulo: "Aparência",
    descricao: "Cores do site e do painel",
    icone: Palette,
  },
  {
    id: "auditoria",
    titulo: "Auditoria (LGPD)",
    descricao: "Quem acessou dados de paciente",
    icone: ShieldAlert,
    adminOnly: true,
  },
  {
    id: "risco",
    titulo: "Zona de risco",
    descricao: "Reset e exclusão de dados",
    icone: AlertTriangle,
    adminOnly: true,
  },
];

const BRAND_LOGO: Record<string, { slug: string; color?: string; imageUrl?: string }> = {
  asaas: { slug: "asaas", color: "1481EE", imageUrl: asaasLogo.url },
  mercadopago: { slug: "mercadopago", color: "00B1EA" },
  paghiper: { slug: "stripe", color: "635BFF" }, // fallback (Paghiper sem slug oficial)
  openrouter: { slug: "openai", color: "412991", imageUrl: openrouterLogo.url },
  resend: { slug: "resend", color: "000000" },
  openai: { slug: "openai", color: "412991" },
};

const BrandIcon = ({ name, className }: { name: string; className?: string }) => {
  const b = BRAND_LOGO[name];
  if (!b) return null;
  if (b.imageUrl) {
    return (
      <img
        src={b.imageUrl}
        alt=""
        className={cn("h-6 w-auto object-contain", className)}
        loading="lazy"
      />
    );
  }
  const color = b.color ?? "000000";
  return (
    <img
      src={`https://cdn.simpleicons.org/${b.slug}/${color}`}
      alt=""
      className={cn("h-6 w-6 object-contain", className)}
      loading="lazy"
    />
  );
};

const LogoUpload = ({
  label,
  valor,
  onChange,
  escuro,
  disabled,
}: {
  label: string;
  valor: string;
  onChange: (url: string) => void;
  escuro?: boolean;
  disabled?: boolean;
}) => {
  const [up, setUp] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUp(true);
    try {
      const path = `tema/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("imagens-exames")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("imagens-exames").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Logo enviado");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar logo");
    } finally {
      setUp(false);
      e.target.value = "";
    }
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className="flex h-16 w-40 items-center justify-center rounded border p-2"
          style={{ backgroundColor: escuro ? "hsl(var(--brand-sidebar))" : "#ffffff" }}
        >
          {valor ? (
            <img src={valor} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">Sem logo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
              disabled={disabled}
            />
            <Button type="button" variant="outline" size="sm" disabled={disabled || up} asChild>
              <span className="cursor-pointer">{up ? "Enviando..." : "Enviar logo"}</span>
            </Button>
          </label>
          {valor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange("")}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

type Props = {
  permissoes?: { config: { ver: boolean; editar: boolean } } | null;
  isAdmin?: boolean;
};

export const AbaConfiguracoes = ({ permissoes, isAdmin = false }: Props = {}) => {
  if (permissoes?.config?.ver === false) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Você não tem permissão para ver esta seção.
      </div>
    );
  }
  const podeEditar = permissoes?.config?.editar !== false;
  const [configs, setConfigs] = useState<Configs>({});
  const [revelados, setRevelados] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [zonaRiscoAberta, setZonaRiscoAberta] = useState(false);
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [resetando, setResetando] = useState(false);
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoId>("shift");

  const resetarDados = async () => {
    setResetando(true);
    try {
      const { data, error } = await supabase.functions.invoke("sancet-resetar-dados", { body: {} });
      if (error) {
        let msg = "Erro ao resetar";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        toast.error(msg);
        return;
      }
      const r = data as any;
      toast.success(`Dados apagados: ${r?.pacientes ?? 0} pacientes, ${r?.pedidos ?? 0} pedidos`);
      setConfirmarReset(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao resetar");
    } finally {
      setResetando(false);
    }
  };

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

  const secoesVisiveis = useMemo(
    () => SECOES.filter((s) => !s.adminOnly || isAdmin),
    [isAdmin],
  );

  const statusSecao = (s: Secao) => {
    if (!s.chavesRequeridas) return null;
    const ok = s.chavesRequeridas.every((k) => (configs[k] ?? "").trim().length > 0);
    return ok;
  };

  const campo = (
    chave: string,
    label: string,
    placeholder = "",
    helper?: string,
  ) => {
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
            disabled={!podeEditar}
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
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    );
  };

  // ---- Aparência (cores) ----
  const setCor = (chave: string, valor: string) => {
    const novos = { ...configs, [chave]: valor };
    setConfigs(novos);
    aplicarTema({
      TEMA_PRIMARIA: novos.TEMA_PRIMARIA || TEMA_PADRAO.TEMA_PRIMARIA,
      TEMA_SECUNDARIA: novos.TEMA_SECUNDARIA || TEMA_PADRAO.TEMA_SECUNDARIA,
      TEMA_SIDEBAR: novos.TEMA_SIDEBAR || TEMA_PADRAO.TEMA_SIDEBAR,
      TEMA_RODAPE: novos.TEMA_RODAPE || TEMA_PADRAO.TEMA_RODAPE,
      TEMA_RODAPE_TEXTO: novos.TEMA_RODAPE_TEXTO || TEMA_PADRAO.TEMA_RODAPE_TEXTO,
    });
  };

  const restaurarCoresPadrao = () => {
    setConfigs((prev) => ({ ...prev, ...TEMA_PADRAO }));
    aplicarTema(TEMA_PADRAO);
  };

  const setLogoConfig = (chave: "LOGO_CLARO" | "LOGO_ESCURO", url: string) => {
    const novos = { ...configs, [chave]: url };
    setConfigs(novos);
    setLogos({ claro: novos.LOGO_CLARO || null, escuro: novos.LOGO_ESCURO || null });
  };

  const setFaviconConfig = (url: string) => {
    setConfigs((prev) => ({ ...prev, FAVICON: url }));
    aplicarFavicon(url);
  };

  // ---- Rodapé (texto + links) ----
  const footerLinks = parseFooterLinks(configs.FOOTER_LINKS);
  const setFooterTexto = (v: string) => {
    const novos: Configs = { ...configs, FOOTER_TEXTO: v };
    setConfigs(novos);
    setFooter({ texto: v, links: parseFooterLinks(novos.FOOTER_LINKS) });
  };
  const setFooterLinksList = (links: { label: string; url: string }[]) => {
    const novos: Configs = { ...configs, FOOTER_LINKS: JSON.stringify(links) };
    setConfigs(novos);
    setFooter({ texto: novos.FOOTER_TEXTO || "", links });
  };

  const corField = (chave: string, label: string, helper?: string) => {
    const valor = configs[chave] || TEMA_PADRAO[chave] || "#000000";
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={valor}
            onChange={(e) => setCor(chave, e.target.value)}
            disabled={!podeEditar}
            className="h-10 w-14 cursor-pointer rounded border bg-background p-1"
            aria-label={label}
          />
          <Input
            value={valor}
            onChange={(e) => setCor(chave, e.target.value)}
            disabled={!podeEditar}
            className="w-32 font-mono text-sm"
          />
          <span className="h-8 flex-1 rounded border" style={{ backgroundColor: valor }} />
        </div>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    );
  };

  const gatewayAtivo = configs["GATEWAY_ATIVO"] ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-secondary/10 p-2 text-secondary">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-secondary">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Integrações, chaves de API e preferências do sistema.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <nav className="space-y-1.5">
          {secoesVisiveis.map((s) => {
            const status = statusSecao(s);
            const ativa = s.id === secaoAtiva;
            const Icone = s.icone ?? SettingsIcon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSecaoAtiva(s.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                  ativa
                    ? "border-secondary/30 bg-secondary/5 shadow-sm"
                    : "border-transparent hover:border-border hover:bg-muted/50",
                  s.id === "risco" && ativa && "border-destructive/30 bg-destructive/5",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background",
                    s.id === "risco" && "border-destructive/30 text-destructive",
                  )}
                >
                  {s.brand ? (
                    <BrandIcon name={s.brand} className="h-5 w-5" />
                  ) : (
                    <Icone className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{s.titulo}</span>
                    {status === true && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    )}
                    {status === false && (
                      <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{s.descricao}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Conteúdo */}
        <div className="space-y-5">
          {secaoAtiva === "shift" && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-secondary" />
                      Integração Shift LIS
                    </CardTitle>
                    {statusSecao(SECOES[0]) && <Badge variant="secondary">Conectado</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campo(
                    "SHIFT_ENDPOINT",
                    "Endpoint SOAP (consultas)",
                    "https://sancet.shiftcloud.com.br/.../consultas.Webserver.cls",
                  )}
                  {campo(
                    "SHIFT_ENDPOINT_MOBILE",
                    "Endpoint SOAP Mobile (convênios)",
                    "https://sancet.shiftcloud.com.br/.../integracaoMobile.Webserver.cls",
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {campo("SHIFT_USER_ID", "Usuário (pUserId)", "Fornecido pelo TI")}
                    {campo("SHIFT_SENHA", "Senha", "••••••••")}
                  </div>
                </CardContent>
              </Card>

              {/* Sincronização do Shift (antes em "Sync Shift" no menu) — só admin */}
              {isAdmin ? (
                <AbaCatalogoShift />
              ) : (
                <p className="text-sm text-muted-foreground">
                  A sincronização com o Shift é restrita a administradores.
                </p>
              )}
            </>
          )}

          {secaoAtiva === "aparencia" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-secondary" /> Cores do sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Estas cores valem para todo o site e o painel. As mudanças aparecem na hora;
                  clique em <b>Salvar</b> (no rodapé) para aplicá-las de forma permanente.
                </p>
                {corField("TEMA_PRIMARIA", "Cor primária", "Botões, links e destaques (vermelho Sancet).")}
                {corField("TEMA_SECUNDARIA", "Cor secundária", "Títulos e elementos de apoio (azul).")}
                {corField("TEMA_SIDEBAR", "Menu lateral do painel", "Fundo da barra lateral do painel interno.")}
                {corField("TEMA_RODAPE", "Fundo do rodapé", "Cor de fundo do rodapé do site.")}
                {corField("TEMA_RODAPE_TEXTO", "Texto do rodapé", "Cor do texto sobre o rodapé.")}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!podeEditar}
                  onClick={restaurarCoresPadrao}
                >
                  Restaurar cores padrão
                </Button>

                <div className="space-y-4 border-t pt-5">
                  <div>
                    <p className="text-sm font-medium">Logotipo</p>
                    <p className="text-xs text-muted-foreground">
                      Ideal PNG com fundo transparente. Sem envio, usamos o logo padrão da Sancet.
                    </p>
                  </div>
                  <LogoUpload
                    label="Logo para fundo escuro (versão clara)"
                    valor={configs.LOGO_CLARO || ""}
                    onChange={(u) => setLogoConfig("LOGO_CLARO", u)}
                    escuro
                    disabled={!podeEditar}
                  />
                  <LogoUpload
                    label="Logo para fundo claro (versão escura)"
                    valor={configs.LOGO_ESCURO || ""}
                    onChange={(u) => setLogoConfig("LOGO_ESCURO", u)}
                    disabled={!podeEditar}
                  />
                  <LogoUpload
                    label="Favicon (ícone da aba do navegador)"
                    valor={configs.FAVICON || ""}
                    onChange={setFaviconConfig}
                    disabled={!podeEditar}
                  />
                  <p className="text-xs text-muted-foreground">
                    Favicon: imagem quadrada (ex.: 32×32 ou 64×64), PNG ou ICO.
                  </p>
                </div>

                <div className="space-y-4 border-t pt-5">
                  <div>
                    <p className="text-sm font-medium">Rodapé</p>
                    <p className="text-xs text-muted-foreground">
                      Texto e links exibidos no rodapé do site. Deixe o texto vazio para usar o padrão.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do rodapé</Label>
                    <Textarea
                      rows={2}
                      value={configs.FOOTER_TEXTO ?? ""}
                      onChange={(e) => setFooterTexto(e.target.value)}
                      disabled={!podeEditar}
                      placeholder="Ex.: Sancet Medicina Diagnóstica © 2026 — Todos os direitos reservados"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Links do rodapé</Label>
                    {footerLinks.map((l, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Texto (ex: Política de Privacidade)"
                          value={l.label}
                          disabled={!podeEditar}
                          onChange={(e) =>
                            setFooterLinksList(footerLinks.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                          }
                        />
                        <Input
                          className="flex-1"
                          placeholder="URL (ex: /termos-de-uso ou https://...)"
                          value={l.url}
                          disabled={!podeEditar}
                          onChange={(e) =>
                            setFooterLinksList(footerLinks.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)))
                          }
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          disabled={!podeEditar}
                          onClick={() => setFooterLinksList(footerLinks.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!podeEditar}
                      onClick={() => setFooterLinksList([...footerLinks, { label: "Novo link", url: "/" }])}
                    >
                      + Adicionar link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {secaoAtiva === "auditoria" && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-secondary" /> Auditoria de acesso (LGPD)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AbaAuditoria />
              </CardContent>
            </Card>
          )}

          {secaoAtiva === "ia" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-secondary" /> Modelo de IA
                  </CardTitle>
                  {statusSecao(SECOES[1]) && <Badge variant="secondary">Conectado</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Um único API key dá acesso a Claude, GPT-4o, Gemini e DeepSeek via OpenRouter.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {campo("OPENROUTER_API_KEY", "API Key", "sk-or-...")}
                <div className="space-y-1.5">
                  <Label>Modelo para leitura de receitas</Label>
                  <Select
                    value={configs["OPENROUTER_MODELO"] ?? "google/gemini-2.5-flash-preview:free"}
                    onValueChange={(v) => set("OPENROUTER_MODELO", v)}
                    disabled={!podeEditar}
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
          )}

          {secaoAtiva === "pagamento" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-secondary" /> Gateway de Pagamento
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Selecione o gateway ativo e preencha as chaves correspondentes.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "asaas", label: "Asaas" },
                    { id: "mercadopago", label: "Mercado Pago" },
                    { id: "paghiper", label: "Paghiper" },
                  ].map((g) => {
                    const ativo = gatewayAtivo === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        disabled={!podeEditar}
                        onClick={() => set("GATEWAY_ATIVO", g.id)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                          ativo
                            ? "border-secondary bg-secondary/5"
                            : "border-border bg-background hover:border-secondary/40",
                        )}
                      >
                        <div className="flex h-14 w-14 items-center justify-center">
                          <BrandIcon name={g.id} className={cn("h-14 w-14", g.id === "paghiper" && "h-10 w-10")} />
                        </div>
                        <span className="text-xs font-medium">{g.label}</span>
                        {ativo && (
                          <Badge variant="secondary" className="text-[10px]">
                            Ativo
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2">
                    <BrandIcon name="asaas" className="h-5 w-5" />
                    <span className="text-sm font-semibold">Asaas</span>
                  </div>
                  {campo("ASAAS_API_KEY", "API Key", "$aact_...")}

                  <div className="space-y-2 rounded-md border border-dashed bg-background p-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Webhook (notificações de pagamento)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No painel Asaas → Integrações → Webhooks, cadastre a URL abaixo (API v3, evento "Pagamentos").
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 break-all rounded bg-muted px-2 py-1 text-xs">
                        {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sancet-webhook-asaas`}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sancet-webhook-asaas`
                          );
                          toast.success("URL copiada");
                        }}
                        className="rounded border px-2 py-1 text-xs hover:bg-muted"
                      >
                        Copiar
                      </button>
                    </div>
                    {campo(
                      "ASAAS_WEBHOOK_TOKEN",
                      "Token do Webhook (opcional)",
                      "definido por você",
                      "Se preencher, deve ser o mesmo valor configurado no painel do Asaas."
                    )}
                  </div>
                </div>


                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2">
                    <BrandIcon name="mercadopago" className="h-5 w-5" />
                    <span className="text-sm font-semibold">Mercado Pago</span>
                  </div>
                  {campo("MERCADOPAGO_ACCESS_TOKEN", "Access Token", "APP_USR-...")}
                </div>

                <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2">
                    <BrandIcon name="paghiper" className="h-5 w-5" />
                    <span className="text-sm font-semibold">Paghiper</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {campo("PAGHIPER_API_KEY", "API Key", "apk_...")}
                    {campo("PAGHIPER_TOKEN", "Token", "...")}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {secaoAtiva === "email" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BrandIcon name="resend" className="h-5 w-5" />
                    Notificações por Email
                  </CardTitle>
                  {statusSecao(SECOES[3]) && <Badge variant="secondary">Conectado</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure o envio automático de emails via Resend.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {campo("RESEND_API_KEY", "API Key do Resend", "re_...", "Crie em resend.com → API Keys")}
                {campo(
                  "RESEND_EMAIL_FROM",
                  "Email remetente (from)",
                  "onboarding@resend.dev",
                  "Use onboarding@resend.dev para testes ou um email do seu domínio verificado.",
                )}
                {campo(
                  "RESEND_EMAILS_ADMIN",
                  "Emails que recebem notificações",
                  "recepcao@sancet.com.br, gestor@sancet.com.br",
                  "Separe múltiplos emails por vírgula.",
                )}
              </CardContent>
            </Card>
          )}

          {secaoAtiva === "risco" && isAdmin && (
            <Card className="border-destructive/40">
              <Collapsible open={zonaRiscoAberta} onOpenChange={setZonaRiscoAberta}>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between p-6 text-left">
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" /> Zona de risco
                    </CardTitle>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${zonaRiscoAberta ? "rotate-180" : ""}`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                      <strong>Atenção:</strong> as ações abaixo são irreversíveis. Use apenas em
                      ambiente de teste ou para limpeza autorizada.
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmarReset(true)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" /> Apagar todos os dados de teste
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {podeEditar && secaoAtiva !== "risco" && (
            <div className="sticky bottom-0 flex justify-end border-t bg-background/95 py-4 backdrop-blur">
              <Button
                onClick={salvar}
                disabled={salvando}
                className="gap-2 text-white hover:opacity-90"
                style={{ backgroundColor: "hsl(var(--brand))" }}
              >
                <Save className="h-4 w-4" />
                {salvando ? "Salvando..." : "Salvar configurações"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmarExclusao
        open={confirmarReset}
        onOpenChange={setConfirmarReset}
        titulo="Apagar TODOS os dados?"
        palavraConfirmacao="APAGAR TUDO"
        textoBotao="Apagar tudo agora"
        loading={resetando}
        onConfirmar={resetarDados}
        descricao={
          <>
            <p>
              Vai apagar <strong>TODOS</strong> os pacientes, pedidos, resultados e arquivos de storage.
            </p>
            <p>Mantém apenas os usuários staff e configurações do sistema.</p>
            <p className="text-destructive font-medium">Esta ação não pode ser desfeita.</p>
          </>
        }
      />
    </div>
  );
};
