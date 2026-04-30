import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";

type Status = "idle" | "loading" | "ok" | "error";
type SyncKey = "exames" | "unidades" | "convenios";

interface SyncResult {
  total?: number;
  error?: string;
  aviso?: string;
}

interface LogEntry {
  ts: string;
  key: SyncKey;
  ok: boolean;
  message: string;
}

const ITEMS: { key: SyncKey; label: string; desc: string }[] = [
  { key: "exames", label: "Exames e Vacinas", desc: "WsGetTodosExames" },
  { key: "unidades", label: "Unidades", desc: "WsGetTodosUnidades" },
  { key: "convenios", label: "Convênios", desc: "WsGetTodosFontePagadora" },
];

export const AbaSync = () => {
  const [status, setStatus] = useState<Record<SyncKey, Status>>({
    exames: "idle",
    unidades: "idle",
    convenios: "idle",
  });
  const [results, setResults] = useState<Record<SyncKey, SyncResult | undefined>>({
    exames: undefined,
    unidades: undefined,
    convenios: undefined,
  });
  const [log, setLog] = useState<LogEntry[]>([]);

  const runSync = async (key: SyncKey) => {
    setStatus((s) => ({ ...s, [key]: "loading" }));
    try {
      const { data, error } = await supabase.functions.invoke(`sancet-sync-${key}`);
      if (error) throw error;
      const result: SyncResult = data ?? {};
      setResults((r) => ({ ...r, [key]: result }));
      const ok = !result.error;
      setStatus((s) => ({ ...s, [key]: ok ? "ok" : "error" }));
      setLog((l) => [
        {
          ts: new Date().toLocaleTimeString("pt-BR"),
          key,
          ok,
          message: ok
            ? `${result.total ?? 0} registros importados${result.aviso ? ` — ${result.aviso}` : ""}`
            : result.error ?? "Erro desconhecido",
        },
        ...l,
      ].slice(0, 20));
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao chamar edge function";
      setResults((r) => ({ ...r, [key]: { error: msg } }));
      setStatus((s) => ({ ...s, [key]: "error" }));
      setLog((l) => [
        { ts: new Date().toLocaleTimeString("pt-BR"), key, ok: false, message: msg },
        ...l,
      ].slice(0, 20));
    }
  };

  const runAll = async () => {
    await Promise.all(ITEMS.map((i) => runSync(i.key)));
  };

  const renderIcon = (s: Status) => {
    switch (s) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const algumCarregando = Object.values(status).some((s) => s === "loading");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1B3A6B" }}>
            Sync Shift LIS
          </h1>
          <p className="text-sm text-muted-foreground">
            Importa catálogo, unidades e convênios do Shift via SOAP.
          </p>
        </div>
        <Button onClick={runAll} disabled={algumCarregando} className="gap-2">
          <RefreshCw className={algumCarregando ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Sincronizar tudo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ITEMS.map(({ key, label, desc }) => {
          const s = status[key];
          const r = results[key];
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{label}</span>
                  {renderIcon(s)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="min-h-[40px] text-sm">
                  {s === "ok" && r?.total !== undefined && (
                    <Badge variant="secondary">{r.total} registros importados</Badge>
                  )}
                  {s === "error" && (
                    <p className="text-xs text-destructive break-words">
                      {r?.error ?? "Erro desconhecido"}
                    </p>
                  )}
                  {s === "idle" && (
                    <p className="text-xs text-muted-foreground">Aguardando execução.</p>
                  )}
                  {s === "loading" && (
                    <p className="text-xs text-muted-foreground">Sincronizando...</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={s === "loading"}
                  onClick={() => runSync(key)}
                >
                  {s === "loading" ? "Sincronizando..." : "Sincronizar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log da sessão</CardTitle>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma sincronização executada ainda nesta sessão.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {log.map((entry, i) => (
                <li key={i} className="flex items-start gap-3 border-b pb-2 last:border-0">
                  <span className="font-mono text-xs text-muted-foreground">{entry.ts}</span>
                  <Badge variant={entry.ok ? "secondary" : "destructive"} className="shrink-0">
                    {entry.key}
                  </Badge>
                  <span className="flex-1 break-words">{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
