import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  descricao: React.ReactNode;
  palavraConfirmacao?: string;
  textoBotao?: string;
  loading?: boolean;
  onConfirmar: () => void;
};

export const ConfirmarExclusao = ({
  open, onOpenChange, titulo, descricao,
  palavraConfirmacao = "EXCLUIR", textoBotao = "Excluir definitivamente",
  loading, onConfirmar,
}: Props) => {
  const [texto, setTexto] = useState("");
  useEffect(() => { if (!open) setTexto(""); }, [open]);
  const habilitado = texto.trim() === palavraConfirmacao && !loading;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">{titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">{descricao}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs">
            Para confirmar, digite <span className="font-mono font-bold">{palavraConfirmacao}</span>
          </Label>
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={palavraConfirmacao}
            autoFocus
            disabled={loading}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); if (habilitado) onConfirmar(); }}
            disabled={!habilitado}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {textoBotao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
