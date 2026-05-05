"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Download,
  Link2,
  MoreVertical,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CircleDollarSign,
  Users,
  Info,
  FileText,
  Clock,
  AlertCircle,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { UserCell } from "@/components/shared/user-cell";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { PayoutStatusBadge } from "@/components/shared/payout-status-badge";

import {
  getPayouts,
  getPayoutById,
  getClosingDocumentUrl,
  retryPayout,
} from "@/lib/api/freelance-payouts";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";
import type { Payout, Service } from "@/lib/types";

// ───────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n) + " ₽";

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(dateStr)
  );

const formatShortDate = (dateStr: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(dateStr));

// Derive freelancer pseudo-object for UserCell
function freelancerToUser(name: string) {
  const parts = name.trim().split(" ");
  return {
    last_name: parts[0] ?? "",
    first_name: parts[1] ?? "",
    middle_name: parts[2],
  };
}

// ───────────────────────────────────────────────────────────────────
// NOMINAL ACCOUNT STATUS (mock — in production from org settings)
// ───────────────────────────────────────────────────────────────────

type NominalAccountStatus = "CONNECTED" | "NOT_CONNECTED" | "ERROR";

interface NominalAccountState {
  status: NominalAccountStatus;
  last_error?: string;
}

const MOCK_NOMINAL_ACCOUNT: NominalAccountState = {
  status: "CONNECTED",
};

// ───────────────────────────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────────────────────────

type TabStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";

interface Filters {
  freelancerId: string;
  agentId: string;
  dateFrom: string;
  dateTo: string;
  store: string;
}

interface DetailedPayout extends Payout {
  services_data?: Service[];
}

// ───────────────────────────────────────────────────────────────────
// KPI BLOCK
// ───────────────────────────────────────────────────────────────────

interface KpiBlockProps {
  payouts: Payout[];
}

function KpiBlock({ payouts }: KpiBlockProps) {
  const t = useTranslations("screen.freelancePayoutsList");

  const paidSum = payouts
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.gross_amount, 0);
  const feeSum = payouts
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + p.nominal_account_fee, 0);
  const agentSum = payouts
    .filter((p) => p.status === "PAID" && p.agent_commission)
    .reduce((s, p) => s + (p.agent_commission ?? 0), 0);
  const pendingSum = payouts
    .filter((p) => p.status === "PENDING" || p.status === "PROCESSING")
    .reduce((s, p) => s + p.gross_amount, 0);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard icon={CircleDollarSign} label={t("kpi.paid_total")} value={formatCurrency(paidSum)} />
      <KpiCard icon={Info} label={t("kpi.fee_total")} value={formatCurrency(feeSum)} />
      <KpiCard icon={Users} label={t("kpi.agent_total")} value={formatCurrency(agentSum)} />
      <KpiCard icon={Clock} label={t("kpi.pending_total")} value={formatCurrency(pendingSum)} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// DETAIL SHEET
// ───────────────────────────────────────────────────────────────────

interface PayoutDetailSheetProps {
  payoutId: string | null;
  onClose: () => void;
  onRetry: (id: string) => void;
}

function PayoutDetailSheet({ payoutId, onClose, onRetry }: PayoutDetailSheetProps) {
  const t = useTranslations("screen.freelancePayoutsList");
  const [detail, setDetail] = useState<DetailedPayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  // Load payout details when sheet opens
  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await getPayoutById(id);
      setDetail(res.data as unknown as DetailedPayout);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // When payoutId changes
  useEffect(() => {
    if (payoutId) {
      setDetail(null);
      loadDetail(payoutId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutId]);

  const handleDownloadAct = async () => {
    if (!detail) return;
    setDocLoading(true);
    try {
      const res = await getClosingDocumentUrl(detail.id);
      window.open(res.data.url, "_blank");
    } catch (e) {
      toast.error(t("toasts.doc_error"));
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <Sheet open={!!payoutId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side="right">
        <SheetHeader className="pb-4">
          <SheetTitle>{t("sheet.title")}</SheetTitle>
        </SheetHeader>

        {loading || !detail ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header: date + freelancer */}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <UserCell
                  user={freelancerToUser(detail.freelancer_name)}
                  className="mb-1"
                />
                <p className="text-sm text-muted-foreground pl-[42px]">
                  {formatDate(detail.payout_date)}
                </p>
              </div>
              <PayoutStatusBadge status={detail.status} />
            </div>

            <Separator />

            {/* Amount card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("sheet.amount_card")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("sheet.gross")}</span>
                  <span className="font-medium">{formatCurrency(detail.gross_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("sheet.fee")}</span>
                  <span className="text-destructive">−{formatCurrency(detail.nominal_account_fee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>{t("sheet.net")}</span>
                  <span>{formatCurrency(detail.net_amount)}</span>
                </div>
                {detail.agent_commission && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("sheet.agent_commission")}</span>
                    <span>{formatCurrency(detail.agent_commission)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services table */}
            {(detail.services_data as Service[] | undefined)?.length ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("sheet.services_table")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{t("sheet.service_date")}</TableHead>
                        <TableHead className="text-xs">{t("sheet.service_store")}</TableHead>
                        <TableHead className="text-xs text-right">{t("sheet.service_hours")}</TableHead>
                        <TableHead className="text-xs text-right">{t("sheet.service_amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail.services_data as Service[]).map((svc) => (
                        <TableRow key={svc.id}>
                          <TableCell className="text-xs py-2">
                            {formatShortDate(svc.service_date)}
                          </TableCell>
                          <TableCell className="text-xs py-2 max-w-[100px] truncate">
                            {svc.store_name}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            {svc.payable_hours}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-right font-medium">
                            {svc.total_amount ? formatCurrency(svc.total_amount) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            {/* Documents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("sheet.documents_card")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detail.closing_doc_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={handleDownloadAct}
                    disabled={docLoading}
                  >
                    <FileText className="size-4 text-muted-foreground" />
                    {t("sheet.closing_doc")}
                    <ExternalLink className="size-3 ml-auto text-muted-foreground" />
                  </Button>
                ) : null}
                {detail.nominal_account_ref ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Link2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {t("sheet.nominal_ref")}:&nbsp;
                    </span>
                    <span className="font-mono text-xs truncate">{detail.nominal_account_ref}</span>
                  </div>
                ) : null}
                {!detail.closing_doc_url && !detail.nominal_account_ref && (
                  <p className="text-sm text-muted-foreground">{t("sheet.no_history")}</p>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("sheet.history_card")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detail.failure_reason ? (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="size-4 mt-0.5 shrink-0" />
                    <span>{detail.failure_reason}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("sheet.no_history")}</p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {detail.status === "FAILED" && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 min-h-11"
                  onClick={() => onRetry(detail.id)}
                >
                  <RefreshCw className="size-4 mr-1.5" />
                  {t("sheet.retry_action")}
                </Button>
              )}
              {detail.status === "PAID" && detail.closing_doc_url && (
                <Button
                  size="sm"
                  className="flex-1 min-h-11"
                  onClick={handleDownloadAct}
                  disabled={docLoading}
                >
                  <Download className="size-4 mr-1.5" />
                  {t("sheet.download_act")}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ───────────────────────────────────────────────────────────────────
// MOBILE CARD
// ───────────────────────────────────────────────────────────────────

function PayoutMobileCard({
  payout,
  onMenuAction,
}: {
  payout: Payout;
  onMenuAction: (action: "details" | "retry" | "download", id: string) => void;
}) {
  const t = useTranslations("screen.freelancePayoutsList");

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <UserCell user={freelancerToUser(payout.freelancer_name)} />
        <p className="text-xs text-muted-foreground pl-[42px]">
          {formatDate(payout.payout_date)}
        </p>
        <div className="flex items-center gap-2 pl-[42px]">
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(payout.net_amount)}
          </span>
          <PayoutStatusBadge status={payout.status} />
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={t("columns.status")}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onMenuAction("details", payout.id)}>
            {t("menu.open_details")}
          </DropdownMenuItem>
          {payout.status === "PAID" && (
            <DropdownMenuItem onSelect={() => onMenuAction("download", payout.id)}>
              <Download className="size-4" />
              {t("menu.download_act")}
            </DropdownMenuItem>
          )}
          {payout.status === "FAILED" && (
            <DropdownMenuItem
              onSelect={() => onMenuAction("retry", payout.id)}
              className="text-destructive focus:text-destructive"
            >
              <RefreshCw className="size-4" />
              {t("menu.retry")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────────────────────────

export function FreelancePayoutsList() {
  const t = useTranslations("screen.freelancePayoutsList");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { user } = useAuth();

  const isNetworkOps =
    user.role === "NETWORK_OPS" || user.role === "REGIONAL";
  const isReadOnly = user.role === "HR_MANAGER";

  // ── state ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabStatus>("PENDING");
  const [allPayouts, setAllPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    freelancerId: "",
    agentId: "",
    dateFrom: "",
    dateTo: "",
    store: "",
  });
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [retryTargetId, setRetryTargetId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [notifyErrors, setNotifyErrors] = useState(false);

  const nominalAccount = MOCK_NOMINAL_ACCOUNT;

  // ── load payouts ──────────────────────────────────────────────────
  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPayouts({
        page_size: 100,
        sort_by: "payout_date",
        sort_dir: "desc",
      });
      setAllPayouts(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── filter options ─────────────────────────────────────────────────
  const freelancerOptions = useMemo<ComboboxOption[]>(() => {
    const seen = new Set<number>();
    return allPayouts
      .filter((p) => {
        if (seen.has(p.freelancer_id)) return false;
        seen.add(p.freelancer_id);
        return true;
      })
      .map((p) => ({
        value: String(p.freelancer_id),
        label: p.freelancer_name,
      }));
  }, [allPayouts]);

  const agentOptions = useMemo<ComboboxOption[]>(() => {
    const seen = new Set<string>();
    return allPayouts
      .filter((p) => {
        if (!p.agent_id || seen.has(p.agent_id)) return false;
        seen.add(p.agent_id);
        return true;
      })
      .map((p) => ({ value: p.agent_id!, label: p.agent_id! }));
  }, [allPayouts]);

  // ── filtered payouts ──────────────────────────────────────────────
  const tabPayouts = useMemo(() => {
    return allPayouts.filter((p) => {
      if (p.status !== activeTab) return false;
      if (filters.freelancerId && String(p.freelancer_id) !== filters.freelancerId) return false;
      if (filters.agentId && p.agent_id !== filters.agentId) return false;
      if (filters.dateFrom && p.payout_date < filters.dateFrom) return false;
      if (filters.dateTo && p.payout_date > filters.dateTo) return false;
      return true;
    });
  }, [allPayouts, activeTab, filters]);

  // ── counts per tab ────────────────────────────────────────────────
  const tabCounts = useMemo(
    () => ({
      PENDING: allPayouts.filter((p) => p.status === "PENDING").length,
      PROCESSING: allPayouts.filter((p) => p.status === "PROCESSING").length,
      PAID: allPayouts.filter((p) => p.status === "PAID").length,
      FAILED: allPayouts.filter((p) => p.status === "FAILED").length,
    }),
    [allPayouts]
  );

  // ── actions ────────────────────────────────────────────────────────
  const handleMenuAction = useCallback(
    async (action: "details" | "retry" | "download", id: string) => {
      if (action === "details") {
        setSelectedPayoutId(id);
      } else if (action === "retry") {
        setRetryTargetId(id);
      } else if (action === "download") {
        try {
          const res = await getClosingDocumentUrl(id);
          window.open(res.data.url, "_blank");
        } catch {
          toast.error(t("toasts.doc_error"));
        }
      }
    },
    [t]
  );

  const handleConfirmRetry = useCallback(async () => {
    if (!retryTargetId) return;
    setRetrying(true);
    try {
      const res = await retryPayout(retryTargetId);
      if (res.success) {
        toast.success(t("toasts.retry_success"));
        await loadPayouts();
      } else {
        toast.error(res.error?.message ?? t("toasts.retry_error"));
      }
    } finally {
      setRetrying(false);
      setRetryTargetId(null);
    }
  }, [retryTargetId, loadPayouts, t]);

  // ── columns ────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Payout>[]>(
    () => [
      {
        accessorKey: "payout_date",
        header: t("columns.payout_date"),
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{formatDate(row.original.payout_date)}</span>
        ),
      },
      {
        accessorKey: "freelancer_name",
        header: t("columns.freelancer"),
        cell: ({ row }) => (
          <UserCell user={freelancerToUser(row.original.freelancer_name)} />
        ),
      },
      {
        id: "stores",
        header: t("columns.stores"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">—</span>
        ),
      },
      {
        id: "services_count",
        header: t("columns.services_count"),
        cell: ({ row }) => (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`${ADMIN_ROUTES.freelanceServices}?payout_id=${row.original.id}`);
            }}
          >
            {row.original.services.length}
          </Button>
        ),
      },
      {
        id: "gross_amount",
        header: t("columns.gross_amount"),
        cell: ({ row }) => (
          <span className="text-sm font-medium">{formatCurrency(row.original.gross_amount)}</span>
        ),
      },
      {
        id: "nominal_fee",
        header: () => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 text-left">
                {t("columns.nominal_fee")}
                <Info className="size-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>{t("fee_tooltip")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
            {formatCurrency(row.original.nominal_account_fee)}
          </Badge>
        ),
      },
      {
        id: "net_amount",
        header: t("columns.net_amount"),
        cell: ({ row }) => (
          <span className="text-sm font-semibold">{formatCurrency(row.original.net_amount)}</span>
        ),
      },
      {
        id: "agent_commission",
        header: t("columns.agent_commission"),
        cell: ({ row }) =>
          row.original.agent_commission ? (
            <span className="text-sm">{formatCurrency(row.original.agent_commission)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: ({ row }) => <PayoutStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const payout = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={tCommon("actions")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleMenuAction("details", payout.id)}>
                  {t("menu.open_details")}
                </DropdownMenuItem>
                {payout.status === "PAID" && (
                  <DropdownMenuItem onSelect={() => handleMenuAction("download", payout.id)}>
                    <Download className="size-4" />
                    {t("menu.download_act")}
                  </DropdownMenuItem>
                )}
                {payout.status === "FAILED" && !isReadOnly && (
                  <DropdownMenuItem
                    onSelect={() => handleMenuAction("retry", payout.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <RefreshCw className="size-4" />
                    {t("menu.retry")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, tCommon, router, handleMenuAction, isReadOnly]
  );

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("page_title")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.freelance"), href: ADMIN_ROUTES.freelanceDashboard },
          { label: t("breadcrumbs.payouts") },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isNetworkOps && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="min-h-10"
              >
                <a href={`${ADMIN_ROUTES.integrations}#nominal-account`} target="_self">
                  <Link2 className="size-4" />
                  {t("actions.connect_nominal")}
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="min-h-10"
              onClick={() => toast.success(t("toasts.export_success"))}
            >
              <Download className="size-4" />
              {t("actions.export_csv")}
            </Button>
          </div>
        }
      />

      {/* Nominal Account Alerts */}
      {nominalAccount.status === "NOT_CONNECTED" && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("alerts.not_connected_title")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>{t("alerts.not_connected_desc")}</span>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="min-h-10"
              asChild
            >
              <a href={`${ADMIN_ROUTES.integrations}#nominal-account`}>
                {t("alerts.not_connected_action")}
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {nominalAccount.status === "ERROR" && (
        <Alert variant="default" className="border-warning/50 bg-warning/10 text-warning-foreground">
          <AlertTriangle className="size-4 text-warning" />
          <AlertTitle className="text-warning">{t("alerts.error_title")}</AlertTitle>
          <AlertDescription>
            {t("alerts.error_desc", {
              message: nominalAccount.last_error ?? "Unknown error",
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Block */}
      {!loading && !error && <KpiBlock payouts={allPayouts} />}

      {/* Tabs */}
      <div className="space-y-4">
        {/* Desktop tabs, mobile select */}
        <div className="hidden md:block">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabStatus)}
          >
            <TabsList>
              <TabsTrigger value="PENDING">
                {t("tabs.pending")}
                {tabCounts.PENDING > 0 && (
                  <Badge variant="secondary" className="ml-1.5 size-5 p-0 flex items-center justify-center text-xs">
                    {tabCounts.PENDING}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="PROCESSING">
                {t("tabs.processing")}
                {tabCounts.PROCESSING > 0 && (
                  <Badge variant="secondary" className="ml-1.5 size-5 p-0 flex items-center justify-center text-xs">
                    {tabCounts.PROCESSING}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="PAID">
                {t("tabs.paid")}
                {tabCounts.PAID > 0 && (
                  <Badge variant="secondary" className="ml-1.5 size-5 p-0 flex items-center justify-center text-xs">
                    {tabCounts.PAID}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="FAILED" className="data-[state=active]:text-destructive">
                {t("tabs.failed")}
                {tabCounts.FAILED > 0 && (
                  <Badge className="ml-1.5 size-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                    {tabCounts.FAILED}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile tab select */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as TabStatus)}>
            <SelectTrigger className="w-full min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">{t("tabs.pending")} ({tabCounts.PENDING})</SelectItem>
              <SelectItem value="PROCESSING">{t("tabs.processing")} ({tabCounts.PROCESSING})</SelectItem>
              <SelectItem value="PAID">{t("tabs.paid")} ({tabCounts.PAID})</SelectItem>
              <SelectItem value="FAILED">{t("tabs.failed")} ({tabCounts.FAILED})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <div className="w-full sm:w-48">
            <Combobox
              options={freelancerOptions}
              value={filters.freelancerId}
              onValueChange={(v) => setFilters((f) => ({ ...f, freelancerId: v }))}
              placeholder={t("filters.freelancer_placeholder")}
              searchPlaceholder={t("filters.freelancer")}
            />
          </div>
          <div className="w-full sm:w-44">
            <Combobox
              options={agentOptions}
              value={filters.agentId}
              onValueChange={(v) => setFilters((f) => ({ ...f, agentId: v }))}
              placeholder={t("filters.agent_placeholder")}
              searchPlaceholder={t("filters.agent")}
            />
          </div>
          <div className="flex gap-1">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm min-h-11 focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label={tCommon("from")}
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm min-h-11 focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label={tCommon("to")}
            />
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadPayouts}>
              <RefreshCw className="size-4 mr-1" />
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Notification subscribe (FAILED tab only) */}
      {activeTab === "FAILED" && !loading && (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Bell className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">
            {t("notification_subscribe")}
          </span>
          <Switch
            checked={notifyErrors}
            onCheckedChange={setNotifyErrors}
            aria-label={t("notification_subscribe")}
          />
        </div>
      )}

      {/* Data table */}
      <ResponsiveDataTable
        columns={columns}
        data={tabPayouts}
        isLoading={loading}
        emptyMessage={{
          title: t("empty.title"),
          description: t("empty.description"),
        }}
        onRowClick={(row) => setSelectedPayoutId(row.id)}
        mobileCardRender={(row) => (
          <PayoutMobileCard payout={row} onMenuAction={handleMenuAction} />
        )}
      />

      {/* Empty state CTA for services */}
      {!loading && !error && tabPayouts.length === 0 && (
        <div className="flex justify-center">
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push(ADMIN_ROUTES.freelanceServices)}
          >
            {t("empty.action")}
            <ExternalLink className="size-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Detail Sheet */}
      <PayoutDetailSheet
        payoutId={selectedPayoutId}
        onClose={() => setSelectedPayoutId(null)}
        onRetry={(id) => {
          setSelectedPayoutId(null);
          setRetryTargetId(id);
        }}
      />

      {/* Retry Confirm Dialog */}
      <AlertDialog
        open={!!retryTargetId}
        onOpenChange={(open) => !open && setRetryTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("retry_dialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("retry_dialog.message")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRetryTargetId(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRetry}
              disabled={retrying}
              className="min-h-10"
            >
              {retrying && <RefreshCw className="size-4 mr-1.5 animate-spin" />}
              {t("retry_dialog.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
