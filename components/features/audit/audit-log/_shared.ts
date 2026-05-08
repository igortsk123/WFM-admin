import {
  Banknote,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Link2,
  Monitor,
  RefreshCcw,
  Settings2,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import type * as React from "react";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export function formatDateFull(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function formatDayLabel(
  iso: string,
  locale: string,
  t: (k: string) => string
): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const dayStr = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  }).format(d);

  if (sameDay(d, today)) return `${t("today")}, ${dayStr}`;
  if (sameDay(d, yesterday)) return `${t("yesterday")}, ${dayStr}`;
  return dayStr;
}

export function getDayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

export function detectDeviceType(ua?: string): "desktop" | "mobile" | "tablet" {
  if (!ua) return "desktop";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const ENTITY_TYPE_OPTIONS = [
  "task",
  "user",
  "store",
  "shift",
  "organization",
  "api_key",
  "permission",
  "session",
  "work_type",
  "freelance_application",
  "freelance_assignment",
  "freelance_service",
  "freelance_payout",
  "freelance_oferta",
  "freelancer",
  "budget_limit",
  "service_norm",
  "agent",
  "payment_mode",
  "external_hr",
];

export const ACTION_OPTIONS = [
  "task.create",
  "task.update",
  "task.start",
  "task.pause",
  "task.complete",
  "task.approve",
  "task.reject",
  "user.update",
  "user.activate",
  "user.deactivate",
  "permission.grant",
  "permission.revoke",
  "shift.open",
  "shift.close",
  "shift.force_close",
  "settings.update",
  "api_key.create",
  "login",
  "logout",
  "application.create",
  "application.cancel",
  "application.approve_full",
  "application.approve_partial",
  "application.reject",
  "application.replace_with_bonus",
  "application.approve_mixed",
  "assignment.create",
  "assignment.remove",
  "service.confirm",
  "service.dispute",
  "service.no_show",
  "service.amount_adjust",
  "payout.batch_created",
  "payout.sent_to_nominal",
  "payout.status_received",
  "payout.retry",
  "payout.failed",
  "oferta.sent",
  "oferta.accepted",
  "freelancer.activate",
  "freelancer.block",
  "freelancer.archive",
  "budget_limit.create",
  "budget_limit.update",
  "budget_limit.archive",
  "service_norm.create",
  "service_norm.update",
  "service_norm.archive",
  "agent.create",
  "agent.update",
  "agent.block",
  "agent.archive",
  "external_hr.config_update",
  "external_hr.sync_manual",
  "external_hr.sync_auto",
  "payment_mode.update",
];

export const ENTITY_TYPE_STYLES: Record<string, string> = {
  task: "bg-info/10 text-info border-info/20",
  user: "bg-primary/10 text-primary border-primary/20",
  shift: "bg-warning/10 text-warning border-warning/20",
  store: "bg-success/10 text-success border-success/20",
  organization: "bg-accent text-accent-foreground border-border",
  api_key: "bg-destructive/10 text-destructive border-destructive/20",
  permission: "bg-primary/10 text-primary border-primary/20",
  session: "bg-muted text-muted-foreground border-border",
  work_type: "bg-accent text-accent-foreground border-border",
  freelance_application: "bg-info/10 text-info border-info/20",
  freelance_assignment: "bg-info/10 text-info border-info/20",
  freelance_service: "bg-success/10 text-success border-success/20",
  freelance_payout: "bg-warning/10 text-warning border-warning/20",
  freelance_oferta: "bg-primary/10 text-primary border-primary/20",
  freelancer: "bg-primary/10 text-primary border-primary/20",
  budget_limit: "bg-warning/10 text-warning border-warning/20",
  service_norm: "bg-accent text-accent-foreground border-border",
  agent: "bg-primary/10 text-primary border-primary/20",
  payment_mode: "bg-destructive/10 text-destructive border-destructive/20",
  external_hr: "bg-muted text-muted-foreground border-border",
};

/** Maps entity_type → Lucide icon component for event rows. */
export const ENTITY_TYPE_ICONS: Record<string, React.ElementType> = {
  task: ClipboardList,
  user: Users,
  shift: Monitor,
  store: Building2,
  organization: Building2,
  api_key: Shield,
  permission: Shield,
  session: Monitor,
  work_type: Settings2,
  freelance_application: FileText,
  freelance_assignment: UserCheck,
  freelance_service: ClipboardList,
  freelance_payout: Banknote,
  freelance_oferta: Link2,
  freelancer: UserCheck,
  budget_limit: Banknote,
  service_norm: Settings2,
  agent: Users,
  payment_mode: CreditCard,
  external_hr: RefreshCcw,
};

// ═══════════════════════════════════════════════════════════════════
// FILTER STATE
// ═══════════════════════════════════════════════════════════════════

export interface FilterState {
  search: string;
  actorId: number | undefined;
  entityTypes: string[];
  actions: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  platformActionOnly: boolean;
}

export const DEFAULT_DATE_FROM = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
})();

export const initialFilters: FilterState = {
  search: "",
  actorId: undefined,
  entityTypes: [],
  actions: [],
  dateFrom: DEFAULT_DATE_FROM,
  dateTo: new Date(),
  platformActionOnly: false,
};

export const PAGE_SIZE = 20;
