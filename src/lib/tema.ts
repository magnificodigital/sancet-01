import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cores da marca controláveis em Configurações → Aparência.
export const CHAVES_TEMA = ["TEMA_PRIMARIA", "TEMA_SECUNDARIA", "TEMA_SIDEBAR"] as const;

// ---- Logos (URLs no storage; controláveis em Configurações → Aparência) ----
export type Logos = { claro: string | null; escuro: string | null };
let logosAtuais: Logos = { claro: null, escuro: null };
const logoSubs = new Set<() => void>();

export function setLogos(next: Logos) {
  logosAtuais = next;
  logoSubs.forEach((cb) => cb());
}

/** Atualiza o favicon da aba do navegador em runtime (vazio → volta ao padrão). */
export function aplicarFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url || "/favicon.ico";
}

/** Hook reativo: retorna as URLs de logo configuradas (ou null). */
export function useLogos(): Logos {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    logoSubs.add(cb);
    return () => {
      logoSubs.delete(cb);
    };
  }, []);
  return logosAtuais;
}

export const TEMA_PADRAO: Record<string, string> = {
  TEMA_PRIMARIA: "#C8102E",
  TEMA_SECUNDARIA: "#1B3A6B",
  TEMA_SIDEBAR: "#0B1F3A",
  TEMA_RODAPE: "#3A3A3A",
  TEMA_RODAPE_TEXTO: "#EBEBEB",
};

type HSL = { h: number; s: number; l: number };

export function hexToHsl(hex: string): HSL | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((hex ?? "").trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const hslStr = (p: HSL, deltaL = 0) =>
  `${p.h} ${p.s}% ${Math.max(0, Math.min(100, p.l + deltaL))}%`;

/** Aplica as cores (hex) como variáveis CSS no :root, em runtime. */
export function aplicarTema(cores: Partial<Record<string, string>>) {
  const root = document.documentElement;

  const prim = cores.TEMA_PRIMARIA && hexToHsl(cores.TEMA_PRIMARIA);
  if (prim) {
    const s = hslStr(prim);
    [
      "--brand",
      "--primary",
      "--ring",
      "--destructive",
      "--sidebar-primary",
      "--sidebar-ring",
    ].forEach((v) => root.style.setProperty(v, s));
    // tom de hover = ~6% mais escuro
    root.style.setProperty("--brand-hover", hslStr(prim, -6));
  }

  const sec = cores.TEMA_SECUNDARIA && hexToHsl(cores.TEMA_SECUNDARIA);
  if (sec) {
    const s = hslStr(sec);
    ["--brand-2", "--secondary"].forEach((v) => root.style.setProperty(v, s));
  }

  const side = cores.TEMA_SIDEBAR && hexToHsl(cores.TEMA_SIDEBAR);
  if (side) root.style.setProperty("--brand-sidebar", hslStr(side));

  const rod = cores.TEMA_RODAPE && hexToHsl(cores.TEMA_RODAPE);
  if (rod) root.style.setProperty("--footer", hslStr(rod));

  const rodTxt = cores.TEMA_RODAPE_TEXTO && hexToHsl(cores.TEMA_RODAPE_TEXTO);
  if (rodTxt) root.style.setProperty("--footer-foreground", hslStr(rodTxt));
}

/** Lê as cores salvas no banco (via RPC pública, sem expor segredos) e aplica.
    Chamado no boot do app — funciona também para visitantes anônimos. */
export async function carregarTema() {
  try {
    // RPC tema_publico(): retorna apenas as chaves TEMA_*/LOGO_* como jsonb.
    const { data } = await (supabase as any).rpc("tema_publico");
    const cores = (data ?? {}) as Record<string, string>;
    if (cores && Object.keys(cores).length) aplicarTema(cores);
    setLogos({
      claro: cores.LOGO_CLARO || null,
      escuro: cores.LOGO_ESCURO || null,
    });
    if (cores.FAVICON) aplicarFavicon(cores.FAVICON);
  } catch {
    /* silencioso — mantém as cores padrão do CSS */
  }
}
