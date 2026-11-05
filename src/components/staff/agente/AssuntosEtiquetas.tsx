import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save, Tag, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const db = supabase as any;

type Assunto = { id?: string; nome: string; descricao: string | null; cor: string; atendentes: string[]; exclusivo: boolean; ativo: boolean; ordem: number };
type Etiqueta = { id?: string; nome: string; cor: string; ativo: boolean; ordem: number };
type Atendente = { user_id: string; nome: string; role: string };

const CORES = ["#2563eb", "#16a34a", "#7c3aed", "#d97706", "#dc2626", "#0891b2", "#db2777", "#64748b"];

const SeletorCor = ({ valor, onMudar, disabled }: { valor: string; onMudar: (c: string) => void; disabled: boolean }) => (
  <div className="flex gap-1">
    {CORES.map((c) => (
      <button
        key={c}
        type="button"
        disabled={disabled}
        onClick={() => onMudar(c)}
        className={cn("h-5 w-5 rounded-full border-2", valor === c ? "border-foreground" : "border-transparent")}
        style={{ background: c }}
        aria-label={`Cor ${c}`}
      />
    ))}
  </div>
);

/**
 * Assuntos (a IA identifica e a fila direciona para os atendentes de cada
 * assunto) e etiquetas que a equipe aplica nas conversas.
 */
export const AssuntosEtiquetas = ({ podeEditar }: { podeEditar: boolean }) => {
  const [assuntos, setAssuntos] = useState<Assunto[] | null>(null);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[] | null>(null);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [removidos, setRemovidos] = useState<{ assuntos: string[]; etiquetas: string[] }>({ assuntos: [], etiquetas: [] });
  const d = !podeEditar || salvando;

  const carregar = useCallback(async () => {
    const [a, e] = await Promise.all([
      db.from("chat_assuntos").select("*").order("ordem").order("nome"),
      db.from("chat_etiquetas").select("*").order("ordem").order("nome"),
    ]);
    setAssuntos((a.data ?? []).map((x: any) => ({ ...x, atendentes: x.atendentes ?? [] })));
    setEtiquetas(e.data ?? []);
    setRemovidos({ assuntos: [], etiquetas: [] });
  }, []);
  useEffect(() => {
    carregar();
    db.rpc("chat_atendentes").then(({ data }: any) => setAtendentes(data ?? []));
  }, [carregar]);

  const salvar = async () => {
    if (!assuntos || !etiquetas) return;
    const nomesA = assuntos.map((a) => a.nome.trim().toLowerCase());
    const nomesE = etiquetas.map((e) => e.nome.trim().toLowerCase());
    if (nomesA.some((n) => n.length < 2) || new Set(nomesA).size !== nomesA.length) return toast.error("Cada assunto precisa de um nome (sem repetir).");
    if (nomesE.some((n) => !n) || new Set(nomesE).size !== nomesE.length) return toast.error("Cada etiqueta precisa de um nome (sem repetir).");
    setSalvando(true);
    try {
      for (const id of removidos.assuntos) {
        const { error } = await db.from("chat_assuntos").delete().eq("id", id);
        if (error) throw error;
      }
      for (const id of removidos.etiquetas) {
        const { error } = await db.from("chat_etiquetas").delete().eq("id", id);
        if (error) throw error;
      }
      for (const [i, a] of assuntos.entries()) {
        const linha = { nome: a.nome.trim(), descricao: a.descricao?.trim() || null, cor: a.cor, atendentes: a.atendentes, exclusivo: a.exclusivo && a.atendentes.length > 0, ativo: a.ativo, ordem: i };
        const { error } = a.id ? await db.from("chat_assuntos").update(linha).eq("id", a.id) : await db.from("chat_assuntos").insert(linha);
        if (error) throw error;
      }
      for (const [i, e] of etiquetas.entries()) {
        const linha = { nome: e.nome.trim(), cor: e.cor, ativo: e.ativo, ordem: i };
        const { error } = e.id ? await db.from("chat_etiquetas").update(linha).eq("id", e.id) : await db.from("chat_etiquetas").insert(linha);
        if (error) throw error;
      }
      toast.success("Assuntos e etiquetas salvos.");
      await carregar();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  if (!assuntos || !etiquetas) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const mudarA = (i: number, p: Partial<Assunto>) => setAssuntos(assuntos.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const mudarE = (i: number, p: Partial<Etiqueta>) => setEtiquetas(etiquetas.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const nome = (uid: string) => atendentes.find((a) => a.user_id === uid)?.nome ?? "Atendente";

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <p className="font-semibold">Assuntos</p>
          <p className="text-sm text-muted-foreground">
            A IA identifica o assunto da conversa ao chamar a equipe (use a descrição para ajudá-la). Se o assunto tiver atendentes, a fila entrega
            primeiro para eles; marcando <b>só esses atendentes</b>, ninguém mais recebe.
          </p>
        </div>
        {assuntos.map((a, i) => (
          <div key={a.id ?? `novo-${i}`} className={cn("space-y-2 rounded-lg border p-3", !a.ativo && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: a.cor }} />
              <Input value={a.nome} disabled={d} maxLength={60} placeholder="Nome (ex.: Resultados)" className="h-8 max-w-[220px]" onChange={(e) => mudarA(i, { nome: e.target.value })} />
              <Input
                value={a.descricao ?? ""}
                disabled={d}
                maxLength={200}
                placeholder="Quando usar (ajuda a IA): ex.: resultado de exame, prazo do laudo"
                className="h-8 min-w-[200px] flex-1"
                onChange={(e) => mudarA(i, { descricao: e.target.value })}
              />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Ativo <Switch checked={a.ativo} disabled={d} onCheckedChange={(v) => mudarA(i, { ativo: v })} className="scale-75" />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={d}
                aria-label="Remover assunto"
                onClick={() => {
                  if (a.id) setRemovidos((r) => ({ ...r, assuntos: [...r.assuntos, a.id!] }));
                  setAssuntos(assuntos.filter((_, j) => j !== i));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SeletorCor valor={a.cor} disabled={d} onMudar={(c) => mudarA(i, { cor: c })} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={d}>
                    <Users className="mr-1 h-3.5 w-3.5" />
                    {a.atendentes.length ? `${a.atendentes.length} atendente(s)` : "Qualquer atendente"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-1 p-2">
                  {atendentes.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhum atendente cadastrado.</p>}
                  {atendentes.map((at) => (
                    <label key={at.user_id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={a.atendentes.includes(at.user_id)}
                        onChange={(e) =>
                          mudarA(i, { atendentes: e.target.checked ? [...a.atendentes, at.user_id] : a.atendentes.filter((x) => x !== at.user_id) })
                        }
                      />
                      <span className="flex-1 truncate">{at.nome}</span>
                      {at.role === "admin" && <Badge variant="outline" className="text-[10px]">admin</Badge>}
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
              {a.atendentes.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">{a.atendentes.map(nome).join(", ")}</span>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch checked={a.exclusivo} disabled={d} onCheckedChange={(v) => mudarA(i, { exclusivo: v })} className="scale-75" />
                    Só esses atendentes
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={d || assuntos.length >= 40}
          onClick={() => setAssuntos([...assuntos, { nome: "", descricao: "", cor: CORES[assuntos.length % CORES.length], atendentes: [], exclusivo: false, ativo: true, ordem: assuntos.length }])}
        >
          <Plus className="mr-1 h-4 w-4" /> Adicionar assunto
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <p className="font-semibold">Etiquetas</p>
          <p className="text-sm text-muted-foreground">A equipe marca as conversas com estas etiquetas (várias por conversa) e filtra a lista por elas.</p>
        </div>
        <div className="space-y-2">
          {etiquetas.map((e, i) => (
            <div key={e.id ?? `nova-${i}`} className={cn("flex flex-wrap items-center gap-2", !e.ativo && "opacity-60")}>
              <Tag className="h-4 w-4 shrink-0" style={{ color: e.cor }} />
              <Input value={e.nome} disabled={d} maxLength={40} placeholder="Nome da etiqueta" className="h-8 max-w-[220px]" onChange={(ev) => mudarE(i, { nome: ev.target.value })} />
              <SeletorCor valor={e.cor} disabled={d} onMudar={(c) => mudarE(i, { cor: c })} />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Ativa <Switch checked={e.ativo} disabled={d} onCheckedChange={(v) => mudarE(i, { ativo: v })} className="scale-75" />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={d}
                aria-label="Remover etiqueta"
                onClick={() => {
                  if (e.id) setRemovidos((r) => ({ ...r, etiquetas: [...r.etiquetas, e.id!] }));
                  setEtiquetas(etiquetas.filter((_, j) => j !== i));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={d || etiquetas.length >= 60}
          onClick={() => setEtiquetas([...etiquetas, { nome: "", cor: CORES[etiquetas.length % CORES.length], ativo: true, ordem: etiquetas.length }])}
        >
          <Plus className="mr-1 h-4 w-4" /> Adicionar etiqueta
        </Button>
      </section>

      {podeEditar && (
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Salvar
        </Button>
      )}
    </div>
  );
};
