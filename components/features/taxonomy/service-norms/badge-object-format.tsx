import type { ObjectFormat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { FORMAT_COLOR, type TFn } from "./_shared";

interface ObjectFormatBadgeProps {
  format: ObjectFormat;
  tFreelance: TFn;
}

export function ObjectFormatBadge({ format, tFreelance }: ObjectFormatBadgeProps) {
  const label = tFreelance(`object_format.${format}`);
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium whitespace-nowrap", FORMAT_COLOR[format])}
    >
      {label}
    </Badge>
  );
}
