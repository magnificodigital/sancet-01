import { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Formato suportado pelo navegador (Chrome/Firefox: webm; Safari/iPhone: mp4). */
const escolherFormato = () => {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return "";
};

export const gravacaoSuportada = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && escolherFormato() !== null;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Gravação de áudio estilo WhatsApp: toca no microfone, grava, e envia ou descarta.
 * Devolve o arquivo pronto (webm ou m4a) em `onPronto`.
 */
export const useGravadorAudio = ({ maxSeg = 180, onPronto, onErro }: { maxSeg?: number; onPronto: (f: File) => void; onErro?: (m: string) => void }) => {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const descartar = useRef(false);
  const cb = useRef({ onPronto, onErro });
  cb.current = { onPronto, onErro };

  const parar = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setGravando(false);
  };

  const iniciar = async () => {
    const formato = escolherFormato();
    if (formato === null || !navigator.mediaDevices?.getUserMedia) {
      cb.current.onErro?.("Seu navegador não permite gravar áudio.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      cb.current.onErro?.("Permita o acesso ao microfone para gravar áudio.");
      return;
    }
    partes.current = [];
    descartar.current = false;
    const r = new MediaRecorder(stream.current, formato ? { mimeType: formato } : undefined);
    rec.current = r;
    r.ondataavailable = (e) => e.data.size && partes.current.push(e.data);
    r.onstop = () => {
      if (descartar.current || !partes.current.length) return;
      const tipo = (r.mimeType || formato || "audio/webm").split(";")[0];
      const ext = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(partes.current, { type: tipo });
      if (blob.size < 1200) return; // toque acidental
      cb.current.onPronto(new File([blob], `audio-${Date.now()}.${ext}`, { type: tipo }));
    };
    r.start(250);
    setSegundos(0);
    setGravando(true);
    const ini = Date.now();
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - ini) / 1000);
      setSegundos(s);
      if (s >= maxSeg) parar();
    }, 250);
  };

  const cancelar = () => {
    descartar.current = true;
    parar();
  };

  useEffect(() => () => cancelar(), []);

  return { gravando, segundos, iniciar, enviar: parar, cancelar };
};

/** Barra exibida durante a gravação (substitui o campo de texto). */
export const BarraGravando = ({ segundos, onCancelar, onEnviar, maxSeg = 180 }: { segundos: number; onCancelar: () => void; onEnviar: () => void; maxSeg?: number }) => (
  <div className="flex flex-1 items-center gap-2 rounded-full border bg-background px-2 py-1.5">
    <button type="button" onClick={onCancelar} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600" aria-label="Descartar áudio">
      <Trash2 className="h-4 w-4" />
    </button>
    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
    <span className="font-mono text-sm tabular-nums">{fmt(segundos)}</span>
    <span className="flex-1 truncate text-xs text-muted-foreground">Gravando… {segundos > maxSeg - 15 ? `(máx. ${fmt(maxSeg)})` : ""}</span>
    <button type="button" onClick={onEnviar} className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700" aria-label="Enviar áudio">
      <Send className="h-4 w-4" />
    </button>
  </div>
);

export const BotaoMicrofone = ({ onClick, disabled, className }: { onClick: () => void; disabled?: boolean; className?: string }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary/90 disabled:opacity-40", className)}
    aria-label="Gravar áudio"
    title="Gravar áudio"
  >
    <Mic className="h-4 w-4" />
  </button>
);
