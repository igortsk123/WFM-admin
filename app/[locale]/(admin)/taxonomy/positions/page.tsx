import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PositionsList } from "@/components/features/taxonomy/positions-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.positions");
  return { title: t("page_title") };
}

function PositionsListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function PositionsPage() {
  return (
    <Suspense fallback={<PositionsListSkeleton />}>
      <PositionsList />
    </Suspense>
  );
}
