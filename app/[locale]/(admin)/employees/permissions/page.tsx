import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionsMatrix } from "@/components/features/employees/permissions-matrix";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.permissions");
  return {
    title: t("page_title"),
  };
}

function PermissionsMatrixSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function PermissionsPage() {
  return (
    <Suspense fallback={<PermissionsMatrixSkeleton />}>
      <PermissionsMatrix />
    </Suspense>
  );
}
