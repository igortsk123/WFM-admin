import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { HintsManager } from "@/components/features/hints/hints-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.hintsManager");
  return { title: t("page_title") };
}

function HintsManagerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function HintsManagerPage() {
  return (
    <Suspense fallback={<HintsManagerSkeleton />}>
      <HintsManager />
    </Suspense>
  );
}
