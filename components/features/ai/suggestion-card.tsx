"use client";

import { useTranslations } from "next-intl";
import { Clock, Sparkles, Target, Gift, Lightbulb, Store, Network, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/utils/format";
import { pickLocalized } from "@/lib/utils/locale-pick";
import type { AISuggestion, AISuggestionType, AISuggestionPriority, Locale } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface SuggestionCardProps {
  suggestion: AISuggestion;
  selected?: boolean;
  checked?: boolean;
  onSelect?: () => void;
  onCheckChange?: (checked: boolean) => void;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onAskAi?: () => void;
  onHelpful?: () => void;
  onNotHelpful?: () => void;
  canTakeAction?: boolean;
  isReadOnly?: boolean;
  locale?: Locale;
  storeNames?: Record<number, string>;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const TYPE_ICONS: Record<AISuggestionType, typeof Sparkles> = {
  TASK_SUGGESTION: Sparkles,
  GOAL_SUGGESTION: Target,
  BONUS_TASK_SUGGESTION: Gift,
  INSIGHT: Lightbulb,
};

const PRIORITY_STYLES: Record<AISuggestionPriority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function SuggestionCard({
  suggestion,
  selected = false,
  checked = false,
  onSelect,
  onCheckChange,
  onAccept,
  onReject,
  onEdit,
  onAskAi,
  onHelpful,
  onNotHelpful,
  canTakeAction = true,
  isReadOnly = false,
  locale = "ru",
  storeNames = {},
  className,
}: SuggestionCardProps) {
  const t = useTranslations("screen.aiSuggestions");
  const tCommon = useTranslations("common");

  const TypeIcon = TYPE_ICONS[suggestion.type];
  const isInsight = suggestion.type === "INSIGHT";
  const isPending = suggestion.status === "PENDING" || suggestion.status === "EDITED";
  const hasDecisionComment = suggestion.decision_comment && suggestion.status === "ACCEPTED";

  // Calculate time estimate from proposed_payload if available
  const timeEstimate = suggestion.proposed_payload?.planned_minutes as number | undefined;
  const bonusPoints = suggestion.proposed_payload?.bonus_points as number | undefined;

  // Build target label
  const getTargetLabel = () => {
    if (suggestion.target_object_type === "NETWORK") {
      return t("card.target_network");
    }
    if (suggestion.target_object_ids.length === 0) {
      return t("card.target_network");
    }
    if (suggestion.target_object_ids.length === 1) {
      const storeId = suggestion.target_object_ids[0];
      const storeName = storeNames[storeId];
      return storeName || `${t("card.target_store")} #${storeId}`;
    }
    return `${suggestion.target_object_ids.length} ${t("card.target_stores").toLowerCase()}`;
  };

  const TargetIcon = suggestion.target_object_type === "NETWORK" ? Network : 
    suggestion.target_object_ids.length > 1 ? MapPin : Store;

  return (
    <Card
      className={cn(
        "rounded-xl transition-all cursor-pointer",
        selected && "ring-2 ring-primary",
        !selected && "hover:bg-accent/50",
        className
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Checkbox for bulk selection (only for PENDING/EDITED) */}
          {isPending && canTakeAction && !isReadOnly && (
            <div 
              className="pt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={onCheckChange}
                aria-label={tCommon("selected")}
              />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-3">
            {/* Header: Type + Priority + Time */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="secondary" 
                className="gap-1 text-xs font-medium shrink-0"
              >
                <TypeIcon className="size-3" aria-hidden="true" />
                {t(`type.${suggestion.type}` as Parameters<typeof t>[0])}
              </Badge>

              <Badge 
                variant="outline"
                className={cn("text-xs font-medium shrink-0", PRIORITY_STYLES[suggestion.priority])}
              >
                {t(`priority.${suggestion.priority}` as Parameters<typeof t>[0])}
              </Badge>

              {hasDecisionComment && (
                <Badge variant="outline" className="text-xs font-medium shrink-0 bg-info/10 text-info border-info/20">
                  {t("card.with_edits")}
                </Badge>
              )}

              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                {formatRelative(new Date(suggestion.created_at), locale)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-medium text-foreground leading-snug line-clamp-2">
              {pickLocalized(suggestion.title, suggestion.title_en, locale)}
            </h3>

            {/* Target + Time estimate / Bonus points */}
            <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <TargetIcon className="size-3.5" aria-hidden="true" />
                {getTargetLabel()}
              </span>

              {timeEstimate && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {t("card.time_estimate", { minutes: timeEstimate })}
                </span>
              )}

              {bonusPoints && (
                <span className="flex items-center gap-1 text-success">
                  <Gift className="size-3.5" aria-hidden="true" />
                  {t("card.bonus_points", { points: bonusPoints })}
                </span>
              )}
            </div>

            {/* Description (line-clamp-2) */}
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {pickLocalized(suggestion.description, suggestion.description_en, locale)}
            </p>

            {/* Rationale (short, text-xs) */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 line-clamp-2">
              <span className="font-medium">{t("card.rationale")}:</span>{" "}
              {pickLocalized(suggestion.rationale, suggestion.rationale_en, locale)}
            </div>

            {/* Action buttons (only if pending and can take action) */}
            {isPending && (
              <div 
                className="flex items-center gap-2 flex-wrap pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                {isInsight ? (
                  // INSIGHT: Helpful / Not helpful buttons
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={onHelpful}
                          disabled={!canTakeAction || isReadOnly}
                        >
                          {t("actions.helpful")}
                        </Button>
                      </TooltipTrigger>
                      {isReadOnly && (
                        <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                      )}
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={onNotHelpful}
                          disabled={!canTakeAction || isReadOnly}
                        >
                          {t("actions.not_helpful")}
                        </Button>
                      </TooltipTrigger>
                      {isReadOnly && (
                        <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                      )}
                    </Tooltip>
                  </>
                ) : (
                  // TASK/GOAL/BONUS: Accept / Edit / Reject
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-success hover:bg-success/90 text-success-foreground"
                          onClick={onAccept}
                          disabled={!canTakeAction || isReadOnly}
                        >
                          {t("actions.accept")}
                        </Button>
                      </TooltipTrigger>
                      {isReadOnly && (
                        <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                      )}
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={onEdit}
                          disabled={!canTakeAction || isReadOnly}
                        >
                          {t("actions.edit")}
                        </Button>
                      </TooltipTrigger>
                      {isReadOnly && (
                        <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                      )}
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          onClick={onReject}
                          disabled={!canTakeAction || isReadOnly}
                        >
                          {t("actions.reject")}
                        </Button>
                      </TooltipTrigger>
                      {isReadOnly && (
                        <TooltipContent>{t("read_only.tooltip")}</TooltipContent>
                      )}
                    </Tooltip>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs ml-auto"
                      onClick={onAskAi}
                    >
                      {t("actions.ask_ai")}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* For non-pending: show decision info */}
            {!isPending && suggestion.decision_reason && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{t("reject_dialog.reason_label")}:</span>{" "}
                {suggestion.decision_reason}
                {suggestion.decision_comment && (
                  <span className="ml-1">— {suggestion.decision_comment}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
