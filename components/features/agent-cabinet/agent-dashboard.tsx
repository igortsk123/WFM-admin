"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarX2,
  CheckCircle2,
  Clock,
  CreditCard,
  Lock,
  MapPin,
  RefreshCw,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { getMyAgentDashboard, getMyTodayActivity } from "@/lib/api/agent-cabinet";
import { AGENT_ROUTES } from "@/lib/constants/routes";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils/format";
import type { Payout, FreelancerAssignment } from "@/lib/types";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface DashboardData {
  agentName: string;
  freelancers_count_active: number;
  earnings_30d: number;
  earnings_7d: number;
  recent_payouts: Payout[];
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CLIENT DIRECT GUARD
// ═══════════════════════════════════════════════════════════════════

function ClientDirectGuard() {
  const t = useTranslations("screen.agentDashboard");
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <span
          className="flex size-16 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <Lock className="size-8 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-foreground text-balance">
            {t("client_direct_title")}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed text-balance">
            {t("client_direct_description")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Назад
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RECENT PAYOUTS SECTION
// ═══════════════════════════════════════════════════════════════════

function PayoutStatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-success/10 text-success",
    FAILED: "bg-destructive/10 text-destructive",
    PENDING: "bg-warning/10 text-warning",
    PROCESSING: "bg-info/10 text-info",
  };
  const labels: Record<string, string> = {
    PAID: "Выплачено",
    FAILED: "Ошибка",
    PENDING: "Ожидает",
    PROCESSING: "В обработке",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        styles[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

function RecentPayoutsSection({
  payouts,
  locale,
}: {
  payouts: Payout[];
  locale: Locale;
}) {
  const t = useTranslations("screen.agentDashboard");

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">
          {t("sections.recent_payouts")}
        </CardTitle>
        {payouts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href={AGENT_ROUTES.earnings}>
              {t("payouts.view_all")}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className={payouts.length === 0 ? undefined : "p-0"}>
        {payouts.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t("payouts.empty_title")}
            description={t("payouts.empty_description")}
            className="py-10"
          />
        ) : (
          <ul role="list">
            {payouts.map((payout, index) => (
              <li
                key={payout.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-6 py-3",
                  index < payouts.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {payout.freelancer_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(new Date(payout.payout_date), locale)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(payout.net_amount, locale)}
                  </span>
                  <PayoutStatusChip status={payout.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TODAY'S ACTIVITY SECTION
// ═══════════════════════════════════════════════════════════════════

function AssignmentStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "DONE":
      return <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden="true" />;
    case "CHECKED_IN":
    case "WORKING":
      return <Clock className="size-4 text-info shrink-0" aria-hidden="true" />;
    case "NO_SHOW":
      return <XCircle className="size-4 text-destructive shrink-0" aria-hidden="true" />;
    default:
      return <Clock className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />;
  }
}

function AssignmentStatusChip({
  status,
  t,
}: {
  status: string;
  t: ReturnType<typeof useTranslations<"screen.agentDashboard">>;
}) {
  const map: Record<string, { label: string; cls: string }> = {
    SCHEDULED: { label: t("today.status_scheduled"), cls: "bg-muted text-muted-foreground" },
    CHECKED_IN: { label: t("today.status_checked_in"), cls: "bg-info/10 text-info" },
    WORKING: { label: t("today.status_working"), cls: "bg-info/10 text-info" },
    DONE: { label: t("today.status_done"), cls: "bg-success/10 text-success" },
    NO_SHOW: { label: t("today.status_no_show"), cls: "bg-destructive/10 text-destructive" },
  };
  const config = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium shrink-0",
        config.cls
      )}
    >
      {config.label}
    </span>
  );
}

function TodayActivitySection({
  assignments,
  locale,
}: {
  assignments: FreelancerAssignment[];
  locale: Locale;
}) {
  const t = useTranslations("screen.agentDashboard");

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {t("sections.today_activity")}
        </CardTitle>
      </CardHeader>
      <CardContent className={assignments.length === 0 ? undefined : "p-0"}>
        {assignments.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title={t("today.empty_title")}
            description={t("today.empty_description")}
            className="py-10"
          />
        ) : (
          <ul role="list">
            {assignments.map((asgn, index) => (
              <li
                key={asgn.id}
                className={cn(
                  "flex items-start gap-3 px-6 py-3",
                  index < assignments.length - 1 && "border-b border-border"
                )}
              >
                <div className="mt-0.5">
                  <AssignmentStatusIcon status={asgn.status} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {asgn.freelancer_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(new Date(asgn.scheduled_start), locale)}
                    {" — "}
                    {formatTime(new Date(asgn.scheduled_end), locale)}
                  </span>
                  {asgn.geo_check_in_match === false && (
                    <span className="flex items-center gap-1 text-xs text-warning">
                      <MapPin className="size-3 shrink-0" aria-hidden="true" />
                      {t("today.geo_mismatch")}
                    </span>
                  )}
                </div>
                <AssignmentStatusChip status={asgn.status} t={t} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AgentDashboard() {
  const t = useTranslations("screen.agentDashboard");
  const locale = useLocale() as Locale;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isClientDirect, setIsClientDirect] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [todayAssignments, setTodayAssignments] = useState<FreelancerAssignment[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [dashRes, activityRes] = await Promise.all([
        getMyAgentDashboard(),
        getMyTodayActivity(),
      ]);
      const {
        agent,
        freelancers_count_active,
        earnings_30d,
        earnings_7d,
        recent_payouts,
      } = dashRes.data;

      // Use contact_person_name if available, fall back to agent.name (legal entity)
      const agentName = agent.contact_person_name ?? agent.name;

      setData({
        agentName,
        freelancers_count_active,
        earnings_30d,
        earnings_7d,
        recent_payouts,
      });
      setTodayAssignments(activityRes.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("CLIENT_DIRECT")) {
        setIsClientDirect(true);
      } else {
        setFetchError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── LOADING ──────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;

  // ── CLIENT DIRECT ────────────────────────────────────────────────
  if (isClientDirect) return <ClientDirectGuard />;

  // ── ERROR ────────────────────────────────────────────────────────
  if (fetchError || !data) {
    return (
      <div className="flex flex-col gap-4 max-w-md">
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>{t("error_title")}</AlertTitle>
          <AlertDescription>{t("error_description")}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={load} className="w-fit gap-2">
          <RefreshCw className="size-4" aria-hidden="true" />
          {t("retry")}
        </Button>
      </div>
    );
  }

  // ── SUCCESS ──────────────────────────────────────────────────────
  const displayName =
    data.agentName ||
    `${user.last_name} ${user.first_name[0]}.${
      user.middle_name ? ` ${user.middle_name[0]}.` : ""
    }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting header */}
      <PageHeader
        title={t("greeting", { name: displayName })}
        subtitle={t("page_subtitle")}
      />

      {/* KPI grid: 2×2 on mobile, 4×1 on lg */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label={t("kpi.active_performers")}
            value={data.freelancers_count_active}
            icon={Users}
          />
          <KpiCard
            label={t("kpi.earnings_30d")}
            value={formatCurrency(data.earnings_30d, locale)}
            icon={Wallet}
          />
          <KpiCard
            label={t("kpi.earnings_7d")}
            value={formatCurrency(data.earnings_7d, locale)}
            icon={CreditCard}
          />
          <KpiCard
            label={t("kpi.recent_payouts_count")}
            value={data.recent_payouts.length}
            icon={CreditCard}
          />
        </div>
      </section>

      {/* Content: stacked on mobile, side-by-side on lg */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentPayoutsSection payouts={data.recent_payouts} locale={locale} />
        <TodayActivitySection assignments={todayAssignments} locale={locale} />
      </div>
    </div>
  );
}
