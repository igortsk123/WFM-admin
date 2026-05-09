import { cn } from "@/lib/utils";
import { TYPE_VARIANT, type BadgeDocumentType } from "./_shared";

export function DocumentTypeBadge({ type, label }: { type: BadgeDocumentType; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TYPE_VARIANT[type] ?? "bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
