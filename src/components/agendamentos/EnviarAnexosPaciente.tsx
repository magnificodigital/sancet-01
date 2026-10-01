import { forwardRef, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Loader2, Paperclip, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePaciente } from "@/hooks/usePaciente";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/jpg,image/webp,application/pdf";

type Anexo = { id: string; nome_arquivo: string | null; comentario: string | null; created_at: string };

type Props = {
  protocolo: string;
  /** A equipe pediu um documento e o paciente ainda não respondeu. */
  pendente: boolean;
  textoSolicitado?: string | null;
};

/**
 * Paciente envia documentos (vários, foto ou PDF) depois do pedido: foto ruim,
 * documento extra pedido pela equipe etc. Fica em destaque quando a equipe
 * solicitou um documento.
 */
export const EnviarAnexosPaciente = forwardRef<HTMLDivElement, Props>(
  ({ protocolo, pendente, textoSolicitado }, ref) => {
    const qc = useQueryClient();
    const { paciente } = usePaciente();
    const inputRef = useRef<HTMLInputElement>(null);
    const [arquivos, setArquivos] = useState<File[]>([]);
    const [comentario, setComentario] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [enviados, setEnviados] = useState<Anexo[]>([]);

    const carregar = async () => {
      const { data } = await (supabase as any).rpc("anexos_do_pedido_auth", { p_protocolo: protocolo });
      setEnviados(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
      setArquivos([]);
      setComentario("");
      carregar();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [protocolo]);

    const escolher = (lista: FileList | null) => {
      const novos = Array.from(lista ?? []);
      const grandes = novos.filter((f) => f.size > MAX_BYTES);
      if (grandes.length) toast.error(`Arquivo muito grande (máx. 10 MB): ${grandes.map((f) => f.name).join(", ")}`);
      setArquivos((prev) => [...prev, ...novos.filter((f) => f.size <= MAX_BYTES)]);
      if (inputRef.current) inputRef.current.value = "";
    };

    const enviar = async () => {
      if (!paciente?.cpf) return toast.error("Faça login novamente para enviar.");
      if (arquivos.length === 0) return toast.error("Escolha ao menos um arquivo.");
      setEnviando(true);
      let ok = 0;
      for (const [i, f] of arquivos.entries()) {
        const ext = (f.name.split(".").pop() || "bin").toLowerCase();
        const path = `${paciente.cpf}/${Date.now()}-anexo-${i + 1}.${ext}`;
        const { error: upErr } = await supabase.storage.from("documentos-pedidos").upload(path, f);
        if (upErr) {
          toast.error(`Não foi possível enviar ${f.name}.`);
          continue;
        }
        const { data, error } = await (supabase as any).rpc("registrar_anexo_paciente_auth", {
          p_protocolo: protocolo,
          p_path: path,
          p_nome: f.name,
          // o comentário vai no primeiro arquivo (vale para o envio todo)
          p_comentario: i === 0 ? comentario : null,
        });
        if (error || data?.error) {
          toast.error(data?.error ?? `Não foi possível registrar ${f.name}.`);
          continue;
        }
        ok++;
      }
      setEnviando(false);
      if (ok > 0) {
        toast.success(ok === 1 ? "Documento enviado! A equipe foi avisada." : `${ok} documentos enviados! A equipe foi avisada.`);
        setArquivos([]);
        setComentario("");
        carregar();
        qc.invalidateQueries({ queryKey: ["pedidos"] });
      }
    };

    return (
      <section
        ref={ref}
        className={cn(
          "rounded-lg border p-4",
          pendente ? "border-brand bg-brand/10 ring-2 ring-brand/30" : "border-border bg-muted/20",
        )}
      >
        <h4 className={cn("mb-1 flex items-center gap-1.5 font-bold", pendente ? "text-base text-brand" : "text-sm text-secondary")}>
          <Paperclip className="h-4 w-4" />
          {pendente ? "⚠️ Envie o documento solicitado" : "Enviar documentos"}
        </h4>
        {pendente && textoSolicitado ? (
          <p className="mb-2 whitespace-pre-line rounded-md bg-white/70 p-2 text-sm text-secondary">{textoSolicitado}</p>
        ) : (
          <p className="mb-2 text-sm text-muted-foreground">
            Precisa mandar uma foto melhor ou outro documento? Anexe aqui (foto ou PDF, pode ser mais de um).
          </p>
        )}

        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => escolher(e.target.files)} />
        {arquivos.length > 0 && (
          <ul className="mb-2 space-y-1">
            {arquivos.map((f, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setArquivos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label={`Remover ${f.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" /> {arquivos.length ? "Adicionar mais arquivos" : "Escolher arquivos"}
        </Button>
        {arquivos.length > 0 && (
          <>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="Comentário (opcional) — ex.: segue a carteirinha nova"
              className="mt-2 bg-white"
            />
            <Button onClick={enviar} disabled={enviando} className="mt-2 w-full bg-brand text-white hover:bg-brand-hover">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : `Enviar ${arquivos.length} arquivo(s)`}
            </Button>
          </>
        )}

        {enviados.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Já enviados</p>
            <ul className="space-y-1">
              {enviados.map((a) => (
                <li key={a.id} className="text-xs text-muted-foreground">
                  <span className="text-secondary">{a.nome_arquivo ?? "arquivo"}</span> ·{" "}
                  {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  {a.comentario && <span className="block italic">“{a.comentario}”</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  },
);
EnviarAnexosPaciente.displayName = "EnviarAnexosPaciente";
