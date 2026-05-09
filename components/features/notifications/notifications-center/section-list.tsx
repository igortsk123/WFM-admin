import { useTranslations } from "next-intl";
import {
  Archive,
  Bell,
  CheckCheck,
  RefreshCw,
  SearchX,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

import type { Notification, Locale } from "@/lib/types";

import { NotificationRow } from "./row-notification";
import { NotificationSkeleton } from "./skeleton";
import type { TabValue, PeriodOption } from "./_shared";

interface SectionListProps {
  notifications: Notification[];
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  activeTab: TabValue;
  search: string;
  category: string;
  period: PeriodOption;
  locale: Locale;
  onRetry: () => void;
  onLoadMore: () => void;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onNavigate: (link: string | undefined) => void;
  onResetFilters: () => void;
}

export function SectionList({
  notifications,
  loading,
  error,
  hasMore,
  activeTab,
  search,
  category,
  period,
  locale,
  onRetry,
  onLoadMore,
  onMarkRead,
  onArchive,
  onNavigate,
  onResetFilters,
}: SectionListProps) {
  const t = useTranslations("screen.notifications");

  return (
    <Card className="max-w-3xl overflow-hidden p-0">
      {renderBody()}
    </Card>
  );

  function renderBody() {
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
                onClick={onRetry}
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
              onClick: onResetFilters,
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
            onMarkRead={onMarkRead}
            onArchive={onArchive}
            onNavigate={onNavigate}
          />
        ))}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center p-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={onLoadMore}
            >
              {loading ? "Загрузка..." : "Загрузить ещё"}
            </Button>
          </div>
        )}
      </div>
    );
  }
}
