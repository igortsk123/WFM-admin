"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  Building2,
  User2,
  Download,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Users,
  TrendingUp,
  BarChart3,
  Divide,
  Pencil,
  ShieldOff,
  ShieldCheck,
  Archive,
  Inbox,
} from "lucide-react";

import type { Agent, AgentEarning, AgentStatus, FreelancerStatus, User } from "@/lib/types";
import {
  getAgentById,
  getAgentEarnings,
  blockAgent,
  archiveAgent,
  updateAgent,
} from "@/lib/api/freelance-agents";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge";
import { UserCell } from "@/components/shared/user-cell";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityFeed, type ActivityItem, type ActivityType } from "@/components/shared/activity-feed";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

// ─── types ────────────────────────────────────────────────────────────────────

type AgentWithRoster = Agent & { freelancers: User[]; earnings: AgentEarning[] };

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatMoney(v: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(s: string | null | undefined, locale: string) {
  if (!s) return "—";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(s)
  );
}

// ─── Agent Status Badge ────────────────────────────────────────────────────────

const AGENT_STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; labelEn: string; className: string }
> = {
  ACTIVE: {
    label: "Активен",
    labelEn: "Active",
    className: "bg-success/10 text-success",
  },
  BLOCKED: {
    label: "Заблокирован",
    labelEn: "Blocked",
    className: "bg-destructive/10 text-destructive",
  },
  ARCHIVED: {
    label: "В архиве",
    labelEn: "Archived",
    className: "bg-muted text-muted-foreground",
  },
};

function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const locale = useLocale();
  const cfg = AGENT_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        cfg.className
      )}
    >
      {locale === "en" ? cfg.labelEn : cfg.label}
    </span>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function AgentDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ─── Hero Card ─────────────────────────────────────────────────────────────────

function HeroCard({ agent, t }: { agent: AgentWithRoster; t: ReturnType<typeof useTranslations> }) {
  const locale = useLocale();

  const rows: { label: string; value: React.ReactNode }[] = [];

  if (agent.inn) rows.push({ label: t("hero.inn"), value: agent.inn });
  if (agent.kpp) rows.push({ label: t("hero.kpp"), value: agent.kpp });
  if (agent.ogrn) rows.push({ label: t("hero.ogrn"), value: agent.ogrn });
  if (agent.contact_person_name)
    rows.push({ label: t("hero.contact_person"), value: agent.contact_person_name });

  if (agent.contact_phone)
    rows.push({
      label: t("hero.phone"),
      value: (
        <a
          href={`tel:${agent.contact_phone}`}
          className="text-primary hover:underline underline-offset-2"
        >
          {agent.contact_phone}
        </a>
      ),
    });

  if (agent.contact_email)
    rows.push({
      label: t("hero.email"),
      value: (
        <a
          href={`mailto:${agent.contact_email}`}
          className="text-primary hover:underline underline-offset-2"
        >
          {agent.contact_email}
        </a>
      ),
    });

  rows.push({
    label: t("hero.contract"),
    value: (
      <div className="flex items-center gap-2">
        {agent.contract_signed_at ? (
          <Badge
            variant="outline"
            className="border-success text-success text-xs"
          >
            {t("hero.contract_signed")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-muted-foreground text-muted-foreground text-xs"
          >
            {t("hero.contract_unsigned")}
          </Badge>
        )}
        {agent.contract_url && (
          <a
            href={agent.contract_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2"
          >
            <Download className="size-3" aria-hidden="true" />
            {t("hero.contract_download")}
          </a>
        )}
      </div>
    ),
  });

  rows.push({
    label: t("hero.commission"),
    value: (
      <span className="font-semibold text-foreground">
        {t("hero.commission_label", { pct: agent.commission_pct })}
      </span>
    ),
  });

  if (agent.contract_signed_at)
    rows.push({
      label: t("hero.signed_at"),
      value: formatDate(agent.contract_signed_at, locale),
    });

  rows.push({
    label: t("hero.status"),
    value: <AgentStatusBadge status={agent.status} />,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {agent.type === "COMPANY" ? (
            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <User2 className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          {agent.type === "INDIVIDUAL" ? t("hero.type_individual") : t("hero.type_company")}
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

// ─── KPI Row ──────────────────────────────────────────────────────────────────

function KpiRow({ agent, t, locale }: { agent: AgentWithRoster; t: ReturnType<typeof useTranslations>; locale: string }) {
  const activeCount = agent.freelancers.filter((f) => f.freelancer_status === "ACTIVE").length;
  const avgPerPerformer =
    activeCount > 0 ? Math.round(agent.total_earned_30d / activeCount) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        label={t("kpi.active_performers")}
        value={activeCount}
        icon={Users}
      />
      <KpiCard
        label={t("kpi.earned_30d")}
        value={formatMoney(agent.total_earned_30d, locale)}
        icon={TrendingUp}
      />
      <KpiCard
        label={t("kpi.earned_all_time")}
        value={formatMoney(agent.total_earned_all_time, locale)}
        icon={BarChart3}
      />
      <KpiCard
        label={t("kpi.avg_per_performer")}
        value={formatMoney(avgPerPerformer, locale)}
        icon={Divide}
      />
    </div>
  );
}

// ─── Performers Tab ────────────────────────────────────────────────────────────

function PerformersTab({
  agent,
  t,
  locale,
}: {
  agent: AgentWithRoster;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const [statusFilter, setStatusFilter] = React.useState<FreelancerStatus | "ALL">("ALL");

  const freelancers = agent.freelancers.filter((f) =>
    statusFilter === "ALL" ? true : f.freelancer_status === statusFilter
  );

  const FREELANCER_STATUSES: FreelancerStatus[] = ["ACTIVE", "NEW", "VERIFICATION", "BLOCKED", "ARCHIVED"];

  // Derive per-freelancer 30d earnings from agent.earnings
  const earningsMap = React.useMemo(() => {
    const map = new Map<number, { services: number; amount: number }>();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const e of agent.earnings) {
      if (new Date(e.created_at).getTime() < cutoff) continue;
      const prev = map.get(e.freelancer_id) ?? { services: 0, amount: 0 };
      map.set(e.freelancer_id, {
        services: prev.services + 1,
        amount: prev.amount + e.gross_amount_base,
      });
    }
    return map;
  }, [agent.earnings]);

  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      header: t("performers_tab.col_name"),
      cell: ({ row }) => <UserCell user={row.original} />,
    },
    {
      id: "phone",
      header: t("performers_tab.col_phone"),
      cell: ({ row }) =>
        row.original.phone ? (
          <a
            href={`tel:${row.original.phone}`}
            className="text-sm text-primary hover:underline underline-offset-2 whitespace-nowrap"
          >
            {row.original.phone}
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: "status",
      header: t("performers_tab.col_status"),
      cell: ({ row }) => (
        <FreelancerStatusBadge status={row.original.freelancer_status ?? "NEW"} />
      ),
    },
    {
      id: "hired_at",
      header: t("performers_tab.col_added_at"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDate(row.original.hired_at, locale)}
        </span>
      ),
    },
    {
      id: "services_30d",
      header: t("performers_tab.col_services_30d"),
      cell: ({ row }) => (
        <span className="text-sm">
          {earningsMap.get(row.original.id)?.services ?? 0}
        </span>
      ),
    },
    {
      id: "earned_30d",
      header: t("performers_tab.col_earned_30d"),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatMoney(earningsMap.get(row.original.id)?.amount ?? 0, locale)}
        </span>
      ),
    },
    {
      id: "open",
      header: "",
      cell: ({ row }) => (
        <Link
          href={ADMIN_ROUTES.employeeDetail(String(row.original.id))}
          className="text-xs text-primary hover:underline underline-offset-2 whitespace-nowrap"
        >
          {t("performers_tab.col_open")}
          <ExternalLink className="inline-block ml-1 size-3" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={statusFilter === "ALL" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setStatusFilter("ALL")}
        >
          Все
        </Button>
        {FREELANCER_STATUSES.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            <FreelancerStatusBadge status={s} />
          </Button>
        ))}
      </div>

      <DataTableShell
        columns={columns}
        data={freelancers}
        emptyMessage={{
          title: t("performers_tab.empty_title"),
          description: t("performers_tab.empty_description"),
        }}
      />
    </div>
  );
}

// ─── Accruals Tab ──────────────────────────────────────────────────────────────

function AccrualsTab({
  agentId,
  t,
  locale,
}: {
  agentId: string;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const [earnings, setEarnings] = React.useState<AgentEarning[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "CALCULATED" | "PAID">("ALL");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const PAGE_SIZE = 20;

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    getAgentEarnings(agentId, { page, page_size: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setEarnings(res.data);
        setTotal(res.total);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsError(true);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId, page]);

  const filtered = React.useMemo(
    () =>
      statusFilter === "ALL"
        ? earnings
        : earnings.filter((e) => e.status === statusFilter),
    [earnings, statusFilter]
  );

  // KPI summary for current page
  const accrued = filtered.reduce((s, e) => s + e.commission_amount, 0);
  const paid = filtered
    .filter((e) => e.status === "PAID")
    .reduce((s, e) => s + e.commission_amount, 0);
  const pending = accrued - paid;

  const columns: ColumnDef<AgentEarning>[] = [
    {
      id: "period_date",
      header: t("accruals_tab.col_date"),
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap text-muted-foreground">
          {formatDate(row.original.period_date, locale)}
        </span>
      ),
    },
    {
      id: "freelancer",
      header: t("accruals_tab.col_performer"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.freelancer_name}</span>
      ),
    },
    {
      id: "service",
      header: t("accruals_tab.col_service"),
      cell: ({ row }) => (
        <Link
          href={`${ADMIN_ROUTES.freelanceServices}?service_id=${row.original.service_id}`}
          className="text-xs text-primary hover:underline underline-offset-2"
        >
          {row.original.service_id}
          <ExternalLink className="inline-block ml-1 size-3" aria-hidden="true" />
        </Link>
      ),
    },
    {
      id: "base",
      header: t("accruals_tab.col_base"),
      cell: ({ row }) => (
        <span className="text-sm">{formatMoney(row.original.gross_amount_base, locale)}</span>
      ),
    },
    {
      id: "pct",
      header: t("accruals_tab.col_pct"),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.commission_pct}%</span>
      ),
    },
    {
      id: "commission",
      header: t("accruals_tab.col_commission"),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatMoney(row.original.commission_amount, locale)}
        </span>
      ),
    },
    {
      id: "status",
      header: t("accruals_tab.col_status"),
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            row.original.status === "PAID"
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          )}
        >
          {row.original.status === "PAID"
            ? t("accruals_tab.status_paid")
            : t("accruals_tab.status_calculated")}
        </span>
      ),
    },
    {
      id: "payout",
      header: t("accruals_tab.col_payout"),
      cell: ({ row }) =>
        row.original.payout_id ? (
          <Link
            href={`${ADMIN_ROUTES.freelancePayouts}?payout_id=${row.original.payout_id}`}
            className="text-xs text-primary hover:underline underline-offset-2 whitespace-nowrap"
          >
            {row.original.payout_id}
            <ExternalLink className="inline-block ml-1 size-3" aria-hidden="true" />
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
  ];

  if (isError) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
        <AlertCircle className="size-4 text-destructive shrink-0" aria-hidden="true" />
        <span className="text-sm text-destructive flex-1">Не удалось загрузить начисления</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setIsError(false);
            setIsLoading(true);
            getAgentEarnings(agentId, { page, page_size: PAGE_SIZE })
              .then((res) => {
                setEarnings(res.data);
                setTotal(res.total);
                setIsLoading(false);
              })
              .catch(() => {
                setIsError(true);
                setIsLoading(false);
              });
          }}
        >
          <RefreshCw className="size-3.5 mr-1.5" aria-hidden="true" />
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI mini row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("accruals_tab.kpi_accrued"), value: formatMoney(accrued, locale) },
          { label: t("accruals_tab.kpi_paid"), value: formatMoney(paid, locale) },
          { label: t("accruals_tab.kpi_pending"), value: formatMoney(pending, locale) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-0.5"
          >
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {(["ALL", "CALCULATED", "PAID"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "ALL"
              ? "Все"
              : s === "PAID"
              ? t("accruals_tab.status_paid")
              : t("accruals_tab.status_calculated")}
          </Button>
        ))}
      </div>

      <DataTableShell
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ agent, t }: { agent: AgentWithRoster; t: ReturnType<typeof useTranslations> }) {
  // Generate mock history from agent data
  const items: ActivityItem[] = React.useMemo(() => {
    const entries: ActivityItem[] = [
      {
        id: `${agent.id}-created`,
        timestamp: agent.created_at,
        actor: "Соколова А. В.",
        action: t("history_tab.created"),
        type: "EMPLOYEE" as ActivityType,
      },
    ];
    if (agent.contract_signed_at) {
      entries.push({
        id: `${agent.id}-contract`,
        timestamp: agent.contract_signed_at + "T12:00:00Z",
        actor: "Соколова А. В.",
        action: t("history_tab.updated"),
        type: "SYSTEM" as ActivityType,
      });
    }
    if (agent.status === "BLOCKED") {
      entries.push({
        id: `${agent.id}-blocked`,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "Иванов П. С.",
        action: t("history_tab.blocked"),
        type: "TASK_BLOCKED" as ActivityType,
      });
    }
    if (agent.status === "ARCHIVED") {
      entries.push({
        id: `${agent.id}-archived`,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        actor: "Соколова А. В.",
        action: t("history_tab.archived"),
        type: "TASK_ARCHIVED" as ActivityType,
      });
    }
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [agent, t]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Нет записей"
        description="История изменений появится здесь"
      />
    );
  }

  return <ActivityFeed items={items} className="mt-2" />;
}

// ─── Edit Sheet ────────────────────────────────────────────────────────────────

interface EditSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent: Agent;
  onSaved: (updated: Partial<Agent>) => void;
  t: ReturnType<typeof useTranslations>;
}

function EditSheet({ open, onOpenChange, agent, onSaved, t }: EditSheetProps) {
  const [form, setForm] = React.useState({
    name: agent.name,
    inn: agent.inn ?? "",
    kpp: agent.kpp ?? "",
    ogrn: agent.ogrn ?? "",
    contact_person_name: agent.contact_person_name ?? "",
    contact_phone: agent.contact_phone ?? "",
    contact_email: agent.contact_email ?? "",
    commission_pct: String(agent.commission_pct),
    contract_url: agent.contract_url ?? "",
    contract_signed_at: agent.contract_signed_at ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  // sync form when agent changes (e.g. after save)
  React.useEffect(() => {
    setForm({
      name: agent.name,
      inn: agent.inn ?? "",
      kpp: agent.kpp ?? "",
      ogrn: agent.ogrn ?? "",
      contact_person_name: agent.contact_person_name ?? "",
      contact_phone: agent.contact_phone ?? "",
      contact_email: agent.contact_email ?? "",
      commission_pct: String(agent.commission_pct),
      contract_url: agent.contract_url ?? "",
      contract_signed_at: agent.contract_signed_at ?? "",
    });
  }, [agent]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Partial<Agent> = {
        name: form.name,
        inn: form.inn || undefined,
        kpp: form.kpp || undefined,
        ogrn: form.ogrn || undefined,
        contact_person_name: form.contact_person_name || undefined,
        contact_phone: form.contact_phone || undefined,
        contact_email: form.contact_email || undefined,
        commission_pct: Number(form.commission_pct),
        contract_url: form.contract_url || null,
        contract_signed_at: form.contract_signed_at || null,
      };
      const res = await updateAgent(agent.id, payload);
      if (res.success) {
        toast.success(t("toasts.saved"));
        onSaved(payload);
        onOpenChange(false);
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("edit_sheet.title")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          {(
            [
              { key: "name", label: t("edit_sheet.field_name"), type: "text" },
              { key: "inn", label: t("edit_sheet.field_inn"), type: "text" },
              { key: "kpp", label: t("edit_sheet.field_kpp"), type: "text" },
              { key: "ogrn", label: t("edit_sheet.field_ogrn"), type: "text" },
              { key: "contact_person_name", label: t("edit_sheet.field_contact_person"), type: "text" },
              { key: "contact_phone", label: t("edit_sheet.field_phone"), type: "tel" },
              { key: "contact_email", label: t("edit_sheet.field_email"), type: "email" },
              { key: "commission_pct", label: t("edit_sheet.field_commission"), type: "number" },
              { key: "contract_url", label: t("edit_sheet.field_contract_url"), type: "url" },
              { key: "contract_signed_at", label: t("edit_sheet.field_contract_signed_at"), type: "date" },
            ] as { key: keyof typeof form; label: string; type: string }[]
          ).map(({ key, label, type }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-${key}`}>{label}</Label>
              <Input
                id={`edit-${key}`}
                type={type}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                min={type === "number" ? 0 : undefined}
                max={type === "number" ? 100 : undefined}
                step={type === "number" ? 0.1 : undefined}
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Block Dialog ──────────────────────────────────────────────────────────────

// NOTE: ConfirmDialog doesn't support an input field,
// so BlockDialogWithReason has a custom UI for the reason textarea.

interface BlockDialogWithReasonProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}

function BlockDialogWithReason({ open, onOpenChange, onConfirm, t, tc }: BlockDialogWithReasonProps) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const isValid = reason.trim().length >= 10;

  async function handleConfirm() {
    if (!isValid) return;
    setBusy(true);
    await onConfirm(reason.trim());
    setBusy(false);
    setReason("");
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("block_dialog.title")}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        <div className="relative z-50 w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">{t("block_dialog.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("block_dialog.description")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="block-reason">{t("block_dialog.reason_label")}</Label>
            <Textarea
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("block_dialog.reason_placeholder")}
              rows={3}
            />
            {reason.length > 0 && !isValid && (
              <p className="text-xs text-destructive">Минимум 10 символов</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!isValid || busy}>
              {busy ? "..." : t("block_dialog.confirm")}
            </Button>
          </div>
        </div>
      </div>
    </AlertDialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function AgentDetail({ id }: { id: string }) {
  const t = useTranslations("screen.freelanceAgentDetail");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();

  const [agent, setAgent] = React.useState<AgentWithRoster | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const [unblockOpen, setUnblockOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  const canEdit = ["NETWORK_OPS", "HR_MANAGER"].includes(user.role);
  const canBlock = ["NETWORK_OPS", "HR_MANAGER"].includes(user.role);

  // ─── Check payment mode (CLIENT_DIRECT → 404-equivalent) ─────────
  const isClientDirect = user.organization.payment_mode === "CLIENT_DIRECT";

  const load = React.useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    getAgentById(id)
      .then((res) => {
        setAgent(res.data as AgentWithRoster);
        setIsLoading(false);
      })
      .catch(() => {
        setIsError(true);
        setIsLoading(false);
      });
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  // ─── Action handlers ──────────────────────────────────────────────

  async function handleBlock(reason: string) {
    if (!agent) return;
    const res = await blockAgent(agent.id, reason);
    if (res.success) {
      toast.success(t("toasts.blocked"));
      setAgent((prev) => prev ? { ...prev, status: "BLOCKED" as AgentStatus } : prev);
    } else {
      toast.error(t("toasts.error"));
    }
    setBlockOpen(false);
  }

  async function handleUnblock() {
    if (!agent) return;
    // unblock = update status back to ACTIVE via updateAgent
    const res = await updateAgent(agent.id, { status: "ACTIVE" as AgentStatus });
    if (res.success) {
      toast.success(t("toasts.unblocked"));
      setAgent((prev) => prev ? { ...prev, status: "ACTIVE" as AgentStatus } : prev);
    } else {
      toast.error(t("toasts.error"));
    }
    setUnblockOpen(false);
  }

  async function handleArchive() {
    if (!agent) return;
    const activeCount = agent.freelancers.filter(
      (f) => f.freelancer_status === "ACTIVE"
    ).length;
    if (activeCount > 0) {
      toast.error(t("toasts.archive_error_active_freelancers"));
      setArchiveOpen(false);
      return;
    }
    const res = await archiveAgent(agent.id);
    if (res.success) {
      toast.success(t("toasts.archived"));
      setAgent((prev) => prev ? { ...prev, status: "ARCHIVED" as AgentStatus } : prev);
    } else {
      toast.error(res.error?.message ?? t("toasts.error"));
    }
    setArchiveOpen(false);
  }

  function handleSaved(updated: Partial<Agent>) {
    setAgent((prev) => (prev ? { ...prev, ...updated } : prev));
    toast.success(t("toasts.saved"));
  }

  // ─── Render states ────────────────────────────────────────────────

  if (isClientDirect) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ShieldOff className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground text-sm">{t("not_available")}</p>
      </div>
    );
  }

  if (isLoading) return <AgentDetailSkeleton />;

  if (isError || !agent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="size-10 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{tc("error")}</p>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="size-3.5 mr-1.5" aria-hidden="true" />
          {tc("retry")}
        </Button>
      </div>
    );
  }

  // ─── Actions area ─────────────────────────────────────────────────

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      {canEdit && agent.status !== "ARCHIVED" && (
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5 mr-1.5" aria-hidden="true" />
          {t("actions.edit")}
        </Button>
      )}
      {canBlock && agent.status === "ACTIVE" && (
        <Button size="sm" variant="outline" onClick={() => setBlockOpen(true)}>
          <ShieldOff className="size-3.5 mr-1.5" aria-hidden="true" />
          {t("actions.block")}
        </Button>
      )}
      {canBlock && agent.status === "BLOCKED" && (
        <Button size="sm" variant="outline" onClick={() => setUnblockOpen(true)}>
          <ShieldCheck className="size-3.5 mr-1.5" aria-hidden="true" />
          {t("actions.unblock")}
        </Button>
      )}
      {canEdit && agent.status !== "ARCHIVED" && (
        <Button size="sm" variant="outline" onClick={() => setArchiveOpen(true)}>
          <Archive className="size-3.5 mr-1.5" aria-hidden="true" />
          {t("actions.archive")}
        </Button>
      )}
    </div>
  );

  // ─── Tabs ─────────────────────────────────────────────────────────

  const activePerformers = agent.freelancers.filter(
    (f) => f.freelancer_status === "ACTIVE"
  ).length;

  const totalEarnings = agent.earnings.reduce(
    (s, e) => s + e.commission_amount,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={agent.name}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.agents"), href: ADMIN_ROUTES.freelanceAgents },
          { label: agent.name },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <AgentStatusBadge status={agent.status} />
            <div className="hidden md:flex items-center gap-2">{headerActions}</div>
          </div>
        }
      />

      {/* Hero Card */}
      <HeroCard agent={agent} t={t} />

      {/* KPI Row */}
      <KpiRow agent={agent} t={t} locale={locale} />

      {/* Tabs */}
      <Tabs defaultValue="performers" className="flex flex-col gap-4">
        <TabsList className="w-full md:w-auto justify-start h-auto p-1 bg-muted/50 rounded-lg overflow-x-auto">
          <TabsTrigger value="performers" className="text-sm whitespace-nowrap">
            {t("tabs.performers")}{" "}
            <span className="ml-1.5 text-xs text-muted-foreground">({agent.freelancers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="accruals" className="text-sm whitespace-nowrap">
            {t("tabs.accruals")}{" "}
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({formatMoney(totalEarnings, locale)})
            </span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-sm whitespace-nowrap">
            {t("tabs.history")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performers" className="mt-0">
          <PerformersTab agent={agent} t={t} locale={locale} />
        </TabsContent>

        <TabsContent value="accruals" className="mt-0">
          <AccrualsTab agentId={agent.id} t={t} locale={locale} />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <HistoryTab agent={agent} t={t} />
        </TabsContent>
      </Tabs>

      {/* Mobile sticky actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2 px-4 py-3 bg-background border-t border-border md:hidden">
        {headerActions}
      </div>

      {/* Edit Sheet */}
      {canEdit && (
        <EditSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          agent={agent}
          onSaved={handleSaved}
          t={t}
        />
      )}

      {/* Block Dialog */}
      {canBlock && (
        <BlockDialogWithReason
          open={blockOpen}
          onOpenChange={setBlockOpen}
          onConfirm={handleBlock}
          t={t}
          tc={tc}
        />
      )}

      {/* Unblock Dialog */}
      <AlertDialog open={unblockOpen} onOpenChange={setUnblockOpen}>
        <ConfirmDialog
          title={t("unblock_dialog.title")}
          message={t("unblock_dialog.description")}
          confirmLabel={t("unblock_dialog.confirm")}
          cancelLabel={tc("cancel")}
          variant="default"
          onConfirm={handleUnblock}
          onOpenChange={setUnblockOpen}
        />
      </AlertDialog>

      {/* Archive Dialog */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <ConfirmDialog
          title={t("archive_dialog.title")}
          message={t("archive_dialog.description")}
          confirmLabel={t("archive_dialog.confirm")}
          cancelLabel={tc("cancel")}
          variant="destructive"
          onConfirm={handleArchive}
          onOpenChange={setArchiveOpen}
        />
      </AlertDialog>
    </div>
  );
}
