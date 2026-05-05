import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiReport } from "@/components/features/reports/kpi-report";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.reportsKpi");
  return {
    title: t("page_title"),
    description: t("page_subtitle"),
  };
}

function KpiReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Toolbar skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-24 ml-auto" />
        <Skeleton className="h-9 w-36" />
      </div>
      {/* Period banner */}
      <Skeleton className="h-10 w-full" />
      {/* AI banner */}
      <Skeleton className="h-20 w-full rounded-lg" />
      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      {/* Trend charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      {/* Breakdown charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      {/* Leaderboards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export default function ReportsKpiPage() {
  return (
    <Suspense fallback={<KpiReportSkeleton />}>
      <KpiReport />
    </Suspense>
  );
}
