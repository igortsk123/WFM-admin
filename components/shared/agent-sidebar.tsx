"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, Wallet, FileText, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AGENT_ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface AgentNavItem {
  labelKey: "dashboard" | "freelancers" | "earnings" | "documents";
  icon: React.ElementType;
  href: string;
}

const NAV_ITEMS: AgentNavItem[] = [
  { labelKey: "dashboard", icon: LayoutDashboard, href: AGENT_ROUTES.dashboard },
  { labelKey: "freelancers", icon: Users, href: AGENT_ROUTES.freelancers },
  { labelKey: "earnings", icon: Wallet, href: AGENT_ROUTES.earnings },
  { labelKey: "documents", icon: FileText, href: AGENT_ROUTES.documents },
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AgentSidebar() {
  const t = useTranslations("agent.nav");
  const pathname = usePathname();

  const isActive = (href: string) => {
    const clean = pathname.replace(/^\/(ru|en)/, "") || "/";
    if (href === AGENT_ROUTES.dashboard) return clean === AGENT_ROUTES.dashboard;
    return clean.startsWith(href);
  };

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-card h-screen sticky top-0"
      aria-label="Agent navigation"
    >
      {/* Logo / brand */}
      <div className="flex items-center gap-2 h-14 px-4 border-b border-border shrink-0">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <span className="font-semibold text-sm text-foreground truncate">WFM Agent</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Sidebar navigation">
        <ul className="flex flex-col gap-1" role="list">
          {NAV_ITEMS.map(({ labelKey, icon: Icon, href }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary border-l-[3px] border-l-primary rounded-l-none pl-[9px]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  <span>{t(labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
