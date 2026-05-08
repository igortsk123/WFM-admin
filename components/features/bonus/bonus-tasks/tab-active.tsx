"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, Gift, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/shared/empty-state";

import type { BonusTaskWithSource } from "@/lib/api/bonus";

import { BonusTaskCard } from "./bonus-task-card";

interface TabActiveProps {
  tasks: BonusTaskWithSource[];
  loading: boolean;
  error: boolean;
  canCreate: boolean;
  onRetry: () => void;
  onRemove: (id: string) => void;
}

export function TabActive({
  tasks,
  loading,
  error,
  canCreate,
  onRetry,
  onRemove,
}: TabActiveProps) {
  const t = useTranslations("screen.bonusTasks");
  const tCommon = useTranslations("common");

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Ошибка загрузки</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          Не удалось загрузить активные задачи.
          <Button size="sm" variant="outline" className="h-7 text-xs ml-2" onClick={onRetry}>
            <RefreshCw className="size-3 mr-1" aria-hidden="true" />
            {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={Gift}
        title={t("empty.no_active_tasks")}
        description="Создайте первую бонусную задачу или дождитесь предложений ИИ"
        action={canCreate ? { label: t("actions.create"), onClick: () => {} } : undefined}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <BonusTaskCard
          key={task.id}
          task={task}
          onRemove={canCreate ? onRemove : undefined}
        />
      ))}
    </div>
  );
}
