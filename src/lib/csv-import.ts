// Helpers para importar CSV (separador ;) com detecção de encoding UTF-8 / CP-1252

export async function lerCsvComEncoding(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // tentar UTF-8 estrito
  try {
    const txt = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return removerBom(txt);
  } catch {
    // fallback windows-1252 (Excel BR default)
    const txt = new TextDecoder("windows-1252").decode(buf);
    return removerBom(txt);
  }
}

function removerBom(s: string) {
  return s.replace(/^\uFEFF/, "");
}

// Parser CSV simples com suporte a aspas e separador customizável
export function parseCsv(texto: string, sep = ";"): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroAspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') { dentroAspas = false; }
      else { campo += c; }
    } else {
      if (c === '"') dentroAspas = true;
      else if (c === sep) { linha.push(campo); campo = ""; }
      else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
      else if (c === "\r") { /* ignora */ }
      else { campo += c; }
    }
  }
  if (campo.length > 0 || linha.length > 0) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

export function csvParaObjetos(texto: string, sep = ";"): Record<string, string>[] {
  const linhas = parseCsv(texto, sep);
  if (linhas.length === 0) return [];
  const cabecalho = linhas[0].map((c) => c.trim().replace(/^\uFEFF/, ""));
  return linhas.slice(1).map((linha) => {
    const obj: Record<string, string> = {};
    cabecalho.forEach((col, idx) => {
      obj[col] = (linha[idx] ?? "").trim();
    });
    return obj;
  });
}

export function parsePrecoBR(valor: string): number | null {
  if (!valor) return null;
  const limpo = valor
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? null : n;
}
