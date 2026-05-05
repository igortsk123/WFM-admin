"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import {
  Bell,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { AGENT_ROUTES, AUTH_ROUTES } from "@/lib/constants/routes";
import { AgentSidebar } from "@/components/shared/agent-sidebar";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ═══════════════════════════════════════════════════════════════════
// AGENT MOBILE BOTTOM NAV
// ═══════════════════════════════════════════════════════════════════

interface AgentMobileNavItem {
  labelKey: "dashboard" | "freelancers" | "earnings" | "documents";
  icon: React.ElementType;
  href: string;
}

const MOBILE_NAV_ITEMS: AgentMobileNavItem[] = [
  { labelKey: "dashboard", icon: LayoutDashboard, href: AGENT_ROUTES.dashboard },
  { labelKey: "freelancers", icon: Users, href: AGENT_ROUTES.freelancers },
  { labelKey: "earnings", icon: Wallet, href: AGENT_ROUTES.earnings },
  { labelKey: "documents", icon: FileText, href: AGENT_ROUTES.documents },
];

function AgentMobileBottomNav() {
  const t = useTranslations("agent.nav");
  const pathname = usePathname();

  const isActive = (href: string) => {
    const clean = pathname.replace(/^\/(ru|en)/, "") || "/";
    if (href === AGENT_ROUTES.dashboard) return clean === AGENT_ROUTES.dashboard;
    return clean.startsWith(href);
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-40 md:hidden"
    >
      <ul className="flex h-full">
        {MOBILE_NAV_ITEMS.map(({ labelKey, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 min-h-[44px] transition-colors",
                  active
                    ? "text-primary border-t-2 border-primary -mt-px"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-tight">
                  {t(labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AGENT TOPBAR
// ═══════════════════════════════════════════════════════════════════

function AgentTopBar() {
  const t = useTranslations("agent.topbar");
  const { user } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = `${user.first_name[0]}${user.last_name[0]}`;
  const displayName = `${user.last_name} ${user.first_name[0]}.${
    user.middle_name ? ` ${user.middle_name[0]}.` : ""
  }`;

  // Mock unread count — PAYOUT_DONE + NO_SHOW notifications only
  const unreadCount = 2;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 md:px-6">
      {/* Mobile: hamburger sheet trigger */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -ml-1 size-9"
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {/* Inline nav in sheet */}
          <AgentSidebarSheet onClose={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        <LanguageSwitcher variant="compact" className="sm:hidden" />
        <LanguageSwitcher variant="full" className="hidden sm:flex" />

        {/* Notifications bell — PAYOUT_DONE + NO_SHOW only */}
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={t("notifications")}
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-xs"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative size-9 rounded-full p-0"
              aria-label={displayName}
            >
              <Avatar className="size-9">
                <AvatarImage src={user.avatar_url} alt="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onSelect={() => router.push(AUTH_ROUTES.login)}
            >
              <LogOut className="mr-2 size-4" aria-hidden="true" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ─── Sheet nav (mirrors AgentSidebar for mobile drawer) ─────────

function AgentSidebarSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("agent.nav");
  const pathname = usePathname();

  const isActive = (href: string) => {
    const clean = pathname.replace(/^\/(ru|en)/, "") || "/";
    if (href === AGENT_ROUTES.dashboard) return clean === AGENT_ROUTES.dashboard;
    return clean.startsWith(href);
  };

  const items = [
    { labelKey: "dashboard" as const, icon: LayoutDashboard, href: AGENT_ROUTES.dashboard },
    { labelKey: "freelancers" as const, icon: Users, href: AGENT_ROUTES.freelancers },
    { labelKey: "earnings" as const, icon: Wallet, href: AGENT_ROUTES.earnings },
    { labelKey: "documents" as const, icon: FileText, href: AGENT_ROUTES.documents },
  ];

  return (
    <nav className="flex flex-col h-full" aria-label="Agent navigation">
      <div className="flex items-center gap-2 h-14 px-4 border-b border-border shrink-0">
        <span className="font-semibold text-sm text-foreground">WFM Agent</span>
      </div>
      <ul className="flex flex-col gap-1 p-2 flex-1" role="list">
        {items.map(({ labelKey, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary border-l-[3px] border-l-primary rounded-l-none pl-[9px]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACCESS DENIED (non-AGENT role or CLIENT_DIRECT)
// ═══════════════════════════════════════════════════════════════════

function AgentAccessDenied() {
  const t = useTranslations("agent.access_denied");
  const router = useRouter();

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs px-6">
        <span
          className="flex size-16 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <Lock className="size-8 text-muted-foreground" strokeWidth={1.5} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-foreground">{t("title")}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("description")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Назад
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════════

export default function AgentCabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  // Role guard: only AGENT can access this layout
  if (user.role !== "AGENT") {
    return <AgentAccessDenied />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <AgentSidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        <AgentTopBar />
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          <div className="mx-auto w-full max-w-screen-xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <AgentMobileBottomNav />
    </div>
  );
}
