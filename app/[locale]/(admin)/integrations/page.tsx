import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationsHub } from "@/components/features/integrations/integrations-hub";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.integrations");
  return { title: t("page_title") };
}

function IntegrationsHubSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<IntegrationsHubSkeleton />}>
      <IntegrationsHub />
    </Suspense>
  );
}
