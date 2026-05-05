import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanFactReport } from "@/components/features/reports/plan-fact-report";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.reportsPlanFact");
  return { title: t("page_title") };
}

function PlanFactReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-64" />
    </div>
  );
}

export default function ReportsPlanFactPage() {
  return (
    <Suspense fallback={<PlanFactReportSkeleton />}>
      <PlanFactReport />
    </Suspense>
  );
}
