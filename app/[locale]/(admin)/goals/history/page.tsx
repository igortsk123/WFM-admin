import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalsHistoryScreen } from "@/components/features/goals/goals-history-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.goalsHistory");
  return { title: t("page_title") };
}

function GoalsHistoryScreenSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function GoalsHistoryPage() {
  return (
    <Suspense fallback={<GoalsHistoryScreenSkeleton />}>
      <GoalsHistoryScreen />
    </Suspense>
  );
}
