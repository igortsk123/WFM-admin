import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiReport } from "@/components/features/reports/kpi-report";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.reportsKpi");
  return { title: t("page_title") };
}

function KpiReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
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
