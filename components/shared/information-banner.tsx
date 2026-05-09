"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Variant tone — controls border / background / icon colour.
 * - `info`        — neutral informational (blue)
 * - `success`     — positive feedback (green)
 * - `warning`     — caution / attention required (yellow)
 * - `destructive` — error / negative (red)
 * - `muted`       — neutral period / scope strip (no accent colour)
 */
export type InformationBannerVariant =
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "muted";

/**
 * Visual layout.
 * - `card`     — rounded card with border + tinted background (default)
 * - `sticky`   — full-width sticky strip with bottom border (h-14, no rounded corners)
 * - `compact`  — single-line muted bar (no icon by default), used for period/scope banners
 */
export type InformationBannerLayout = "card" | "sticky" | "compact";

const VARIANT_STYLES: Record<
  InformationBannerVariant,
  { container: string; iconWrap: string; icon: string }
> = {
  info: {
    container: "border-info/30 bg-info/5",
    iconWrap: "bg-info/10",
    icon: "text-info",
  },
  success: {
    container: "border-success/30 bg-success/5",
    iconWrap: "bg-success/10",
    icon: "text-success",
  },
  warning: {
    container: "border-warning/30 bg-warning/10",
    iconWrap: "bg-warning/15",
    icon: "text-warning",
  },
  destructive: {
    container: "border-destructive/30 bg-destructive/5",
    iconWrap: "bg-destructive/10",
    icon: "text-destructive",
  },
  muted: {
    container: "border-border bg-muted/40",
    iconWrap: "bg-muted",
    icon: "text-muted-foreground",
  },
};

export interface InformationBannerProps {
  /** Tone of the banner (info | success | warning | destructive | muted). Defaults to `info`. */
  variant?: InformationBannerVariant;
  /** Visual layout (card | sticky | compact). Defaults to `card`. */
  layout?: InformationBannerLayout;
  /** Optional leading icon — typically a `lucide-react` icon. Rendered inside a tinted circle. */
  icon?: React.ReactNode;
  /** Title / primary text. */
  title?: React.ReactNode;
  /** Optional secondary text. */
  description?: React.ReactNode;
  /** Optional inline action area (button/link). Rendered to the right of text on `sm+`. */
  action?: React.ReactNode;
  /** When true, fires `onClose` from a built-in close button. */
  onClose?: () => void;
  /** ARIA label for the close button (consumer-supplied for i18n). */
  closeLabel?: string;
  /** ARIA role override (defaults to `region` for card/sticky, none for compact). */
  role?: string;
  /** Accessible label for the region. */
  ariaLabel?: string;
  /** Extra classes merged into the container. */
  className?: string;
  /** Optional id (for `aria-labelledby` / focus). */
  id?: string;
}

/**
 * Generic banner / alert component used for AI insights, period scopes, future-feature
 * notices, contextual chat banners, etc.
 *
 * Rules:
 * - All strings (title / description / closeLabel / ariaLabel) must come from the consumer
 *   via `next-intl` — InformationBanner does not own any i18n.
 * - Use semantic Tailwind tokens via `variant` — never hard-code `bg-blue-*` / `text-yellow-*`.
 */
export function InformationBanner({
  variant = "info",
  layout = "card",
  icon,
  title,
  description,
  action,
  onClose,
  closeLabel,
  role,
  ariaLabel,
  className,
  id,
}: InformationBannerProps) {
  const styles = VARIANT_STYLES[variant];
  const resolvedRole = role ?? (layout === "compact" ? undefined : "region");

  if (layout === "compact") {
    return (
      <div
        id={id}
        role={resolvedRole}
        aria-label={ariaLabel}
        className={cn(
          "rounded-lg border px-4 py-2.5 text-sm",
          styles.container,
          variant === "muted" ? "text-muted-foreground" : styles.icon,
          className,
        )}
      >
        <div className="flex items-center gap-2">
          {icon ? (
            <span
              className={cn(
                "inline-flex size-5 shrink-0 items-center justify-center",
                styles.icon,
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <div className="flex-1 min-w-0">
            {title}
            {description ? <span className="ml-1">{description}</span> : null}
          </div>
          {action}
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={onClose}
              aria-label={closeLabel}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (layout === "sticky") {
    return (
      <div
        id={id}
        role={resolvedRole}
        aria-label={ariaLabel}
        className={cn(
          "sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b px-4",
          styles.container,
          className,
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon ? (
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                styles.iconWrap,
                styles.icon,
              )}
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex items-center gap-2 overflow-hidden">
            {title ? (
              <span className="truncate text-sm font-medium text-foreground">
                {title}
              </span>
            ) : null}
            {description ? (
              <span className="truncate text-sm text-muted-foreground">
                {description}
              </span>
            ) : null}
            {action}
          </div>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  }

  // Default `card` layout.
  return (
    <div
      id={id}
      role={resolvedRole}
      aria-label={ariaLabel}
      className={cn(
        "rounded-lg border p-4 flex flex-col gap-3 sm:flex-row sm:items-start",
        styles.container,
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
            styles.iconWrap,
            styles.icon,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <div className="flex-1 min-w-0 space-y-0.5">
        {title ? (
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {title}
          </p>
        ) : null}
        {description ? (
          <p
            className={cn(
              "text-sm leading-relaxed",
              title ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {(action || onClose) && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {action}
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={onClose}
              aria-label={closeLabel}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
