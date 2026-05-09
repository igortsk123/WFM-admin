"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import {
  getNotifications,
  markRead,
  markAllRead,
  archiveNotification,
} from "@/lib/api/notifications";
import type { Notification, NotificationCategory } from "@/lib/types";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import {
  PAGE_SIZE,
  getPeriodDates,
  type PeriodOption,
  type TabValue,
} from "./_shared";

interface UseNotificationsDataParams {
  activeTab: TabValue;
  search: string;
  category: string;
  period: PeriodOption;
}

export interface NotificationsDataApi {
  notifications: Notification[];
  unreadCount: number;
  archivedCount: number;
  aiUnreadCount: number;
  total: number;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  fetchNotifications: (resetPage?: boolean) => Promise<void>;
  loadMore: () => void;
  handleMarkRead: (id: string) => void;
  handleArchive: (id: string) => void;
  handleMarkAllRead: () => Promise<void>;
  handleNavigate: (link: string | undefined) => void;
}

export function useNotificationsData({
  activeTab,
  search,
  category,
  period,
}: UseNotificationsDataParams): NotificationsDataApi {
  const t = useTranslations("screen.notifications");
  const router = useRouter();

  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [archivedCount, setArchivedCount] = React.useState(0);
  const [aiUnreadCount, setAiUnreadCount] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);

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
            (n.category === "AI_SUGGESTION_NEW" || n.category === "AI_ANOMALY"),
        ).length;
        setAiUnreadCount(aiUnread);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, search, category, period, page],
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
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
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

  function loadMore() {
    setPage((p) => p + 1);
    fetchNotifications(false);
  }

  return {
    notifications,
    unreadCount,
    archivedCount,
    aiUnreadCount,
    total,
    loading,
    error,
    hasMore,
    fetchNotifications,
    loadMore,
    handleMarkRead,
    handleArchive,
    handleMarkAllRead,
    handleNavigate,
  };
}
