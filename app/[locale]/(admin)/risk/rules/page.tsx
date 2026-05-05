import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskRules } from "@/components/features/risk/risk-rules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.riskRules");
  return { title: t("page_title") };
}

function RiskRulesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function RiskRulesPage() {
  return (
    <Suspense fallback={<RiskRulesSkeleton />}>
      <RiskRules />
    </Suspense>
  );
}
