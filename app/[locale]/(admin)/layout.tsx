"use client";

import { useAuth } from "@/lib/contexts/auth-context";
import { AdminSidebar } from "@/components/shared/admin-sidebar";
import { AdminTopBar } from "@/components/shared/admin-topbar";
import { ImpersonationBanner } from "@/components/shared/impersonation-banner";
import { PlatformAdminBanner } from "@/components/shared/platform-admin-banner";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";
import { SidebarInset } from "@/components/ui/sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isImpersonating, unreadNotificationsCount } = useAuth();

  return (
    <>
      {/* Impersonation banner - sticky above everything */}
      {isImpersonating && <ImpersonationBanner />}

      <div className="flex min-h-screen w-full">
        {/* Sidebar - desktop only */}
        <AdminSidebar />

        {/* Main content area */}
        <SidebarInset className="flex flex-col">
          {/* Top bar */}
          <AdminTopBar />

          {/* Platform admin info banner - sticky below TopBar, dismissible per session */}
          <PlatformAdminBanner />

          {/* Main content with proper padding */}
          <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
            <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
          </main>
        </SidebarInset>

        {/* Mobile bottom navigation */}
        <MobileBottomNav unreadCount={unreadNotificationsCount} />

        {/* Dev-only role switcher */}
        <RoleSwitcher />
      </div>
    </>
  );
}
