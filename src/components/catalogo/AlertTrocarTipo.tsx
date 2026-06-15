import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quantidade: number;
  onConfirmar: () => void;
};

export const AlertTrocarTipo = ({ open, onOpenChange, quantidade, onConfirmar }: Props) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Trocar tipo de atendimento?</AlertDialogTitle>
        <AlertDialogDescription>
          Você tem {quantidade} {quantidade === 1 ? "item" : "itens"} no carrinho.
          Trocar de tipo vai esvaziar seu carrinho. Deseja continuar?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirmar}
          className="bg-[#C8102E] hover:bg-[#a80d26]"
        >
          Sim, trocar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
