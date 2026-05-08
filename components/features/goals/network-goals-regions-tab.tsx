"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import { MapPin, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";

const NetworkGoalsSparkline = dynamic(
  () =>
    import("./network-goals-sparkline").then((m) => m.NetworkGoalsSparkline),
  { ssr: false, loading: () => null }
);

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ResponsiveDataTable, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface RegionData {
  id: string;
  name: string;
  stores_count: number;
  active_goals: number;
  avg_progress: number;
  ai_accepted: number;
  ai_rejected: number;
  trend_7d: number[];
}

// Mock data for regions
const MOCK_REGIONS: RegionData[] = [
  {
    id: "tomsk",
    name: "Томская обл.",
    stores_count: 4,
    active_goals: 3,
    avg_progress: 72,
    ai_accepted: 12,
    ai_rejected: 3,
    trend_7d: [65, 67, 68, 70, 71, 71, 72],
  },
  {
    id: "novosibirsk",
    name: "Новосибирская обл.",
    stores_count: 2,
    active_goals: 2,
    avg_progress: 58,
    ai_accepted: 8,
    ai_rejected: 5,
    trend_7d: [52, 54, 55, 56, 57, 58, 58],
  },
  {
    id: "kemerovo",
    name: "Кемеровская обл.",
    stores_count: 1,
    active_goals: 1,
    avg_progress: 81,
    ai_accepted: 5,
    ai_rejected: 1,
    trend_7d: [75, 76, 78, 79, 80, 80, 81],
  },
];

export function RegionsTab() {
  const t = useTranslations("screen.networkGoals.regions_tab");
  const tActions = useTranslations("screen.networkGoals.actions");
  const tCommon = useTranslations("common");

  const [isLoading, setIsLoading] = React.useState(true);
  const [data, setData] = React.useState<RegionData[]>([]);

  // Fetch data (simulated)
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 400));
      setData(MOCK_REGIONS);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // Define columns
  const columns: ColumnDef<RegionData>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("columns.region"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "stores_count",
        header: t("columns.stores"),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.stores_count}</span>
        ),
      },
      {
        accessorKey: "active_goals",
        header: t("columns.active_goals"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="tabular-nums font-medium">
              {row.original.active_goals}
            </span>
            <span className="text-xs text-muted-foreground">
              / {row.original.stores_count}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "avg_progress",
        header: t("columns.avg_progress"),
        cell: ({ row }) => {
          const progress = row.original.avg_progress;
          return (
            <div className="flex items-center gap-2 w-28">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-xs font-medium tabular-nums w-8">
                {progress}%
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "ai_accepted",
        header: t("columns.ai_accepted"),
        cell: ({ row }) => (
          <Badge variant="secondary" className="bg-success/10 text-success gap-1">
            <TrendingUp className="size-3" />
            {row.original.ai_accepted}
          </Badge>
        ),
      },
      {
        accessorKey: "ai_rejected",
        header: t("columns.ai_rejected"),
        cell: ({ row }) => {
          const isHigh =
            row.original.ai_rejected > row.original.ai_accepted * 0.5;
          return (
            <Badge
              variant="secondary"
              className={cn(
                "gap-1",
                isHigh
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <TrendingDown className="size-3" />
              {row.original.ai_rejected}
            </Badge>
          );
        },
      },
      {
        accessorKey: "trend_7d",
        header: t("columns.trend"),
        cell: ({ row }) => {
          const trend = row.original.trend_7d;
          const isUp = trend[trend.length - 1] >= trend[0];

          return (
            <div className="w-16 h-6" aria-hidden="true">
              <NetworkGoalsSparkline data={trend} isUp={isUp} />
            </div>
          );
        },
      },
    ],
    [t]
  );

  // Mobile card render
  const mobileCardRender = (row: RegionData) => (
    <RegionRowCard region={row} />
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={tCommon("noResults")}
        description={tCommon("noData")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Compare button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowRightLeft className="size-4" />
          {tActions("compare_regions")}
        </Button>
      </div>

      {/* Data Table */}
      <ResponsiveDataTable
        columns={columns}
        data={data}
        mobileCardRender={mobileCardRender}
        isLoading={isLoading}
        isEmpty={data.length === 0}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOBILE CARD
// ═══════════════════════════════════════════════════════════════════

interface RegionRowCardProps {
  region: RegionData;
}

function RegionRowCard({ region }: RegionRowCardProps) {
  const t = useTranslations("screen.networkGoals.regions_tab.columns");

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{region.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {region.stores_count} {t("stores").toLowerCase()}
        </span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <Progress value={region.avg_progress} className="h-2 flex-1" />
        <span className="text-xs font-medium tabular-nums">{region.avg_progress}%</span>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {t("active_goals")}: {region.active_goals}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-success/10 text-success gap-1 h-5 text-xs">
            <TrendingUp className="size-3" />
            {region.ai_accepted}
          </Badge>
          <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1 h-5 text-xs">
            <TrendingDown className="size-3" />
            {region.ai_rejected}
          </Badge>
        </div>
      </div>
    </div>
  );
}
