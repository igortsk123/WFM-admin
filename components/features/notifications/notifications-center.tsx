"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Settings,
  Eye,
  Check,
  Archive,
  Inbox,
  XCircle,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { PageHeader } from "@/components/shared/page-header";
import { FilterChip } from "@/components/shared/filter-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import { NotificationsSettingsDialogContent } from "./notifications-settings-dialog-content";

import {
  getNotifications,
  markRead,
  markAllRead,
  archiveNotification,
} from "@/lib/api/notifications";
import type { Notification, NotificationCategory } from "@/lib/types";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { formatRelative, formatDateTime } from "@/lib/utils/format";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

type TabValue = "all" | "unread" | "ai" | "archived";

const PERIOD_OPTIONS = ["30d", "7d", "today", "all"] as const;
type PeriodOption = (typeof PERIOD_OPTIONS)[number];

const CATEGORY_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: "all", labelKey: "filters.category_all" },
  { value: "TASK_REVIEW", labelKey: "category.TASK_REVIEW" },
  { value: "TASK_REJECTED", labelKey: "category.TASK_REJECTED" },
  { value: "TASK_STATE_CHANGED", labelKey: "category.TASK_STATE_CHANGED" },
  { value: "AI_SUGGESTION_NEW", labelKey: "category.AI_SUGGESTION_NEW" },
  { value: "AI_ANOMALY", labelKey: "category.AI_ANOMALY" },
  { value: "GENERIC", labelKey: "category.GENERIC" },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function getCategoryIcon(
  category: NotificationCategory
): React.ReactElement {
  switch (category) {
    case "TASK_REVIEW":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-info/10 text-info">
          <Inbox className="size-4" />
        </span>
      );
    case "TASK_REJECTED":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <XCircle className="size-4" />
        </span>
      );
    case "TASK_STATE_CHANGED":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-success/10 text-success">
          <CheckCircle2 className="size-4" />
        </span>
      );
    case "AI_SUGGESTION_NEW":
    case "AI_ANOMALY":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </span>
      );
    case "BONUS_AVAILABLE":
    case "GOAL_UPDATE":
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-warning/10 text-warning">
          <AlertTriangle className="size-4" />
        </span>
      );
    default:
      return (
        <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Bell className="size-4" />
        </span>
      );
  }
}

function getPeriodDates(period: PeriodOption): {
  date_from?: string;
  date_to?: string;
} {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { date_from: start.toISOString() };
  }
  if (period === "7d") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { date_from: start.toISOString() };
  }
  if (period === "30d") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { date_from: start.toISOString() };
  }
  return {};
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════════════

function NotificationSkeleton() {
  return (
    <div className="flex gap-4 p-4 border-b border-border last:border-0">
      <Skeleton className="size-8 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION ROW
// ═══════════════════════════════════════════════════════════════════

interface NotificationRowProps {
  notification: Notification;
  locale: Locale;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onNavigate: (link: string | undefined) => void;
}

function NotificationRow({
  notification,
  locale,
  onMarkRead,
  onArchive,
  onNavigate,
}: NotificationRowProps) {
  const t = useTranslations("screen.notifications");
  const isUnread = !notification.is_read;

  const relativeTime = formatRelative(
    new Date(notification.created_at),
    locale as Locale
  );
  const absoluteTime = formatDateTime(
    new Date(notification.created_at),
    locale as Locale
  );

  function handleRowClick(e: React.MouseEvent) {
    // Don't navigate if clicking action buttons
    if ((e.target as HTMLElement).closest("button")) return;
    if (isUnread) onMarkRead(notification.id);
    if (notification.link) onNavigate(notification.link);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isUnread) onMarkRead(notification.id);
      if (notification.link) onNavigate(notification.link);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex gap-4 p-4 border-b border-border last:border-0 transition-colors cursor-pointer",
        "hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isUnread && "border-l-4 border-l-primary bg-primary/5"
      )}
    >
      {/* Category icon */}
      <div className="shrink-0 mt-0.5">{getCategoryIcon(notification.category)}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {notification.title}
            </p>
            {isUnread && (
              <span
                className="shrink-0 size-2 rounded-full bg-primary"
                aria-label="Непрочитано"
              />
            )}
          </div>
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <time
                  dateTime={notification.created_at}
                  className="text-xs text-muted-foreground shrink-0 whitespace-nowrap"
                >
                  {relativeTime}
                </time>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">{absoluteTime}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {notification.body}
        </p>

        {/* Meta */}
        {(notification.data?.store_id || notification.data?.task_id) && (
          <p className="mt-1 text-xs text-muted-foreground/70">
            {notification.data.task_id
              ? `Задача: ${String(notification.data.task_id)}`
              : ""}
            {notification.data.store_id && notification.data.task_id ? " · " : ""}
            {notification.data.store_id
              ? `Магазин ID: ${String(notification.data.store_id)}`
              : ""}
          </p>
        )}
      </div>

      {/* Action buttons — always visible on mobile, visible on hover on desktop */}
      <div
        className={cn(
          "flex flex-col gap-1 shrink-0",
          "opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {notification.link && (
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  aria-label={t("row.open_link")}
                  onClick={() => {
                    if (isUnread) onMarkRead(notification.id);
                    onNavigate(notification.link);
                  }}
                >
                  <Eye className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">{t("row.open_link")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {isUnread && (
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-success"
                  aria-label={t("row.mark_read")}
                  onClick={() => onMarkRead(notification.id)}
                >
                  <Check className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">{t("row.mark_read")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!notification.is_archived && (
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-muted-foreground/70"
                  aria-label={t("row.archive")}
                  onClick={() => onArchive(notification.id)}
                >
                  <Archive className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">{t("row.archive")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function NotificationsCenter() {
  const t = useTranslations("screen.notifications");
  const router = useRouter();
  const locale = useLocale() as Locale;

  // ── State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<TabValue>("all");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [period, setPeriod] = React.useState<PeriodOption>("30d");

  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [archivedCount, setArchivedCount] = React.useState(0);
  const [aiUnreadCount, setAiUnreadCount] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const PAGE_SIZE = 10;

  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [markAllOpen, setMarkAllOpen] = React.useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchNotifications = React.useCallback(
    async (resetPage = true) => {
      setLoading(true);
      setError(false);

      const currentPage = resetPage ? 1 : page;
      if (resetPage) setPage(1);

      try {
        const dateParams = getPeriodDates(period);
        const isArchived = activeTab === "archived";
        const isUnread = activeTab === "unread" ? true : undefined;
        const aiCategories: NotificationCategory[] = [
          "AI_SUGGESTION_NEW",
          "AI_ANOMALY",
        ];
        const effectiveCategories: NotificationCategory[] | undefined =
          activeTab === "ai"
            ? aiCategories
            : category !== "all"
            ? [category as NotificationCategory]
            : undefined;

        const res = await getNotifications({
          page: currentPage,
          page_size: PAGE_SIZE,
          search: search || undefined,
          is_read: isUnread,
          categories: effectiveCategories,
          include_archived: isArchived,
          ...dateParams,
        });

        const filtered = isArchived
          ? res.data.filter((n) => n.is_archived)
          : res.data.filter((n) => !n.is_archived);

        if (resetPage) {
          setNotifications(filtered);
        } else {
          setNotifications((prev) => [...prev, ...filtered]);
        }
        setTotal(filtered.length);
        setUnreadCount(res.unread_count);
        setArchivedCount(res.archived_count);
        setHasMore(currentPage * PAGE_SIZE < res.total);

        // Compute AI unread
        const aiUnread = res.data.filter(
          (n) =>
            !n.is_read &&
            !n.is_archived &&
            (n.category === "AI_SUGGESTION_NEW" || n.category === "AI_ANOMALY")
        ).length;
        setAiUnreadCount(aiUnread);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, search, category, period, page]
  );

  React.useEffect(() => {
    fetchNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, category, period]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications(true);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Real-time mock: add a notification every 30s ───────────────
  React.useEffect(() => {
    const interval = setInterval(() => {
      const mockNew: Notification = {
        id: `notif-rt-${Date.now()}`,
        user_id: 4,
        category: "AI_SUGGESTION_NEW",
        title: "ИИ предложил задачу: Проверка выкладки",
        body: "Зафиксировано отклонение по планограмме в зоне «Напитки». ИИ предлагает задачу.",
        data: { suggestion_id: `sugg-rt-${Date.now()}`, store_id: 1 },
        link: ADMIN_ROUTES.aiSuggestions,
        is_read: false,
        is_archived: false,
        created_at: new Date().toISOString(),
      };
      if (activeTab === "all" || activeTab === "unread" || activeTab === "ai") {
        setNotifications((prev) => [mockNew, ...prev]);
        setUnreadCount((c) => c + 1);
        setAiUnreadCount((c) => c + 1);
        toast(mockNew.title, {
          description: mockNew.body.slice(0, 80) + "...",
          icon: <Sparkles className="size-4 text-primary" />,
          action: {
            label: "Открыть",
            onClick: () => router.push(ADMIN_ROUTES.aiSuggestions),
          },
          duration: 6000,
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, router]);

  // ── Optimistic actions ─────────────────────────────────────────
  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    markRead(id).catch(() => toast.error(t("toasts.error")));
    toast.success(t("toasts.marked_read"), { duration: 2000 });
  }

  function handleArchive(id: string) {
    const notif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (notif && !notif.is_read) setUnreadCount((c) => Math.max(0, c - 1));

    archiveNotification(id).catch(() => {
      // Rollback on error
      if (notif) setNotifications((prev) => [notif, ...prev]);
    });

    toast(t("toasts.archived"), {
      action: {
        label: "Отменить",
        onClick: () => {
          if (notif) setNotifications((prev) => [notif, ...prev]);
        },
      },
      duration: 5000,
    });
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setAiUnreadCount(0);
    await markAllRead();
    toast.success(t("toasts.all_marked_read"));
  }

  function handleNavigate(link: string | undefined) {
    if (!link) return;
    router.push(link);
  }

  // ── Active filter count for mobile sheet ──────────────────────
  const activeFilterCount =
    (category !== "all" ? 1 : 0) + (period !== "30d" ? 1 : 0);

  // ── Filter chips ───────────────────────────────────────────────
  const filterChips: Array<{ label: string; value: string; onRemove: () => void }> = [];
  if (category !== "all") {
    const cat = CATEGORY_OPTIONS.find((c) => c.value === category);
    if (cat) {
      filterChips.push({
        label: t("filters.category"),
        value: t(cat.labelKey as Parameters<typeof t>[0]),
        onRemove: () => setCategory("all"),
      });
    }
  }
  if (period !== "30d") {
    const periodLabels: Record<PeriodOption, string> = {
      today: "Сегодня",
      "7d": "7 дней",
      "30d": "30 дней",
      all: "Всё время",
    };
    filterChips.push({
      label: t("filters.date_range"),
      value: periodLabels[period],
      onRemove: () => setPeriod("30d"),
    });
  }

  // ── Render helpers ─────────────────────────────────────────────
  function renderList() {
    if (loading && notifications.length === 0) {
      return (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>Не удалось загрузить уведомления</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNotifications(true)}
                className="ml-4 shrink-0"
              >
                <RefreshCw className="size-3.5 mr-1.5" />
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (notifications.length === 0) {
      if (activeTab === "unread") {
        return (
          <EmptyState
            icon={CheckCheck}
            title={t("empty.no_unread_title")}
            description={t("empty.no_unread_subtitle")}
          />
        );
      }
      if (activeTab === "archived") {
        return (
          <EmptyState
            icon={Archive}
            title={t("empty.no_archived_title")}
            description="Заархивированные уведомления появятся здесь"
          />
        );
      }
      if (search || category !== "all" || period !== "30d") {
        return (
          <EmptyState
            icon={SearchX}
            title={t("empty.filtered_title")}
            description="Попробуйте изменить параметры поиска или фильтры"
            action={{
              label: t("empty.filtered_reset"),
              onClick: () => {
                setSearch("");
                setCategory("all");
                setPeriod("30d");
              },
            }}
          />
        );
      }
      return (
        <EmptyState
          icon={Bell}
          title={t("empty.no_notifications_title")}
          description={t("empty.no_notifications_subtitle")}
        />
      );
    }

    return (
      <div>
        {notifications.map((notif) => (
          <NotificationRow
            key={notif.id}
            notification={notif}
            locale={locale}
            onMarkRead={handleMarkRead}
            onArchive={handleArchive}
            onNavigate={handleNavigate}
          />
        ))}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center p-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => {
                setPage((p) => p + 1);
                fetchNotifications(false);
              }}
            >
              {loading ? "Загрузка..." : "Загрузить ещё"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  function TabBadge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
      <Badge
        variant="secondary"
        className="ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-semibold bg-primary/10 text-primary border-primary/20"
      >
        {count}
      </Badge>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title={t("breadcrumbs.notifications")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.notifications") },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Mark all read */}
            <AlertDialog open={markAllOpen} onOpenChange={setMarkAllOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unreadCount === 0}
                  className="hidden sm:flex"
                >
                  <CheckCheck className="size-4 mr-2" />
                  {t("actions.mark_all_read")}
                </Button>
              </AlertDialogTrigger>
              {/* Icon-only on mobile */}
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={unreadCount === 0}
                  className="sm:hidden size-9"
                  aria-label={t("actions.mark_all_read")}
                >
                  <CheckCheck className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <ConfirmDialog
                title="Прочитать все уведомления?"
                message={`Это отметит все ${unreadCount} непрочитанных уведомлений как прочитанные.`}
                confirmLabel="Прочитать все"
                onConfirm={handleMarkAllRead}
                onOpenChange={setMarkAllOpen}
              />
            </AlertDialog>

            {/* Settings */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Settings className="size-4 mr-2" />
                  {t("actions.preferences")}
                </Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden size-9"
                  aria-label={t("actions.preferences")}
                >
                  <Settings className="size-4" />
                </Button>
              </DialogTrigger>
              {settingsOpen && (
                <NotificationsSettingsDialogContent
                  onOpenChange={setSettingsOpen}
                />
              )}
            </Dialog>
          </div>
        }
      />

      {/* Tabs + content */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabValue);
          setSearch("");
          setCategory("all");
          setPeriod("30d");
        }}
      >
        {/* Tabs list — horizontal scroll on mobile */}
        <div className="overflow-x-auto scrollbar-none">
          <TabsList className="w-max min-w-full md:w-auto h-10">
            <TabsTrigger value="all" className="text-sm">
              {t("tabs.all")}
              <span className="ml-1 text-xs text-muted-foreground">
                ({total})
              </span>
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-sm">
              {t("tabs.unread")}
              <TabBadge count={unreadCount} />
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-sm flex items-center gap-1">
              <Sparkles className="size-3.5" />
              ИИ-предложения
              <TabBadge count={aiUnreadCount} />
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-sm">
              {t("tabs.archived")}
              <span className="ml-1 text-xs text-muted-foreground">
                ({archivedCount})
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Shared content for all tabs */}
        {(["all", "unread", "ai", "archived"] as TabValue[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
            {/* Toolbar */}
            <div className="space-y-3">
              {/* Search — full width on mobile */}
              <Input
                placeholder={t("filters.search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9"
                aria-label={t("filters.search_placeholder")}
              />

              {/* Selects + mobile filter sheet */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category select — hidden on mobile (in filter sheet) */}
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="hidden md:flex w-52 h-9 text-sm">
                    <SelectValue placeholder={t("filters.category_all")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Period select — hidden on mobile */}
                <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
                  <SelectTrigger className="hidden md:flex w-40 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Сегодня</SelectItem>
                    <SelectItem value="7d">7 дней</SelectItem>
                    <SelectItem value="30d">30 дней</SelectItem>
                    <SelectItem value="all">Всё время</SelectItem>
                  </SelectContent>
                </Select>

                {/* Mobile filter sheet */}
                <MobileFilterSheet
                  activeCount={activeFilterCount}
                  onClearAll={() => {
                    setCategory("all");
                    setPeriod("30d");
                  }}
                  onApply={() => fetchNotifications(true)}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t("filters.category")}</p>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {t(opt.labelKey as Parameters<typeof t>[0])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t("filters.date_range")}</p>
                      <Select
                        value={period}
                        onValueChange={(v) => setPeriod(v as PeriodOption)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Сегодня</SelectItem>
                          <SelectItem value="7d">7 дней</SelectItem>
                          <SelectItem value="30d">30 дней</SelectItem>
                          <SelectItem value="all">Всё время</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </MobileFilterSheet>

                {/* Clear all */}
                {filterChips.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-sm text-muted-foreground"
                    onClick={() => {
                      setCategory("all");
                      setPeriod("30d");
                    }}
                  >
                    {t("filters.clear_all")}
                  </Button>
                )}
              </div>

              {/* Active filter chips */}
              {filterChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filterChips.map((chip) => (
                    <FilterChip
                      key={chip.label}
                      label={chip.label}
                      value={chip.value}
                      onRemove={chip.onRemove}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Notification list */}
            <Card className="max-w-3xl overflow-hidden p-0">
              {renderList()}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
