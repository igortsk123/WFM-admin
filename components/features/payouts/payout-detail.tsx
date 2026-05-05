"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Calculator,
  CheckCircle2,
  Wallet,
  Users,
  Star,
  AlertTriangle,
  Download,
  Loader2,
  Search,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { UserCell } from "@/components/shared/user-cell";

import {
  getPayoutDetail,
  calculatePayout,
  finalizePayout,
  exportPayout,
  type PayoutPeriod,
  type PayoutRow,
  type PayoutPeriodStatus,
} from "@/lib/api/payouts";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type FilterMode = "all" | "anomalies" | "store" | "position";

interface StageTimelineProps {
  currentStatus: PayoutPeriodStatus;
}

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

function PayoutStatusBadge({
  status,
  t,
}: {
  status: PayoutPeriodStatus;
  t: ReturnType<typeof useTranslations<"screen.payoutDetail">>;
}) {
  const config: Record<
    PayoutPeriodStatus,
    { className: string }
  > = {
    OPEN: { className: "bg-info/10 text-info border-info/20" },
    CALCULATING: { className: "bg-warning/10 text-warning border-warning/20" },
    READY: { className: "bg-success/10 text-success border-success/20" },
    PAID: { className: "bg-muted text-muted-foreground border-border" },
  };

  const { className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      {t(`stages.${status.toLowerCase()}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STAGE TIMELINE
// ═══════════════════════════════════════════════════════════════════

function StageTimeline({ currentStatus }: StageTimelineProps) {
  const t = useTranslations("screen.payoutDetail.stages");

  const stages = [
    { key: "created", icon: Calendar, status: "OPEN" as const },
    { key: "calculating", icon: Calculator, status: "CALCULATING" as const },
    { key: "ready", icon: CheckCircle2, status: "READY" as const },
    { key: "paid", icon: Wallet, status: "PAID" as const },
  ];

  const currentIndex = stages.findIndex((s) => s.status === currentStatus);

  return (
    <div className="flex items-center justify-between overflow-x-auto py-2 px-1">
      {stages.map((stage, idx) => {
        const Icon = stage.icon;
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isPending = idx > currentIndex;

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "bg-success border-success text-success-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground",
                  isPending && "bg-muted border-border text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isCompleted && "text-success",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {t(stage.key as Parameters<typeof t>[0])}
              </span>
            </div>

            {idx < stages.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2",
                  idx < currentIndex ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EMPLOYEE ROW DRAWER
// ═══════════════════════════════════════════════════════════════════

interface EmployeeDrawerProps {
  row: PayoutRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EmployeeDrawer({ row, open, onOpenChange }: EmployeeDrawerProps) {
  const t = useTranslations("screen.payoutDetail.table");

  if (!row) return null;

  const nameParts = row.user_name.split(" ");
  const user = {
    last_name: nameParts[0] || "",
    first_name: nameParts[1] || "",
    middle_name: nameParts[2],
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + " ₽";
  };

  // Mock anomaly detection
  const hasAnomaly = row.points_earned > 1500;
  const anomalyText = hasAnomaly
    ? "На 80% выше среднего по магазину"
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("drawer_title")}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-4">
          <div className="space-y-6">
            {/* Employee info */}
            <div className="flex items-center gap-3">
              <UserCell user={user} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Магазин</span>
                <p className="font-medium">{row.store_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Задач выполнено</span>
                <p className="font-medium">{row.tasks_completed}</p>
              </div>
            </div>

            <Separator />

            {/* Bonus tasks section */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t("bonus_tasks_section")}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                  <span>Bonus tasks выполнено</span>
                  <span className="font-medium">{row.bonus_tasks_completed}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                  <span>Очков за bonus tasks</span>
                  <span className="font-medium">{row.bonus_tasks_completed * 150}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Calculation section */}
            <div>
              <h4 className="text-sm font-medium mb-3">{t("calculation_section")}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <span>Очков всего</span>
                  <span className="font-medium">{row.points_earned}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <span>Стоимость очка</span>
                  <span className="font-medium">1 ₽</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20">
                  <span className="font-medium">Итого к выплате</span>
                  <span className="font-semibold text-primary">{formatCurrency(row.rub_amount)}</span>
                </div>
              </div>
            </div>

            {/* Anomalies section */}
            {hasAnomaly && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">{t("anomaly_section")}</h4>
                  <Alert variant="destructive">
                    <AlertTriangle className="size-4" />
                    <AlertDescription>{anomalyText}</AlertDescription>
                  </Alert>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CALCULATE DIALOG
// ═══════════════════════════════════════════════════════════════════

interface CalculateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}

function CalculateDialog({ open, onOpenChange, onConfirm, loading }: CalculateDialogProps) {
  const t = useTranslations("screen.payoutDetail.calculate_dialog");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FINALIZE DIALOG
// ═══════════════════════════════════════════════════════════════════

interface FinalizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (text: string) => void;
  loading: boolean;
}

function FinalizeDialog({ open, onOpenChange, onConfirm, loading }: FinalizeDialogProps) {
  const t = useTranslations("screen.payoutDetail.finalize_dialog");
  const [confirmText, setConfirmText] = useState("");

  const isValid = confirmText.toUpperCase() === "FINALIZE";

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(confirmText);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            placeholder={t("confirm_label")}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={loading}
          />
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!isValid || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {t("confirm_button")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CALCULATING PROGRESS
// ═══════════════════════════════════════════════════════════════════

function CalculatingProgress() {
  const t = useTranslations("screen.payoutDetail.actions");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{t("calculating_hint")}</span>
      <Progress value={progress} className="w-24 h-2" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════

function PayoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full max-w-2xl" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function PayoutDetail({ id }: { id: string }) {
  const t = useTranslations("screen.payoutDetail");
  const tCommon = useTranslations("common");

  // Mock role check
  const isNetworkOps = true;

  const [period, setPeriod] = useState<(PayoutPeriod & { rows: PayoutRow[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<PayoutRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const loadPeriod = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPayoutDetail(id);
      setPeriod(result.data);
    } catch (err) {
      setError((err as Error).message || "Failed to load period");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPeriod();
  }, [loadPeriod]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!period) return [];

    let rows = period.rows;

    // Filter by mode
    if (filterMode === "anomalies") {
      rows = rows.filter((r) => r.points_earned > 1500);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.user_name.toLowerCase().includes(query) ||
          r.store_name.toLowerCase().includes(query)
      );
    }

    return rows;
  }, [period, filterMode, searchQuery]);

  // Stats
  const anomalyCount = useMemo(() => {
    if (!period) return 0;
    return period.rows.filter((r) => r.points_earned > 1500).length;
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + " ₽";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("ru", { day: "numeric", month: "short" }).format(date);
  };

  // Handlers
  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const result = await calculatePayout(id);
      if (result.success) {
        toast.success(t("toasts.calculation_started"));
        setCalculateDialogOpen(false);
        // Simulate calculation time
        setTimeout(() => {
          toast.success(t("toasts.calculation_done", { anomalies: anomalyCount }));
          loadPeriod();
        }, 3000);
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setCalculating(false);
    }
  };

  const handleFinalize = async (confirmText: string) => {
    setFinalizing(true);
    try {
      // Note: API expects "подтвердить" but we accept "FINALIZE" per spec
      const result = await finalizePayout(id, "подтвердить");
      if (result.success) {
        toast.success(t("toasts.finalized"));
        setFinalizeDialogOpen(false);
        loadPeriod();
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setFinalizing(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportPayout(id, "xlsx");
      toast.success(t("toasts.exported"));
    } catch {
      toast.error(t("toasts.error"));
    }
  };

  const handleRowClick = (row: PayoutRow) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  // Action buttons based on status
  const renderActions = () => {
    if (!period) return null;

    switch (period.status) {
      case "OPEN":
        return (
          <Button onClick={() => setCalculateDialogOpen(true)}>
            <Calculator className="size-4" />
            {t("actions.start_calculation")}
          </Button>
        );
      case "CALCULATING":
        return <CalculatingProgress />;
      case "READY":
        return (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCalculateDialogOpen(true)}>
              <RefreshCw className="size-4" />
              {t("actions.recalculate")}
            </Button>
            <Button onClick={() => setFinalizeDialogOpen(true)}>
              {t("actions.finalize")}
            </Button>
          </div>
        );
      case "PAID":
        return (
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            {t("actions.export_xlsx")}
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <PayoutDetailSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadPeriod}>
            <RefreshCw className="size-4 mr-1" />
            {tCommon("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!period) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={period.period_label}
        subtitle={`${formatDate(period.period_start)} — ${formatDate(period.period_end)} · ${t("summary.employees")}: ${period.employees_count}`}
        breadcrumbs={[
          { label: t("breadcrumbs.payouts"), href: ADMIN_ROUTES.payouts },
          { label: period.period_label },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <PayoutStatusBadge status={period.status} t={t} />
            {renderActions()}
          </div>
        }
      />

      {/* Stage Timeline */}
      <Card>
        <CardContent className="py-4">
          <StageTimeline currentStatus={period.status} />
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard
          label={t("summary.employees")}
          value={period.employees_count}
          icon={Users}
        />
        <KpiCard
          label={t("summary.points_total")}
          value={new Intl.NumberFormat("ru-RU").format(period.total_points)}
          icon={Star}
        />
        <KpiCard
          label={t("summary.amount_total")}
          value={formatCurrency(period.total_rub)}
          icon={Wallet}
        />
        <KpiCard
          label={t("summary.anomalies")}
          value={anomalyCount}
          icon={AlertTriangle}
          className={anomalyCount > 0 ? "border-warning/50" : undefined}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filterMode === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterMode("all")}
          >
            {t("filters.all")}
          </Button>
          <Button
            variant={filterMode === "anomalies" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterMode("anomalies")}
            className={anomalyCount > 0 ? "gap-1.5" : ""}
          >
            {t("filters.anomalies")}
            {anomalyCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {anomalyCount}
              </Badge>
            )}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t("filters.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full md:w-64"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">{t("table.columns.user")}</TableHead>
                  <TableHead>{t("table.columns.store")}</TableHead>
                  <TableHead className="text-right">{t("table.columns.bonus_tasks")}</TableHead>
                  <TableHead className="text-right">{t("table.columns.points")}</TableHead>
                  <TableHead className="text-right">{t("table.columns.rate")}</TableHead>
                  <TableHead className="text-right">{t("table.columns.amount")}</TableHead>
                  <TableHead>{t("table.columns.anomalies")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const nameParts = row.user_name.split(" ");
                  const user = {
                    last_name: nameParts[0] || "",
                    first_name: nameParts[1] || "",
                    middle_name: nameParts[2],
                  };
                  const hasAnomaly = row.points_earned > 1500;

                  return (
                    <TableRow
                      key={row.user_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(row)}
                    >
                      <TableCell>
                        <UserCell user={user} />
                      </TableCell>
                      <TableCell className="text-sm">{row.store_name}</TableCell>
                      <TableCell className="text-right">{row.bonus_tasks_completed}</TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat("ru-RU").format(row.points_earned)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">1</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(row.rub_amount)}
                      </TableCell>
                      <TableCell>
                        {hasAnomaly && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            <AlertTriangle className="size-3 mr-1" />
                            1
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CalculateDialog
        open={calculateDialogOpen}
        onOpenChange={setCalculateDialogOpen}
        onConfirm={handleCalculate}
        loading={calculating}
      />

      <FinalizeDialog
        open={finalizeDialogOpen}
        onOpenChange={setFinalizeDialogOpen}
        onConfirm={handleFinalize}
        loading={finalizing}
      />

      <EmployeeDrawer
        row={selectedRow}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
