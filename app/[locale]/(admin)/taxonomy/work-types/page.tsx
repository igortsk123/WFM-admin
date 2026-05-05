import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkTypesList } from "@/components/features/taxonomy/work-types-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.workTypes");
  return { title: t("page_title") };
}

function WorkTypesListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function WorkTypesPage() {
  return (
    <Suspense fallback={<WorkTypesListSkeleton />}>
      <WorkTypesList />
    </Suspense>
  );
}
