import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreCompareReport } from "@/components/features/reports/store-compare-report";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.reportsCompare");
  return { title: t("page_title") };
}

function StoreCompareReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default function ReportsComparePage() {
  return (
    <Suspense fallback={<StoreCompareReportSkeleton />}>
      <StoreCompareReport />
    </Suspense>
  );
}
