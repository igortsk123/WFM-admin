import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditList } from "@/components/features/audit/audit-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.audit");
  return { title: t("page_title") };
}

function AuditListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-16 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<AuditListSkeleton />}>
      <AuditList />
    </Suspense>
  );
}
