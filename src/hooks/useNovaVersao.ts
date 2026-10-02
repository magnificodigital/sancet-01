import { useEffect } from "react";
import { toast } from "sonner";

// Quem deixa o site/painel aberto por dias continua rodando a versão antiga.
// De tempos em tempos compara o script principal publicado com o carregado e,
// se mudou, oferece atualizar.
const INTERVALO_MS = 5 * 60 * 1000;
const RE_SCRIPT = /\/assets\/index-[\w-]+\.js/;

export function useNovaVersao() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const atual = Array.from(document.scripts)
      .map((s) => s.getAttribute("src") ?? "")
      .find((src) => RE_SCRIPT.test(src))
      ?.match(RE_SCRIPT)?.[0];
    if (!atual) return;
    let avisado = false;

    const verificar = async () => {
      if (avisado || document.visibilityState !== "visible") return;
      try {
        const html = await fetch("/", { cache: "no-store" }).then((r) => r.text());
        const publicado = html.match(RE_SCRIPT)?.[0];
        if (publicado && publicado !== atual) {
          avisado = true;
          toast("Nova versão disponível", {
            description: "Atualize a página para usar as últimas melhorias.",
            duration: Infinity,
            action: { label: "Atualizar", onClick: () => window.location.reload() },
          });
        }
      } catch {
        /* offline: tenta de novo depois */
      }
    };

    const timer = window.setInterval(verificar, INTERVALO_MS);
    document.addEventListener("visibilitychange", verificar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", verificar);
    };
  }, []);
}
