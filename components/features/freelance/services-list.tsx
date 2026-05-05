"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  useQueryState,
  parseAsString,
  parseAsInteger,
} from "nuqs";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import {
  FileDown,
  InboxIcon,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Pencil,
  MoreHorizontal,
  RefreshCw,
  ChevronsUpDown,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { useAuth } from "@/lib/contexts/auth-context";
import type { Service, NoShowReport, ServiceStatus, PaymentMode } from "@/lib/types";
import {
  getServices,
  confirmService,
  disputeService,
  adjustServiceAmount,
} from "@/lib/api/freelance-services";
import { getNoShows, updateNoShowStatus } from "@/lib/api/no-show";
import { MOCK_FREELANCE_SERVICES } from "@/lib/mock-data/freelance-services";

import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ServiceStatusBadge } from "@/components/shared/service-status-badge";
import { WorkTypeBadge } from "@/components/shared/work-type-badge";
import { FreelancerStatusBadge } from "@/components/shared/freelancer-status-badge";
import { UserCell } from "@/components/shared/user-cell";
import { FilterChip } from "@/components/shared/filter-chip";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
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

import { ServiceDetailSheet } from "./service-detail-sheet";
import { AdjustAmountDialog } from "./adjust-amount-dialog";
import { DisputeServiceDialog } from "./dispute-service-dialog";
import { NoShowLegalBadge } from "./service-detail-sheet";
import useSWR, { mutate as globalMutate } from "swr";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency = "RUB", locale = "ru"): string {
  const symbol = currency === "RUB" ? "₽" : currency === "GBP" ? "£" : "$";
  const formatted = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted}\u00a0${symbol}`;
}

function formatDate(dateStr: string, locale: string): string {
  try {
    return format(new Date(dateStr), "d MMM", {
      locale: locale === "ru" ? ru : undefined,
    });
  } catch {
    return dateStr;
  }
}

type TabKey = "all" | "pending" | "ready" | "paid" | "confirmed" | "no_show" | "disputed";

function getTabStatuses(tab: TabKey, paymentMode: PaymentMode): ServiceStatus[] | undefined {
  switch (tab) {
    case "all":
      return undefined;
    case "pending":
      return ["COMPLETED"];
    case "ready":
      return paymentMode === "NOMINAL_ACCOUNT" ? ["CONFIRMED", "READY_TO_PAY"] : undefined;
    case "paid":
      return ["PAID"];
    case "confirmed":
      return ["CONFIRMED"];
    case "no_show":
      return ["NO_SHOW"];
    case "disputed":
      return ["DISPUTED"];
    default:
      return undefined;
  }
}

function getTabsForPaymentMode(paymentMode: PaymentMode): TabKey[] {
  if (paymentMode === "NOMINAL_ACCOUNT") {
    return ["all", "pending", "ready", "paid", "no_show", "disputed"];
  }
  return ["all", "pending", "confirmed", "no_show", "disputed"];
}

// ─── Combobox ─────────────────────────────────────────────────────────────────

interface ComboboxFilterProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  buttonLabel: string;
}

function ComboboxFilter({ options, value, onChange, placeholder, buttonLabel }: ComboboxFilterProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-sm font-normal"
          aria-expanded={open}
        >
          <span className="text-muted-foreground">{buttonLabel}:</span>
          <span className="truncate max-w-[120px]">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>—</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(v) => {
                    onChange(v === value ? "" : v);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── SWR fetcher keys ─────────────────────────────────────────────────────────

const SWR_SERVICES_KEY = "freelance-services-list";
const SWR_NO_SHOWS_KEY = "freelance-no-shows-list";

// ─── Main component ───────────────────────────────────────────────────────────

export function ServicesList() {
  const t = useTranslations("screen.freelanceServicesList");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();

  const paymentMode = user.organization.payment_mode;
  const isNominal = paymentMode === "NOMINAL_ACCOUNT";

  // Permission checks
  const canAdjustAmount =
    isNominal &&
    (user.role === "REGIONAL" || user.role === "NETWORK_OPS");
  const canConfirm =
    user.role === "STORE_DIRECTOR" ||
    user.role === "SUPERVISOR" ||
    user.role === "REGIONAL" ||
    user.role === "NETWORK_OPS";
  const canSendToLegal =
    user.role === "NETWORK_OPS" || user.role === "HR_MANAGER";
  const canExport =
    user.role === "NETWORK_OPS" ||
    user.role === "REGIONAL" ||
    user.role === "HR_MANAGER";

  // URL state
  const [activeTab, setActiveTab] = useQueryState("tab", parseAsString.withDefault("all"));
  const [storeFilter, setStoreFilter] = useQueryState("store", parseAsString.withDefault(""));
  const [freelancerFilter, setFreelancerFilter] = useQueryState("performer", parseAsString.withDefault(""));
  const [agentFilter, setAgentFilter] = useQueryState("agent", parseAsString.withDefault(""));
  const [workTypeFilter, setWorkTypeFilter] = useQueryState("work_type", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  // Dialog/sheet state
  const [detailService, setDetailService] = useState<Service | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adjustService, setAdjustService] = useState<Service | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [disputeTargetService, setDisputeTargetService] = useState<Service | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // No-show report lookup
  const { data: noShowsData } = useSWR(SWR_NO_SHOWS_KEY, () =>
    getNoShows({ page_size: 100 })
  );
  const noShowMap = useMemo(() => {
    const map = new Map<string, NoShowReport>();
    noShowsData?.data.forEach((r) => map.set(r.service_id, r));
    return map;
  }, [noShowsData]);

  const tab = activeTab as TabKey;
  const tabs = getTabsForPaymentMode(paymentMode);
  const tabStatuses = getTabStatuses(tab, paymentMode);

  // Services fetcher
  const swrKey = [
    SWR_SERVICES_KEY,
    tab,
    storeFilter,
    freelancerFilter,
    agentFilter,
    workTypeFilter,
    page,
  ].join("|");

  const { data, isLoading, error, mutate } = useSWR(
    swrKey,
    async () => {
      // Build status filter
      const statusParam = tabStatuses?.length === 1 ? tabStatuses[0] : undefined;
      const result = await getServices({
        status: statusParam,
        store_id: storeFilter ? Number(storeFilter) : undefined,
        freelancer_id: freelancerFilter ? Number(freelancerFilter) : undefined,
        agent_id: agentFilter || undefined,
        page,
        page_size: 20,
      });
      // If multi-status tab (ready = CONFIRMED + READY_TO_PAY), filter client-side
      if (tabStatuses && tabStatuses.length > 1) {
        return {
          ...result,
          data: result.data.filter((s) => tabStatuses.includes(s.status)),
        };
      }
      return result;
    },
    { revalidateOnFocus: false }
  );

  // Build unique store/agent/work-type options from mock data (scope-locked in real impl)
  const storeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    MOCK_FREELANCE_SERVICES.forEach((s) => {
      seen.set(String(s.store_id), s.store_name);
    });
    return [{ value: "", label: t("filters.store_placeholder") }, ...Array.from(seen.entries()).map(([v, l]) => ({ value: v, label: l }))];
  }, [t]);

  const agentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    MOCK_FREELANCE_SERVICES.forEach((s) => {
      if (s.agent_id && s.agent_name) seen.set(s.agent_id, s.agent_name);
    });
    return [{ value: "", label: t("filters.agent_placeholder") }, ...Array.from(seen.entries()).map(([v, l]) => ({ value: v, label: l }))];
  }, [t]);

  const workTypeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    MOCK_FREELANCE_SERVICES.forEach((s) => {
      seen.set(String(s.work_type_id), s.work_type_name);
    });
    return [{ value: "", label: t("filters.work_type_placeholder") }, ...Array.from(seen.entries()).map(([v, l]) => ({ value: v, label: l }))];
  }, [t]);

  const freelancerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    MOCK_FREELANCE_SERVICES.forEach((s) => {
      seen.set(String(s.freelancer_id), s.freelancer_name);
    });
    return [{ value: "", label: t("filters.freelancer_placeholder") }, ...Array.from(seen.entries()).map(([v, l]) => ({ value: v, label: l }))];
  }, [t]);

  const activeFilterCount = [storeFilter, freelancerFilter, agentFilter, workTypeFilter].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    void setStoreFilter("");
    void setFreelancerFilter("");
    void setAgentFilter("");
    void setWorkTypeFilter("");
    void setPage(1);
  }, [setStoreFilter, setFreelancerFilter, setAgentFilter, setWorkTypeFilter, setPage]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleConfirm = useCallback(async (service: Service) => {
    setIsSubmitting(true);
    try {
      const res = await confirmService(service.id);
      if (res.success) {
        toast.success(t("toasts.confirmed"));
        void mutate();
        setSheetOpen(false);
      } else {
        toast.error(res.error?.message ?? t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmitting(false);
    }
  }, [t, mutate]);

  const handleDisputeSubmit = useCallback(async (id: string, reason: string) => {
    setIsSubmitting(true);
    try {
      const res = await disputeService(id, reason);
      if (res.success) {
        toast.success(t("toasts.disputed"));
        void mutate();
        setSheetOpen(false);
      } else {
        toast.error(res.error?.message ?? t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmitting(false);
    }
  }, [t, mutate]);

  const handleAdjustSubmit = useCallback(async (id: string, newAmount: number, reason: string) => {
    setIsSubmitting(true);
    try {
      const res = await adjustServiceAmount(id, newAmount, reason);
      if (res.success) {
        toast.success(t("toasts.adjusted"));
        void mutate();
        setDetailService((prev) => prev?.id === id ? { ...prev, total_amount: newAmount } : prev);
      } else {
        toast.error(res.error?.message ?? t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmitting(false);
    }
  }, [t, mutate]);

  const handleSendToLegal = useCallback(async (report: NoShowReport) => {
    setIsSubmitting(true);
    try {
      const res = await updateNoShowStatus(report.id, "IN_LEGAL");
      if (res.success) {
        toast.success(t("toasts.legal_sent"));
        void globalMutate(SWR_NO_SHOWS_KEY);
        setSheetOpen(false);
      } else {
        toast.error(res.error?.message ?? t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setIsSubmitting(false);
    }
  }, [t]);

  const openDetail = useCallback((service: Service) => {
    setDetailService(service);
    setSheetOpen(true);
  }, []);

  // ─── Column defs ──────────────────────────────────────────────────────────

  const isNoShowTab = tab === "no_show";

  const columns = useMemo<ColumnDef<Service>[]>(() => {
    const cols: ColumnDef<Service>[] = [
      {
        id: "date",
        header: t("columns.date"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.service_date, locale)}
          </span>
        ),
      },
      {
        id: "performer",
        header: t("columns.performer"),
        cell: ({ row }) => {
          const s = row.original;
          const nameParts = s.freelancer_name.split(" ");
          const fakeUser = {
            first_name: nameParts[1] ?? "",
            last_name: nameParts[0] ?? "",
            middle_name: nameParts[2],
          };
          return (
            <div className="flex items-center gap-2 min-w-0">
              <UserCell user={fakeUser} />
              <FreelancerStatusBadge status="ACTIVE" size="sm" />
            </div>
          );
        },
      },
      {
        id: "store",
        header: t("columns.store"),
        cell: ({ row }) => (
          <span className="text-sm text-foreground max-w-[140px] truncate block">
            {row.original.store_name}
          </span>
        ),
      },
      {
        id: "work_type",
        header: t("columns.work_type"),
        cell: ({ row }) => (
          <WorkTypeBadge
            workType={{ id: row.original.work_type_id, name: row.original.work_type_name }}
            size="sm"
          />
        ),
      },
      {
        id: "hours",
        header: () => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">{t("columns.hours")}</span>
              </TooltipTrigger>
              <TooltipContent>{t("columns.hours_tooltip")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        cell: ({ row }) => {
          const s = row.original;
          const allSame = s.scheduled_hours === s.actual_hours && s.actual_hours === s.payable_hours;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-sm text-foreground font-mono">
                {allSame
                  ? `${s.scheduled_hours}`
                  : `${s.scheduled_hours}\u00a0/\u00a0${s.actual_hours}\u00a0/\u00a0${s.payable_hours}`}
                {" ч"}
              </span>
              {s.underload_not_fault && s.payable_hours > s.actual_hours && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-info/10 text-info border-transparent text-[10px] px-1 py-0 cursor-default">
                        {t("hours_badge.underload")}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{s.adjustment_reason}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
      {
        id: "volume",
        header: t("columns.volume"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {row.original.normative_volume}&nbsp;{row.original.normative_unit}
          </span>
        ),
      },
      {
        id: "amount",
        header: t("columns.amount"),
        cell: ({ row }) => {
          const s = row.original;
          const amount = isNominal ? s.total_amount : s.total_amount_indicative;
          if (amount == null) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-sm font-medium text-foreground font-mono">
                {formatAmount(amount, "RUB", locale)}
              </span>
              {!isNominal && (
                <span className="text-xs text-muted-foreground">{t("columns.amount_indicative")}</span>
              )}
              {s.manually_adjusted && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Pencil className="size-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>{t("adjusted_tooltip")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
    ];

    // Agent column — only NOMINAL_ACCOUNT
    if (isNominal) {
      cols.push({
        id: "agent",
        header: t("columns.agent"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[100px] block">
            {row.original.agent_name ?? "—"}
          </span>
        ),
      });
    }

    // Source column
    cols.push({
      id: "source",
      header: t("columns.source"),
      cell: ({ row }) => {
        const hasApp = Boolean(row.original.application_id);
        return (
          <Badge
            variant="outline"
            className="text-xs whitespace-nowrap"
          >
            {t(hasApp ? "source.INTERNAL" : "source.EXTERNAL" as Parameters<typeof t>[0])}
          </Badge>
        );
      },
    });

    // Legal status column (no-show tab)
    if (isNoShowTab) {
      cols.push({
        id: "legal_status",
        header: t("columns.legal_status"),
          cell: ({ row }) => {
          const report = noShowMap.get(row.original.id);
          if (!report) return <span className="text-muted-foreground">—</span>;
          return <NoShowLegalBadge status={report.status} />;
        },
      });
    }

    // Status column
    cols.push({
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) => <ServiceStatusBadge status={row.original.status} />,
    });

    // Actions column
    cols.push({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original;
        const noShowReport = noShowMap.get(s.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={tc("actions")}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canConfirm && s.status === "COMPLETED" && (
                <>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleConfirm(s);
                    }}
                  >
                    <CheckCircle2 className="size-4 mr-2 text-success" />
                    {t("actions.confirm")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setDisputeTargetService(s);
                      setDisputeOpen(true);
                    }}
                  >
                    <AlertTriangle className="size-4 mr-2 text-destructive" />
                    {t("actions.dispute")}
                  </DropdownMenuItem>
                </>
              )}
              {isNominal && s.status === "PAID" && (
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <FileDown className="size-4 mr-2" />
                  {t("actions.download_act")}
                </DropdownMenuItem>
              )}
              {s.status === "NO_SHOW" && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetail(s);
                  }}
                >
                  <Shield className="size-4 mr-2" />
                  {t("actions.open_no_show")}
                </DropdownMenuItem>
              )}
              {canAdjustAmount && isNominal && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdjustService(s);
                    setAdjustOpen(true);
                  }}
                >
                  <Pencil className="size-4 mr-2" />
                  {t("actions.adjust_amount")}
                </DropdownMenuItem>
              )}
              {canSendToLegal && s.status === "NO_SHOW" && noShowReport?.status === "OPEN" && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSendToLegal(noShowReport);
                  }}
                >
                  <Shield className="size-4 mr-2 text-info" />
                  {t("actions.to_legal")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });

    return cols;
  }, [t, tc, locale, isNominal, isNoShowTab, canConfirm, canAdjustAmount, canSendToLegal, noShowMap, handleConfirm, handleSendToLegal, openDetail]);

  // ─── Empty state per-tab ──────────────────────────────────────────────────

  function getEmptyState(tab: TabKey) {
    if (tab === "no_show") {
      return {
        icon: CheckCircle2,
        title: t("empty.no_show_title"),
        description: t("empty.no_show_description"),
      };
    }
    if (tab === "pending") {
      return {
        icon: CheckCircle2,
        title: t("empty.pending_title"),
        description: t("empty.pending_description"),
      };
    }
    if (tab === "all") {
      return {
        icon: InboxIcon,
        title: t("empty.all_title"),
        description: t("empty.all_description"),
      };
    }
    return {
      icon: InboxIcon,
      title: t("empty.generic_title"),
      description: t("empty.generic_description"),
    };
  }

  const emptyState = getEmptyState(tab);
  const services = data?.data ?? [];
  const total = data?.total ?? 0;

  // ─── Mobile card renderer ─────────────────────────────────────────────────

  const mobileCardRender = (s: Service) => {
    const nameParts = s.freelancer_name.split(" ");
    const fakeUser = {
      first_name: nameParts[1] ?? "",
      last_name: nameParts[0] ?? "",
      middle_name: nameParts[2],
    };
    const amount = isNominal ? s.total_amount : s.total_amount_indicative;
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <UserCell user={fakeUser} />
          <ServiceStatusBadge status={s.status} size="sm" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{formatDate(s.service_date, locale)}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{s.store_name}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <WorkTypeBadge workType={{ id: s.work_type_id, name: s.work_type_name }} size="sm" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-mono">
              {s.scheduled_hours}&nbsp;ч
            </span>
            {amount != null && (
              <span className="text-sm font-semibold text-foreground font-mono">
                {formatAmount(amount, "RUB", locale)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title={t("page_title")}
          subtitle={t("page_subtitle")}
          breadcrumbs={[
            { label: t("breadcrumbs.home"), href: "/dashboard" },
            { label: t("breadcrumbs.freelance"), href: "/freelance" },
            { label: t("breadcrumbs.services") },
          ]}
          actions={
            canExport ? (
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <FileDown className="size-4" />
                {t("export")}
              </Button>
            ) : undefined
          }
        />

        {/* Error banner */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{t("toasts.load_error")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void mutate()}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                {tc("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs — Desktop */}
        <Tabs value={tab} onValueChange={(v) => { void setActiveTab(v); void setPage(1); }}>
          {/* Desktop tab list */}
          <div className="hidden md:block overflow-x-auto">
            <TabsList className="h-auto gap-1 bg-muted/50 p-1 flex-wrap">
              {tabs.map((tabKey) => (
                <TabsTrigger key={tabKey} value={tabKey} className="text-sm">
                  {t(`tabs.${tabKey}` as Parameters<typeof t>[0])}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Mobile: combobox tab selector */}
          <div className="md:hidden">
            <ComboboxFilter
              options={tabs.map((tabKey) => ({
                value: tabKey,
                label: t(`tabs.${tabKey}` as Parameters<typeof t>[0]),
              }))}
              value={tab}
              onChange={(v) => { void setActiveTab(v || "all"); void setPage(1); }}
              placeholder={t("tabs.all")}
              buttonLabel={tc("filter")}
            />
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-2 items-center">
            <ComboboxFilter
              options={storeOptions}
              value={storeFilter}
              onChange={(v) => { void setStoreFilter(v); void setPage(1); }}
              placeholder={t("filters.store_placeholder")}
              buttonLabel={t("filters.store")}
            />
            <ComboboxFilter
              options={freelancerOptions}
              value={freelancerFilter}
              onChange={(v) => { void setFreelancerFilter(v); void setPage(1); }}
              placeholder={t("filters.freelancer_placeholder")}
              buttonLabel={t("filters.freelancer")}
            />
            {isNominal && (
              <ComboboxFilter
                options={agentOptions}
                value={agentFilter}
                onChange={(v) => { void setAgentFilter(v); void setPage(1); }}
                placeholder={t("filters.agent_placeholder")}
                buttonLabel={t("filters.agent")}
              />
            )}
            <ComboboxFilter
              options={workTypeOptions}
              value={workTypeFilter}
              onChange={(v) => { void setWorkTypeFilter(v); void setPage(1); }}
              placeholder={t("filters.work_type_placeholder")}
              buttonLabel={t("filters.work_type")}
            />
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                {tc("clearAll")}
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {storeFilter && (
                <FilterChip
                  label={t("filters.store")}
                  value={storeOptions.find((o) => o.value === storeFilter)?.label ?? storeFilter}
                  onRemove={() => { void setStoreFilter(""); void setPage(1); }}
                />
              )}
              {freelancerFilter && (
                <FilterChip
                  label={t("filters.freelancer")}
                  value={freelancerOptions.find((o) => o.value === freelancerFilter)?.label ?? freelancerFilter}
                  onRemove={() => { void setFreelancerFilter(""); void setPage(1); }}
                />
              )}
              {agentFilter && isNominal && (
                <FilterChip
                  label={t("filters.agent")}
                  value={agentOptions.find((o) => o.value === agentFilter)?.label ?? agentFilter}
                  onRemove={() => { void setAgentFilter(""); void setPage(1); }}
                />
              )}
              {workTypeFilter && (
                <FilterChip
                  label={t("filters.work_type")}
                  value={workTypeOptions.find((o) => o.value === workTypeFilter)?.label ?? workTypeFilter}
                  onRemove={() => { void setWorkTypeFilter(""); void setPage(1); }}
                />
              )}
            </div>
          )}

          {/* Table */}
          <ResponsiveDataTable
            columns={columns}
            data={services}
            mobileCardRender={mobileCardRender}
            isLoading={isLoading}
            isError={!!error}
            isEmpty={!isLoading && services.length === 0}
            emptyMessage={{ title: emptyState.title, description: emptyState.description }}
            pagination={{
              page,
              pageSize: 20,
              total,
              onPageChange: (p) => void setPage(p),
            }}
            onRowClick={(row, e) => {
              if (e.metaKey || e.ctrlKey) {
                window.open(`/freelance/services?id=${row.id}`, "_blank");
                return;
              }
              openDetail(row);
            }}
          />
        </Tabs>

        {/* Detail Sheet */}
        <ServiceDetailSheet
          service={detailService}
          noShowReport={detailService ? noShowMap.get(detailService.id) : null}
          paymentMode={paymentMode}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          canAdjustAmount={canAdjustAmount}
          canConfirm={canConfirm}
          canSendToLegal={canSendToLegal}
          onConfirm={handleConfirm}
          onDispute={(s) => { setDisputeTargetService(s); setDisputeOpen(true); }}
          onAdjustAmount={(s) => { setAdjustService(s); setAdjustOpen(true); }}
          onSendToLegal={handleSendToLegal}
        />

        {/* Adjust Amount Dialog */}
        <AdjustAmountDialog
          service={adjustService}
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          onSubmit={handleAdjustSubmit}
          isSubmitting={isSubmitting}
        />

        {/* Dispute Dialog */}
        <DisputeServiceDialog
          service={disputeTargetService}
          open={disputeOpen}
          onOpenChange={setDisputeOpen}
          onSubmit={handleDisputeSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </TooltipProvider>
  );
}
