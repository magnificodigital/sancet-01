import { useEffect, useState } from "react";
import { CheckCircle2, Crown, KeyRound, Loader2, Plus, Save, Sparkles, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const db = supabase as any;

type ItemChave = { chave: string; fonte: "cofre" | "secrets" | null; final: string | null; teste: { ok: boolean; detalhe: string } | null };
type Modelos = { modelo_chat: string; modelo_receita: string; modelo_voz: string; modelo_transcricao: string };
type SuperAdmin = { user_id: string; email: string; nome: string | null; desde: string };

const PROVEDORES: Record<string, { nome: string; uso: string; onde: string }> = {
  OPENROUTER_API_KEY: {
    nome: "OpenRouter",
    uso: "Chat do assistente e leitura do pedido médico (acesso a Gemini, GPT, Claude e outros com uma chave só).",
    onde: "openrouter.ai/keys",
  },
  OPENAI_API_KEY: { nome: "OpenAI", uso: "Voz ao vivo (Realtime) e transcrição da ligação.", onde: "platform.openai.com/api-keys" },
  ANTHROPIC_API_KEY: { nome: "Anthropic (Claude)", uso: "Reserva para uso direto do Claude (opcional).", onde: "console.anthropic.com" },
  GEMINI_API_KEY: { nome: "Google Gemini", uso: "Reserva para uso direto do Gemini (opcional).", onde: "aistudio.google.com/apikey" },
};

const MODELOS: Record<keyof Modelos, { titulo: string; desc: string; opcoes: { value: string; label: string }[]; livre?: boolean }> = {
  modelo_chat: {
    titulo: "Chat do assistente",
    desc: "Conversa com o paciente no site (via OpenRouter). Precisa aceitar ferramentas.",
    livre: true,
    opcoes: [
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — rápido e econômico (recomendado)" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — mais inteligente" },
      { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini — econômico" },
      { value: "openai/gpt-4.1", label: "GPT-4.1" },
      { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 — rápido" },
      { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5 — mais inteligente" },
    ],
  },
  modelo_receita: {
    titulo: "Leitura do pedido médico",
    desc: "Lê foto/PDF do pedido e encontra os exames no catálogo (via OpenRouter). Precisa enxergar imagens.",
    livre: true,
    opcoes: [
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash — rápido e econômico (recomendado)" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro — melhor com letra difícil" },
      { value: "openai/gpt-4.1", label: "GPT-4.1" },
      { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
    ],
  },
  modelo_voz: {
    titulo: "Voz ao vivo",
    desc: "Ligação pelo navegador (OpenAI Realtime).",
    opcoes: [
      { value: "gpt-realtime", label: "GPT Realtime — melhor qualidade" },
      { value: "gpt-realtime-mini", label: "GPT Realtime Mini — mais econômico" },
    ],
  },
  modelo_transcricao: {
    titulo: "Transcrição da ligação",
    desc: "Texto do que o paciente falou (fica salvo na conversa).",
    opcoes: [
      { value: "gpt-4o-mini-transcribe", label: "GPT-4o Mini Transcribe — econômico (recomendado)" },
      { value: "gpt-4o-transcribe", label: "GPT-4o Transcribe — mais preciso" },
      { value: "whisper-1", label: "Whisper" },
    ],
  },
};

export const AbaSuperAdmin = () => {
  const [chaves, setChaves] = useState<ItemChave[] | null>(null);
  const [novas, setNovas] = useState<Record<string, string>>({});
  const [testando, setTestando] = useState<string | null>(null);
  const [modelos, setModelos] = useState<Modelos | null>(null);
  const [modelosAlterados, setModelosAlterados] = useState(false);
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [emailNovo, setEmailNovo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarChaves = async (testar?: string) => {
    const { data, error } = await supabase.functions.invoke("sancet-integracoes", { body: testar ? { testar } : {} });
    if (error || data?.error) return toast.error(data?.error ?? "Não foi possível carregar as integrações.");
    setChaves(data.itens);
  };
  const carregar = async () => {
    carregarChaves();
    const [{ data: m }, { data: sa }] = await Promise.all([
      db.from("plataforma_config").select("modelo_chat, modelo_receita, modelo_voz, modelo_transcricao").eq("id", 1).maybeSingle(),
      db.rpc("super_admins_listar"),
    ]);
    setModelos(m ?? null);
    setAdmins(sa ?? []);
  };
  useEffect(() => {
    carregar();
  }, []);

  const salvarChave = async (chave: string, valor: string | null) => {
    if (valor !== null && valor.trim().length < 10) return toast.error("Chave muito curta.");
    if (valor === null && !window.confirm("Remover a chave do cofre? Volta a valer a chave dos Secrets do Supabase (se houver).")) return;
    setSalvando(true);
    const { error } = await db.rpc("integracao_salvar", { _chave: chave, _valor: valor });
    setSalvando(false);
    if (error) return toast.error(error.message);
    setNovas((n) => ({ ...n, [chave]: "" }));
    toast.success(valor === null ? "Chave removida do cofre." : "Chave salva no cofre. Testando...");
    setTestando(chave);
    await carregarChaves(valor === null ? undefined : chave);
    setTestando(null);
  };

  const testar = async (chave: string) => {
    setTestando(chave);
    await carregarChaves(chave);
    setTestando(null);
  };

  const salvarModelos = async () => {
    if (!modelos) return;
    const limpo = Object.fromEntries(Object.entries(modelos).map(([k, v]) => [k, String(v).trim()]));
    if (Object.values(limpo).some((v) => !v)) return toast.error("Preencha todos os modelos.");
    setSalvando(true);
    const { error } = await db.from("plataforma_config").update({ ...limpo, atualizado_em: new Date().toISOString() }).eq("id", 1);
    setSalvando(false);
    if (error) return toast.error(error.message);
    setModelosAlterados(false);
    toast.success("Modelos de IA salvos (valem em até 30 segundos).");
  };

  const adicionarAdmin = async () => {
    if (!emailNovo.trim()) return;
    const { error } = await db.rpc("super_admin_adicionar", { _email: emailNovo.trim() });
    if (error) return toast.error(error.message);
    setEmailNovo("");
    toast.success("Super admin adicionado.");
    carregar();
  };
  const removerAdmin = async (a: SuperAdmin) => {
    if (!window.confirm(`Remover ${a.email} dos super admins?`)) return;
    const { error } = await db.rpc("super_admin_remover", { _user_id: a.user_id });
    if (error) return toast.error(error.message);
    toast.success("Removido.");
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-secondary">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Integrações, chaves de API, modelos de IA e acessos da plataforma.</p>
        </div>
      </div>

      {/* Chaves */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-secondary" /> Chaves de API (cofre)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As chaves ficam num cofre que ninguém do painel consegue ler (só o servidor). Aqui você só substitui ou remove. Sem chave no cofre, vale a dos
            Secrets do Supabase.
          </p>
          {!chaves ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            chaves.map((c) => {
              const p = PROVEDORES[c.chave];
              return (
                <div key={c.chave} className="space-y-2 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p?.nome ?? c.chave}</p>
                    {c.fonte === "cofre" && <Badge>No cofre · …{c.final}</Badge>}
                    {c.fonte === "secrets" && <Badge variant="secondary">Secrets do Supabase · …{c.final}</Badge>}
                    {!c.fonte && <Badge variant="outline">Não configurada</Badge>}
                    {c.teste &&
                      (c.teste.ok ? (
                        <span className="flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {c.teste.detalhe}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="h-3.5 w-3.5" /> {c.teste.detalhe}
                        </span>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p?.uso} Gere em <span className="font-mono">{p?.onde}</span>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="password"
                      autoComplete="off"
                      placeholder="Cole a nova chave para substituir"
                      value={novas[c.chave] ?? ""}
                      onChange={(e) => setNovas((n) => ({ ...n, [c.chave]: e.target.value }))}
                      className="min-w-[220px] flex-1 font-mono"
                    />
                    <Button disabled={salvando || !(novas[c.chave] ?? "").trim()} onClick={() => salvarChave(c.chave, novas[c.chave])}>
                      <Save className="mr-1 h-4 w-4" /> Salvar
                    </Button>
                    <Button variant="outline" disabled={!c.fonte || testando === c.chave} onClick={() => testar(c.chave)}>
                      {testando === c.chave ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Testar
                    </Button>
                    {c.fonte === "cofre" && (
                      <Button variant="ghost" size="icon" onClick={() => salvarChave(c.chave, null)} aria-label="Remover do cofre">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Modelos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" /> Modelos de IA por função
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!modelos ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            (Object.keys(MODELOS) as (keyof Modelos)[]).map((k) => {
              const def = MODELOS[k];
              const conhecido = def.opcoes.some((o) => o.value === modelos[k]);
              return (
                <div key={k} className="space-y-1.5">
                  <Label>{def.titulo}</Label>
                  <p className="text-xs text-muted-foreground">{def.desc}</p>
                  <Select
                    value={conhecido ? modelos[k] : "_outro"}
                    onValueChange={(v) => {
                      setModelos({ ...modelos, [k]: v === "_outro" ? "" : v });
                      setModelosAlterados(true);
                    }}
                  >
                    <SelectTrigger className="max-w-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {def.opcoes.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                      {def.livre && <SelectItem value="_outro">Outro (digitar o código OpenRouter)</SelectItem>}
                    </SelectContent>
                  </Select>
                  {def.livre && !conhecido && (
                    <Input
                      className="max-w-xl font-mono"
                      placeholder="ex.: openai/gpt-4o-mini"
                      value={modelos[k]}
                      onChange={(e) => {
                        setModelos({ ...modelos, [k]: e.target.value });
                        setModelosAlterados(true);
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
          <Button disabled={!modelosAlterados || salvando} onClick={salvarModelos}>
            <Save className="mr-2 h-4 w-4" /> Salvar modelos
          </Button>
        </CardContent>
      </Card>

      {/* Super admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-secondary" /> Super admins
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Só super admins veem esta área, as integrações (Shift, pagamentos, e-mail, IA), a zona de risco e podem liberar o assistente no site.
          </p>
          {admins.map((a) => (
            <div key={a.user_id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{a.nome || a.email}</p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removerAdmin(a)} disabled={admins.length <= 1} aria-label="Remover">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="E-mail de um admin da equipe" value={emailNovo} onChange={(e) => setEmailNovo(e.target.value)} className="max-w-sm" />
            <Button variant="outline" onClick={adicionarAdmin} disabled={!emailNovo.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
