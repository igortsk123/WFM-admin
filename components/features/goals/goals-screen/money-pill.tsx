import { Coins, Info, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Link } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { Locale, MoneyImpact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { pickLocalized, pickLocalizedList } from "@/lib/utils/locale-pick";

import type { GoalsT } from "./_shared";

/**
 * Compact money-impact pill: amount + period + (i) icon → popover.
 * Reused by ActiveGoalBanner, AIProposalsSection, SelectGoalDialog.
 *
 * Не показывается для не-money целей (`impact_type !== 'money'`).
 */
export function MoneyPill({
  impact,
  goalId,
  locale,
  t,
  size = "md",
}: {
  impact: MoneyImpact;
  /** ID цели или предложения — для ссылки в ИИ-чат. */
  goalId: string;
  locale: Locale;
  t: GoalsT;
  size?: "sm" | "md";
}) {
  // Compliance/quality/training цели не имеют ₽-пилла
  if (impact.impact_type !== "money" || impact.amount <= 0) return null;

  const formattedAmount = formatRubleAmount(impact.amount, locale);
  const periodLabel = t(`active_goal.money.period.${impact.period}` as Parameters<typeof t>[0]);
  const localizedShort = pickLocalized(
    impact.rationale_short,
    impact.rationale_short_en,
    locale,
  );
  const localizedBreakdown = pickLocalizedList(
    impact.rationale_breakdown,
    impact.rationale_breakdown_en,
    locale,
  );

  const isSm = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 text-success tabular-nums",
        isSm
          ? "pl-2.5 pr-1 py-0.5 text-xs font-semibold"
          : "pl-3 pr-1.5 py-1 text-sm font-semibold",
      )}
    >
      <Coins className={isSm ? "size-3.5" : "size-4"} aria-hidden="true" />
      <span>
        +{formattedAmount}/{periodLabel}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              isSm ? "size-5" : "size-6",
              "text-success/70 hover:text-success hover:bg-success/15",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success",
              "transition-colors",
            )}
            aria-label={t("active_goal.money.aria_open_breakdown")}
          >
            <Info className={isSm ? "size-3.5" : "size-4"} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(420px,calc(100vw-2rem))] p-4 space-y-3"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("active_goal.money.label")}
            </p>
            <p className="text-xl font-semibold tabular-nums">
              +{formattedAmount}/{periodLabel}
            </p>
            <p className="text-sm text-muted-foreground">{localizedShort}</p>
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
              {t("active_goal.money.breakdown_title")}
            </p>
            <ul className="space-y-1.5 text-sm">
              {localizedBreakdown.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className="text-success mt-1.5 size-1 rounded-full bg-success shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-foreground leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <Button asChild variant="default" size="sm" className="w-full">
            <Link
              href={`${ADMIN_ROUTES.aiChat}?context_type=goal&context_id=${goalId}`}
            >
              <MessageSquare className="size-4 mr-1.5" aria-hidden="true" />
              {t("active_goal.money.details_in_ai_chat")}
            </Link>
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function formatRubleAmount(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}
