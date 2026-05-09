import * as React from "react";
import { useTranslations } from "next-intl";
import { Eye, Check, Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { Notification, Locale } from "@/lib/types";
import { formatRelative, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

import { CategoryIcon } from "./category-icon";

interface NotificationRowProps {
  notification: Notification;
  locale: Locale;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onNavigate: (link: string | undefined) => void;
}

export function NotificationRow({
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
    locale,
  );
  const absoluteTime = formatDateTime(
    new Date(notification.created_at),
    locale,
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
        isUnread && "border-l-4 border-l-primary bg-primary/5",
      )}
    >
      {/* Category icon */}
      <div className="shrink-0 mt-0.5">
        <CategoryIcon category={notification.category} />
      </div>

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
        {Boolean(notification.data?.store_id || notification.data?.task_id) && (
          <p className="mt-1 text-xs text-muted-foreground/70">
            {notification.data?.task_id
              ? `Задача: ${String(notification.data.task_id)}`
              : ""}
            {notification.data?.store_id && notification.data?.task_id ? " · " : ""}
            {notification.data?.store_id
              ? `Магазин ID: ${String(notification.data.store_id)}`
              : ""}
          </p>
        )}
      </div>

      {/* Action buttons — always visible on mobile, visible on hover on desktop */}
      <div
        className={cn(
          "flex flex-col gap-1 shrink-0",
          "opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity",
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
