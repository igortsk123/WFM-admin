"use client";

import * as React from "react";
import { Sparkles, ExternalLink, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { AISuggestion, Locale } from "@/lib/types";

import type { TFn, TCommonFn } from "./_shared";

export interface DetailPaneProps {
  suggestion: AISuggestion | null;
  onAccept: (edits?: Record<string, unknown>) => void;
  onReject: () => void;
  onAskAi: () => void;
  canTakeAction: boolean;
  isReadOnly: boolean;
  locale: Locale;
  stores: { id: number; name: string }[];
  t: TFn;
  tCommon: TCommonFn;
}

export function DetailPane({
  suggestion,
  onAccept,
  onReject,
  onAskAi,
  canTakeAction,
  isReadOnly,
  locale,
  stores,
  t,
  tCommon,
}: DetailPaneProps) {
  if (!suggestion) {
    return (
      <div className="sticky top-6 flex flex-col items-center justify-center rounded-xl border bg-muted/30 p-6 min-h-[300px] text-center">
        <Sparkles className="size-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{t("detail.title")}</p>
      </div>
    );
  }

  return (
    <div className="sticky top-6 rounded-xl border bg-card p-6 space-y-4">
      <DetailContent
        suggestion={suggestion}
        onAccept={onAccept}
        onReject={onReject}
        onAskAi={onAskAi}
        canTakeAction={canTakeAction}
        isReadOnly={isReadOnly}
        locale={locale}
        stores={stores}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}

interface DetailContentProps {
  suggestion: AISuggestion;
  onAccept: (edits?: Record<string, unknown>) => void;
  onReject: () => void;
  onAskAi: () => void;
  canTakeAction: boolean;
  isReadOnly: boolean;
  locale: Locale;
  stores: { id: number; name: string }[];
  t: TFn;
  tCommon: TCommonFn;
}

function DetailContent({
  suggestion,
  onAccept,
  onReject,
  onAskAi,
  canTakeAction,
  isReadOnly,
  locale: _locale,
  stores: _stores,
  t,
  tCommon: _tCommon,
}: DetailContentProps) {
  const router = useRouter();
  const [localEdits, setLocalEdits] = React.useState<Record<string, unknown>>({});
  const isInsight = suggestion.type === "INSIGHT";
  const isPending =
    suggestion.status === "PENDING" || suggestion.status === "EDITED";
  const isAccepted = suggestion.status === "ACCEPTED";
  const payload = suggestion.proposed_payload as
    | Record<string, unknown>
    | undefined;

  const linkedRoute = React.useMemo((): string | null => {
    if (!suggestion.linked_object_type || !suggestion.linked_object_id) {
      return null;
    }
    if (suggestion.linked_object_type === "task") {
      return ADMIN_ROUTES.taskDetail(suggestion.linked_object_id);
    }
    if (suggestion.linked_object_type === "goal") {
      return ADMIN_ROUTES.goalDetail(suggestion.linked_object_id);
    }
    return ADMIN_ROUTES.bonusTasks;
  }, [suggestion.linked_object_type, suggestion.linked_object_id]);

  // Reset local edits when suggestion changes
  React.useEffect(() => {
    setLocalEdits({});
  }, [suggestion.id]);

  const hasEdits = Object.keys(localEdits).length > 0;

  const handleFieldChange = (field: string, value: unknown) => {
    setLocalEdits((prev) => ({ ...prev, [field]: value }));
  };

  const handleAcceptClick = () => {
    if (hasEdits) {
      onAccept({ ...payload, ...localEdits });
    } else {
      onAccept();
    }
  };

  const handleReset = () => {
    setLocalEdits({});
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-foreground mb-1">{suggestion.title}</h3>
        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
      </div>

      {/* Rationale */}
      <div className="bg-muted/50 rounded-md p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {t("detail.rationale_section")}
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {suggestion.rationale}
        </p>
      </div>

      {/* Linked created object (for ACCEPTED suggestions) */}
      {isAccepted && linkedRoute && suggestion.linked_object_type && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/10 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {t(
                  `detail.linked.${suggestion.linked_object_type}` as Parameters<
                    typeof t
                  >[0]
                )}
              </p>
              <p className="text-sm text-foreground truncate">
                {suggestion.linked_object_title ?? suggestion.linked_object_id}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs shrink-0"
            onClick={() =>
              router.push(linkedRoute as Parameters<typeof router.push>[0])
            }
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            {t("detail.linked.open")}
          </Button>
        </div>
      )}

      {/* Editable fields (for non-insight pending) */}
      {!isInsight && isPending && payload && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {t("detail.proposed_section")}
            </p>
            {hasEdits && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleReset}
              >
                {t("actions.reset_to_original")}
              </Button>
            )}
          </div>

          {/* Duration */}
          {payload.planned_minutes !== undefined && (
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("detail.form.duration")}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={480}
                  className="w-16 h-8 px-2 text-sm border rounded-md bg-background"
                  value={
                    (localEdits.planned_minutes as number) ??
                    (payload.planned_minutes as number)
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      "planned_minutes",
                      parseInt(e.target.value) || 0
                    )
                  }
                  disabled={isReadOnly || !canTakeAction}
                />
                <span className="text-xs text-muted-foreground">мин</span>
              </div>
            </div>
          )}

          {/* Discount */}
          {payload.discount_percent !== undefined && (
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t("detail.form.discount_percent")}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-16 h-8 px-2 text-sm border rounded-md bg-background"
                  value={
                    (localEdits.discount_percent as number) ??
                    (payload.discount_percent as number)
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      "discount_percent",
                      parseInt(e.target.value) || 0
                    )
                  }
                  disabled={isReadOnly || !canTakeAction}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          )}

          {/* Bonus points */}
          {payload.bonus_points !== undefined && (
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("detail.form.bonus_points")}</Label>
              <input
                type="number"
                min={0}
                className="w-20 h-8 px-2 text-sm border rounded-md bg-background"
                value={
                  (localEdits.bonus_points as number) ??
                  (payload.bonus_points as number)
                }
                onChange={(e) =>
                  handleFieldChange(
                    "bonus_points",
                    parseInt(e.target.value) || 0
                  )
                }
                disabled={isReadOnly || !canTakeAction}
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex flex-col gap-2 pt-2">
          {isInsight ? (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => onAccept()}
                disabled={!canTakeAction || isReadOnly}
              >
                {t("actions.helpful")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={onReject}
                disabled={!canTakeAction || isReadOnly}
              >
                {t("actions.not_helpful")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Button
                  className={cn(
                    "flex-1",
                    !hasEdits &&
                      "bg-success hover:bg-success/90 text-success-foreground"
                  )}
                  onClick={handleAcceptClick}
                  disabled={!canTakeAction || isReadOnly}
                >
                  {hasEdits
                    ? t("actions.accept_with_edits")
                    : t("actions.accept")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={onReject}
                  disabled={!canTakeAction || isReadOnly}
                >
                  {t("actions.reject")}
                </Button>
              </div>
              <Button variant="ghost" className="w-full gap-1.5" onClick={onAskAi}>
                {t("actions.ask_ai")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
