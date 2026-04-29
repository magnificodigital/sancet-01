import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const AbaConvenio = () => (
  <div className="rounded-xl border bg-card p-6 space-y-4 text-center max-w-md">
    <CreditCard className="h-10 w-10 text-[#1B3A6B] mx-auto" />
    <h3 className="text-lg font-semibold text-secondary">Seu convênio</h3>
    <p className="text-sm text-muted-foreground">
      Adicione seu convênio para agilizar futuros agendamentos.
    </p>
    <Button
      variant="outline"
      onClick={() => toast.info("Em breve!")}
      className="border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E]/5 hover:text-[#C8102E]"
    >
      Adicionar convênio
    </Button>
  </div>
);
