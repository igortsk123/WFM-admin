"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Link2, ExternalLink } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { getBonusBudgetFreelanceLink } from "@/lib/api/bonus";
import type { FreelanceLinkInfo } from "@/lib/api/bonus";

import { fmtRub } from "./_shared";

interface FreelanceLinkBadgeProps {
  budgetId: string;
  locale: string;
}

export function FreelanceLinkBadge({ budgetId, locale }: FreelanceLinkBadgeProps) {
  const t = useTranslations("screen.bonusTasks.freelance_link");
  const [info, setInfo] = useState<FreelanceLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBonusBudgetFreelanceLink(budgetId).then((res) => {
      if (!cancelled) {
        setInfo(res.data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  if (loading) return <Skeleton className="h-6 w-40" />;
  if (!info) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={ADMIN_ROUTES.freelanceApplicationDetail(info.application_id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-info/15 text-info border border-info/30 px-3 h-7 text-xs font-medium hover:bg-info/25 transition-colors"
            aria-label={t("from_app_badge", { id: info.short_id })}
          >
            <Link2 className="size-3 shrink-0" aria-hidden="true" />
            {t("from_app_badge", { id: info.short_id })}
            <ExternalLink className="size-3 shrink-0 opacity-70" aria-hidden="true" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs leading-relaxed">
            {t("tooltip", {
              full: fmtRub(info.full_cost, locale),
              bonus: fmtRub(info.bonus_cost, locale),
              saved: fmtRub(info.saved, locale),
            })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
