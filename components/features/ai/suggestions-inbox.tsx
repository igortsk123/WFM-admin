"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { History, Settings2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared";
import { SuggestionDetailSheet } from "./suggestion-detail-sheet";
import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  getAiSuggestions,
  acceptAiSuggestion,
  rejectAiSuggestion,
  checkSuggestionReadiness,
} from "@/lib/api/ai-suggestions";
import type {
  AISuggestion,
  AISuggestionStatus,
  AISuggestionType,
  AISuggestionPriority,
  Locale,
} from "@/lib/types";

import {
  DECISION_MAKERS,
  READ_ONLY_ROLES,
  FORBIDDEN_ROLES,
  TABS,
  type TabValue,
} from "./suggestions-inbox/_shared";
import { ForbiddenState } from "./suggestions-inbox/forbidden-state";
import { StatsRow } from "./suggestions-inbox/stats-row";
import {
  FiltersBar,
  getActiveFiltersCount,
} from "./suggestions-inbox/filters-bar";
import { BulkActionBar } from "./suggestions-inbox/bulk-action-bar";
import { SuggestionsList } from "./suggestions-inbox/suggestions-list";
import { DetailPane } from "./suggestions-inbox/detail-pane";
import { RejectDialog } from "./suggestions-inbox/reject-dialog";

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AISuggestionsInbox() {
  const t = useTranslations("screen.aiSuggestions");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale() as Locale;

  // ─── Permission checks ────────────────────────────────────────────
  const canTakeAction = DECISION_MAKERS.includes(user.role);
  const isReadOnly = READ_ONLY_ROLES.includes(user.role);
  const isForbidden = FORBIDDEN_ROLES.includes(user.role);
  const isNetworkOps =
    user.role === "NETWORK_OPS" || user.role === "PLATFORM_ADMIN";

  // ─── URL state ────────────────────────────────────────────────────
  const currentTab = (searchParams.get("status") as TabValue) || "all";
  const selectedId = searchParams.get("id") || null;
  const typeFilter = searchParams.get("type") as AISuggestionType | null;
  const priorityFilter = searchParams.get(
    "priority"
  ) as AISuggestionPriority | null;
  const storeFilter = searchParams.get("store_id")
    ? parseInt(searchParams.get("store_id")!)
    : null;

  // ─── Local state ──────────────────────────────────────────────────
  const [suggestions, setSuggestions] = React.useState<AISuggestion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(new Set());
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState<string>("");
  const [rejectComment, setRejectComment] = React.useState("");
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = React.useState(false);

  // ─── Fetch data ───────────────────────────────────────────────────
  const fetchSuggestions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof getAiSuggestions>[0] = {
        page_size: 100,
      };
      if (currentTab !== "all") {
        params.status = currentTab as AISuggestionStatus;
      }
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (storeFilter) params.store_id = storeFilter;

      const result = await getAiSuggestions(params);
      setSuggestions(result.data);
    } catch (err) {
      console.error("[v0] Error fetching AI suggestions:", err);
      setError(t("toasts.error"));
    } finally {
      setLoading(false);
    }
  }, [currentTab, typeFilter, priorityFilter, storeFilter, t]);

  React.useEffect(() => {
    if (!isForbidden) {
      fetchSuggestions();
    }
  }, [fetchSuggestions, isForbidden]);

  // ─── URL helpers ──────────────────────────────────────────────────
  const updateSearchParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleTabChange = (value: string) => {
    updateSearchParams({ status: value === "all" ? null : value, id: null });
    setCheckedIds(new Set());
  };

  const handleSelectSuggestion = (id: string) => {
    updateSearchParams({ id });
  };

  const clearFilters = () => {
    updateSearchParams({
      type: null,
      priority: null,
      store_id: null,
    });
  };

  // ─── Stats calculation ────────────────────────────────────────────
  const stats = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      newToday: suggestions.filter(
        (s) => s.status === "PENDING" && new Date(s.created_at) >= todayStart
      ).length,
      inProgress: suggestions.filter((s) => s.status === "EDITED").length,
      acceptedWeek: suggestions.filter(
        (s) =>
          s.status === "ACCEPTED" &&
          s.decided_at &&
          new Date(s.decided_at) >= weekAgo
      ).length,
      rejectedWeek: suggestions.filter(
        (s) =>
          s.status === "REJECTED" &&
          s.decided_at &&
          new Date(s.decided_at) >= weekAgo
      ).length,
    };
  }, [suggestions]);

  // ─── Actions ──────────────────────────────────────────────────────

  /** Маршрут к созданной из предложения сущности — task / goal / bonus_task. */
  const routeForCreated = React.useCallback(
    (entityType: "task" | "goal" | "bonus_task", entityId: string): string => {
      if (entityType === "task") return ADMIN_ROUTES.taskDetail(entityId);
      if (entityType === "goal") return ADMIN_ROUTES.goalDetail(entityId);
      return ADMIN_ROUTES.bonusTasks;
    },
    []
  );

  const handleAccept = async (id: string, edits?: Record<string, unknown>) => {
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) return;

    // ── Edge: тип ещё не поддержан авто-созданием ──
    // (на текущий момент поддерживаем все 4 type'а, но если в будущем
    //  появится новый — gracefully degrade.)
    const supportedTypes = [
      "TASK_SUGGESTION",
      "GOAL_SUGGESTION",
      "BONUS_TASK_SUGGESTION",
      "INSIGHT",
    ];
    if (!supportedTypes.includes(suggestion.type)) {
      toast.info(t("toasts.unsupported_type"));
      return;
    }

    // ── Edge: payload неполный — открыть detail-pane чтобы дозаполнить ──
    // edits мог дозаполнить пустые поля; проверяем merged readiness.
    const merged: Record<string, unknown> = {
      ...suggestion.proposed_payload,
      ...edits,
    };
    const readiness = checkSuggestionReadiness({
      ...suggestion,
      proposed_payload: merged,
    });
    if (!readiness.ready) {
      toast.warning(
        t("toasts.incomplete_data", { fields: readiness.missing.join(", ") })
      );
      // Открываем detail pane чтобы пользователь смог заполнить.
      updateSearchParams({ id: suggestion.id });
      return;
    }

    try {
      const result = await acceptAiSuggestion(id, edits);
      const { created_entity_type, created_entity_id, created_entity_title } =
        result.data;

      // INSIGHT не создаёт сущность — отдельный toast.
      if (suggestion.type === "INSIGHT") {
        toast.success(t("toasts.remembered"));
      } else {
        const route = routeForCreated(created_entity_type, created_entity_id);
        toast.success(
          t("toasts.created", { entity: created_entity_title }),
          {
            description: t(
              `toasts.created_description.${created_entity_type}` as Parameters<
                typeof t
              >[0]
            ),
            action: {
              label: t("toasts.open_created"),
              onClick: () => router.push(route as Parameters<typeof router.push>[0]),
            },
          }
        );
      }

      fetchSuggestions();
      updateSearchParams({ id: null });
    } catch (err) {
      console.error("[v0] Error accepting suggestion:", err);
      toast.error(t("toasts.error"));
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason) return;

    try {
      await rejectAiSuggestion(
        rejectingId,
        t(`reject_dialog.reasons.${rejectReason}` as Parameters<typeof t>[0]),
        rejectComment
      );
      toast.success(t("toasts.rejected"));
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectReason("");
      setRejectComment("");
      fetchSuggestions();
      updateSearchParams({ id: null });
    } catch (err) {
      console.error("[v0] Error rejecting suggestion:", err);
      toast.error(t("toasts.error"));
    }
  };

  const openRejectDialog = (id: string) => {
    setRejectingId(id);
    setRejectDialogOpen(true);
  };

  const handleBulkAccept = async () => {
    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    for (const id of checkedIds) {
      const suggestion = suggestions.find((s) => s.id === id);
      if (!suggestion) {
        failedCount++;
        continue;
      }
      const readiness = checkSuggestionReadiness(suggestion);
      if (!readiness.ready) {
        skippedCount++;
        continue;
      }
      try {
        await acceptAiSuggestion(id);
        createdCount++;
      } catch (err) {
        console.error("[v0] Error bulk accepting:", err);
        failedCount++;
      }
    }
    if (createdCount > 0) {
      toast.success(t("toasts.bulk_accepted", { count: createdCount }));
    }
    if (skippedCount > 0) {
      toast.warning(t("toasts.bulk_skipped", { count: skippedCount }));
    }
    if (failedCount > 0) {
      toast.error(t("toasts.bulk_failed", { count: failedCount }));
    }
    setCheckedIds(new Set());
    fetchSuggestions();
  };

  const handleBulkReject = async () => {
    if (!rejectReason) return;

    try {
      for (const id of checkedIds) {
        await rejectAiSuggestion(
          id,
          t(`reject_dialog.reasons.${rejectReason}` as Parameters<typeof t>[0]),
          rejectComment
        );
      }
      toast.success(t("toasts.bulk_rejected", { count: checkedIds.size }));
      setBulkRejectDialogOpen(false);
      setCheckedIds(new Set());
      setRejectReason("");
      setRejectComment("");
      fetchSuggestions();
    } catch (err) {
      console.error("[v0] Error bulk rejecting:", err);
      toast.error(t("toasts.error"));
    }
  };

  const handleAskAi = (id: string) => {
    router.push(
      `${ADMIN_ROUTES.aiChat}?context_type=suggestion&context_id=${id}`
    );
  };

  // ─── Selection helpers ────────────────────────────────────────────
  const toggleCheck = (id: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  // ─── Selected suggestion ──────────────────────────────────────────
  const selectedSuggestion = selectedId
    ? suggestions.find((s) => s.id === selectedId) || null
    : null;

  // ─── Build store names map ────────────────────────────────────────
  const storeNames = React.useMemo(() => {
    const map: Record<number, string> = {};
    user.stores.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [user.stores]);

  const activeFiltersCount = getActiveFiltersCount(
    typeFilter,
    priorityFilter,
    storeFilter
  );
  const hasActiveFilters = activeFiltersCount > 0;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: Forbidden state
  // ═══════════════════════════════════════════════════════════════════
  if (isForbidden) {
    return (
      <ForbiddenState
        onBack={() => router.push(ADMIN_ROUTES.dashboard)}
        t={t}
        tCommon={tCommon}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: Main content
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumbs={[
          { label: t("breadcrumb_home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumb_ai") },
          { label: t("title") },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden md:flex gap-1.5">
              <History className="size-4" />
              {t("actions.history")}
            </Button>
            {isNetworkOps && (
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex gap-1.5"
              >
                <Settings2 className="size-4" />
                {t("actions.ai_settings")}
              </Button>
            )}
          </div>
        }
      />

      {/* Read-only banner */}
      {isReadOnly && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>{t("read_only.banner")}</AlertDescription>
        </Alert>
      )}

      {/* Stats row */}
      <StatsRow
        newToday={stats.newToday}
        inProgress={stats.inProgress}
        acceptedWeek={stats.acceptedWeek}
        rejectedWeek={stats.rejectedWeek}
        t={t}
      />

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey as Parameters<typeof t>[0])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <FiltersBar
        typeFilter={typeFilter}
        priorityFilter={priorityFilter}
        storeFilter={storeFilter}
        stores={user.stores}
        onUpdateFilters={updateSearchParams}
        onClearFilters={clearFilters}
        t={t}
        tCommon={tCommon}
      />

      {/* Bulk action bar */}
      {checkedIds.size > 0 && canTakeAction && !isReadOnly && (
        <BulkActionBar
          selectedCount={checkedIds.size}
          bulkRejectDialogOpen={bulkRejectDialogOpen}
          onBulkRejectDialogOpenChange={setBulkRejectDialogOpen}
          rejectReason={rejectReason}
          onRejectReasonChange={setRejectReason}
          rejectComment={rejectComment}
          onRejectCommentChange={setRejectComment}
          onBulkAccept={handleBulkAccept}
          onBulkReject={handleBulkReject}
          t={t}
          tCommon={tCommon}
        />
      )}

      {/* Main content: 2-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left: Cards list */}
        <div className="space-y-3">
          <SuggestionsList
            loading={loading}
            error={error}
            suggestions={suggestions}
            selectedId={selectedId}
            checkedIds={checkedIds}
            currentTab={currentTab}
            hasActiveFilters={hasActiveFilters}
            canTakeAction={canTakeAction}
            isReadOnly={isReadOnly}
            locale={locale}
            storeNames={storeNames}
            onSelect={handleSelectSuggestion}
            onToggleCheck={toggleCheck}
            onAccept={(id) => handleAccept(id)}
            onReject={openRejectDialog}
            onAskAi={handleAskAi}
            onRetry={fetchSuggestions}
            onClearFilters={clearFilters}
            t={t}
            tCommon={tCommon}
          />
        </div>

        {/* Right: Detail panel (desktop only) */}
        <div className="hidden lg:block">
          <DetailPane
            suggestion={selectedSuggestion}
            onAccept={(edits) =>
              selectedSuggestion && handleAccept(selectedSuggestion.id, edits)
            }
            onReject={() =>
              selectedSuggestion && openRejectDialog(selectedSuggestion.id)
            }
            onAskAi={() =>
              selectedSuggestion && handleAskAi(selectedSuggestion.id)
            }
            canTakeAction={canTakeAction}
            isReadOnly={isReadOnly}
            locale={locale}
            stores={user.stores}
            t={t}
            tCommon={tCommon}
          />
        </div>
      </div>

      {/* Mobile detail sheet */}
      <SuggestionDetailSheet
        suggestion={selectedSuggestion}
        open={
          !!selectedId &&
          typeof window !== "undefined" &&
          window.innerWidth < 1024
        }
        onOpenChange={(open) => {
          if (!open) updateSearchParams({ id: null });
        }}
        onAccept={(edits) =>
          selectedSuggestion && handleAccept(selectedSuggestion.id, edits)
        }
        onReject={() =>
          selectedSuggestion && openRejectDialog(selectedSuggestion.id)
        }
        onAskAi={() => selectedSuggestion && handleAskAi(selectedSuggestion.id)}
        canTakeAction={canTakeAction}
        isReadOnly={isReadOnly}
        locale={locale}
        stores={user.stores}
      />

      {/* Reject dialog */}
      <RejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        comment={rejectComment}
        onCommentChange={setRejectComment}
        onConfirm={handleReject}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}
