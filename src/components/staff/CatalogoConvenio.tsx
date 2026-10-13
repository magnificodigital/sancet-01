import { useEffect, useState } from "react";
import { Download, Pencil, Search, Upload } from "lucide-react";
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
import {
  baixarPlanilha,
  buscarTodos,
  emLotes,
  lerPlanilha,
  PreviaImportacao,
  ResumoImportacao,
  simNao,
  vazio,
} from "./PreviaImportacao";

const POR_PAGINA = 50;

// Compara orientações pelo conteúdo (a planilha quebra uma orientação com
// várias linhas em itens separados; não é mudança real).
const textoPreparo = (l: any) =>
  (Array.isArray(l) ? l : []).join(" ").replace(/\s+/g, " ").trim();

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

  // ---------- Planilha (fonte de verdade do catálogo de convênio) ----------
  const [processando, setProcessando] = useState(false);
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null);
  const [aplicar, setAplicar] = useState<((desativar: boolean) => Promise<void>) | null>(null);

  const carregarTudo = async () => {
    const exames = await buscarTodos<ExameConvenio>((de, ate) =>
      (supabase as any).from("exames_convenio").select("codigo_shift, nome, nome_norm, ativo").order("nome").range(de, ate),
    );
    const preparos = await buscarTodos<{ nome_norm: string } & Preparo>((de, ate) =>
      (supabase as any).from("exame_preparo").select("nome_norm, jejum_horas, instrucoes").order("nome_norm").range(de, ate),
    );
    const prepPorNorm = new Map(preparos.map((p) => [p.nome_norm, p]));
    return { exames, prepPorNorm };
  };

  const exportar = async () => {
    setProcessando(true);
    try {
      const { exames, prepPorNorm } = await carregarTudo();
      const linhas = exames.map((e) => {
        const p = prepPorNorm.get(e.nome_norm);
        return {
          codigo_shift: e.codigo_shift,
          nome: e.nome,
          ativo: e.ativo ? "SIM" : "NAO",
          jejum_horas: p ? p.jejum_horas : "",
          preparo: p && Array.isArray(p.instrucoes) ? p.instrucoes.join("\n") : "",
        };
      });
      baixarPlanilha(
        `catalogo-convenio-${new Date().toISOString().slice(0, 10)}.xlsx`,
        ["codigo_shift", "nome", "ativo", "jejum_horas", "preparo"],
        linhas,
        [
          "Catálogo de exames do CONVÊNIO — Sancet",
          "codigo_shift: código do exame (número, obrigatório). É ele que liga a linha ao exame.",
          "nome: nome do exame como aparece para o paciente (obrigatório).",
          "ativo: SIM ou NAO. NAO tira o exame da busca do paciente.",
          "jejum_horas: horas de jejum (0 = sem jejum). Vazio = não altera.",
          "preparo: orientações, uma por linha dentro da célula (Alt+Enter no Excel). Vazio = não altera.",
          "Exames que não estiverem na planilha podem ser desativados na importação (nada é apagado).",
        ],
      );
    } catch {
      toast.error("Não foi possível gerar a planilha.");
    } finally {
      setProcessando(false);
    }
  };

  const importar = async (file: File) => {
    setProcessando(true);
    try {
      const [linhas, atual] = await Promise.all([lerPlanilha(file), carregarTudo()]);
      if (!linhas.length) return toast.error("Planilha vazia.");
      if (!("codigo_shift" in linhas[0]) || !("nome" in linhas[0])) {
        return toast.error('A planilha precisa das colunas "codigo_shift" e "nome". Use "Baixar planilha" como base.');
      }
      const porCodigo = new Map(atual.exames.map((e) => [e.codigo_shift, e]));
      const ignorados: string[] = [];
      const vistos = new Map<number, any>();
      linhas.forEach((r, i) => {
        const codigo = parseInt(String(r.codigo_shift ?? "").replace(/\D/g, ""), 10);
        const nomeL = String(r.nome ?? "").trim();
        if (!Number.isFinite(codigo) || !nomeL) {
          ignorados.push(`Linha ${i + 2}: sem código ou nome`);
          return;
        }
        if (vistos.has(codigo)) ignorados.push(`Linha ${i + 2}: código ${codigo} repetido (vale a última)`);
        const horas = vazio(r.jejum_horas) ? null : Math.max(0, parseInt(String(r.jejum_horas), 10) || 0);
        const prep = vazio(r.preparo)
          ? null
          : String(r.preparo)
              .split(/\r?\n|\s\|\s/)
              .map((l) => l.trim())
              .filter(Boolean);
        vistos.set(codigo, { codigo, nome: nomeL, ativo: simNao(r.ativo, true), horas, prep });
      });

      const novos: any[] = [];
      const alterados: any[] = [];
      const preparos = new Map<string, any>();
      vistos.forEach((l) => {
        const norm = normalizeExameNome(l.nome);
        const ex = porCodigo.get(l.codigo);
        const prepAtual = atual.prepPorNorm.get(ex?.nome_norm ?? norm) ?? atual.prepPorNorm.get(norm);
        const horas = l.horas ?? prepAtual?.jejum_horas ?? 0;
        const instr = l.prep ?? (Array.isArray(prepAtual?.instrucoes) ? prepAtual!.instrucoes : []);
        const prepMudou =
          (l.horas !== null || l.prep !== null) &&
          (!prepAtual || prepAtual.jejum_horas !== horas || textoPreparo(prepAtual.instrucoes) !== textoPreparo(instr));
        const linha = { codigo_shift: l.codigo, nome: l.nome, nome_norm: norm, ativo: l.ativo };
        if (!ex) novos.push(linha);
        else if (ex.nome !== l.nome || ex.ativo !== l.ativo || prepMudou || (ex.nome_norm !== norm && prepAtual))
          alterados.push(linha);
        // Preparo acompanha o nome (nome_norm): grava quando muda ou quando o nome mudou.
        if (prepMudou || (ex && ex.nome_norm !== norm && prepAtual) || (!ex && (l.horas !== null || l.prep !== null))) {
          preparos.set(norm, { nome_norm: norm, jejum_horas: horas, instrucoes: instr, atualizado_em: new Date().toISOString() });
        }
      });
      const semPlanilha = atual.exames.filter((e) => e.ativo && !vistos.has(e.codigo_shift));

      setResumo({
        novos: novos.map((n) => `${n.codigo_shift} — ${n.nome}`),
        alterados: alterados.map((n) => `${n.codigo_shift} — ${n.nome}`),
        semPlanilha: semPlanilha.map((e) => `${e.codigo_shift} — ${e.nome}`),
        ignorados,
      });
      setAplicar(() => async (desativar: boolean) => {
        try {
          for (const lote of emLotes([...novos, ...alterados], 500)) {
            const { error } = await (supabase as any).from("exames_convenio").upsert(lote, { onConflict: "codigo_shift" });
            if (error) throw error;
          }
          for (const lote of emLotes([...preparos.values()], 500)) {
            const { error } = await (supabase as any).from("exame_preparo").upsert(lote, { onConflict: "nome_norm" });
            if (error) throw error;
          }
          if (desativar) {
            for (const lote of emLotes(semPlanilha.map((e) => e.codigo_shift), 300)) {
              const { error } = await (supabase as any).from("exames_convenio").update({ ativo: false }).in("codigo_shift", lote);
              if (error) throw error;
            }
          }
          toast.success(
            `Catálogo atualizado: ${novos.length} novos, ${alterados.length} alterados` +
              (desativar && semPlanilha.length ? `, ${semPlanilha.length} desativados.` : "."),
          );
          setResumo(null);
          carregar();
        } catch (e: any) {
          toast.error(`Erro ao aplicar: ${e?.message ?? e}. Parte pode ter sido gravada; importe de novo para concluir.`);
        }
      });
    } catch (e: any) {
      toast.error(`Não foi possível ler a planilha: ${e?.message ?? e}`);
    } finally {
      setProcessando(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Exames que o paciente vê ao buscar pelo <b>convênio</b> (importados do Shift). O preparo editado aqui
        aparece para o paciente e vai no e-mail de preparo.
      </p>
      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportar} disabled={processando}>
            <Download className="h-4 w-4" /> Baixar planilha
          </Button>
          <label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={processando}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) importar(f);
              }}
            />
            <Button variant="outline" size="sm" className="cursor-pointer gap-1.5" asChild>
              <span>
                <Upload className="h-4 w-4" /> {processando ? "Processando..." : "Importar planilha"}
              </span>
            </Button>
          </label>
        </div>
      )}
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

      <PreviaImportacao
        resumo={resumo}
        onCancelar={() => setResumo(null)}
        onAplicar={async (d) => {
          if (aplicar) await aplicar(d);
        }}
      />

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
