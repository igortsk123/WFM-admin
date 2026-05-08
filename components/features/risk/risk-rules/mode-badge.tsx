import type { RiskMode } from "@/lib/api/risk";
import { MODE_VARIANT } from "./_shared";

export function ModeBadge({ mode, label }: { mode: RiskMode; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 h-6 text-xs font-medium ${MODE_VARIANT[mode]}`}
    >
      {label}
    </span>
  );
}
