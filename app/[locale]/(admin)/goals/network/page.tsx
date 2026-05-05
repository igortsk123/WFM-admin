import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkGoalsDashboard } from "@/components/features/goals/network-goals-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.networkGoals");
  return { title: t("page_title") };
}

function NetworkGoalsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function NetworkGoalsPage() {
  return (
    <Suspense fallback={<NetworkGoalsDashboardSkeleton />}>
      <NetworkGoalsDashboard />
    </Suspense>
  );
}
