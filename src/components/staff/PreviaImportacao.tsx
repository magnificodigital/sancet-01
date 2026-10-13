import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------- Helpers de planilha (catálogos) ----------

/** Lê a 1ª aba de um .xlsx/.xls/.csv como lista de objetos (cabeçalho = 1ª linha). */
export async function lerPlanilha(file: File): Promise<Record<string, any>[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const linhas: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  // Cabeçalhos tolerantes: minúsculas, sem acento/espaço extra.
  return linhas.map((r) => {
    const o: Record<string, any> = {};
    Object.entries(r).forEach(([k, v]) => {
      const chave = k
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
      o[chave] = typeof v === "string" ? v.trim() : v;
    });
    return o;
  });
}

/** Gera e baixa um .xlsx com a aba de dados e uma aba de instruções. */
export function baixarPlanilha(nomeArquivo: string, colunas: string[], linhas: Record<string, any>[], instrucoes: string[]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas, { header: colunas }), "Catalogo");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(instrucoes.map((l) => [l])),
    "Instrucoes",
  );
  XLSX.writeFile(wb, nomeArquivo);
}

/** SIM/NÃO da planilha → boolean (vazio = padrão). */
export function simNao(v: any, padrao: boolean): boolean {
  const s = String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
  if (!s) return padrao;
  return !["NAO", "N", "FALSE", "0", "INATIVO"].includes(s);
}

/** Célula vazia = "não mexer" (null). */
export const vazio = (v: any) => v === null || v === undefined || String(v).trim() === "";

export function emLotes<T>(lista: T[], tamanho: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) out.push(lista.slice(i, i + tamanho));
  return out;
}

/** Busca todas as linhas de uma consulta paginando (o banco devolve no máx. 1000 por vez). */
export async function buscarTodos<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw error;
    todos.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return todos;
}

// ---------- Prévia antes de aplicar ----------

export type ResumoImportacao = {
  novos: string[];
  alterados: string[];
  semPlanilha: string[]; // ativos hoje que não estão na planilha
  ignorados: string[]; // linhas inválidas / repetidas
};

const Lista = ({ titulo, itens, cor }: { titulo: string; itens: string[]; cor: string }) =>
  itens.length === 0 ? null : (
    <div>
      <p className={`text-sm font-semibold ${cor}`}>
        {titulo}: {itens.length}
      </p>
      <ul className="mt-1 max-h-28 overflow-y-auto rounded border bg-muted/30 px-2 py-1 text-xs">
        {itens.slice(0, 200).map((t, i) => (
          <li key={i} className="truncate">
            {t}
          </li>
        ))}
        {itens.length > 200 && <li className="text-muted-foreground">… e mais {itens.length - 200}</li>}
      </ul>
    </div>
  );

export const PreviaImportacao = ({
  resumo,
  onCancelar,
  onAplicar,
}: {
  resumo: ResumoImportacao | null;
  onCancelar: () => void;
  onAplicar: (desativarAusentes: boolean) => Promise<void>;
}) => {
  const [desativar, setDesativar] = useState(true);
  const [aplicando, setAplicando] = useState(false);
  if (!resumo) return null;
  const nada = !resumo.novos.length && !resumo.alterados.length && !(desativar && resumo.semPlanilha.length);

  return (
    <Dialog open onOpenChange={(v) => !v && !aplicando && onCancelar()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conferir importação</DialogTitle>
          <DialogDescription>Nada foi alterado ainda. Confira o que vai mudar e clique em Aplicar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Lista titulo="Exames novos" itens={resumo.novos} cor="text-green-700" />
          <Lista titulo="Exames alterados" itens={resumo.alterados} cor="text-blue-700" />
          <Lista titulo="Ativos hoje que NÃO estão na planilha" itens={resumo.semPlanilha} cor="text-amber-700" />
          {resumo.semPlanilha.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={desativar} onCheckedChange={(v) => setDesativar(!!v)} className="mt-0.5" />
              <span>
                Desativar esses {resumo.semPlanilha.length} exames (somem da busca do paciente; nada é apagado e dá
                para reativar depois).
              </span>
            </label>
          )}
          <Lista titulo="Linhas ignoradas" itens={resumo.ignorados} cor="text-red-700" />
          {nada && <p className="text-sm text-muted-foreground">A planilha não traz nenhuma mudança.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancelar} disabled={aplicando}>
            Cancelar
          </Button>
          <Button
            disabled={aplicando || nada}
            className="bg-brand-2 text-white hover:bg-[#162f58]"
            onClick={async () => {
              setAplicando(true);
              try {
                await onAplicar(desativar);
              } finally {
                setAplicando(false);
              }
            }}
          >
            {aplicando ? "Aplicando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
