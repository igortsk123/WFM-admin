"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CreditCard,
  Package,
  Phone,
  RefreshCw,
} from "lucide-react";
import { getMyFreelancerDetailById } from "@/lib/api/agent-cabinet";
import { AGENT_ROUTES } from "@/lib/constants/routes";
import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils/format";
import type { AgentEarning, Locale, Service, User } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface DetailData {
  freelancer: Omit<User, "rating">;
  services_count_30d: number;
  earned_30d: number;
  active_shifts_today: number;
  services: Service[];
  earnings: AgentEarning[];
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HERO CARD
// ═══════════════════════════════════════════════════════════════════

function HeroCard({
  freelancer,
  locale,
}: {
  freelancer: Omit<User, "rating">;
  locale: Locale;
}) {
  const t = useTranslations("screen.agentFreelancers.detail");
  const initials = `${freelancer.first_name[0]}${freelancer.last_name[0]}`;
  const fullName = `${freelancer.last_name} ${freelancer.first_name}${
    freelancer.middle_name ? ` ${freelancer.middle_name}` : ""
  }`;

  return (
    <Card className="rounded-xl">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-5">
        <Avatar className="size-16 shrink-0">
          {freelancer.avatar_url && (
            <AvatarImage src={freelancer.avatar_url} alt="" />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground leading-tight">
              {fullName}
            </h2>
            <FreelancerStatusBadge
              status={freelancer.freelancer_status ?? "NEW"}
              size="md"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
            <a
              href={`tel:${freelancer.phone}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit min-h-[44px] sm:min-h-0"
            >
              <Phone className="size-3.5 shrink-0" aria-hidden="true" />
              {formatPhone(freelancer.phone, locale)}
            </a>
            {freelancer.hired_at && (
              <span className="text-sm text-muted-foreground">
                {t("hero.added")}:{" "}
                {formatDate(new Date(freelancer.hired_at), locale)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SERVICE STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

const SERVICE_STATUS_STYLES: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-info/10 text-info",
  COMPLETED: "bg-info/10 text-info",
  CONFIRMED: "bg-success/10 text-success",
  READY_TO_PAY: "bg-warning/10 text-warning",
  PAID: "bg-success/10 text-success",
  NO_SHOW: "bg-destructive/10 text-destructive",
  DISPUTED: "bg-destructive/10 text-destructive",
};

function ServiceStatusBadge({ status }: { status: string }) {
  const t = useTranslations("freelance.service.status");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        SERVICE_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {t(status as Parameters<typeof t>[0])}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EARNING STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

function EarningStatusBadge({ status }: { status: "CALCULATED" | "PAID" }) {
  const styles =
    status === "PAID"
      ? "bg-success/10 text-success"
      : "bg-warning/10 text-warning";
  const labels = { CALCULATED: "Начислено", PAID: "Выплачено" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        styles
      )}
    >
      {labels[status]}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SERVICES TAB
// ═══════════════════════════════════════════════════════════════════

function ServicesTab({
  services,
  locale,
}: {
  services: Service[];
  locale: Locale;
}) {
  const t = useTranslations("screen.agentFreelancers.detail.services");

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t("empty_title")}
        description={t("empty_description")}
        className="py-12"
      />
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <ul className="flex flex-col gap-2 md:hidden" role="list">
        {services.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-2 px-4 py-3 rounded-lg border border-border bg-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {s.store_name}
              </span>
              <ServiceStatusBadge status={s.status} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{formatDate(new Date(s.service_date), locale)}</span>
              <span>{s.work_type_name}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {s.payable_hours}h · {s.normative_volume} {s.normative_unit}
              </span>
              {s.total_amount != null && (
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCurrency(s.total_amount * 0.1, locale)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm" aria-label="Services">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                {t("col_date")}
              </th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                {t("col_store")}
              </th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                {t("col_work_type")}
              </th>
              <th className="text-right font-medium text-muted-foreground px-4 py-3">
                {t("col_hours")}
              </th>
              <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                {t("col_volume")}
              </th>
              <th className="text-right font-medium text-muted-foreground px-4 py-3">
                {t("col_commission")}
              </th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                {t("col_status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, index) => (
              <tr
                key={s.id}
                className={cn(
                  index < services.length - 1 && "border-b border-border"
                )}
              >
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(new Date(s.service_date), locale)}
                </td>
                <td className="px-4 py-3 text-foreground max-w-[200px] truncate">
                  {s.store_name}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {s.work_type_name}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">
                  {s.payable_hours}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                  {s.normative_volume} {s.normative_unit}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                  {s.total_amount != null
                    ? formatCurrency(s.total_amount * 0.1, locale)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <ServiceStatusBadge status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EARNINGS TAB
// ═══════════════════════════════════════════════════════════════════

function EarningsTab({
  earnings,
  locale,
}: {
  earnings: AgentEarning[];
  locale: Locale;
}) {
  const t = useTranslations("screen.agentFreelancers.detail.earnings");

  if (earnings.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title={t("empty_title")}
        description={t("empty_description")}
        className="py-12"
      />
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      <ul className="flex flex-col gap-2 md:hidden" role="list">
        {earnings.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border bg-card"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {e.freelancer_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(new Date(e.period_date), locale)}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatCurrency(e.commission_amount, locale)}
              </span>
              <EarningStatusBadge status={e.status} />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm" aria-label="Earnings">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                {t("col_date")}
              </th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                {t("col_freelancer")}
              </th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                {t("col_service")}
              </th>
              <th className="text-right font-medium text-muted-foreground px-4 py-3">
                {t("col_commission")}
              </th>
              <th className="text-left font-medium text-muted-foreground px-4 py-3">
                {t("col_status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((e, index) => (
              <tr
                key={e.id}
                className={cn(
                  index < earnings.length - 1 && "border-b border-border"
                )}
              >
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(new Date(e.period_date), locale)}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {e.freelancer_name}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell font-mono text-xs">
                  {e.service_id}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                  {formatCurrency(e.commission_amount, locale)}
                </td>
                <td className="px-4 py-3">
                  <EarningStatusBadge status={e.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

interface AgentFreelancerDetailProps {
  freelancerId: number;
}

export function AgentFreelancerDetail({
  freelancerId,
}: AgentFreelancerDetailProps) {
  const t = useTranslations("screen.agentFreelancers.detail");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<DetailData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setNotFound(false);
    try {
      const res = await getMyFreelancerDetailById(freelancerId);
      setData(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("not found")) {
        setNotFound(true);
      } else {
        setFetchError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [freelancerId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── LOADING ──────────────────────────────────────────────────────
  if (loading) return <DetailSkeleton />;

  // ── NOT FOUND ────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5 -ml-1 text-muted-foreground hover:text-foreground"
          onClick={() => router.push(AGENT_ROUTES.freelancers)}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("back")}
        </Button>
        <EmptyState
          icon={Package}
          title={t("not_found")}
          description=""
        />
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────
  if (fetchError || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5 -ml-1 text-muted-foreground hover:text-foreground"
          onClick={() => router.push(AGENT_ROUTES.freelancers)}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("back")}
        </Button>
        <div className="flex flex-col gap-4 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>{t("error_title")}</AlertTitle>
            <AlertDescription>{t("error_description")}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="w-fit gap-2"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  const { freelancer, services_count_30d, earned_30d, active_shifts_today, services, earnings } =
    data;

  const fullName = `${freelancer.last_name} ${freelancer.first_name}${
    freelancer.middle_name ? ` ${freelancer.middle_name[0]}.` : ""
  }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href={AGENT_ROUTES.freelancers}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit min-h-[44px] -ml-1"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
        {t("back")}
      </Link>

      {/* Page header */}
      <PageHeader title={fullName} />

      {/* Hero card */}
      <HeroCard freelancer={freelancer} locale={locale} />

      {/* KPI grid — 1 column on mobile, 3 columns on sm+ */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label={t("kpi.services_30d")}
            value={services_count_30d}
            icon={Package}
          />
          <KpiCard
            label={t("kpi.earned_30d")}
            value={formatCurrency(earned_30d, locale)}
            icon={CreditCard}
          />
          <KpiCard
            label={t("kpi.active_shifts_today")}
            value={active_shifts_today}
            icon={CalendarClock}
          />
        </div>
      </section>

      {/* Tabs: Services | Earnings (no Ratings block — agents don't see ratings) */}
      <Tabs defaultValue="services">
        <TabsList className="sticky top-[56px] z-20 bg-background w-full sm:w-auto">
          <TabsTrigger value="services" className="flex-1 sm:flex-none">
            {t("tabs.services")}
          </TabsTrigger>
          <TabsTrigger value="earnings" className="flex-1 sm:flex-none">
            {t("tabs.earnings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          <ServicesTab services={services} locale={locale} />
        </TabsContent>

        <TabsContent value="earnings" className="mt-4">
          <EarningsTab earnings={earnings} locale={locale} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
