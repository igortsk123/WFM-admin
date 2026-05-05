"use client";

import {
  AlertTriangle,
  Bell,
  CalendarX,
  ClipboardList,
  Clock,
  RefreshCw,
  UserX,
  Wallet,
  CheckSquare,
  XCircle,
  ArrowRightLeft,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationCategory } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// CATEGORY CONFIG
// ═══════════════════════════════════════════════════════════════════

export interface CategoryConfig {
  icon: LucideIcon;
  /** Tailwind classes for the badge container (bg + text). */
  badgeClass: string;
  /** Which group this category belongs to for the filter dropdown. */
  group: "tasks" | "freelance" | "ai" | "other";
}

export const CATEGORY_CONFIG: Record<NotificationCategory, CategoryConfig> = {
  // ── Tasks ────────────────────────────────────────────────────────
  TASK_REVIEW: {
    icon: CheckSquare,
    badgeClass: "bg-primary/10 text-primary",
    group: "tasks",
  },
  TASK_REJECTED: {
    icon: XCircle,
    badgeClass: "bg-destructive/10 text-destructive",
    group: "tasks",
  },
  TASK_STATE_CHANGED: {
    icon: ArrowRightLeft,
    badgeClass: "bg-muted text-muted-foreground",
    group: "tasks",
  },
  BONUS_AVAILABLE: {
    icon: TrendingUp,
    badgeClass: "bg-success/10 text-success",
    group: "tasks",
  },
  GOAL_UPDATE: {
    icon: TrendingUp,
    badgeClass: "bg-info/10 text-info",
    group: "tasks",
  },

  // ── AI ───────────────────────────────────────────────────────────
  AI_SUGGESTION_NEW: {
    icon: Sparkles,
    badgeClass: "bg-info/10 text-info",
    group: "ai",
  },
  AI_ANOMALY: {
    icon: AlertTriangle,
    badgeClass: "bg-warning/10 text-warning",
    group: "ai",
  },

  // ── Freelance ────────────────────────────────────────────────────
  FREELANCE_APPLICATION_PENDING: {
    icon: ClipboardList,
    badgeClass: "bg-warning/10 text-warning",
    group: "freelance",
  },
  FREELANCE_BUDGET_OVERLIMIT: {
    icon: AlertTriangle,
    badgeClass: "bg-destructive/10 text-destructive",
    group: "freelance",
  },
  FREELANCE_NO_TASKS: {
    icon: CalendarX,
    badgeClass: "bg-warning/10 text-warning",
    group: "freelance",
  },
  FREELANCE_SERVICE_NOT_CONFIRMED: {
    icon: Clock,
    badgeClass: "bg-info/10 text-info",
    group: "freelance",
  },
  FREELANCE_NO_SHOW: {
    icon: UserX,
    badgeClass: "bg-destructive/10 text-destructive",
    group: "freelance",
  },
  FREELANCE_EXTERNAL_SYNC: {
    icon: RefreshCw,
    badgeClass: "bg-info/10 text-info",
    group: "freelance",
  },
  FREELANCE_PAYOUT_DONE: {
    icon: Wallet,
    badgeClass: "bg-success/10 text-success",
    group: "freelance",
  },

  // ── Other ────────────────────────────────────────────────────────
  GENERIC: {
    icon: Bell,
    badgeClass: "bg-muted text-muted-foreground",
    group: "other",
  },
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface NotificationCategoryBadgeProps {
  category: NotificationCategory;
  label: string;
  size?: "sm" | "md";
  className?: string;
}

export function NotificationCategoryBadge({
  category,
  label,
  size = "sm",
  className,
}: NotificationCategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.GENERIC;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        config.badgeClass,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        className
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "size-3" : "size-3.5")} />
      {label}
    </span>
  );
}
