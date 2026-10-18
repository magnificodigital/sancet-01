import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HelpCircle, Loader2, MessageSquare, Star, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const db = supabase as any;

type Avaliacao = {
  id: string;
  lead_nome: string | null;
  unidade_nome: string | null;
  avaliacao_nota: number;
  avaliacao_comentario: string | null;
  avaliacao_em: string;
  avaliacao_atendente: string | null;
};
type Lacuna = { id: string; pergunta: string; pergunta_norm: string; unidade_nome: string | null; conversa_id: string | null; created_at: string };
type Grupo = { chave: string; exemplo: Lacuna; total: number; ultima: string; unidades: string[] };

const Estrelas = ({ n, tamanho = "h-3.5 w-3.5" }: { n: number; tamanho?: string }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={cn(tamanho, i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
    ))}
  </span>
);

/** Qualidade do atendimento: avaliações dos pacientes e perguntas que a IA não soube responder. */
export const PainelQualidade = ({
  aberto,
  onFechar,
  nomeAtendente,
  onAbrirConversa,
  podeEditarIA,
}: {
  aberto: boolean;
  onFechar: () => void;
  nomeAtendente: (uid: string | null) => string | null;
  onAbrirConversa: (id: string) => void;
  podeEditarIA: boolean;
}) => {
  const [dias, setDias] = useState("30");
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [lacunas, setLacunas] = useState<Lacuna[] | null>(null);
  const [respostas, setRespostas] = useState<Record<string, { pergunta: string; resposta: string }>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = async () => {
    const desde = new Date(Date.now() - Number(dias) * 86400_000).toISOString();
    const [{ data: a }, { data: l }] = await Promise.all([
      db
        .from("chat_conversas")
        .select("id, lead_nome, unidade_nome, avaliacao_nota, avaliacao_comentario, avaliacao_em, avaliacao_atendente")
        .not("avaliacao_nota", "is", null)
        .gte("avaliacao_em", desde)
        .order("avaliacao_em", { ascending: false })
        .limit(500),
      db.from("ia_lacunas").select("id, pergunta, pergunta_norm, unidade_nome, conversa_id, created_at").eq("status", "aberta").order("created_at", { ascending: false }).limit(500),
    ]);
    setAvaliacoes(a ?? []);
    setLacunas(l ?? []);
  };
  useEffect(() => {
    if (aberto) carregar();
  }, [aberto, dias]);

  const resumo = useMemo(() => {
    const lista = avaliacoes ?? [];
    const media = lista.length ? lista.reduce((s, x) => s + x.avaliacao_nota, 0) / lista.length : 0;
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, qtd: lista.filter((x) => x.avaliacao_nota === n).length }));
    const porAtendente = new Map<string, { soma: number; qtd: number; baixas: number }>();
    lista.forEach((x) => {
      const k = x.avaliacao_atendente ?? "_";
      const v = porAtendente.get(k) ?? { soma: 0, qtd: 0, baixas: 0 };
      v.soma += x.avaliacao_nota;
      v.qtd++;
      if (x.avaliacao_nota <= 2) v.baixas++;
      porAtendente.set(k, v);
    });
    return {
      media,
      total: lista.length,
      dist,
      atendentes: [...porAtendente.entries()].map(([k, v]) => ({ uid: k, media: v.soma / v.qtd, qtd: v.qtd, baixas: v.baixas })).sort((a, b) => b.qtd - a.qtd),
    };
  }, [avaliacoes]);

  // Perguntas iguais agrupadas (as mais repetidas primeiro).
  const grupos: Grupo[] = useMemo(() => {
    const m = new Map<string, Grupo>();
    (lacunas ?? []).forEach((l) => {
      const g = m.get(l.pergunta_norm) ?? { chave: l.pergunta_norm, exemplo: l, total: 0, ultima: l.created_at, unidades: [] };
      g.total++;
      if (l.unidade_nome && !g.unidades.includes(l.unidade_nome)) g.unidades.push(l.unidade_nome);
      m.set(l.pergunta_norm, g);
    });
    return [...m.values()].sort((a, b) => b.total - a.total || b.ultima.localeCompare(a.ultima));
  }, [lacunas]);

  const resolver = async (g: Grupo, ignorar = false) => {
    const r = respostas[g.chave];
    if (!ignorar && !r?.resposta?.trim()) return toast.error("Escreva a resposta oficial.");
    setSalvando(g.chave);
    const { error } = await db.rpc("ia_lacuna_resolver", {
      _id: g.exemplo.id,
      _resposta: ignorar ? null : r.resposta,
      _pergunta: ignorar ? null : r.pergunta || g.exemplo.pergunta,
      _ignorar: ignorar,
    });
    setSalvando(null);
    if (error) return toast.error(error.message);
    toast.success(ignorar ? "Pergunta ignorada." : "Adicionada às perguntas frequentes: a IA já passa a responder.");
    carregar();
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Qualidade do atendimento</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="lacunas" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <TabsList>
              <TabsTrigger value="lacunas">
                <HelpCircle className="mr-1.5 h-4 w-4" /> IA não soube responder
                {grupos.length > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{grupos.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="avaliacoes">
                <Star className="mr-1.5 h-4 w-4" /> Avaliações
              </TabsTrigger>
            </TabsList>
            <Select value={dias} onValueChange={setDias}>
              <SelectTrigger className="ml-auto h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Perguntas sem resposta */}
          <TabsContent value="lacunas" className="min-h-0 flex-1 space-y-3 overflow-y-auto pt-3">
            <p className="text-sm text-muted-foreground">
              Perguntas que os pacientes fizeram e a IA não tinha a informação. Escreva a resposta oficial: ela vira pergunta frequente e a IA passa a responder na hora.
            </p>
            {!lacunas ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : grupos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <p className="text-sm">Nenhuma pergunta pendente. 🎉</p>
              </div>
            ) : (
              grupos.map((g) => (
                <div key={g.chave} className="space-y-2 rounded-xl border p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="flex-1 font-medium">“{g.exemplo.pergunta}”</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {g.total}× perguntada
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Última: {new Date(g.ultima).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    {g.unidades.length > 0 && ` · ${g.unidades.join(", ")}`}
                    {g.exemplo.conversa_id && (
                      <button className="ml-2 underline" onClick={() => onAbrirConversa(g.exemplo.conversa_id!)}>
                        ver conversa
                      </button>
                    )}
                  </p>
                  {podeEditarIA ? (
                    <>
                      <Input
                        placeholder="Pergunta como vai ficar nas perguntas frequentes (opcional)"
                        defaultValue={g.exemplo.pergunta}
                        onChange={(e) => setRespostas((r) => ({ ...r, [g.chave]: { ...(r[g.chave] ?? { resposta: "" }), pergunta: e.target.value } }))}
                        className="text-sm"
                      />
                      <Textarea
                        rows={2}
                        placeholder="Resposta oficial do laboratório..."
                        value={respostas[g.chave]?.resposta ?? ""}
                        onChange={(e) => setRespostas((r) => ({ ...r, [g.chave]: { pergunta: r[g.chave]?.pergunta ?? g.exemplo.pergunta, resposta: e.target.value } }))}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" disabled={salvando === g.chave} onClick={() => resolver(g, true)}>
                          <X className="mr-1 h-4 w-4" /> Ignorar
                        </Button>
                        <Button size="sm" disabled={salvando === g.chave} onClick={() => resolver(g)}>
                          {salvando === g.chave ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                          Ensinar a IA
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Só quem pode editar Configurações ensina a IA.</p>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Avaliações */}
          <TabsContent value="avaliacoes" className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-3">
            {!avaliacoes ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                  <div className="rounded-xl border p-4 text-center">
                    <p className="text-4xl font-bold text-secondary">{resumo.total ? resumo.media.toFixed(1) : "—"}</p>
                    <Estrelas n={Math.round(resumo.media)} tamanho="h-4 w-4" />
                    <p className="mt-1 text-xs text-muted-foreground">{resumo.total} avaliação(ões)</p>
                  </div>
                  <div className="space-y-1 rounded-xl border p-4">
                    {resumo.dist.map((d) => (
                      <div key={d.n} className="flex items-center gap-2 text-xs">
                        <span className="w-8">{d.n} ★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", d.n >= 4 ? "bg-green-500" : d.n === 3 ? "bg-amber-400" : "bg-red-500")}
                            style={{ width: `${resumo.total ? (d.qtd / resumo.total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-muted-foreground">{d.qtd}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {resumo.atendentes.length > 0 && (
                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Atendente</th>
                          <th className="px-3 py-2 text-center font-medium">Média</th>
                          <th className="px-3 py-2 text-center font-medium">Avaliações</th>
                          <th className="px-3 py-2 text-center font-medium">Notas baixas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumo.atendentes.map((a) => (
                          <tr key={a.uid} className="border-t">
                            <td className="px-3 py-2">{a.uid === "_" ? "—" : nomeAtendente(a.uid)}</td>
                            <td className="px-3 py-2 text-center font-semibold">{a.media.toFixed(1)}</td>
                            <td className="px-3 py-2 text-center">{a.qtd}</td>
                            <td className={cn("px-3 py-2 text-center", a.baixas > 0 && "font-semibold text-red-600")}>{a.baixas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="space-y-2">
                  {avaliacoes.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma avaliação no período.</p>}
                  {avaliacoes.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => onAbrirConversa(a.id)}
                      className={cn("w-full rounded-xl border p-3 text-left hover:bg-muted/50", a.avaliacao_nota <= 2 && "border-red-200 bg-red-50/50")}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Estrelas n={a.avaliacao_nota} />
                        <span className="text-sm font-medium">{a.lead_nome ?? "Visitante"}</span>
                        <span className="text-xs text-muted-foreground">
                          · {nomeAtendente(a.avaliacao_atendente) ?? "—"} · {a.unidade_nome ?? "—"}
                        </span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {new Date(a.avaliacao_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      {a.avaliacao_comentario && <p className="mt-1 text-sm italic text-muted-foreground">“{a.avaliacao_comentario}”</p>}
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-secondary">
                        <MessageSquare className="h-3 w-3" /> abrir conversa
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
