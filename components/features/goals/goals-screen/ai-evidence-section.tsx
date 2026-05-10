import {
  BarChart3,
  Boxes,
  Camera,
  ChevronDown,
  Eye,
  Scale,
  Search,
  Tag,
  CalendarRange,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

import type { AIEvidenceItem, AISignalSource, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/format";
import { pickLocalized } from "@/lib/utils/locale-pick";

import type { GoalsT } from "./_shared";

/**
 * «Откуда AI это взял?» — expandable секция для прозрачности.
 *
 * Рендерит:
 *  - chip с источником (POS / ERP / Photo / Mixed)
 *  - 1-2 строки `ai_detection_method` (что именно AI смотрит)
 *  - список `ai_evidence` items с превью фото для photo-bonus
 *
 * Используется в `ActiveGoalBanner` (полная версия) и в `AIProposalsSection`
 * (компактная версия — только chip без expandable). Оборачивает MoneyPill /
 * layout не ломает — добавляется отдельной секцией под Narrative row.
 */
export function AIEvidenceSection({
  signalSource,
  detectionMethod,
  detectionMethodEn,
  evidence,
  locale,
  t,
}: {
  signalSource?: AISignalSource;
  detectionMethod?: string;
  detectionMethodEn?: string;
  evidence?: AIEvidenceItem[];
  locale: Locale;
  t: GoalsT;
}) {
  // Если нет signal'а вообще — не рендерим (legacy goals).
  if (!signalSource && !detectionMethod && (!evidence || evidence.length === 0)) {
    return null;
  }

  const localizedDetection = pickLocalized(
    detectionMethod ?? "",
    detectionMethodEn,
    locale,
  );
  const evidenceCount = evidence?.length ?? 0;

  return (
    <Collapsible className="rounded-lg border border-border bg-muted/20">
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center justify-between gap-3 px-4 py-3 text-left",
          "hover:bg-muted/40 transition-colors rounded-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <Search className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">
            {t("ai_evidence.section_title")}
          </span>
          {signalSource && <SignalSourceChip source={signalSource} t={t} />}
          {evidenceCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {t("ai_evidence.facts_count", { count: evidenceCount })}
            </Badge>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            "group-data-[state=open]:rotate-180",
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-1 space-y-3">
        {localizedDetection && (
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              {t("ai_evidence.detection_method_label")}
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {localizedDetection}
            </p>
          </div>
        )}

        {evidence && evidence.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("ai_evidence.facts_label")}
            </p>
            <ul className="space-y-2">
              {evidence.map((item, i) => (
                <li key={i}>
                  <EvidenceItemCard item={item} locale={locale} t={t} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SIGNAL SOURCE CHIP — компактный для AIProposalsSection и здесь.
// ─────────────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<AISignalSource, typeof Camera> = {
  "pos-cheque": BarChart3,
  "erp-stock": Boxes,
  "erp-price-master": Tag,
  "photo-bonus": Camera,
  "wfm-schedule": CalendarRange,
  egais: Scale,
  mixed: Eye,
};

export function SignalSourceChip({
  source,
  t,
}: {
  source: AISignalSource;
  t: GoalsT;
}) {
  const Icon = SOURCE_ICON[source];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10",
        "px-2 py-0.5 text-xs font-medium text-primary",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {t(`ai_evidence.source.${source}` as Parameters<typeof t>[0])}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────
// EVIDENCE ITEM CARD — один факт с источником и (для photo-bonus) фото.
// ─────────────────────────────────────────────────────────────────────

function EvidenceItemCard({
  item,
  locale,
  t,
}: {
  item: AIEvidenceItem;
  locale: Locale;
  t: GoalsT;
}) {
  const Icon = SOURCE_ICON[item.source];
  const localizedSummary = pickLocalized(item.summary, item.summary_en, locale);
  const localizedScope = pickLocalized(
    item.scope_hint ?? "",
    item.scope_hint_en,
    locale,
  );
  const isPhoto = item.source === "photo-bonus";
  const observedRange = formatObserved(item.observed_from, item.observed_to, locale);

  return (
    <div className="flex gap-3 rounded-md border border-border bg-background p-3">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex-1 space-y-1.5 min-w-0">
        <p className="text-sm font-medium leading-snug">{localizedSummary}</p>
        {localizedScope && (
          <p className="text-xs text-muted-foreground">{localizedScope}</p>
        )}
        {observedRange && (
          <p className="text-xs text-muted-foreground tabular-nums">
            <CalendarRange
              className="inline size-3 mr-1 -mt-0.5"
              aria-hidden="true"
            />
            {observedRange}
          </p>
        )}
        {isPhoto && item.photo_taken_by && (
          <p className="text-xs text-muted-foreground">
            {t("ai_evidence.photo_taken_by", {
              name: item.photo_taken_by,
              date: item.photo_taken_at
                ? formatDateTime(new Date(item.photo_taken_at), locale)
                : "",
            })}
          </p>
        )}
      </div>
      {isPhoto && item.photo_url && (
        // Mock thumbnail. В проде будет <Image />.
        <div
          className={cn(
            "shrink-0 size-16 rounded-md border border-border bg-muted/40",
            "flex items-center justify-center text-muted-foreground",
          )}
          aria-label={t("ai_evidence.photo_thumb_aria")}
          title={item.photo_url}
        >
          <Camera className="size-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function formatObserved(
  from: string | undefined,
  to: string | undefined,
  locale: Locale,
): string | null {
  if (!from && !to) return null;
  const fromStr = from ? formatDateTime(new Date(from), locale) : "";
  const toStr = to ? formatDateTime(new Date(to), locale) : "";
  if (fromStr && toStr) return `${fromStr} — ${toStr}`;
  return fromStr || toStr;
}
