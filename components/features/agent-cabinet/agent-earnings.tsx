"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  parseAsString,
  useQueryStates,
} from "nuqs";
import {
  AlertCircle,
  ArrowUpDown,
  BadgeCheck,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  RefreshCw,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { getMyEarnings, getMyFreelancers, getMyPayoutById } from "@/lib/api/agent-cabinet";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { AgentEarning, Payout, Locale } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

// Last 30 days default range
function defaultDateFrom(): string {
  const d = new Date("2026-05-01");
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
function defaultDateTo(): string {
  return "2026-05-01";
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatShortDate(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale);
}

function downloadCsv(rows: AgentEarning[], locale: Locale) {
  const headers = ["id", "period_date", "freelancer_name", "service_id", "gross_amount_base", "commission_pct", "commission_amount", "status", "payout_id"];
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      [
        r.id,
        r.period_date,
        r.freelancer_name,
        r.service_id,
        r.gross_amount_base,
        r.commission_pct,
        r.commission_amount,
        r.status,
        r.payout_id ?? "",
      ].join(";")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agent-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

function EarningStatusBadge({ status, label }: { status: "CALCULATED" | "PAID"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        status === "PAID"
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning"
      )}
    >
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAYOUT DETAIL SHEET
// ═══════════════════════════════════════════════════════════════════

function PayoutDetailSheet({
  payoutId,
  freelancerName,
  open,
  onOpenChange,
  locale,
}: {
  payoutId: string;
  freelancerName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: Locale;
}) {
  const t = useTranslations("screen.agentEarnings");
  const [payout, setPayout] = useState<Payout | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    if (!open || !payoutId) return;
    setPayoutLoading(true);
    getMyPayoutById(payoutId)
      .then((res) => setPayout(res.data))
      .catch(() => setPayout(null))
      .finally(() => setPayoutLoading(false));
  }, [open, payoutId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-sm sm:max-w-md overflow-y-auto"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{t("payout_sheet.title")}</SheetTitle>
        </SheetHeader>

        {payoutLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !payout ? (
          <p className="text-sm text-muted-foreground">{t("payout_sheet.no_payout")}</p>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Summary */}
            <div className="rounded-lg bg-muted p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("payout_sheet.amount_label")}</span>
                <span className="text-base font-semibold tabular-nums">
                  {formatCurrency(payout.net_amount, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("payout_sheet.date_label")}</span>
                <span className="text-sm">{formatShortDate(payout.payout_date, locale)}</span>
              </div>
              {payout.nominal_account_ref && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("payout_sheet.ref_label")}</span>
                  <span className="text-xs font-mono text-foreground">{payout.nominal_account_ref}</span>
                </div>
              )}
            </div>

            {/* Services in this payout for this freelancer */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("payout_sheet.services_label")}
              </p>
              <ul className="flex flex-col gap-1">
                {payout.services.length === 0 ? (
                  <li className="text-sm text-muted-foreground">—</li>
                ) : (
                  payout.services.map((svcId) => (
                    <li key={svcId} className="text-sm text-foreground font-mono">
                      {svcId}
                    </li>
                  ))
                )}
              </ul>
            </div>

            <Separator />

            {/* Freelancer */}
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Исполнитель</p>
              <p className="text-sm font-medium text-foreground">{freelancerName}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DETAIL SHEET (row click)
// ═══════════════════════════════════════════════════════════════════

function EarningDetailSheet({
  earning,
  open,
  onOpenChange,
  locale,
}: {
  earning: AgentEarning | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: Locale;
}) {
  const t = useTranslations("screen.agentEarnings");
  const statusLabel = earning ? t(`status.${earning.status}`) : "";

  const [payout, setPayout] = useState<Payout | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    if (!open || !earning?.payout_id) {
      setPayout(null);
      return;
    }
    setPayoutLoading(true);
    getMyPayoutById(earning.payout_id)
      .then((res) => setPayout(res.data))
      .catch(() => setPayout(null))
      .finally(() => setPayoutLoading(false));
  }, [open, earning?.payout_id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-sm sm:max-w-md overflow-y-auto"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{t("detail_sheet.title")}</SheetTitle>
        </SheetHeader>

        {!earning ? null : (
          <div className="flex flex-col gap-6">
            {/* Earning section */}
            <section aria-label={t("detail_sheet.section_earning")}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("detail_sheet.section_earning")}
              </p>
              <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("columns.date")}</span>
                  <span className="text-sm">{formatShortDate(earning.period_date, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("columns.freelancer")}</span>
                  <span className="text-sm font-medium truncate max-w-[180px] text-right">{earning.freelancer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("columns.gross_base")}</span>
                  <span className="text-sm tabular-nums">{formatCurrency(earning.gross_amount_base, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t("columns.commission_pct")}</span>
                  <span className="text-sm tabular-nums">{earning.commission_pct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("columns.commission_amount")}</span>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(earning.commission_amount, locale)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t("columns.status")}</span>
                  <EarningStatusBadge status={earning.status} label={statusLabel} />
                </div>
              </div>
            </section>

            {/* Service section */}
            <section aria-label={t("detail_sheet.section_service")}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("detail_sheet.section_service")}
              </p>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm font-mono text-foreground">{earning.service_id}</p>
              </div>
            </section>

            {/* Payout section */}
            <section aria-label={t("detail_sheet.section_payout")}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("detail_sheet.section_payout")}
              </p>
              {!payout ? (
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t("payout_sheet.no_payout")}</p>
                </div>
              ) : (
                <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t("payout_sheet.date_label")}</span>
                    <span className="text-sm">{formatShortDate(payout.payout_date, locale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{t("payout_sheet.amount_label")}</span>
                    <span className="text-sm tabular-nums font-medium">{formatCurrency(payout.net_amount, locale)}</span>
                  </div>
                  {payout.nominal_account_ref && (
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">{t("payout_sheet.ref_label")}</span>
                      <span className="text-xs font-mono">{payout.nominal_account_ref}</span>
                    </div>
                  )}
                  {/* Timeline */}
                  <div className="mt-1 flex items-center gap-2">
                    {payout.status === "PAID" && (
                      <BadgeCheck className="size-4 text-success shrink-0" aria-hidden="true" />
                    )}
                    {payout.status === "PROCESSING" && (
                      <Clock className="size-4 text-info shrink-0" aria-hidden="true" />
                    )}
                    {payout.status === "PENDING" && (
                      <Clock className="size-4 text-warning shrink-0" aria-hidden="true" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        payout.status === "PAID" && "text-success",
                        payout.status === "PROCESSING" && "text-info",
                        payout.status === "PENDING" && "text-warning",
                        payout.status === "FAILED" && "text-destructive"
                      )}
                    >
                      {payout.status === "PAID" && t("detail_sheet.payout_timeline_paid")}
                      {payout.status === "PROCESSING" && t("detail_sheet.payout_timeline_processing")}
                      {payout.status === "PENDING" && t("detail_sheet.payout_timeline_pending")}
                    </span>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FILTER BAR
// ═══════════════════════════════════════════════════════════════════

interface FilterState {
  dateFrom: string;
  dateTo: string;
  freelancerId: string;
  status: string;
}

function DateRangePicker({
  from,
  to,
  onChange,
  label,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  function apply() {
    onChange(localFrom, localTo);
    setOpen(false);
  }

  const active = from !== defaultDateFrom() || to !== defaultDateTo();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          aria-expanded={open}
        >
          <CalendarRange className="size-3.5" aria-hidden="true" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="date-from">С</label>
            <input
              id="date-from"
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="date-to">По</label>
            <input
              id="date-to"
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </div>
          <Button size="sm" className="w-full h-8 text-xs" onClick={apply}>
            Применить
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FreelancerCombobox({
  value,
  onChange,
  freelancers,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  freelancers: Array<{ id: number; name: string }>;
  placeholder: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = freelancers.find((f) => String(f.id) === value);
  const active = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs max-w-[180px]"
          aria-expanded={open}
        >
          <span className="truncate">
            {selected ? selected.name.split(" ")[0] + " " + selected.name.split(" ")[1] : label}
          </span>
          {active && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Очистить"
              className="ml-0.5 rounded-full hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
            >
              <X className="size-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>Не найдено</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => { onChange(""); setOpen(false); }}
                className="text-xs"
              >
                {placeholder}
              </CommandItem>
              {freelancers.map((f) => (
                <CommandItem
                  key={f.id}
                  value={f.name}
                  onSelect={() => { onChange(String(f.id)); setOpen(false); }}
                  className={cn("text-xs", String(f.id) === value && "font-semibold text-primary")}
                >
                  {f.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function StatusCombobox({
  value,
  onChange,
  label,
  placeholder,
  tStatus,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  tStatus: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const active = !!value;
  const statuses: Array<"CALCULATED" | "PAID"> = ["CALCULATED", "PAID"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          aria-expanded={open}
        >
          <span>{active ? tStatus(value) : label}</span>
          {active && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Очистить"
              className="ml-0.5 rounded-full hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
            >
              <X className="size-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem value="__all__" onSelect={() => { onChange(""); setOpen(false); }} className="text-xs">
                {placeholder}
              </CommandItem>
              {statuses.map((s) => (
                <CommandItem
                  key={s}
                  value={s}
                  onSelect={() => { onChange(s); setOpen(false); }}
                  className={cn("text-xs", s === value && "font-semibold text-primary")}
                >
                  {tStatus(s)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════

function EarningsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOBILE CARD ROW
// ═══════════════════════════════════════════════════════════════════

function MobileEarningCard({
  earning,
  onClick,
  locale,
  statusLabel,
}: {
  earning: AgentEarning;
  onClick: () => void;
  locale: Locale;
  statusLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-border bg-card p-4 flex flex-col gap-2 hover:bg-muted/50 transition-colors min-h-[44px]"
      aria-label={`${earning.freelancer_name} – ${formatCurrency(earning.commission_amount, locale)}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground truncate">
          {earning.freelancer_name}
        </span>
        <EarningStatusBadge status={earning.status} label={statusLabel} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {formatShortDate(earning.period_date, locale)}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatCurrency(earning.commission_amount, locale)}
        </span>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AgentEarnings() {
  const t = useTranslations("screen.agentEarnings");
  const locale = useLocale() as Locale;

  // ── URL state via nuqs ──────────────────────────────────────────
  const [params, setParams] = useQueryStates({
    dateFrom: parseAsString.withDefault(defaultDateFrom()),
    dateTo: parseAsString.withDefault(defaultDateTo()),
    freelancerId: parseAsString.withDefault(""),
    status: parseAsString.withDefault(""),
    page: parseAsString.withDefault("1"),
    sortDir: parseAsString.withDefault("desc"),
  });

  const { dateFrom, dateTo, freelancerId, status, page, sortDir } = params;
  const currentPage = parseInt(page, 10) || 1;

  // ── Data state ───────────────────────────────────────────────────
  const [allEarnings, setAllEarnings] = useState<AgentEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [freelancerOptions, setFreelancerOptions] = useState<Array<{ id: number; name: string }>>([]);

  // ── Sheet state ──────────────────────────────────────────────────
  const [detailEarning, setDetailEarning] = useState<AgentEarning | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [payoutSheetId, setPayoutSheetId] = useState<string | null>(null);
  const [payoutSheetFreelancer, setPayoutSheetFreelancer] = useState("");
  const [payoutOpen, setPayoutOpen] = useState(false);

  // ── Load data ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [earningsRes, freelancersRes] = await Promise.all([
        getMyEarnings({ date_from: dateFrom, date_to: dateTo, page_size: 999 }),
        getMyFreelancers({ page_size: 100 }),
      ]);
      setAllEarnings(earningsRes.data);
      const opts = freelancersRes.data.map((f) => ({
        id: f.id,
        name: `${f.last_name} ${f.first_name}${f.middle_name ? " " + f.middle_name : ""}`,
      }));
      setFreelancerOptions(opts);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Client-side filtering + sorting ────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...allEarnings];
    if (freelancerId) {
      rows = rows.filter((e) => String(e.freelancer_id) === freelancerId);
    }
    if (status) {
      rows = rows.filter((e) => e.status === status);
    }
    rows.sort((a, b) => {
      const cmp = a.period_date.localeCompare(b.period_date);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [allEarnings, freelancerId, status, sortDir]);

  // ── KPI aggregates ───────────────────────────────────────────────
  const kpi = useMemo(() => {
    const accrued = filtered.reduce((s, e) => s + e.commission_amount, 0);
    const paid = filtered
      .filter((e) => e.status === "PAID")
      .reduce((s, e) => s + e.commission_amount, 0);
    const pending = filtered
      .filter((e) => e.status === "CALCULATED")
      .reduce((s, e) => s + e.commission_amount, 0);

    // Days in range
    const fromMs = new Date(dateFrom).getTime();
    const toMs = new Date(dateTo).getTime();
    const days = Math.max(1, Math.ceil((toMs - fromMs) / 86400000) + 1);
    const avgPerDay = accrued / days;

    return { accrued, paid, pending, avgPerDay };
  }, [filtered, dateFrom, dateTo]);

  // ── Pagination ───────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Active filters count ─────────────────────────────────────────
  const activeFiltersCount = [
    dateFrom !== defaultDateFrom() || dateTo !== defaultDateTo(),
    !!freelancerId,
    !!status,
  ].filter(Boolean).length;

  function clearAllFilters() {
    setParams({
      dateFrom: defaultDateFrom(),
      dateTo: defaultDateTo(),
      freelancerId: "",
      status: "",
      page: "1",
    });
  }

  function openPayoutSheet(payoutId: string, name: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPayoutSheetId(payoutId);
    setPayoutSheetFreelancer(name);
    setPayoutOpen(true);
  }

  function openDetailSheet(earning: AgentEarning) {
    setDetailEarning(earning);
    setDetailOpen(true);
  }

  // ── LOADING ──────────────────────────────────────────────────────
  if (loading) return <EarningsSkeleton />;

  // ── ERROR ────────────────────────────────────────────────────────
  if (fetchError) {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9"
            onClick={() => downloadCsv(filtered, locale)}
            aria-label={t("actions.export_csv")}
          >
            <Download className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("actions.export_csv")}</span>
          </Button>
        }
      />

      {/* KPI: 2×2 on mobile, 4-column on lg */}
      <section aria-label="KPI">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label={t("kpi.accrued")}
            value={formatCurrency(kpi.accrued, locale)}
            icon={Wallet}
          />
          <KpiCard
            label={t("kpi.paid")}
            value={formatCurrency(kpi.paid, locale)}
            icon={BadgeCheck}
          />
          <KpiCard
            label={t("kpi.pending")}
            value={formatCurrency(kpi.pending, locale)}
            icon={CreditCard}
          />
          <KpiCard
            label={t("kpi.avg_per_day")}
            value={formatCurrency(kpi.avgPerDay, locale)}
            icon={TrendingUp}
          />
        </div>
      </section>

      {/* Filter row */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filters"
      >
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={(f, to) => setParams({ dateFrom: f, dateTo: to, page: "1" })}
          label={t("filters.date_range")}
        />
        <FreelancerCombobox
          value={freelancerId}
          onChange={(v) => setParams({ freelancerId: v, page: "1" })}
          freelancers={freelancerOptions}
          placeholder={t("filters.freelancer_placeholder")}
          label={t("filters.freelancer")}
        />
        <StatusCombobox
          value={status}
          onChange={(v) => setParams({ status: v, page: "1" })}
          label={t("filters.status")}
          placeholder={t("filters.status_placeholder")}
          tStatus={(k) => t(`status.${k as "CALCULATED" | "PAID"}`)}
        />
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={clearAllFilters}
          >
            <X className="size-3" aria-hidden="true" />
            {t("filters.clear_all")}
          </Button>
        )}
      </div>

      {/* Table — desktop */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t("empty.title")}
          description={t("empty.description")}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden" aria-label="Earnings table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-0 gap-1 text-xs font-semibold hover:bg-transparent"
                      onClick={() =>
                        setParams({ sortDir: sortDir === "asc" ? "desc" : "asc", page: "1" })
                      }
                      aria-label="Sort by date"
                    >
                      {t("columns.date")}
                      <ArrowUpDown className="size-3" aria-hidden="true" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-xs">{t("columns.freelancer")}</TableHead>
                  <TableHead className="text-xs">{t("columns.service")}</TableHead>
                  <TableHead className="text-xs text-right">{t("columns.gross_base")}</TableHead>
                  <TableHead className="text-xs text-right">{t("columns.commission_pct")}</TableHead>
                  <TableHead className="text-xs text-right">{t("columns.commission_amount")}</TableHead>
                  <TableHead className="text-xs">{t("columns.status")}</TableHead>
                  <TableHead className="text-xs">{t("columns.payout")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((earning) => (
                  <TableRow
                    key={earning.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openDetailSheet(earning)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openDetailSheet(earning);
                    }}
                    tabIndex={0}
                    aria-label={`${earning.freelancer_name} – ${formatCurrency(earning.commission_amount, locale)}`}
                  >
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatShortDate(earning.period_date, locale)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground truncate block max-w-[180px]">
                        {earning.freelancer_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {earning.service_id}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(earning.gross_amount_base, locale)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {earning.commission_pct}%
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(earning.commission_amount, locale)}
                    </TableCell>
                    <TableCell>
                      <EarningStatusBadge
                        status={earning.status}
                        label={t(`status.${earning.status}`)}
                      />
                    </TableCell>
                    <TableCell>
                      {earning.payout_id ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs font-mono text-primary hover:underline"
                          onClick={(e) =>
                            openPayoutSheet(earning.payout_id!, earning.freelancer_name, e)
                          }
                        >
                          {earning.payout_id}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {pageRows.map((earning) => (
              <MobileEarningCard
                key={earning.id}
                earning={earning}
                onClick={() => openDetailSheet(earning)}
                locale={locale}
                statusLabel={t(`status.${earning.status}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4" aria-label="Pagination">
              <p className="text-xs text-muted-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)}{" "}
                из {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setParams({ page: String(currentPage - 1) })}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span className="text-xs tabular-nums px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setParams({ page: String(currentPage + 1) })}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payout detail Sheet */}
      {payoutSheetId && (
        <PayoutDetailSheet
          payoutId={payoutSheetId}
          freelancerName={payoutSheetFreelancer}
          open={payoutOpen}
          onOpenChange={setPayoutOpen}
          locale={locale}
        />
      )}

      {/* Earning detail Sheet */}
      <EarningDetailSheet
        earning={detailEarning}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        locale={locale}
      />
    </div>
  );
}
