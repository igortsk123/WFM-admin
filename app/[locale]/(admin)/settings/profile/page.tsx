import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSettings } from "@/components/features/settings/profile-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("screen.profile");
  return { title: t("page_title") };
}

function ProfileSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full max-w-md" />
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  return (
    <Suspense fallback={<ProfileSettingsSkeleton />}>
      <ProfileSettings />
    </Suspense>
  );
}
