"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Sparkles,
  User,
  ExternalLink,
  History,
  Mail,
  Target,
} from "lucide-react";

import { getNetworkGoals, type NetworkGoalStore } from "@/lib/api/ai-performance";
import { computeGoalProgress } from "@/lib/utils/goals-progress";

const NetworkGoalsSparkline = dynamic(
  () =>
    import("./network-goals-sparkline").then((m) => m.NetworkGoalsSparkline),
  { ssr: false, loading: () => null }
);
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDataTable,
  FilterChip,
  MobileFilterSheet,
  EmptyState,
  UserCell,
} from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import { useRouter } from "@/i18n/navigation";

type StatusFilter = "all" | "with_goal" | "without_goal" | "completed";
type RegionFilter = string | null;

export function StoresTab() {
  const t = useTranslations("screen.networkGoals.stores_tab");
  const tActions = useTranslations("screen.networkGoals.actions");
  const tCommon = useTranslations("common");
  const tEmpty = useTranslations("screen.networkGoals.empty");
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(true);
  const [data, setData] = React.useState<NetworkGoalStore[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [regionFilter, setRegionFilter] = React.useState<RegionFilter>(null);

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const hasGoal =
          statusFilter === "with_goal"
            ? true
            : statusFilter === "without_goal"
              ? false
              : undefined;

        const result = await getNetworkGoals({
          has_goal: hasGoal,
          region: regionFilter ?? undefined,
        });
        setData(result.data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [statusFilter, regionFilter]);

  // Get unique regions for filter
  const regions = React.useMemo(() => {
    const unique = new Set(data.map((s) => s.region ?? ""));
    return Array.from(unique).filter((r): r is string => Boolean(r));
  }, [data]);

  // Filter chips
  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) + (regionFilter ? 1 : 0);

  const clearAllFilters = () => {
    setStatusFilter("all");
    setRegionFilter(null);
  };

  // Row click handler
  const handleRowClick = (row: NetworkGoalStore, event: React.MouseEvent) => {
    const isNewTab = event.metaKey || event.ctrlKey;
    const url = row.active_goal
      ? ADMIN_ROUTES.goalDetail(row.active_goal.id)
      : ADMIN_ROUTES.storeDetail(String(row.id));

    if (isNewTab) {
      window.open(url, "_blank");
    } else {
      router.push(url);
    }
  };

  // Define columns
  const columns: ColumnDef<NetworkGoalStore>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("columns.store"),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-medium text-foreground truncate">
              {row.original.name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {row.original.region}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "active_goal",
        header: t("columns.active_goal"),
        cell: ({ row }) => {
          const goal = row.original.active_goal;
          if (!goal) {
            return (
              <Badge variant="outline" className="text-muted-foreground">
                {t("status_options.without_goal")}
              </Badge>
            );
          }
          return (
            <span className="font-medium text-foreground truncate max-w-[200px] block">
              {goal.title}
            </span>
          );
        },
      },
      {
        accessorKey: "progress",
        header: t("columns.progress"),
        cell: ({ row }) => {
          const goal = row.original.active_goal;
          if (!goal) return <span className="text-muted-foreground">—</span>;

          const progress = computeGoalProgress(goal);
          return (
            <div className="flex items-center gap-2 w-24">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-xs font-medium tabular-nums w-8">
                {progress}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "set_by",
        header: t("columns.set_by"),
        cell: ({ row }) => {
          const goal = row.original.active_goal;
          if (!goal || !goal.set_by) {
            return <span className="text-muted-foreground">—</span>;
          }
          return <UserCell user={goal.set_by} />;
        },
      },
      {
        accessorKey: "days_left",
        header: t("columns.days_left"),
        cell: ({ row }) => {
          const goal = row.original.active_goal;
          if (!goal) return <span className="text-muted-foreground">—</span>;

          const isUrgent = goal.days_left <= 3;
          return (
            <span
              className={cn(
                "font-medium tabular-nums",
                isUrgent ? "text-warning" : "text-foreground"
              )}
            >
              {goal.days_left}
            </span>
          );
        },
      },
      {
        accessorKey: "source",
        header: t("columns.source"),
        cell: ({ row }) => {
          const goal = row.original.active_goal;
          if (!goal) return <span className="text-muted-foreground">—</span>;

          const isAi = goal.proposed_by === "AI";
          return (
            <Badge
              variant="secondary"
              className={cn(
                "gap-1",
                isAi && "bg-info/10 text-info border-info/20"
              )}
            >
              {isAi && <Sparkles className="size-3" />}
              {isAi ? t("source.ai") : t("source.manager")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "trend",
        header: t("columns.trend"),
        cell: ({ row }) => {
          const goal = row.original.active_goal;
          if (!goal || !goal.trend_7d)
            return <span className="text-muted-foreground">—</span>;

          const trend = goal.trend_7d;
          const isUp = trend[trend.length - 1] >= trend[0];

          return (
            <div className="w-16 h-6" aria-hidden="true">
              <NetworkGoalsSparkline data={trend} isUp={isUp} />
            </div>
          );
        },
      },
      {
        id: "actions",
        header: t("columns.actions"),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">{tCommon("actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  row.original.active_goal &&
                  router.push(
                    ADMIN_ROUTES.goalDetail(row.original.active_goal.id)
                  )
                }
                disabled={!row.original.active_goal}
              >
                <Target className="size-4" />
                {tActions("open_goal")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(ADMIN_ROUTES.storeDetail(String(row.original.id)))
                }
              >
                <ExternalLink className="size-4" />
                {tActions("open_store")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <History className="size-4" />
                {tActions("store_goals_history")}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="size-4" />
                {tActions("contact_director")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, tActions, tCommon, router]
  );

  // Filter content for desktop + mobile
  const filterContent = (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("filters.status_label")}</label>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            <SelectItem value="with_goal">
              {t("status_options.with_goal")}
            </SelectItem>
            <SelectItem value="without_goal">
              {t("status_options.without_goal")}
            </SelectItem>
            <SelectItem value="completed">
              {t("status_options.completed")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("filters.region_label")}</label>
        <Select
          value={regionFilter ?? "all"}
          onValueChange={(v) => setRegionFilter(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );

  // Mobile card render
  const mobileCardRender = (row: NetworkGoalStore) => (
    <StoreRowCard store={row} onRowClick={handleRowClick} />
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title={tEmpty("no_data_title")}
        description={tEmpty("no_data_cta")}
        action={{
          label: tEmpty("no_data_cta"),
          href: ADMIN_ROUTES.aiSuggestions,
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop Filters */}
      <div className="hidden md:flex items-center gap-4 flex-wrap">
        {filterContent}

        {/* Active filters chips */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 ml-2">
            {statusFilter !== "all" && (
              <FilterChip
                label={t("filters.status_label")}
                value={t(`status_options.${statusFilter}` as Parameters<typeof t>[0])}
                onRemove={() => setStatusFilter("all")}
              />
            )}
            {regionFilter && (
              <FilterChip
                label={t("filters.region_label")}
                value={regionFilter}
                onRemove={() => setRegionFilter(null)}
              />
            )}
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground h-auto p-0"
              onClick={clearAllFilters}
            >
              {tCommon("clearAll")}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        activeCount={activeFiltersCount}
        onClearAll={clearAllFilters}
        onApply={() => {}}
      >
        {filterContent}
      </MobileFilterSheet>

      {/* Data Table */}
      <ResponsiveDataTable
        columns={columns}
        data={data}
        mobileCardRender={mobileCardRender}
        isLoading={isLoading}
        isEmpty={data.length === 0}
        onRowClick={handleRowClick}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOBILE CARD
// ═══════════════════════════════════════════════════════════════════

interface StoreRowCardProps {
  store: NetworkGoalStore;
  onRowClick: (store: NetworkGoalStore, event: React.MouseEvent) => void;
}

function StoreRowCard({ store, onRowClick }: StoreRowCardProps) {
  const t = useTranslations("screen.networkGoals.stores_tab");
  const goal = store.active_goal;
  const progress = goal ? computeGoalProgress(goal) : 0;

  return (
    <div
      className="flex flex-col gap-3"
      onClick={(e) => onRowClick(store, e)}
      role="button"
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-medium text-foreground">{store.name}</span>
          <span className="text-xs text-muted-foreground">{store.region}</span>
        </div>
        {goal ? (
          <Badge
            variant="secondary"
            className={cn(
              "gap-1 shrink-0",
              goal.proposed_by === "AI" && "bg-info/10 text-info border-info/20"
            )}
          >
            {goal.proposed_by === "AI" && <Sparkles className="size-3" />}
            {goal.proposed_by === "AI" ? t("source.ai") : t("source.manager")}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground shrink-0">
            {t("status_options.without_goal")}
          </Badge>
        )}
      </div>

      {/* Goal info */}
      {goal && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-foreground">{goal.title}</span>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-xs font-medium tabular-nums">{progress}%</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="size-3" />
              <span>
                {goal.set_by?.last_name} {goal.set_by?.first_name.charAt(0)}.
              </span>
            </div>
            <span
              className={cn(
                "tabular-nums",
                goal.days_left <= 3 && "text-warning font-medium"
              )}
            >
              {goal.days_left} {t("columns.days_left").toLowerCase()}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
