import { useEffect, useRef, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  arquivo: File | null;
  onArquivo: (f: File | null) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export const UploadReceita = ({ arquivo, onArquivo }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (arquivo && arquivo.type.startsWith("image/")) {
      const url = URL.createObjectURL(arquivo);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [arquivo]);

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    onArquivo(f);
  };

  const visualizar = () => {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (arquivo) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#C8102E] bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            {previewUrl ? (
              <img src={previewUrl} alt="Prévia do pedido" className="h-full w-full object-cover" />
            ) : (
              <FileText className="h-8 w-8 text-[#C8102E]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={arquivo.name}>
              {arquivo.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {(arquivo.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={visualizar}>
              Visualizar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onArquivo(null)}
              aria-label="Remover arquivo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full rounded-xl border-2 border-dashed border-[#C8102E] bg-white p-6 text-center transition hover:bg-[#FFF5F6]"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onSelect}
      />
      <FileText className="mx-auto mb-3 text-[#C8102E]" size={40} />
      <p className="font-bold text-secondary">Enviar imagem do pedido médico</p>
      <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou PDF</p>
    </button>
  );
};
