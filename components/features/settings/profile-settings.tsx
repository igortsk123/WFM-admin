"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { LogOut, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge } from "@/components/shared/role-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { getCurrentUser } from "@/lib/api/auth";
import { ADMIN_ROUTES } from "@/lib/constants/routes";

import type { CurrentUser } from "@/lib/api/auth";

import {
  SidebarNav,
  ProfileTab,
  SecurityTab,
  NotificationsTab,
  AssignmentsTab,
  AppearanceTab,
  OrganizationsTab,
  type Section,
  getSectionsForRole,
  getInitials,
} from "./profile-settings/index";

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────

function ProfileSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function ProfileSettings() {
  const t = useTranslations("screen.profile");
  const locale = useLocale();
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleUserUpdate = useCallback((data: Partial<CurrentUser>) => {
    setUser((prev) => prev ? { ...prev, ...data } : prev);
  }, []);

  useEffect(() => {
    setLoading(true);
    getCurrentUser()
      .then((res) => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Не удалось загрузить данные профиля");
        setLoading(false);
      });
  }, []);

  if (loading) return <ProfileSettingsSkeleton />;

  if (error || !user) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center gap-3">
          {error ?? "Ошибка загрузки"}
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            Повторить
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const availableSections = getSectionsForRole(user.role);
  const safeActiveSection = availableSections.includes(activeSection) ? activeSection : availableSections[0];

  const sectionContent: Record<Section, React.ReactNode> = {
    profile: <ProfileTab user={user} locale={locale} onUserUpdate={handleUserUpdate} />,
    security: <SecurityTab user={user} onUserUpdate={handleUserUpdate} />,
    notifications: <NotificationsTab />,
    assignments: <AssignmentsTab userId={user.id} />,
    appearance: <AppearanceTab user={user} locale={locale} onUserUpdate={handleUserUpdate} />,
    organizations: <OrganizationsTab user={user} />,
  };

  const sectionLabels: Record<Section, string> = {
    profile: t("sidebar.profile"),
    security: t("sidebar.security"),
    notifications: t("sidebar.notifications"),
    assignments: t("sidebar.assignments"),
    appearance: t("sidebar.appearance"),
    organizations: t("platform_admin.title"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        breadcrumbs={[
          { label: t("breadcrumbs.home"), href: ADMIN_ROUTES.dashboard },
          { label: t("breadcrumbs.settings") },
        ]}
      />

      {/* User summary row */}
      <div className="flex items-center gap-3 pb-2">
        <Avatar className="size-12">
          <AvatarImage src={user.avatar_url ?? undefined} alt={`${user.first_name} ${user.last_name}`} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(user)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">
            {user.last_name} {user.first_name} {user.middle_name ?? ""}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <RoleBadge role={user.role} size="sm" />
          </div>
        </div>
      </div>

      {/* Desktop: sidebar + content grid */}
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <SidebarNav
              activeSection={safeActiveSection}
              onSelect={setActiveSection}
              onLogout={() => setLogoutOpen(true)}
              availableSections={availableSections}
            />
          </div>
        </aside>

        {/* Mobile: Tabs */}
        <div className="lg:hidden">
          <Tabs
            value={safeActiveSection}
            onValueChange={(v) => setActiveSection(v as Section)}
          >
            <TabsList className="w-full overflow-x-auto flex-nowrap justify-start h-auto gap-1 p-1 mb-4">
              {availableSections.map((s) => (
                <TabsTrigger key={s} value={s} className="shrink-0 text-xs">
                  {sectionLabels[s]}
                </TabsTrigger>
              ))}
            </TabsList>
            {availableSections.map((s) => (
              <TabsContent key={s} value={s}>
                {sectionContent[s]}
              </TabsContent>
            ))}
          </Tabs>
          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="mr-2 size-4" />
              {t("sidebar.logout")}
            </Button>
          </div>
        </div>

        {/* Desktop content */}
        <div className="hidden lg:block">
          {sectionContent[safeActiveSection]}
        </div>
      </div>

      {/* Logout confirm dialog */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <ConfirmDialog
          title={t("logout_confirm.title")}
          message={t("logout_confirm.message")}
          confirmLabel={t("sidebar.logout")}
          variant="destructive"
          onConfirm={async () => {
            toast.success(t("toasts.logged_out"));
            router.push("/login");
          }}
          onOpenChange={setLogoutOpen}
        />
      </AlertDialog>
    </div>
  );
}
