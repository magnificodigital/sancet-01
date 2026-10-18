import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, Pencil, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePaciente } from "@/hooks/usePaciente";
import { ConvenioSalvo, useConveniosSalvos } from "@/hooks/useConveniosSalvos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Convenio = { id: string; nome: string; codigo_shift: string };
import { SeletorPlano, type Plano } from "@/components/convenio/SeletorPlano";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Aba "Convênio" do paciente: cadastra convênio + plano + carteirinha (número e
 * foto) na conta. No próximo pedido os dados já vêm preenchidos.
 */
export const AbaConvenio = () => {
  const { data: salvos = [], isLoading } = useConveniosSalvos();
  const [editando, setEditando] = useState<ConvenioSalvo | "novo" | null>(null);
  const qc = useQueryClient();

  const remover = async (c: ConvenioSalvo) => {
    if (!window.confirm(`Remover o convênio ${c.convenio_nome} da sua conta?`)) return;
    const { error } = await (supabase as any).from("paciente_convenios").delete().eq("id", c.id);
    if (error) return toast.error("Não foi possível remover.");
    toast.success("Convênio removido.");
    qc.invalidateQueries({ queryKey: ["convenios-salvos"] });
  };

  const tornarPrincipal = async (c: ConvenioSalvo) => {
    await (supabase as any).from("paciente_convenios").update({ principal: false }).neq("id", c.id);
    const { error } = await (supabase as any).from("paciente_convenios").update({ principal: true }).eq("id", c.id);
    if (error) return toast.error("Não foi possível alterar.");
    qc.invalidateQueries({ queryKey: ["convenios-salvos"] });
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-secondary">Convênio</h1>
      <p className="text-sm text-muted-foreground">
        Salve seu convênio e a carteirinha para agilizar os próximos agendamentos: os dados já vêm preenchidos.
      </p>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : salvos.length === 0 ? (
        <div className="space-y-4 rounded-xl border bg-card p-6 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-brand-2" />
          <h3 className="text-lg font-semibold text-secondary">Nenhum convênio salvo</h3>
          <Button onClick={() => setEditando("novo")} className="bg-brand text-white hover:bg-brand-hover">
            Adicionar convênio
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {salvos.map((c) => (
              <li key={c.id} className={cn("rounded-xl border bg-card p-4", c.principal && "border-brand/40")}>
                <div className="flex flex-wrap items-start gap-3">
                  <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-brand-2" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-secondary">
                      {c.convenio_nome}
                      {c.principal && (
                        <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">
                          Principal
                        </span>
                      )}
                    </p>
                    {c.plano_descricao && <p className="text-sm text-muted-foreground">Plano: {c.plano_descricao}</p>}
                    <p className="text-sm text-muted-foreground">
                      Carteirinha: ****{c.numero_carteirinha.slice(-4)}
                      {c.validade && ` · validade ${c.validade.split("-").reverse().join("/")}`}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs">
                      {c.url_carteirinha ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Foto da carteirinha salva
                        </>
                      ) : (
                        <span className="text-amber-700">Sem foto da carteirinha</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!c.principal && salvos.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => tornarPrincipal(c)} title="Tornar principal">
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditando(c)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remover(c)}
                      title="Remover"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" onClick={() => setEditando("novo")}>
            + Adicionar outro convênio
          </Button>
        </>
      )}

      <FormConvenio
        aberto={!!editando}
        atual={editando && editando !== "novo" ? editando : null}
        primeiro={salvos.length === 0}
        onFechar={() => setEditando(null)}
      />
    </div>
  );
};

const FormConvenio = ({
  aberto,
  atual,
  primeiro,
  onFechar,
}: {
  aberto: boolean;
  atual: ConvenioSalvo | null;
  primeiro: boolean;
  onFechar: () => void;
}) => {
  const qc = useQueryClient();
  const { paciente } = usePaciente();
  const inputRef = useRef<HTMLInputElement>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [busca, setBusca] = useState("");
  const [convSel, setConvSel] = useState<Convenio | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoSel, setPlanoSel] = useState<string>("");
  const [numero, setNumero] = useState("");
  const [validade, setValidade] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [principal, setPrincipal] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setBusca("");
    setFoto(null);
    setNumero(atual?.numero_carteirinha ?? "");
    setValidade(atual?.validade ?? "");
    setPrincipal(atual ? atual.principal : primeiro);
    setPlanoSel(atual?.plano_codigo ?? "");
    setConvSel(
      atual?.convenio_id
        ? { id: atual.convenio_id, nome: atual.convenio_nome, codigo_shift: atual.convenio_codigo_shift ?? "" }
        : null,
    );
    if (!convenios.length) {
      supabase
        .from("convenios_cache")
        .select("id,nome,codigo_shift")
        .eq("ativo", true)
        .limit(1000)
        .then(({ data }) =>
          setConvenios(
            ((data as Convenio[]) ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
          ),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, atual?.id]);

  useEffect(() => {
    setPlanos([]);
    if (!convSel) return;
    supabase
      .from("convenios_planos")
      .select("codigo_item,descricao")
      .eq("convenio_id", convSel.id)
      .eq("ativo", true)
      .order("codigo_item")
      .limit(1000)
      .then(({ data }) => setPlanos((data as Plano[]) ?? []));
  }, [convSel?.id]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (q ? convenios.filter((c) => c.nome.toLowerCase().includes(q)) : convenios).slice(0, 50);
  }, [convenios, busca]);

  const salvar = async () => {
    if (!paciente) return;
    if (!convSel) return toast.error("Escolha o convênio.");
    if (planos.length > 0 && !planoSel) return toast.error("Escolha o plano.");
    if (!numero.trim()) return toast.error("Informe o número da carteirinha.");
    setSalvando(true);
    try {
      let urlCarteirinha = atual?.url_carteirinha ?? null;
      if (foto) {
        const ext = (foto.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${paciente.cpf}/${Date.now()}-carteirinha-salva.${ext}`;
        const { error: upErr } = await supabase.storage.from("documentos-pedidos").upload(path, foto);
        if (upErr) throw upErr;
        urlCarteirinha = path;
      }
      const plano = planos.find((p) => p.codigo_item === planoSel);
      const registro = {
        paciente_id: paciente.id,
        convenio_id: convSel.id,
        convenio_nome: convSel.nome,
        convenio_codigo_shift: convSel.codigo_shift,
        plano_codigo: plano?.codigo_item ?? null,
        plano_descricao: plano?.descricao ?? null,
        numero_carteirinha: numero.trim(),
        validade: validade || null,
        url_carteirinha: urlCarteirinha,
        principal,
        updated_at: new Date().toISOString(),
      };
      if (principal) {
        await (supabase as any).from("paciente_convenios").update({ principal: false }).eq("paciente_id", paciente.id);
      }
      const { error } = atual
        ? await (supabase as any).from("paciente_convenios").update(registro).eq("id", atual.id)
        : await (supabase as any).from("paciente_convenios").insert(registro);
      if (error) throw error;
      toast.success("Convênio salvo na sua conta.");
      qc.invalidateQueries({ queryKey: ["convenios-salvos"] });
      onFechar();
    } catch (e: any) {
      toast.error(`Não foi possível salvar: ${e?.message ?? e}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !salvando && onFechar()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{atual ? "Editar convênio" : "Adicionar convênio"}</DialogTitle>
          <DialogDescription>Esses dados vão preencher automaticamente seus próximos pedidos.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Convênio *</Label>
            {convSel ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <span className="flex-1 font-medium">{convSel.nome}</span>
                <button type="button" className="text-xs text-brand hover:underline" onClick={() => setConvSel(null)}>
                  Trocar
                </button>
              </div>
            ) : (
              <>
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar convênio..." />
                <ul className="max-h-48 overflow-y-auto rounded-md border">
                  {filtrados.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setConvSel(c);
                          setPlanoSel("");
                        }}
                      >
                        {c.nome}
                      </button>
                    </li>
                  ))}
                  {filtrados.length === 0 && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum convênio encontrado.</li>
                  )}
                </ul>
              </>
            )}
          </div>

          {convSel && planos.length > 0 && (
            <div className="space-y-1.5">
              <Label>Plano *</Label>
              <SeletorPlano
                planos={planos}
                valor={planos.find((p) => p.codigo_item === planoSel) ?? null}
                onChange={(p) => setPlanoSel(p.codigo_item)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Número da carteirinha *</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" />
          </div>

          <div className="space-y-1.5">
            <Label>Validade (opcional)</Label>
            <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="w-48" />
          </div>

          <div className="space-y-1.5">
            <Label>Foto da carteirinha</Label>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (f && f.size > MAX_BYTES) return toast.error("Arquivo muito grande (máx. 10 MB).");
                setFoto(f);
              }}
            />
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {foto ? foto.name : atual?.url_carteirinha ? "Trocar foto (já tem uma salva)" : "Enviar foto ou PDF"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Com a foto salva, você não precisa anexar a carteirinha de novo a cada pedido.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={principal} onCheckedChange={(v) => setPrincipal(!!v)} />
            Usar como meu convênio principal
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando} className="bg-brand text-white hover:bg-brand-hover">
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
