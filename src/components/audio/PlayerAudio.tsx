import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
const VELOCIDADES = [1, 1.5, 2];

/** Player de áudio estilo WhatsApp: play/pausa, barra, tempo e velocidade. */
export const PlayerAudio = ({ src, claro = false, className }: { src: string; claro?: boolean; className?: string }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [atual, setAtual] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [vel, setVel] = useState(1);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setAtual(a.currentTime);
    // WebM gravado no navegador às vezes vem sem duração: força o cálculo.
    const onMeta = () => {
      if (a.duration === Infinity) {
        a.currentTime = 1e101;
        a.ontimeupdate = () => {
          a.ontimeupdate = null;
          setDuracao(a.duration);
          a.currentTime = 0;
        };
      } else setDuracao(a.duration);
    };
    const onEnd = () => {
      setTocando(false);
      setAtual(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    const onWait = () => setCarregando(true);
    const onPlay = () => setCarregando(false);
    const onErr = () => {
      setErro(true);
      setTocando(false);
    };
    setErro(false);
    a.addEventListener("waiting", onWait);
    a.addEventListener("playing", onPlay);
    a.addEventListener("error", onErr);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("waiting", onWait);
      a.removeEventListener("playing", onPlay);
      a.removeEventListener("error", onErr);
    };
  }, [src]);

  const alternar = () => {
    const a = ref.current;
    if (!a) return;
    if (tocando) {
      a.pause();
      setTocando(false);
    } else {
      // Pausa outros áudios tocando na página.
      document.querySelectorAll("audio").forEach((x) => x !== a && x.pause());
      a.playbackRate = vel;
      a.play().then(() => setTocando(true)).catch(() => setTocando(false));
    }
  };
  const trocarVel = () => {
    const nova = VELOCIDADES[(VELOCIDADES.indexOf(vel) + 1) % VELOCIDADES.length];
    setVel(nova);
    if (ref.current) ref.current.playbackRate = nova;
  };
  const pct = duracao > 0 ? Math.min(100, (atual / duracao) * 100) : 0;
  if (erro) {
    return <p className={cn("py-1 text-xs italic", claro ? "text-white/80" : "text-muted-foreground")}>🎤 Áudio indisponível (o link expirou — recarregue a conversa).</p>;
  }

  return (
    <div className={cn("flex w-60 max-w-full items-center gap-2 py-0.5", className)}>
      <audio ref={ref} src={src} preload="metadata" onPause={() => setTocando(false)} />
      <button
        type="button"
        onClick={alternar}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          claro ? "bg-white/20 text-white hover:bg-white/30" : "bg-secondary text-white hover:bg-secondary/90",
        )}
        aria-label={tocando ? "Pausar áudio" : "Ouvir áudio"}
      >
        {carregando && tocando ? <Loader2 className="h-4 w-4 animate-spin" /> : tocando ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={duracao || 0}
          step={0.1}
          value={atual}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (ref.current) ref.current.currentTime = v;
            setAtual(v);
          }}
          className={cn("h-1 w-full cursor-pointer", claro ? "accent-white" : "accent-[hsl(var(--secondary))]")}
          style={{ background: "transparent" }}
          aria-label="Posição do áudio"
          data-pct={pct}
        />
        <div className={cn("flex justify-between text-[10px]", claro ? "text-white/80" : "text-muted-foreground")}>
          <span>{fmt(tocando || atual > 0 ? atual : duracao)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={trocarVel}
        className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold", claro ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}
        aria-label="Velocidade"
      >
        {vel}x
      </button>
    </div>
  );
};
