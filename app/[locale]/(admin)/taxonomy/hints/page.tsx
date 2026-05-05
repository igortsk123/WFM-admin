import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { HintsManagement } from "@/components/features/taxonomy/hints-management";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.hints");
  return { title: t("page_title") };
}

function HintsManagementSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function HintsPage() {
  return (
    <Suspense fallback={<HintsManagementSkeleton />}>
      <HintsManagement />
    </Suspense>
  );
}
