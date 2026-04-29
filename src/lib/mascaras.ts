// Máscaras de input — mantém apenas dígitos e formata.

export const apenasDigitos = (v: string) => v.replace(/\D/g, "");

export function mascaraCPF(v: string) {
  const d = apenasDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function mascaraData(v: string) {
  const d = apenasDigitos(v).slice(0, 8);
  return d
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

export function mascaraCelular(v: string) {
  const d = apenasDigitos(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function mascaraCEP(v: string) {
  const d = apenasDigitos(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

// Validação de CPF (dígitos verificadores).
export function validarCPF(cpf: string): boolean {
  const d = apenasDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

// Converte "DD/MM/AAAA" → "AAAA-MM-DD". Retorna null se inválida.
export function dataBRparaISO(v: string): string | null {
  const d = apenasDigitos(v);
  if (d.length !== 8) return null;
  const dia = parseInt(d.slice(0, 2));
  const mes = parseInt(d.slice(2, 4));
  const ano = parseInt(d.slice(4, 8));
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  if (ano < 1900 || ano > new Date().getFullYear()) return null;
  const dt = new Date(ano, mes - 1, dia);
  if (
    dt.getFullYear() !== ano ||
    dt.getMonth() !== mes - 1 ||
    dt.getDate() !== dia
  )
    return null;
  return `${ano.toString().padStart(4, "0")}-${mes
    .toString()
    .padStart(2, "0")}-${dia.toString().padStart(2, "0")}`;
}
