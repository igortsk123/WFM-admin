import type { ServiceNormUnit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { UNIT_COLOR, type TFn } from "./_shared";

interface NormativeUnitBadgeProps {
  unit: ServiceNormUnit;
  tFreelance: TFn;
}

export function NormativeUnitBadge({ unit, tFreelance }: NormativeUnitBadgeProps) {
  const label = tFreelance(`normative.unit.${unit}`);
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-mono whitespace-nowrap", UNIT_COLOR[unit])}
    >
      {label}
    </Badge>
  );
}
