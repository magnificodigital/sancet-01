import { useEffect, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normalizeExameNome } from "@/lib/normalizeExame";

const POR_PAGINA = 50;

type ExameConvenio = { codigo_shift: number; nome: string; nome_norm: string; ativo: boolean };
type Preparo = { jejum_horas: number; instrucoes: string[] };

/**
 * Catálogo de CONVÊNIO (exames_convenio, importado do Shift — milhares de
 * exames). É o que o paciente vê ao buscar exames pelo convênio. O preparo
 * (jejum + orientações) fica em exame_preparo, ligado pelo nome normalizado,
 * e é o mesmo usado na tela do paciente e no e-mail de preparo.
 */
export const CatalogoConvenio = ({ podeEditar }: { podeEditar: boolean }) => {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<ExameConvenio[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);

  const [editando, setEditando] = useState<ExameConvenio | null>(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [jejum, setJejum] = useState("0");
  const [instrucoes, setInstrucoes] = useState("");
  const [temPreparo, setTemPreparo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Busca com pequeno atraso enquanto digita.
  useEffect(() => {
    const t = setTimeout(() => {
      setTermo(busca.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = async () => {
    setCarregando(true);
    let q = (supabase as any)
      .from("exames_convenio")
      .select("codigo_shift, nome, nome_norm, ativo", { count: "exact" })
      .order("nome")
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
    if (termo) {
      q = /^\d+$/.test(termo)
        ? q.eq("codigo_shift", Number(termo))
        : q.ilike("nome_norm", `%${normalizeExameNome(termo)}%`);
    }
    const { data, count, error } = await q;
    setCarregando(false);
    if (error) return toast.error("Não foi possível carregar o catálogo de convênio.");
    setItens(data ?? []);
    setTotal(count ?? 0);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo, pagina]);

  const abrir = async (e: ExameConvenio) => {
    setEditando(e);
    setNome(e.nome);
    setAtivo(e.ativo);
    setJejum("0");
    setInstrucoes("");
    setTemPreparo(false);
    const { data } = await (supabase as any)
      .from("exame_preparo")
      .select("jejum_horas, instrucoes")
      .eq("nome_norm", e.nome_norm)
      .maybeSingle();
    if (data) {
      const p = data as Preparo;
      setTemPreparo(true);
      setJejum(String(p.jejum_horas ?? 0));
      setInstrucoes((Array.isArray(p.instrucoes) ? p.instrucoes : []).join("\n"));
    }
  };

  const salvar = async () => {
    if (!editando) return;
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return toast.error("Informe o nome do exame.");
    const horas = Math.max(0, parseInt(jejum, 10) || 0);
    const novoNorm = normalizeExameNome(nomeLimpo);
    setSalvando(true);

    const { data: upd, error: e1 } = await (supabase as any)
      .from("exames_convenio")
      .update({ nome: nomeLimpo, nome_norm: novoNorm, ativo })
      .eq("codigo_shift", editando.codigo_shift)
      .select("codigo_shift");
    if (e1 || !upd?.length) {
      setSalvando(false);
      return toast.error(e1?.message ?? "Sem permissão para alterar o catálogo.");
    }

    const linhas = instrucoes
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (linhas.length || horas > 0 || temPreparo) {
      const { error: e2 } = await (supabase as any)
        .from("exame_preparo")
        .upsert(
          { nome_norm: novoNorm, jejum_horas: horas, instrucoes: linhas, atualizado_em: new Date().toISOString() },
          { onConflict: "nome_norm" },
        );
      if (e2) {
        setSalvando(false);
        return toast.error(`Exame salvo, mas o preparo falhou: ${e2.message}`);
      }
    }

    setSalvando(false);
    toast.success("Exame atualizado.");
    setEditando(null);
    carregar();
  };

  const alternarAtivo = async (e: ExameConvenio, novo: boolean) => {
    setItens((prev) => prev.map((i) => (i.codigo_shift === e.codigo_shift ? { ...i, ativo: novo } : i)));
    const { error } = await (supabase as any)
      .from("exames_convenio")
      .update({ ativo: novo })
      .eq("codigo_shift", e.codigo_shift);
    if (error) {
      toast.error("Não foi possível alterar.");
      setItens((prev) => prev.map((i) => (i.codigo_shift === e.codigo_shift ? { ...i, ativo: !novo } : i)));
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Exames que o paciente vê ao buscar pelo <b>convênio</b> (importados do Shift). O preparo editado aqui
        aparece para o paciente e vai no e-mail de preparo.
      </p>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código Shift (ex.: serotonina)"
          className="pl-9"
        />
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((e) => (
              <TableRow key={e.codigo_shift}>
                <TableCell className="font-mono text-xs">{e.codigo_shift}</TableCell>
                <TableCell>{e.nome}</TableCell>
                <TableCell>
                  <Switch checked={e.ativo} disabled={!podeEditar} onCheckedChange={(v) => alternarAtivo(e, v)} />
                </TableCell>
                <TableCell>
                  {podeEditar && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => abrir(e)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!carregando && itens.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum exame encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {carregando ? "Carregando..." : `${total} exames · página ${pagina} de ${totalPaginas}`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      <Sheet open={!!editando} onOpenChange={(v) => !v && !salvando && setEditando(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>Editar exame do convênio</SheetTitle>
          </SheetHeader>
          {editando && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">Código Shift: {editando.codigo_shift}</p>
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Ativo (aparece na busca do paciente)</Label>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>
              <div className="space-y-1.5">
                <Label>Jejum (horas)</Label>
                <Input type="number" min={0} value={jejum} onChange={(e) => setJejum(e.target.value)} className="w-32" />
                <p className="text-xs text-muted-foreground">0 = sem jejum. No e-mail vale o maior jejum do pedido.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Orientações de preparo (uma por linha)</Label>
                <Textarea
                  rows={8}
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder={"Ex.:\nInformar medicamentos em uso durante os últimos 3 dias.\nEvitar alimentos ricos em serotonina 72h antes."}
                />
                {!temPreparo && (
                  <p className="text-xs text-amber-700">Este exame ainda não tem preparo cadastrado.</p>
                )}
              </div>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditando(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando} className="bg-brand-2 text-white hover:bg-[#162f58]">
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
