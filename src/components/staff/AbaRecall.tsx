import { useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Regra = {
  id: string;
  codigo_shift: string;
  nome: string;
  meses: number;
  ativo: boolean;
};

type ExameBusca = { codigo_shift: string; nome: string };

export const AbaRecall = () => {
  const [ativo, setAtivo] = useState(false);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [devidos, setDevidos] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ExameBusca[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    const [{ data: cfg }, { data: rg }, { data: cand }] = await Promise.all([
      supabase.from("configuracoes").select("valor").eq("chave", "RECALL_ATIVO").maybeSingle(),
      supabase.from("recall_regras").select("*").order("nome"),
      supabase.rpc("recall_candidatos"),
    ]);
    setAtivo((cfg as any)?.valor === "true");
    setRegras((rg as Regra[]) ?? []);
    setDevidos(Array.isArray(cand) ? (cand as any[]).length : 0);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const alternarAtivo = async (v: boolean) => {
    setAtivo(v);
    const { error } = await supabase
      .from("configuracoes")
      .upsert({ chave: "RECALL_ATIVO", valor: v ? "true" : "false" }, { onConflict: "chave" });
    if (error) {
      toast.error("Erro ao salvar.");
      setAtivo(!v);
    } else {
      toast.success(v ? "Recall ativado." : "Recall desativado.");
      carregar();
    }
  };

  const buscar = async (q: string) => {
    setBusca(q);
    if (q.trim().length < 2) {
      setResultados([]);
      return;
    }
    const { data } = await supabase
      .from("exames_cache")
      .select("codigo_shift, nome")
      .eq("ativo", true)
      .ilike("nome", `%${q.trim()}%`)
      .limit(8);
    setResultados((data as ExameBusca[]) ?? []);
  };

  const adicionar = async (ex: ExameBusca) => {
    if (regras.some((r) => r.codigo_shift === String(ex.codigo_shift))) {
      toast.message("Esse exame já tem regra.");
      return;
    }
    const { error } = await supabase.from("recall_regras").insert({
      codigo_shift: String(ex.codigo_shift),
      nome: ex.nome,
      meses: 12,
      ativo: true,
    });
    if (error) {
      toast.error("Erro ao adicionar (só admin pode).");
      return;
    }
    setBusca("");
    setResultados([]);
    carregar();
  };

  const salvarMeses = async (id: string, meses: number) => {
    if (!meses || meses < 1) return;
    await supabase.from("recall_regras").update({ meses }).eq("id", id);
  };

  const alternarRegra = async (id: string, ativo: boolean) => {
    setRegras((rs) => rs.map((r) => (r.id === id ? { ...r, ativo } : r)));
    await supabase.from("recall_regras").update({ ativo }).eq("id", id);
  };

  const excluir = async (id: string) => {
    setRegras((rs) => rs.filter((r) => r.id !== id));
    await supabase.from("recall_regras").delete().eq("id", id);
    carregar();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Recall — lembretes de retorno</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Avisa o paciente por e-mail quando chega a hora de repetir um exame. Você
          define quais exames e a periodicidade. Só age quando estiver ativado.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Switch checked={ativo} onCheckedChange={alternarAtivo} />
          <div>
            <p className="font-semibold text-secondary">
              {ativo ? "Recall ativado" : "Recall desativado"}
            </p>
            <p className="text-xs text-muted-foreground">
              {ativo
                ? "Os lembretes são enviados automaticamente conforme as regras."
                : "Nenhum lembrete é enviado enquanto estiver desativado."}
            </p>
          </div>
        </div>
        {devidos !== null && (
          <div className="text-right">
            <p className="text-2xl font-bold text-secondary">{devidos}</p>
            <p className="text-xs text-muted-foreground">pacientes devidos agora</p>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="mb-3 font-semibold text-secondary">Adicionar exame ao recall</p>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => buscar(e.target.value)}
            placeholder="Buscar exame pelo nome..."
            className="pl-9"
          />
          {resultados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
              {resultados.map((ex) => (
                <button
                  key={ex.codigo_shift}
                  onClick={() => adicionar(ex)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span>{ex.nome}</span>
                  <Plus className="h-4 w-4 shrink-0 text-brand" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="mb-3 font-semibold text-secondary">Regras ({regras.length})</p>
        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : regras.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma regra ainda. Adicione exames acima.
          </p>
        ) : (
          <div className="divide-y">
            {regras.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1 text-sm text-secondary">{r.nome}</span>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground">repetir a cada</span>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={r.meses}
                    onBlur={(e) => salvarMeses(r.id, parseInt(e.target.value))}
                    className="h-8 w-16 text-center"
                  />
                  <span className="text-muted-foreground">meses</span>
                </div>
                <Switch checked={r.ativo} onCheckedChange={(v) => alternarRegra(r.id, v)} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => excluir(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
