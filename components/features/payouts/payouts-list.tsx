"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Calendar,
  Plus,
  Users,
  Star,
  Wallet,
  Award,
  MoreVertical,
  RefreshCw,
  XCircle,
  Download,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

import {
  getPayoutPeriods,
  createPayoutPeriod,
  exportPayout,
  type PayoutPeriod,
  type PayoutPeriodStatus,
} from "@/lib/api/payouts";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import { CreatePeriodForm } from "./create-period-form";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type ViewMode = "all" | PayoutPeriodStatus;

interface PayoutStageProps {
  currentStage: number;
}

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

function PayoutStatusBadge({
  status,
  t,
}: {
  status: PayoutPeriodStatus;
  t: ReturnType<typeof useTranslations<"screen.payouts">>;
}) {
  const config: Record<
    PayoutPeriodStatus,
    { variant: "info" | "warning" | "success" | "muted"; className: string }
  > = {
    OPEN: { variant: "info", className: "bg-info/10 text-info border-info/20" },
    CALCULATING: {
      variant: "warning",
      className: "bg-warning/10 text-warning border-warning/20",
    },
    READY: {
      variant: "success",
      className: "bg-success/10 text-success border-success/20",
    },
    PAID: {
      variant: "muted",
      className: "bg-muted text-muted-foreground border-border",
    },
  };

  const { className } = config[status];

  return (
    <Badge variant="outline" className={className}>
      {t(`status.${status}` as Parameters<typeof t>[0])}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STAGE INDICATOR (mini stepper)
// ═══════════════════════════════════════════════════════════════════

function StageIndicator({ currentStage }: PayoutStageProps) {
  const stages = [0, 1, 2, 3]; // Created, Calculating, Ready, Paid
  return (
    <div className="flex items-center gap-1.5">
      {stages.map((stage, idx) => (
        <div key={stage} className="flex items-center gap-1.5">
          <div
            className={`size-2 rounded-full ${
              stage < currentStage
                ? "bg-success"
                : stage === currentStage
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
            }`}
          />
          {idx < stages.length - 1 && (
            <div
              className={`h-0.5 w-3 ${
                stage < currentStage ? "bg-success" : "bg-muted-foreground/30"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function getStageNumber(status: PayoutPeriodStatus): number {
  switch (status) {
    case "OPEN":
      return 0;
    case "CALCULATING":
      return 1;
    case "READY":
      return 2;
    case "PAID":
      return 3;
    default:
      return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PERIOD CARD
// ═══════════════════════════════════════════════════════════════════

interface PeriodCardProps {
  period: PayoutPeriod;
  isNetworkOps: boolean;
  onExport: (id: string) => void;
}

function PeriodCard({ period, isNetworkOps, onExport }: PeriodCardProps) {
  const t = useTranslations("screen.payouts");
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("ru", { day: "numeric", month: "short" }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount) + " ₽";
  };

  const handleOpen = () => {
    router.push(`${ADMIN_ROUTES.payouts}/${period.id}`);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">
            {period.period_label}
          </h3>
          <PayoutStatusBadge status={period.status} t={t} />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="size-3.5" aria-hidden="true" />
          <span>
            {formatDate(period.period_start)} — {formatDate(period.period_end)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Users className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{period.employees_count}</span>
              <span className="text-xs text-muted-foreground">{t("card.stats_employees")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Star className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {new Intl.NumberFormat("ru-RU").format(period.total_points)}
              </span>
              <span className="text-xs text-muted-foreground">{t("card.stats_points")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Wallet className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{formatCurrency(period.total_rub)}</span>
              <span className="text-xs text-muted-foreground">{t("card.stats_amount")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Award className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">—</span>
              <span className="text-xs text-muted-foreground">{t("card.stats_bonus_tasks")}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <StageIndicator currentStage={getStageNumber(period.status)} />
        </div>
      </CardContent>

      <CardFooter className="gap-2 border-t pt-4">
        {isNetworkOps ? (
          <>
            <Button size="sm" onClick={handleOpen} className="flex-1">
              {t("actions.open")}
              <ChevronRight className="size-4 ml-1" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-9">
                  <MoreVertical className="size-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <RefreshCw className="size-4" />
                  {t("actions.recalculate")}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <XCircle className="size-4" />
                  {t("actions.cancel_period")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport(period.id)}>
                  <Download className="size-4" />
                  {t("actions.export")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={handleOpen} className="flex-1">
              {t("actions.open")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport(period.id)}>
              <Download className="size-4" />
              {t("actions.export")}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════

function PayoutsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="size-8" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-2 w-24" />
          </CardContent>
          <CardFooter className="gap-2 border-t pt-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="size-9" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function PayoutsList() {
  const t = useTranslations("screen.payouts");
  const tCommon = useTranslations("common");
  const router = useRouter();

  // Mock role check — in real app would come from auth context
  const isNetworkOps = true;
  const isHrManager = false;

  const [periods, setPeriods] = useState<PayoutPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusFilter = viewMode === "all" ? undefined : viewMode;
      const result = await getPayoutPeriods({ status: statusFilter });
      setPeriods(result.data);
    } catch (err) {
      setError((err as Error).message || "Failed to load periods");
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const handleCreatePeriod = async (data: {
    name: string;
    period_start: string;
    period_end: string;
    rate_per_point: number;
    store_ids?: number[];
    include_bonus: boolean;
  }) => {
    setCreating(true);
    try {
      const result = await createPayoutPeriod({
        name: data.name,
        period_start: data.period_start,
        period_end: data.period_end,
        rate_per_point: data.rate_per_point,
        store_ids: data.store_ids,
      });
      if (result.success && result.id) {
        toast.success(t("toasts.created"));
        setCreateDialogOpen(false);
        router.push(`${ADMIN_ROUTES.payouts}/${result.id}`);
      } else {
        toast.error(t("toasts.error"));
      }
    } catch {
      toast.error(t("toasts.error"));
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async (id: string) => {
    try {
      await exportPayout(id, "xlsx");
      toast.success(t("toasts.exported"));
    } catch {
      toast.error(t("toasts.error"));
    }
  };

  // Filter periods client-side for store filter (mock)
  const filteredPeriods = periods.filter((p) => {
    if (selectedStore === "all") return true;
    return p.store_id?.toString() === selectedStore;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.future"), href: "/" },
          { label: t("breadcrumbs.payouts") },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-info/10 text-info border-info/20">
              {t("beta_badge")}
            </Badge>
            {isNetworkOps && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4" />
                    {t("actions.create_period")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("create_dialog.title")}</DialogTitle>
                  </DialogHeader>
                  <CreatePeriodForm
                    onSubmit={handleCreatePeriod}
                    submitting={creating}
                    onCancel={() => setCreateDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 -mx-4 px-4 md:-mx-6 md:px-6 border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
            className="w-full md:w-auto"
          >
            <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
              <TabsTrigger value="all">
                {tCommon("all")}
              </TabsTrigger>
              <TabsTrigger value="OPEN">{t("tabs.open")}</TabsTrigger>
              <TabsTrigger value="CALCULATING">{t("tabs.calculating")}</TabsTrigger>
              <TabsTrigger value="READY">{t("tabs.ready")}</TabsTrigger>
              <TabsTrigger value="PAID">{t("tabs.paid")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select
            value={selectedStore}
            onValueChange={setSelectedStore}
            disabled={isHrManager}
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder={t("filters.store_label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all_stores")}</SelectItem>
              <SelectItem value="1">СПАР Томск, пр. Ленина 80</SelectItem>
              <SelectItem value="7">Food City Томск Global Market</SelectItem>
              <SelectItem value="3">СПАР Новосибирск, ул. Ленина 55</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <PayoutsListSkeleton />
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadPeriods}>
              <RefreshCw className="size-4 mr-1" />
              {tCommon("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : filteredPeriods.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={t("empty.no_periods_title")}
          description={t("empty.no_periods_subtitle")}
          action={
            isNetworkOps
              ? {
                  label: t("actions.create_period"),
                  onClick: () => setCreateDialogOpen(true),
                  icon: Plus,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPeriods.map((period) => (
            <PeriodCard
              key={period.id}
              period={period}
              isNetworkOps={isNetworkOps}
              onExport={handleExport}
            />
          ))}
        </div>
      )}
    </div>
  );
}
