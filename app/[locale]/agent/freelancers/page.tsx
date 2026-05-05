import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentFreelancers } from "@/components/features/agent-cabinet/agent-freelancers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.agentFreelancers");
  return { title: t("page_title") };
}

function AgentFreelancersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function AgentFreelancersPage() {
  return (
    <Suspense fallback={<AgentFreelancersSkeleton />}>
      <AgentFreelancers />
    </Suspense>
  );
}
