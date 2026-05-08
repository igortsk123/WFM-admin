"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/shared/empty-state";

import type { BonusTaskWithSource } from "@/lib/api/bonus";

interface TabCompletedProps {
  tasks: BonusTaskWithSource[];
  loading: boolean;
}

export function TabCompleted({ tasks, loading }: TabCompletedProps) {
  const t = useTranslations("screen.bonusTasks");

  if (loading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={t("empty.no_completed")}
        description="Завершённые бонусные задачи появятся здесь"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
              {t("completed_tab.columns.task")}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
              {t("completed_tab.columns.user")}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
              {t("completed_tab.columns.source")}
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">
              {t("completed_tab.columns.points")}
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => (
            <tr
              key={task.id}
              className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
            >
              <td className="px-4 py-3">
                <span className="font-medium text-foreground line-clamp-1">{task.title}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                {task.assignee_name ?? t("task_card.any_assignee")}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <span className="inline-flex items-center rounded-full bg-muted px-2 h-5 text-xs text-muted-foreground">
                  {t(`completed_tab.source.${task.bonus_source}`)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">
                {task.bonus_points} ₽
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
