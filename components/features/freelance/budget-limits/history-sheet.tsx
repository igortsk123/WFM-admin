"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { BudgetLimit } from "@/lib/types";

import {
  ActivityFeed,
  type ActivityItem,
} from "@/components/shared/activity-feed";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface HistorySheetProps {
  limit: BudgetLimit;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function HistorySheet({ limit, open, onOpenChange }: HistorySheetProps) {
  const t = useTranslations("freelanceBudgetLimits");

  // Synthetic history from the single set_at event on the limit
  const items: ActivityItem[] = useMemo(
    () => [
      {
        id: `${limit.id}-set`,
        timestamp: limit.set_at,
        actor: limit.set_by_name,
        action: `установил лимит ${limit.amount.toLocaleString("ru-RU")} ₽ (${limit.period})`,
        type: "TASK_CREATED" as const,
      },
    ],
    [limit]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{t("history_sheet.title")}</SheetTitle>
          <p className="text-sm text-muted-foreground">{limit.store_name}</p>
        </SheetHeader>
        <ActivityFeed items={items} />
      </SheetContent>
    </Sheet>
  );
}
