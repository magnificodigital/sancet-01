import { useEffect, useState } from "react";

// Sinal compartilhado: a página atual tem um HERO no topo?
// Serve para o cabeçalho (transparente) ficar branco sobre heros escuros.
let sobreHero = false;
const subs = new Set<() => void>();

export function setSobreHero(v: boolean) {
  if (sobreHero === v) return;
  sobreHero = v;
  subs.forEach((cb) => cb());
}

export function useSobreHero(): boolean {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  }, []);
  return sobreHero;
}
