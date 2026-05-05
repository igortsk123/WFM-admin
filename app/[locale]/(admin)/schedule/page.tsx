import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleView } from "@/components/features/schedule/schedule-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.schedule");
  return {
    title: t("page_title"),
  };
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-[480px] w-full" />
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<ScheduleSkeleton />}>
      <ScheduleView />
    </Suspense>
  );
}
