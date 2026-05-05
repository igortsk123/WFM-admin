import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { ZonesList } from "@/components/features/taxonomy/zones-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.zones");
  return { title: t("page_title") };
}

function ZonesListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export default function ZonesPage() {
  return (
    <Suspense fallback={<ZonesListSkeleton />}>
      <ZonesList />
    </Suspense>
  );
}
