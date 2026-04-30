import { cn } from "@/lib/utils";
import { STATUS_CORES, STATUS_LABELS } from "./utils";

export const BadgeStatus = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      STATUS_CORES[status] ?? "bg-muted text-muted-foreground border-border",
    )}
  >
    {STATUS_LABELS[status] ?? status}
  </span>
);
