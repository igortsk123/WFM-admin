"use client";

import * as React from "react";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Archive, CheckCheck, ExternalLink, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

function relativeTime(dateStr: string, locale: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return rtf.format(-diffDay, "day");
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return rtf.format(-diffMonth, "month");
  return rtf.format(-Math.floor(diffMonth / 12), "year");
}
import type { Notification, Locale } from "@/lib/types";
import { pickLocalized } from "@/lib/utils/locale-pick";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationCategoryBadge } from "./notification-category-badge";

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION ROW
// ═══════════════════════════════════════════════════════════════════

interface NotificationRowProps {
  notification: Notification;
  categoryLabel: string;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
}

export const NotificationRow = React.memo(function NotificationRow({
  notification,
  categoryLabel,
  onMarkRead,
  onArchive,
}: NotificationRowProps) {
  const t = useTranslations("screen.notifications");
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  const timeAgo = relativeTime(notification.created_at, locale);
  const titleText = pickLocalized(notification.title, notification.title_en, locale as Locale);
  const bodyText = pickLocalized(notification.body, notification.body_en, locale as Locale);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/40",
        !notification.is_read && "bg-primary/[0.03]"
      )}
    >
      {/* Unread dot */}
      {!notification.is_read && (
        <span
          aria-label="Unread"
          className="absolute left-1.5 top-4 size-1.5 rounded-full bg-primary shrink-0"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 pl-1">
        {/* Top row: badge + time */}
        <div className="flex items-center gap-2 mb-1">
          <NotificationCategoryBadge
            category={notification.category}
            label={categoryLabel}
            size="sm"
          />
          <span className="ml-auto text-xs text-muted-foreground shrink-0">
            {timeAgo}
          </span>
        </div>

        {/* Title */}
        <p
          className={cn(
            "text-sm leading-snug",
            notification.is_read
              ? "text-foreground/80 font-normal"
              : "text-foreground font-medium"
          )}
        >
          {notification.link ? (
            <Link
              href={notification.link as Parameters<typeof Link>[0]["href"]}
              className="hover:underline focus-visible:underline outline-none"
            >
              {titleText}
            </Link>
          ) : (
            titleText
          )}
        </p>

        {/* Body */}
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {bodyText}
        </p>
      </div>

      {/* Actions (visible on hover / when menu is open) */}
      <div
        className={cn(
          "flex items-center gap-1 shrink-0 transition-opacity",
          menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
        )}
      >
        {notification.link && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-7"
            title={t("row.open_link")}
          >
            <Link href={notification.link as Parameters<typeof Link>[0]["href"]}>
              <ExternalLink className="size-3.5" />
              <span className="sr-only">{t("row.open_link")}</span>
            </Link>
          </Button>
        )}

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-3.5" />
              <span className="sr-only">{t("actions.more")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {!notification.is_read && (
              <DropdownMenuItem onSelect={() => onMarkRead(notification.id)}>
                <CheckCheck className="mr-2 size-4" />
                {t("row.mark_read")}
              </DropdownMenuItem>
            )}
            {!notification.is_archived && (
              <DropdownMenuItem
                onSelect={() => onArchive(notification.id)}
                className="text-muted-foreground"
              >
                <Archive className="mr-2 size-4" />
                {t("row.archive")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════

type EmptyVariant = "no_notifications" | "no_unread" | "no_archived" | "filtered";

interface NotificationsEmptyProps {
  variant: EmptyVariant;
  onReset?: () => void;
}

export function NotificationsEmpty({ variant, onReset }: NotificationsEmptyProps) {
  const t = useTranslations("screen.notifications.empty");

  const config: Record<EmptyVariant, { title: string; subtitle?: string }> = {
    no_notifications: {
      title: t("no_notifications_title"),
      subtitle: t("no_notifications_subtitle"),
    },
    no_unread: {
      title: t("no_unread_title"),
      subtitle: t("no_unread_subtitle"),
    },
    no_archived: {
      title: t("no_archived_title"),
    },
    filtered: {
      title: t("filtered_title"),
    },
  };

  const { title, subtitle } = config[variant];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
      {variant === "filtered" && onReset && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onReset}
        >
          {t("filtered_reset")}
        </Button>
      )}
    </div>
  );
}
