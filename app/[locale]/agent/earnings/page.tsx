import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentEarnings } from "@/components/features/agent-cabinet/agent-earnings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.agentEarnings");
  return { title: t("page_title") };
}

function AgentEarningsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function AgentEarningsPage() {
  return (
    <Suspense fallback={<AgentEarningsSkeleton />}>
      <AgentEarnings />
    </Suspense>
  );
}
