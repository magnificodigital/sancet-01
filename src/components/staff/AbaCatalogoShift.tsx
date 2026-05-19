import { Fragment as FragmentWithKey, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  RefreshCw, Loader2, CheckCircle2, AlertCircle, Clock, ChevronDown, FlaskConical, Building2, FileText,
} from "lucide-react";

type LogRow = {
  id: string;
  iniciado_em: string;
  finalizado_em: string | null;
  status: string;
  exames_criados: number;
  exames_atualizados: number;
  unidades_criadas: number;
  unidades_atualizadas: number;
  convenios_criados: number;
  convenios_atualizados: number;
  erro_mensagem: string | null;
  duracao_ms: number | null;
};

const fmtData = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });

const fmtDur = (ms: number | null) => {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const AbaCatalogoShift = () => {
  const [totais, setTotais] = useState({ exames: 0, unidades: 0, convenios: 0 });
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [rodando, setRodando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);

  const carregar = async () => {
    const [exa, uni, conv, lg] = await Promise.all([
      supabase.from("exames_cache").select("*", { count: "exact", head: true }),
      supabase.from("unidades_cache").select("*", { count: "exact", head: true }),
      supabase.from("convenios_cache").select("*", { count: "exact", head: true }),
      supabase.from("shift_sync_logs").select("*").order("iniciado_em", { ascending: false }).limit(10),
    ]);
    setTotais({
      exames: exa.count ?? 0,
      unidades: uni.count ?? 0,
      convenios: conv.count ?? 0,
    });
    setLogs((lg.data ?? []) as LogRow[]);
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const sincronizar = async () => {
    setRodando(true);
    try {
      const { data, error } = await supabase.functions.invoke("sancet-sync-shift");
      if (error) throw error;
      if (data?.sucesso) {
        const e = data.exames, u = data.unidades, c = data.convenios;
        toast.success("Sincronização concluída", {
          description: `Exames: +${e.criados} / ~${e.atualizados} · Unidades: +${u.criadas} / ~${u.atualizadas} · Convênios: +${c.criados} / ~${c.atualizados}`,
        });
      } else {
        toast.error("Falha na sincronização", { description: data?.erro ?? "Erro desconhecido" });
      }
    } catch (e: any) {
      toast.error("Erro ao sincronizar", { description: e?.message ?? String(e) });
    } finally {
      setRodando(false);
      carregar();
    }
  };

  const ultimo = logs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1B3A6B" }}>Catálogo Shift</h1>
          <p className="text-sm text-muted-foreground">
            Sincroniza exames, unidades e convênios do Shift LIS em uma única execução.
          </p>
        </div>
        <Button onClick={sincronizar} disabled={rodando} size="lg" className="gap-2">
          {rodando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {rodando ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-muted-foreground" /> Exames
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.exames.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-muted-foreground" /> Unidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.unidades.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" /> Convênios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totais.convenios.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>

      {ultimo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Último sync</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{fmtData(ultimo.iniciado_em)}</span>
            <StatusBadge status={ultimo.status} />
            <span className="text-muted-foreground">Duração: {fmtDur(ultimo.duracao_ms)}</span>
            <span>
              +{ultimo.exames_criados + ultimo.unidades_criadas + ultimo.convenios_criados} criados ·
              ~{ultimo.exames_atualizados + ultimo.unidades_atualizadas + ultimo.convenios_atualizados} atualizados
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico (últimos 10)</CardTitle>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sincronização registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Criados</TableHead>
                  <TableHead>Atualizados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => {
                  const criados = l.exames_criados + l.unidades_criadas + l.convenios_criados;
                  const atualizados = l.exames_atualizados + l.unidades_atualizadas + l.convenios_atualizados;
                  const aberto = expandido === l.id;
                  return (
                    <FragmentWithKey key={l.id}>
                      <TableRow>
                        <TableCell>
                          <Collapsible open={aberto} onOpenChange={(o) => setExpandido(o ? l.id : null)}>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <ChevronDown className={`h-4 w-4 transition ${aberto ? "rotate-180" : ""}`} />
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{fmtData(l.iniciado_em)}</TableCell>
                        <TableCell><StatusBadge status={l.status} /></TableCell>
                        <TableCell className="text-sm">{fmtDur(l.duracao_ms)}</TableCell>
                        <TableCell className="text-sm">+{criados}</TableCell>
                        <TableCell className="text-sm">~{atualizados}</TableCell>
                      </TableRow>
                      {aberto && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="text-xs">
                            <div className="grid grid-cols-3 gap-4 py-2">
                              <div>
                                <p className="font-semibold">Exames</p>
                                <p>+{l.exames_criados} criados</p>
                                <p>~{l.exames_atualizados} atualizados</p>
                              </div>
                              <div>
                                <p className="font-semibold">Unidades</p>
                                <p>+{l.unidades_criadas} criadas</p>
                                <p>~{l.unidades_atualizadas} atualizadas</p>
                              </div>
                              <div>
                                <p className="font-semibold">Convênios</p>
                                <p>+{l.convenios_criados} criados</p>
                                <p>~{l.convenios_atualizados} atualizados</p>
                              </div>
                            </div>
                            {l.erro_mensagem && (
                              <p className="rounded bg-destructive/10 p-2 text-destructive">
                                <strong>Erro:</strong> {l.erro_mensagem}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </FragmentWithKey>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "sucesso") {
    return (
      <Badge variant="secondary" className="gap-1 border-green-200 bg-green-50 text-green-700">
        <CheckCircle2 className="h-3 w-3" /> Sucesso
      </Badge>
    );
  }
  if (status === "erro") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" /> Erro
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Loader2 className="h-3 w-3 animate-spin" /> Em execução
    </Badge>
  );
};
