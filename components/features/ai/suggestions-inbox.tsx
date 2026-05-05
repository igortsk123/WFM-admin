"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Settings2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageHeader,
  KpiCard,
  FilterChip,
  EmptyState,
  MobileFilterSheet,
} from "@/components/shared";
import { SuggestionCard } from "./suggestion-card";
import { SuggestionDetailSheet } from "./suggestion-detail-sheet";
import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import {
  getAiSuggestions,
  acceptAiSuggestion,
  rejectAiSuggestion,
} from "@/lib/api/ai-suggestions";
import { cn } from "@/lib/utils";
import type {
  AISuggestion,
  AISuggestionStatus,
  AISuggestionType,
  AISuggestionPriority,
  FunctionalRole,
  Locale,
} from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const DECISION_MAKERS: FunctionalRole[] = [
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "PLATFORM_ADMIN",
];

const READ_ONLY_ROLES: FunctionalRole[] = ["STORE_DIRECTOR"];

const FORBIDDEN_ROLES: FunctionalRole[] = ["HR_MANAGER", "OPERATOR", "WORKER"];

type TabValue = "all" | "PENDING" | "EDITED" | "ACCEPTED" | "REJECTED";

const TABS: { value: TabValue; labelKey: string }[] = [
  { value: "all", labelKey: "tabs.all" },
  { value: "PENDING", labelKey: "tabs.pending" },
  { value: "EDITED", labelKey: "tabs.edited" },
  { value: "ACCEPTED", labelKey: "tabs.accepted" },
  { value: "REJECTED", labelKey: "tabs.rejected" },
];

const REJECT_REASONS = [
  "not_relevant",
  "already_in_progress",
  "disagree_analysis",
  "too_generic",
  "other",
] as const;

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

  // ─── Permission checks ────────────────────────────────────────────
  const canTakeAction = DECISION_MAKERS.includes(user.role);
  const isReadOnly = READ_ONLY_ROLES.includes(user.role);
  const isForbidden = FORBIDDEN_ROLES.includes(user.role);
  const isNetworkOps = user.role === "NETWORK_OPS" || user.role === "PLATFORM_ADMIN";

  // ─── URL state ────────────────────────────────────────────────────
  const currentTab = (searchParams.get("status") as TabValue) || "all";
  const selectedId = searchParams.get("id") || null;
  const typeFilter = searchParams.get("type") as AISuggestionType | null;
  const priorityFilter = searchParams.get("priority") as AISuggestionPriority | null;
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
  const locale = "ru" as Locale; // TODO: get from next-intl

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
        (s) =>
          s.status === "PENDING" &&
          new Date(s.created_at) >= todayStart
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
  const handleAccept = async (id: string, edits?: Record<string, unknown>) => {
    try {
      const result = await acceptAiSuggestion(id, edits);
      const suggestionType = suggestions.find((s) => s.id === id)?.type;

      // Show appropriate toast based on type
      if (suggestionType === "GOAL_SUGGESTION") {
        toast.success(t("toasts.accepted_goal"));
      } else if (suggestionType === "BONUS_TASK_SUGGESTION") {
        toast.success(t("toasts.accepted_bonus"));
      } else {
        toast.success(t("toasts.accepted"));
      }

      // Refresh data
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
    try {
      for (const id of checkedIds) {
        await acceptAiSuggestion(id);
      }
      toast.success(t("toasts.bulk_accepted", { count: checkedIds.size }));
      setCheckedIds(new Set());
      fetchSuggestions();
    } catch (err) {
      console.error("[v0] Error bulk accepting:", err);
      toast.error(t("toasts.error"));
    }
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
    router.push(`${ADMIN_ROUTES.aiChat}?context_type=suggestion&context_id=${id}`);
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

  // ─── Active filters ───────────────────────────────────────────────
  const activeFilters: { label: string; value: string; onRemove: () => void }[] = [];
  if (typeFilter) {
    activeFilters.push({
      label: t("filters.type"),
      value: t(`type.${typeFilter}` as Parameters<typeof t>[0]),
      onRemove: () => updateSearchParams({ type: null }),
    });
  }
  if (priorityFilter) {
    activeFilters.push({
      label: t("filters.priority"),
      value: t(`priority.${priorityFilter}` as Parameters<typeof t>[0]),
      onRemove: () => updateSearchParams({ priority: null }),
    });
  }
  if (storeFilter) {
    const store = user.stores.find((s) => s.id === storeFilter);
    activeFilters.push({
      label: t("filters.store"),
      value: store?.name || `#${storeFilter}`,
      onRemove: () => updateSearchParams({ store_id: null }),
    });
  }

  // ─── Build store names map ────────────────────────────────────────
  const storeNames = React.useMemo(() => {
    const map: Record<number, string> = {};
    user.stores.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [user.stores]);

  // ─── Pending suggestions for bulk actions ─────────────────────────
  const pendingSuggestions = suggestions.filter(
    (s) => s.status === "PENDING" || s.status === "EDITED"
  );

  // ═══════════════════════════════════════════════════════════════════
  // RENDER: Forbidden state
  // ═══════════════════════════════════════════════════════════════════
  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
          <Lock className="size-8 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t("forbidden.title")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {t("forbidden.description")}
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push(ADMIN_ROUTES.dashboard)}
        >
          {tCommon("back")}
        </Button>
      </div>
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
              <Button variant="outline" size="sm" className="hidden md:flex gap-1.5">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("stats.new_today")}
          value={stats.newToday}
          icon={Sparkles}
        />
        <KpiCard
          label={t("stats.in_progress")}
          value={stats.inProgress}
          icon={Clock}
        />
        <KpiCard
          label={t("stats.accepted_week")}
          value={stats.acceptedWeek}
          icon={CheckCircle2}
        />
        <KpiCard
          label={t("stats.rejected_week")}
          value={stats.rejectedWeek}
          icon={XCircle}
        />
      </div>

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

      {/* Filter row (desktop) */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        <Select
          value={typeFilter || ""}
          onValueChange={(v) => updateSearchParams({ type: v || null })}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={t("filters.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TASK_SUGGESTION">{t("type.TASK_SUGGESTION")}</SelectItem>
            <SelectItem value="GOAL_SUGGESTION">{t("type.GOAL_SUGGESTION")}</SelectItem>
            <SelectItem value="BONUS_TASK_SUGGESTION">
              {t("type.BONUS_TASK_SUGGESTION")}
            </SelectItem>
            <SelectItem value="INSIGHT">{t("type.INSIGHT")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter || ""}
          onValueChange={(v) => updateSearchParams({ priority: v || null })}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t("filters.priority")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">{t("priority.high")}</SelectItem>
            <SelectItem value="medium">{t("priority.medium")}</SelectItem>
            <SelectItem value="low">{t("priority.low")}</SelectItem>
          </SelectContent>
        </Select>

        {user.stores.length > 0 && (
          <Select
            value={storeFilter?.toString() || ""}
            onValueChange={(v) => updateSearchParams({ store_id: v || null })}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder={t("filters.store")} />
            </SelectTrigger>
            <SelectContent>
              {user.stores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mobile filter sheet */}
      <MobileFilterSheet
        activeCount={activeFilters.length}
        onClearAll={clearFilters}
        onApply={() => {}}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("filters.type")}
            </Label>
            <Select
              value={typeFilter || ""}
              onValueChange={(v) => updateSearchParams({ type: v || null })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("filters.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TASK_SUGGESTION">
                  {t("type.TASK_SUGGESTION")}
                </SelectItem>
                <SelectItem value="GOAL_SUGGESTION">
                  {t("type.GOAL_SUGGESTION")}
                </SelectItem>
                <SelectItem value="BONUS_TASK_SUGGESTION">
                  {t("type.BONUS_TASK_SUGGESTION")}
                </SelectItem>
                <SelectItem value="INSIGHT">{t("type.INSIGHT")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t("filters.priority")}
            </Label>
            <Select
              value={priorityFilter || ""}
              onValueChange={(v) => updateSearchParams({ priority: v || null })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("filters.priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t("priority.high")}</SelectItem>
                <SelectItem value="medium">{t("priority.medium")}</SelectItem>
                <SelectItem value="low">{t("priority.low")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {user.stores.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t("filters.store")}
              </Label>
              <Select
                value={storeFilter?.toString() || ""}
                onValueChange={(v) => updateSearchParams({ store_id: v || null })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("filters.store")} />
                </SelectTrigger>
                <SelectContent>
                  {user.stores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </MobileFilterSheet>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilters.map((filter, i) => (
            <FilterChip
              key={i}
              label={filter.label}
              value={filter.value}
              onRemove={filter.onRemove}
            />
          ))}
          <Button
            variant="link"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clearFilters}
          >
            {tCommon("clear_all")}
          </Button>
        </div>
      )}

      {/* Bulk action bar */}
      {checkedIds.size > 0 && canTakeAction && !isReadOnly && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {tCommon("selected")}: {checkedIds.size}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={handleBulkAccept}
            >
              {t("actions.bulk_accept")}
            </Button>
            <AlertDialog
              open={bulkRejectDialogOpen}
              onOpenChange={setBulkRejectDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  {t("actions.bulk_reject")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("bulk_reject_dialog.title", { count: checkedIds.size })}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("bulk_reject_dialog.message")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <RadioGroup value={rejectReason} onValueChange={setRejectReason}>
                    {REJECT_REASONS.map((reason) => (
                      <div key={reason} className="flex items-center space-x-2">
                        <RadioGroupItem value={reason} id={`bulk-${reason}`} />
                        <Label htmlFor={`bulk-${reason}`}>
                          {t(`reject_dialog.reasons.${reason}` as Parameters<typeof t>[0])}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Textarea
                    placeholder={t("reject_dialog.comment_placeholder")}
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    rows={2}
                  />
                </div>
                <AlertDialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setBulkRejectDialogOpen(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleBulkReject}
                    disabled={!rejectReason}
                  >
                    {t("actions.reject")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Main content: 2-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left: Cards list */}
        <div className="space-y-3">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
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
            ))
          ) : error ? (
            // Error state
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>{tCommon("error")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={fetchSuggestions}
              >
                {tCommon("retry")}
              </Button>
            </Alert>
          ) : suggestions.length === 0 ? (
            // Empty state
            <EmptyState
              icon={Sparkles}
              title={
                activeFilters.length > 0
                  ? t("empty.filtered.title")
                  : currentTab === "ACCEPTED"
                  ? t("empty.accepted.title")
                  : currentTab === "REJECTED"
                  ? t("empty.rejected.title")
                  : t("empty.pending.title")
              }
              description={
                activeFilters.length > 0
                  ? t("empty.filtered.description")
                  : currentTab === "ACCEPTED"
                  ? t("empty.accepted.description")
                  : currentTab === "REJECTED"
                  ? t("empty.rejected.description")
                  : t("empty.pending.description")
              }
              action={
                activeFilters.length > 0
                  ? {
                      label: tCommon("clear_all"),
                      onClick: clearFilters,
                    }
                  : undefined
              }
            />
          ) : (
            // Suggestions list
            suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                selected={selectedId === suggestion.id}
                checked={checkedIds.has(suggestion.id)}
                onSelect={() => handleSelectSuggestion(suggestion.id)}
                onCheckChange={(checked) => toggleCheck(suggestion.id, checked)}
                onAccept={() => handleAccept(suggestion.id)}
                onReject={() => openRejectDialog(suggestion.id)}
                onEdit={() => handleSelectSuggestion(suggestion.id)}
                onAskAi={() => handleAskAi(suggestion.id)}
                onHelpful={() => handleAccept(suggestion.id)}
                onNotHelpful={() => openRejectDialog(suggestion.id)}
                canTakeAction={canTakeAction}
                isReadOnly={isReadOnly}
                locale={locale}
                storeNames={storeNames}
              />
            ))
          )}
        </div>

        {/* Right: Detail panel (desktop only) */}
        <div className="hidden lg:block">
          {selectedSuggestion ? (
            <div className="sticky top-6 rounded-xl border bg-card p-6 space-y-4">
              <SuggestionDetailContent
                suggestion={selectedSuggestion}
                onAccept={(edits) => handleAccept(selectedSuggestion.id, edits)}
                onReject={() => openRejectDialog(selectedSuggestion.id)}
                onAskAi={() => handleAskAi(selectedSuggestion.id)}
                canTakeAction={canTakeAction}
                isReadOnly={isReadOnly}
                locale={locale}
                stores={user.stores}
                t={t}
                tCommon={tCommon}
              />
            </div>
          ) : (
            <div className="sticky top-6 flex flex-col items-center justify-center rounded-xl border bg-muted/30 p-6 min-h-[300px] text-center">
              <Sparkles className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t("detail.title")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail sheet */}
      <SuggestionDetailSheet
        suggestion={selectedSuggestion}
        open={!!selectedId && typeof window !== "undefined" && window.innerWidth < 1024}
        onOpenChange={(open) => {
          if (!open) updateSearchParams({ id: null });
        }}
        onAccept={(edits) => selectedSuggestion && handleAccept(selectedSuggestion.id, edits)}
        onReject={() => selectedSuggestion && openRejectDialog(selectedSuggestion.id)}
        onAskAi={() => selectedSuggestion && handleAskAi(selectedSuggestion.id)}
        canTakeAction={canTakeAction}
        isReadOnly={isReadOnly}
        locale={locale}
        stores={user.stores}
      />

      {/* Reject dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reject_dialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("reject_dialog.message")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t("reject_dialog.reason_label")}
              </Label>
              <RadioGroup value={rejectReason} onValueChange={setRejectReason}>
                {REJECT_REASONS.map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason} id={reason} />
                    <Label htmlFor={reason}>
                      {t(`reject_dialog.reasons.${reason}` as Parameters<typeof t>[0])}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t("reject_dialog.comment_label")}
              </Label>
              <Textarea
                placeholder={t("reject_dialog.comment_placeholder")}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason || rejectComment.length < 10}
            >
              {t("actions.reject")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DETAIL CONTENT (inline for desktop sticky panel)
// ═══════════════════════════════════════════════════════════════════

interface SuggestionDetailContentProps {
  suggestion: AISuggestion;
  onAccept: (edits?: Record<string, unknown>) => void;
  onReject: () => void;
  onAskAi: () => void;
  canTakeAction: boolean;
  isReadOnly: boolean;
  locale: Locale;
  stores: { id: number; name: string }[];
  t: ReturnType<typeof useTranslations<"screen.aiSuggestions">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
}

function SuggestionDetailContent({
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
}: SuggestionDetailContentProps) {
  const [localEdits, setLocalEdits] = React.useState<Record<string, unknown>>({});
  const isInsight = suggestion.type === "INSIGHT";
  const isPending = suggestion.status === "PENDING" || suggestion.status === "EDITED";
  const payload = suggestion.proposed_payload as Record<string, unknown> | undefined;

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
        <p className="text-sm text-foreground leading-relaxed">{suggestion.rationale}</p>
      </div>

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
                    handleFieldChange("planned_minutes", parseInt(e.target.value) || 0)
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
              <Label className="text-sm">{t("detail.form.discount_percent")}</Label>
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
                    handleFieldChange("discount_percent", parseInt(e.target.value) || 0)
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
                  (localEdits.bonus_points as number) ?? (payload.bonus_points as number)
                }
                onChange={(e) =>
                  handleFieldChange("bonus_points", parseInt(e.target.value) || 0)
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
                    !hasEdits && "bg-success hover:bg-success/90 text-success-foreground"
                  )}
                  onClick={handleAcceptClick}
                  disabled={!canTakeAction || isReadOnly}
                >
                  {hasEdits ? t("actions.accept_with_edits") : t("actions.accept")}
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
