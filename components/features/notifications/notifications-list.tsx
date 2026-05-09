"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Settings2, CheckCheck, LayoutList, Layers } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import type { Notification, NotificationCategory } from "@/lib/types";
import {
  getNotifications,
  markRead,
  markAllRead,
  archiveNotification,
} from "@/lib/api/notifications";
import { CATEGORY_CONFIG } from "./notification-category-badge";
import { NotificationRow, NotificationsEmpty } from "./notification-row";
import { NotificationFilters, type NotificationFiltersState } from "./notification-filters";
import { NotificationPreferencesSheet } from "./notification-preferences-sheet";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type TabValue = "all" | "unread" | "archived";
type ViewMode = "list" | "grouped";

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function NotificationsLoadingSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-start gap-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GROUPED VIEW
// ═══════════════════════════════════════════════════════════════════

type CategoryGroup = "tasks" | "freelance" | "ai" | "other";

const GROUP_ORDER: CategoryGroup[] = ["tasks", "freelance", "ai", "other"];

interface GroupedNotificationsProps {
  notifications: Notification[];
  categoryLabel: (cat: NotificationCategory) => string;
  groupLabel: (group: CategoryGroup) => string;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
}

function GroupedNotifications({
  notifications,
  categoryLabel,
  groupLabel,
  onMarkRead,
  onArchive,
}: GroupedNotificationsProps) {
  const grouped = useMemo(() => {
    const map = new Map<CategoryGroup, Notification[]>();
    for (const cat of GROUP_ORDER) {
      map.set(cat, []);
    }
    for (const n of notifications) {
      const group = CATEGORY_CONFIG[n.category]?.group ?? "other";
      map.get(group as CategoryGroup)!.push(n);
    }
    return map;
  }, [notifications]);

  return (
    <div className="space-y-4">
      {GROUP_ORDER.map((group) => {
        const items = grouped.get(group)!;
        if (items.length === 0) return null;
        return (
          <section key={group} aria-labelledby={`group-${group}`}>
            <div className="px-4 py-2 flex items-center gap-2">
              <h2
                id={`group-${group}`}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {groupLabel(group)}
              </h2>
              <Badge variant="secondary" className="text-xs h-5">
                {items.length}
              </Badge>
            </div>
            <div>
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  categoryLabel={categoryLabel(n.category)}
                  onMarkRead={onMarkRead}
                  onArchive={onArchive}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function NotificationsList() {
  const t = useTranslations("screen.notifications");
  const tCat = useTranslations("screen.notifications.category");
  const tFilters = useTranslations("screen.notifications.filters");

  // useTransition — таб/фильтры/view-mode как non-urgent.
  const [, startTransition] = useTransition();

  const [tab, setTab] = useState<TabValue>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [prefOpen, setPrefOpen] = useState(false);
  const [filters, setFilters] = useState<NotificationFiltersState>({
    search: "",
    categories: [],
  });

  // Local optimistic state for read/archive mutations
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());
  const [localArchived, setLocalArchived] = useState<Set<string>>(new Set());
  const [allMarkedRead, setAllMarkedRead] = useState(false);

  const swrKey = ["notifications", tab, filters] as const;

  const { data, isLoading, mutate } = useSWR(swrKey, () =>
    getNotifications({
      is_read: tab === "unread" ? false : undefined,
      include_archived: tab === "archived",
      categories: filters.categories.length > 0 ? filters.categories : undefined,
      search: filters.search || undefined,
    })
  );

  // Merge API data with optimistic local mutations
  const notifications = useMemo<Notification[]>(() => {
    if (!data?.data) return [];
    return data.data
      .map((n) => ({
        ...n,
        is_read: allMarkedRead ? true : localRead.has(n.id) ? true : n.is_read,
        is_archived: localArchived.has(n.id) ? true : n.is_archived,
      }))
      .filter((n) => {
        if (tab === "unread") return !n.is_read && !n.is_archived;
        if (tab === "archived") return n.is_archived;
        return !n.is_archived;
      });
  }, [data, localRead, localArchived, allMarkedRead, tab]);

  const unreadCount = useMemo(() => {
    if (allMarkedRead) return 0;
    return (data?.unread_count ?? 0) - localRead.size;
  }, [data, localRead, allMarkedRead]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      setLocalRead((prev) => new Set([...prev, id]));
      try {
        await markRead(id);
        void mutate();
      } catch {
        toast.error(t("toasts.error"));
        setLocalRead((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [mutate, t]
  );

  const handleArchive = useCallback(
    async (id: string) => {
      setLocalArchived((prev) => new Set([...prev, id]));
      toast.success(t("toasts.archived"));
      try {
        await archiveNotification(id);
        void mutate();
      } catch {
        toast.error(t("toasts.error"));
        setLocalArchived((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [mutate, t]
  );

  const handleMarkAllRead = useCallback(async () => {
    setAllMarkedRead(true);
    toast.success(t("toasts.all_marked_read"));
    try {
      await markAllRead();
      void mutate();
    } catch {
      toast.error(t("toasts.error"));
      setAllMarkedRead(false);
    }
  }, [mutate, t]);

  const hasFilters = filters.search.length > 0 || filters.categories.length > 0;

  const getEmptyVariant = () => {
    if (hasFilters) return "filtered";
    if (tab === "unread") return "no_unread";
    if (tab === "archived") return "no_archived";
    return "no_notifications";
  };

  const categoryLabel = (cat: NotificationCategory) => tCat(cat);
  const GROUP_LABELS: Record<string, string> = {
    tasks: tFilters("category_group_tasks"),
    freelance: tFilters("category_group_freelance"),
    ai: tFilters("category_group_ai"),
    other: tFilters("category_group_other"),
  };
  const groupLabel = (group: string) => GROUP_LABELS[group] ?? group;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: "/" },
          { label: t("breadcrumbs.notifications") },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrefOpen(true)}
            className="gap-2"
          >
            <Settings2 className="size-4" />
            <span className="hidden sm:inline">{t("actions.preferences")}</span>
          </Button>
        }
      />

      {/* Tabs + Mark-all-read */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={(v) =>
            startTransition(() => setTab(v as TabValue))
          }
        >
          <TabsList>
            <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
            <TabsTrigger value="unread" className="gap-2">
              {t("tabs.unread")}
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1 text-xs"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived">{t("tabs.archived")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {/* Group/list toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="h-9"
          >
            <ToggleGroupItem value="list" className="size-9" aria-label="List view">
              <LayoutList className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grouped" className="size-9" aria-label="Grouped view">
              <Layers className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Mark all as read — only in all/unread tabs */}
          {tab !== "archived" && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground h-9"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="size-4" />
              <span className="hidden sm:inline">{t("actions.mark_all_read")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <NotificationFilters
        value={filters}
        onChange={(next) => startTransition(() => setFilters(next))}
      />

      <Separator />

      {/* Content */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <NotificationsLoadingSkeleton />
        ) : notifications.length === 0 ? (
          <NotificationsEmpty
            variant={getEmptyVariant()}
            onReset={hasFilters ? () => setFilters({ search: "", categories: [] }) : undefined}
          />
        ) : viewMode === "grouped" ? (
          <div className="animate-in fade-in">
            <GroupedNotifications
              notifications={notifications}
              categoryLabel={categoryLabel}
              groupLabel={(g) => groupLabel(g)}
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
            />
          </div>
        ) : (
          <div className="animate-in fade-in">
            {notifications.map((n, idx) => (
              <div key={n.id}>
                {idx > 0 && <Separator className="mx-4" />}
                <NotificationRow
                  notification={n}
                  categoryLabel={categoryLabel(n.category)}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preferences sheet */}
      <NotificationPreferencesSheet
        open={prefOpen}
        onOpenChange={setPrefOpen}
      />
    </div>
  );
}
