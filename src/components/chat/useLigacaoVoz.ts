import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Ligação de voz ao vivo com a OpenAI Realtime (WebRTC direto do navegador).
 * A chave é temporária e vem da edge function; as ferramentas (catálogo,
 * preços, carrinho...) são executadas no servidor via `executarFerramenta`.
 */
export type SessaoVoz = { client_secret: string; max_minutos: number; saudacao: string | null };
export type EstadoLigacao = "inativa" | "conectando" | "ativa" | "encerrando";
type Fala = { autor: "paciente" | "assistente"; texto: string };

type Opcoes = {
  obterSessao: () => Promise<SessaoVoz>;
  executarFerramenta: (nome: string, args: string) => Promise<unknown>;
  salvarTranscricao: (itens: Fala[], fim: boolean) => Promise<void>;
  onFala: (f: Fala) => void;
  onErro: (msg: string) => void;
};

export const useLigacaoVoz = ({ obterSessao, executarFerramenta, salvarTranscricao, onFala, onErro }: Opcoes) => {
  const [estado, setEstado] = useState<EstadoLigacao>("inativa");
  const [mudo, setMudo] = useState(false);
  const [falando, setFalando] = useState(false);
  const [restante, setRestante] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendentes = useRef<Fala[]>([]);
  const estadoRef = useRef<EstadoLigacao>("inativa");
  // Callbacks sempre atuais sem reconectar.
  const cb = useRef({ executarFerramenta, salvarTranscricao, onFala, onErro });
  cb.current = { executarFerramenta, salvarTranscricao, onFala, onErro };

  const mudarEstado = (e: EstadoLigacao) => {
    estadoRef.current = e;
    setEstado(e);
  };

  const registrar = (f: Fala) => {
    if (!f.texto.trim()) return;
    cb.current.onFala(f);
    pendentes.current.push(f);
    if (pendentes.current.length >= 10) {
      const lote = pendentes.current.splice(0);
      cb.current.salvarTranscricao(lote, false).catch(() => {});
    }
  };

  const limpar = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    dcRef.current?.close();
    pcRef.current?.close();
    micRef.current?.getTracks().forEach((t) => t.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    dcRef.current = null;
    pcRef.current = null;
    micRef.current = null;
    setFalando(false);
    setMudo(false);
  };

  const encerrar = useCallback(async () => {
    if (estadoRef.current === "inativa" || estadoRef.current === "encerrando") return;
    mudarEstado("encerrando");
    limpar();
    const lote = pendentes.current.splice(0);
    await cb.current.salvarTranscricao(lote, true).catch(() => {});
    mudarEstado("inativa");
  }, []);

  const enviar = (ev: unknown) => {
    if (dcRef.current?.readyState === "open") dcRef.current.send(JSON.stringify(ev));
  };

  const tratarEvento = async (ev: any) => {
    switch (ev.type) {
      case "conversation.item.input_audio_transcription.completed":
        registrar({ autor: "paciente", texto: String(ev.transcript ?? "") });
        break;
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
        registrar({ autor: "assistente", texto: String(ev.transcript ?? "") });
        break;
      case "output_audio_buffer.started":
        setFalando(true);
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        setFalando(false);
        break;
      case "response.done": {
        const chamadas = (ev.response?.output ?? []).filter((o: any) => o.type === "function_call");
        if (!chamadas.length) break;
        for (const c of chamadas) {
          const resultado = await cb.current
            .executarFerramenta(c.name, c.arguments ?? "{}")
            .catch(() => ({ erro: "Falha ao consultar. Peça desculpas e ofereça o atendimento da equipe." }));
          enviar({
            type: "conversation.item.create",
            item: { type: "function_call_output", call_id: c.call_id, output: JSON.stringify(resultado).slice(0, 12000) },
          });
        }
        enviar({ type: "response.create" });
        break;
      }
      case "error":
        console.warn("realtime:", ev.error);
        break;
    }
  };

  const iniciar = useCallback(async () => {
    if (estadoRef.current !== "inativa") return;
    mudarEstado("conectando");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Seu navegador não permite usar o microfone.");
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
        throw new Error("Permita o acesso ao microfone para falar com a assistente.");
      });
      micRef.current = mic;
      const sessao = await obterSessao();
      if (estadoRef.current !== "conectando") return mic.getTracks().forEach((t) => t.stop());

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.autoplay = true;
      }
      pc.ontrack = (e) => {
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];
      };
      pc.addTrack(mic.getAudioTracks()[0], mic);
      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected"].includes(pc.connectionState) && estadoRef.current === "ativa") {
          cb.current.onErro("A ligação caiu.");
          encerrar();
        }
      };

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (m) => {
        try {
          tratarEvento(JSON.parse(m.data));
        } catch {
          /* evento inválido */
        }
      };
      dc.onopen = () => {
        enviar({
          type: "response.create",
          response: {
            instructions: sessao.saudacao
              ? `Diga exatamente, de forma natural: "${sessao.saudacao}"`
              : "Cumprimente em uma frase curta como assistente virtual da Sancet e pergunte como pode ajudar.",
          },
        });
      };

      const oferta = await pc.createOffer();
      await pc.setLocalDescription(oferta);
      const r = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: oferta.sdp,
        headers: { Authorization: `Bearer ${sessao.client_secret}`, "Content-Type": "application/sdp" },
      });
      if (!r.ok) throw new Error("Não foi possível conectar a ligação.");
      await pc.setRemoteDescription({ type: "answer", sdp: await r.text() });

      mudarEstado("ativa");
      const fim = Date.now() + sessao.max_minutos * 60_000;
      setRestante(sessao.max_minutos * 60);
      timerRef.current = window.setInterval(() => {
        const s = Math.max(0, Math.round((fim - Date.now()) / 1000));
        setRestante(s);
        if (s <= 0) encerrar();
      }, 1000);
    } catch (e: any) {
      limpar();
      mudarEstado("inativa");
      cb.current.onErro(e?.message || "Não foi possível iniciar a ligação.");
    }
  }, [obterSessao, encerrar]);

  const alternarMudo = () => {
    const t = micRef.current?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setMudo(!t.enabled);
  };

  // Fecha a ligação se o componente sair da tela.
  useEffect(() => () => void encerrar(), [encerrar]);

  return { estado, mudo, falando, restante, iniciar, encerrar, alternarMudo };
};
