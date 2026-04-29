export function gerarProtocolo(): string {
  const ano = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SAN-${ano}-${random}`;
}
