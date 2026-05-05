import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizationSettings } from "@/components/features/settings/organization-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.organizationSettings");
  return { title: t("page_title") };
}

function OrganizationSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function OrganizationSettingsPage() {
  return (
    <Suspense fallback={<OrganizationSettingsSkeleton />}>
      <OrganizationSettings />
    </Suspense>
  );
}
