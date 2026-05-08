"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Goal } from "@/lib/types";

interface ActiveGoalCardProps {
  goal: Goal;
  proposalsCount: number;
}

export function ActiveGoalCard({ goal, proposalsCount }: ActiveGoalCardProps) {
  const t = useTranslations("screen.bonusTasks");

  return (
    <Card className="rounded-xl bg-primary/5 border-primary/20">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 shrink-0">
            <Target className="size-5 text-primary" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("active_goal_card.title")}
              </span>
              <Badge
                variant="secondary"
                className="text-xs h-5 bg-primary/10 text-primary border-primary/20"
              >
                <Sparkles className="size-3 mr-1" aria-hidden="true" />
                {t("active_goal_card.ai_badge")}
              </Badge>
            </div>
            <span className="text-sm font-semibold text-foreground truncate">
              {goal.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("active_goal_card.proposals_count", { count: proposalsCount })}
            </span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 shrink-0">
          <Link href={ADMIN_ROUTES.goals}>
            {t("actions.open_goal")}
            <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
