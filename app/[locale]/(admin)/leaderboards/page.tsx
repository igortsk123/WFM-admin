import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { Leaderboards } from "@/components/features/leaderboards/leaderboards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.leaderboards");
  return { title: t("page_title") };
}

function LeaderboardsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function LeaderboardsPage() {
  return (
    <Suspense fallback={<LeaderboardsSkeleton />}>
      <Leaderboards />
    </Suspense>
  );
}
