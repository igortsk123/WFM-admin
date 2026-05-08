"use client";

import { Sparkles, AlertTriangle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared";

import type { AISuggestion, Locale } from "@/lib/types";

import { SuggestionCard } from "../suggestion-card";

import type { TabValue, TFn, TCommonFn } from "./_shared";

export interface SuggestionsListProps {
  loading: boolean;
  error: string | null;
  suggestions: AISuggestion[];
  selectedId: string | null;
  checkedIds: Set<string>;
  currentTab: TabValue;
  hasActiveFilters: boolean;
  canTakeAction: boolean;
  isReadOnly: boolean;
  locale: Locale;
  storeNames: Record<number, string>;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAskAi: (id: string) => void;
  onRetry: () => void;
  onClearFilters: () => void;
  t: TFn;
  tCommon: TCommonFn;
}

export function SuggestionsList({
  loading,
  error,
  suggestions,
  selectedId,
  checkedIds,
  currentTab,
  hasActiveFilters,
  canTakeAction,
  isReadOnly,
  locale,
  storeNames,
  onSelect,
  onToggleCheck,
  onAccept,
  onReject,
  onAskAi,
  onRetry,
  onClearFilters,
  t,
  tCommon,
}: SuggestionsListProps) {
  if (loading) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{tCommon("error")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          {tCommon("retry")}
        </Button>
      </Alert>
    );
  }

  if (suggestions.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={
          hasActiveFilters
            ? t("empty.filtered.title")
            : currentTab === "ACCEPTED"
            ? t("empty.accepted.title")
            : currentTab === "REJECTED"
            ? t("empty.rejected.title")
            : t("empty.pending.title")
        }
        description={
          hasActiveFilters
            ? t("empty.filtered.description")
            : currentTab === "ACCEPTED"
            ? t("empty.accepted.description")
            : currentTab === "REJECTED"
            ? t("empty.rejected.description")
            : t("empty.pending.description")
        }
        action={
          hasActiveFilters
            ? {
                label: tCommon("clear_all"),
                onClick: onClearFilters,
              }
            : undefined
        }
      />
    );
  }

  return (
    <>
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          selected={selectedId === suggestion.id}
          checked={checkedIds.has(suggestion.id)}
          onSelect={() => onSelect(suggestion.id)}
          onCheckChange={(checked) => onToggleCheck(suggestion.id, checked)}
          onAccept={() => onAccept(suggestion.id)}
          onReject={() => onReject(suggestion.id)}
          onEdit={() => onSelect(suggestion.id)}
          onAskAi={() => onAskAi(suggestion.id)}
          onHelpful={() => onAccept(suggestion.id)}
          onNotHelpful={() => onReject(suggestion.id)}
          canTakeAction={canTakeAction}
          isReadOnly={isReadOnly}
          locale={locale}
          storeNames={storeNames}
        />
      ))}
    </>
  );
}
