"use client";

import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/shared/empty-state";

import type { AuthUser } from "@/lib/contexts/auth-context";
import type { BonusBudget } from "@/lib/types";

import { BonusPoolCard } from "./bonus-pool-card";

interface BudgetPoolsSectionProps {
  budgets: BonusBudget[];
  loading: boolean;
  user: AuthUser;
  locale: string;
}

export function BudgetPoolsSection({
  budgets,
  loading,
  user,
  locale,
}: BudgetPoolsSectionProps) {
  const t = useTranslations("screen.bonusTasks");

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("budget_card.title")}
      </h2>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={t("empty.no_budget_title")}
          description={t("empty.no_budget_subtitle")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const store = user.stores.find((s) => s.id === budget.store_id);
            return (
              <BonusPoolCard
                key={budget.id}
                budget={budget}
                locale={locale}
                storeName={store?.name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
