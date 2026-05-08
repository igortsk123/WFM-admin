"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertCircle, ArrowRight, RefreshCw, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/shared/empty-state";

import type { BonusTaskWithSource } from "@/lib/api/bonus";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Goal } from "@/lib/types";

import { BonusTaskCard } from "./bonus-task-card";

interface TabAIProposalsProps {
  proposals: BonusTaskWithSource[];
  loading: boolean;
  error: boolean;
  canCreate: boolean;
  activeGoal: Goal | null;
  onRetry: () => void;
  onPublish: (id: string) => void;
  onReject: (id: string) => void;
}

export function TabAIProposals({
  proposals,
  loading,
  error,
  canCreate,
  activeGoal,
  onRetry,
  onPublish,
  onReject,
}: TabAIProposalsProps) {
  const t = useTranslations("screen.bonusTasks");
  const tCommon = useTranslations("common");

  return (
    <>
      {activeGoal && (
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {t("ai_proposals.section_description", { goal: activeGoal.title })}
        </p>
      )}
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Ошибка загрузки</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            Не удалось загрузить предложения ИИ.
            <Button size="sm" variant="outline" className="h-7 text-xs ml-2" onClick={onRetry}>
              <RefreshCw className="size-3 mr-1" aria-hidden="true" />
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("empty.no_proposals")}
          description="ИИ анализирует данные и предложит задачи на основе активной цели"
        />
      ) : (
        <div className="grid gap-3">
          {proposals.map((task) => (
            <BonusTaskCard
              key={task.id}
              task={task}
              isProposal
              onPublishProposal={canCreate ? onPublish : undefined}
              onRejectProposal={canCreate ? onReject : undefined}
            />
          ))}
          <div className="text-center pt-2">
            <Button
              asChild
              variant="link"
              size="sm"
              className="text-xs text-muted-foreground"
            >
              <Link href={ADMIN_ROUTES.aiSuggestions}>
                {t("ai_proposals.all_link")}
                <ArrowRight className="size-3 ml-1" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
