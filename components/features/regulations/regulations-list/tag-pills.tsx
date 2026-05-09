import { AlertTriangle } from "lucide-react";

import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";
import { MOCK_ZONES } from "@/lib/mock-data/zones";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TagPillsProps {
  workTypeIds?: number[];
  zoneIds?: number[];
}

export function TagPills({ workTypeIds, zoneIds }: TagPillsProps) {
  const allTags: string[] = [
    ...(workTypeIds ?? []).map((id) => MOCK_WORK_TYPES.find((wt) => wt.id === id)?.name ?? `#${id}`),
    ...(zoneIds ?? []).map((id) => MOCK_ZONES.find((z) => z.id === id)?.name ?? `#${id}`),
  ];

  if (allTags.length === 0) {
    return (
      <Badge
        variant="outline"
        className="border-warning text-warning bg-warning/10 text-xs gap-1"
      >
        <AlertTriangle className="size-3" />
        Без тегов
      </Badge>
    );
  }

  const visible = allTags.slice(0, 3);
  const extra = allTags.length - visible.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-1">
        {visible.map((tag, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
        {extra > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-default">
                +{extra}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">
                {allTags.slice(3).join(", ")}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
