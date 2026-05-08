import { useTranslations } from "next-intl";
import { CheckSquare, ChevronRight, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, TaskStateBadge } from "@/components/shared";
import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import type { ShiftDetailData } from "./_shared";

export function TabTasks({ shift }: { shift: ShiftDetailData }) {
  const t = useTranslations("screen.shiftDetail");

  if (!shift.tasks || shift.tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title={t("tasks.empty")}
        description=""
        className="py-12"
      />
    );
  }

  return (
    <div className="space-y-2">
      {shift.tasks.map((task) => (
        <Link
          key={task.id}
          href={ADMIN_ROUTES.taskDetail(task.id)}
          className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors group min-h-11"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <ListChecks className="size-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{task.title}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {task.zone_name && (
                <span className="text-xs text-muted-foreground">{task.zone_name}</span>
              )}
              {task.planned_minutes && (
                <span className="text-xs text-muted-foreground">
                  · {task.planned_minutes} мин
                </span>
              )}
              {task.actual_minutes && (
                <span className="text-xs text-muted-foreground">
                  · факт {task.actual_minutes} мин
                </span>
              )}
            </div>
            {/* Mobile second row */}
            <div className="flex items-center gap-2 mt-1.5 md:hidden">
              <TaskStateBadge state={task.state} size="sm" />
            </div>
          </div>
          {/* Desktop badge */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <TaskStateBadge state={task.state} size="sm" />
          </div>
          <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ))}
      <div className="pt-2 md:hidden">
        <Button variant="outline" className="w-full" asChild>
          <Link href={ADMIN_ROUTES.tasks}>Открыть в задачах</Link>
        </Button>
      </div>
    </div>
  );
}
