import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const AbaConvenio = () => (
  <div className="rounded-xl border bg-card p-6 space-y-4 text-center max-w-md">
    <CreditCard className="h-10 w-10 text-brand-2 mx-auto" />
    <h3 className="text-lg font-semibold text-secondary">Seu convênio</h3>
    <p className="text-sm text-muted-foreground">
      Adicione seu convênio para agilizar futuros agendamentos.
    </p>
    <Button
      variant="outline"
      onClick={() => toast.info("Em breve!")}
      className="border-brand text-brand hover:bg-brand/5 hover:text-brand"
    >
      Adicionar convênio
    </Button>
  </div>
);
