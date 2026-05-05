import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalsScreen } from "@/components/features/goals/goals-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.goals");
  return { title: t("page_title") };
}

function GoalsScreenSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<GoalsScreenSkeleton />}>
      <GoalsScreen />
    </Suspense>
  );
}
