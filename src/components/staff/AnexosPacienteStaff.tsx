import { useEffect, useState } from "react";
import { ExternalLink, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registrarAcesso } from "@/lib/auditoria";
import { Button } from "@/components/ui/button";
import { formatarData } from "./utils";

type Anexo = {
  id: string;
  arquivo_path: string;
  nome_arquivo: string | null;
  comentario: string | null;
  created_at: string;
};

/** Documentos que o paciente anexou depois do pedido (aba Documentos do staff). */
export const AnexosPacienteStaff = ({
  pedidoId,
  pacienteId,
}: {
  pedidoId: string;
  pacienteId: string | null;
}) => {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [abrindo, setAbrindo] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    (supabase as any)
      .from("pedido_anexos")
      .select("id, arquivo_path, nome_arquivo, comentario, created_at")
      .eq("pedido_id", pedidoId)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Anexo[] | null }) => {
        if (ativo) setAnexos(data ?? []);
      });
    return () => {
      ativo = false;
    };
  }, [pedidoId]);

  if (anexos.length === 0) return null;

  const abrir = async (a: Anexo) => {
    setAbrindo(a.id);
    const { data, error } = await supabase.storage
      .from("documentos-pedidos")
      .createSignedUrl(a.arquivo_path, 300);
    setAbrindo(null);
    if (error || !data) return toast.error("Não foi possível abrir o documento");
    registrarAcesso(pacienteId, "ver_anexo_paciente", a.nome_arquivo ?? a.arquivo_path);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50/60 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-violet-800">
        <Paperclip className="h-3.5 w-3.5" /> Enviados pelo paciente depois do pedido ({anexos.length})
      </p>
      <ul className="space-y-2">
        {anexos.map((a) => (
          <li key={a.id}>
            <Button
              variant="outline"
              onClick={() => abrir(a)}
              disabled={abrindo === a.id}
              className="h-auto w-full justify-between bg-white py-2 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate">{a.nome_arquivo ?? "arquivo"}</span>
                <span className="block text-[11px] font-normal text-muted-foreground">
                  {formatarData(a.created_at)}
                </span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </Button>
            {a.comentario && (
              <p className="mt-1 whitespace-pre-line px-1 text-xs italic text-muted-foreground">
                “{a.comentario}”
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
