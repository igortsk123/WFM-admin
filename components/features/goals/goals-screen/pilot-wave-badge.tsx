import { Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GoalTier, PilotWave } from "@/lib/types";

import type { GoalsT } from "./_shared";

/**
 * Компактный чип «Волна A/B/C/D» рядом с CategoryBadge.
 *
 * Источник смысла — deep-research отчёт + `.memory_bank/_claude/AI-GOALS-ROADMAP.md`.
 * Рендерится только для priority-целей; если `tier !== "priority"` или
 * `pilot_wave` не задан — компонент возвращает null.
 */
export function PilotWaveBadge({
  tier,
  wave,
  t,
}: {
  tier?: GoalTier;
  wave?: PilotWave;
  t: GoalsT;
}) {
  if (tier !== "priority" || !wave) return null;
  const label = t(`pilot_wave.${wave}` as Parameters<typeof t>[0]);
  const tooltip = t(`pilot_wave.${wave}_tooltip` as Parameters<typeof t>[0]);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
          <Layers className="size-3" aria-hidden="true" />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
