"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CheckSquare,
  ClipboardCheck,
  ListChecks,
  Archive,
  Sparkles,
  MessageSquare,
  Target,
  Network,
  Award,
  CreditCard,
  Calendar,
  Users,
  Shield,
  Store,
  Layers,
  MapPin,
  Briefcase,
  HelpCircle,
  Upload,
  FileText,
  LayoutGrid,
  FileSignature,
  Receipt,
  Wallet,
  UserCog,
  BarChart2,
  TrendingUp,
  GitCompare,
  Bot,
  AlertTriangle,
  Trophy,
  User,
  Building,
  Plug,
  History,
  Bell,
  Ruler,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/contexts/auth-context";
import { ADMIN_ROUTES } from "@/lib/constants/routes";
import type { FunctionalRole } from "@/lib/types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface NavItem {
  labelKey: string;
  icon: React.ElementType;
  href: string;
  badge?: number | string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  visibleFor?: FunctionalRole[];
  hiddenFor?: FunctionalRole[];
  hideIf?: (ctx: { paymentMode: string; freelanceEnabled: boolean }) => boolean;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const ALL_MANAGER_ROLES: FunctionalRole[] = [
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
  "PLATFORM_ADMIN",
];

const DECISION_MAKERS: FunctionalRole[] = [
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "PLATFORM_ADMIN",
];

const FULL_ACCESS_ROLES: FunctionalRole[] = [
  "NETWORK_OPS",
  "REGIONAL",
  "SUPERVISOR",
  "PLATFORM_ADMIN",
];

const buildNavGroups = (
  pendingAISuggestionsCount: number
): NavGroup[] => [
  {
    labelKey: "groups.main",
    items: [
      {
        labelKey: "dashboard",
        icon: LayoutDashboard,
        href: ADMIN_ROUTES.dashboard,
      },
    ],
  },
  {
    labelKey: "groups.tasks",
    items: [
      {
        labelKey: "tasks",
        icon: CheckSquare,
        href: ADMIN_ROUTES.tasks,
      },
      {
        labelKey: "tasks_review",
        icon: ClipboardCheck,
        href: ADMIN_ROUTES.tasksReview,
      },
      {
        labelKey: "subtasks_moderation",
        icon: ListChecks,
        href: ADMIN_ROUTES.subtasksModeration,
      },
      {
        labelKey: "tasks_archive",
        icon: Archive,
        href: ADMIN_ROUTES.tasksArchive,
      },
    ],
  },
  {
    labelKey: "groups.ai",
    items: [
      {
        labelKey: "ai_suggestions",
        icon: Sparkles,
        href: ADMIN_ROUTES.aiSuggestions,
        badge: pendingAISuggestionsCount > 0 ? pendingAISuggestionsCount : undefined,
        badgeVariant: "default",
      },
      {
        labelKey: "ai_chat",
        icon: MessageSquare,
        href: ADMIN_ROUTES.aiChat,
      },
    ],
  },
  {
    labelKey: "groups.goals",
    items: [
      {
        labelKey: "goals",
        icon: Target,
        href: ADMIN_ROUTES.goals,
      },
      {
        labelKey: "network_goals",
        icon: Network,
        href: ADMIN_ROUTES.networkGoals,
        visibleFor: DECISION_MAKERS,
      },
      {
        labelKey: "bonus_tasks",
        icon: Award,
        href: ADMIN_ROUTES.bonusTasks,
      },
      {
        labelKey: "payouts",
        icon: CreditCard,
        href: ADMIN_ROUTES.payouts,
      },
    ],
  },
  {
    labelKey: "groups.schedule",
    items: [
      {
        labelKey: "schedule",
        icon: Calendar,
        href: ADMIN_ROUTES.schedule,
      },
    ],
  },
  {
    labelKey: "groups.employees",
    items: [
      {
        labelKey: "employees",
        icon: Users,
        href: ADMIN_ROUTES.employees,
      },
      {
        labelKey: "permissions",
        icon: Shield,
        href: ADMIN_ROUTES.permissions,
      },
    ],
  },
  {
    labelKey: "groups.stores",
    items: [
      {
        labelKey: "stores",
        icon: Store,
        href: ADMIN_ROUTES.stores,
        visibleFor: ["NETWORK_OPS", "REGIONAL", "PLATFORM_ADMIN"],
      },
    ],
  },
  {
    labelKey: "groups.taxonomy",
    items: [
      {
        labelKey: "taxonomy_work_types",
        icon: Layers,
        href: ADMIN_ROUTES.taxonomyWorkTypes,
      },
      {
        labelKey: "taxonomy_zones",
        icon: MapPin,
        href: ADMIN_ROUTES.taxonomyZones,
      },
      {
        labelKey: "taxonomy_positions",
        icon: Briefcase,
        href: ADMIN_ROUTES.taxonomyPositions,
      },
      {
        labelKey: "taxonomy_hints",
        icon: HelpCircle,
        href: ADMIN_ROUTES.hints,
      },
      {
        labelKey: "taxonomy_hints_manager",
        icon: Upload,
        href: ADMIN_ROUTES.hintsManager,
        visibleFor: ["OPERATOR", "NETWORK_OPS", "PLATFORM_ADMIN"],
      },
      {
        labelKey: "regulations",
        icon: FileText,
        href: ADMIN_ROUTES.regulations,
      },
      {
        labelKey: "taxonomy_service_norms",
        icon: Ruler,
        href: ADMIN_ROUTES.taxonomyServiceNorms,
      },
    ],
  },
  {
    labelKey: "groups.freelance",
    items: [
      {
        labelKey: "freelance_dashboard",
        icon: LayoutGrid,
        href: ADMIN_ROUTES.freelanceDashboard,
      },
      {
        labelKey: "freelance_applications",
        icon: FileSignature,
        href: ADMIN_ROUTES.freelanceApplications,
      },
      {
        labelKey: "freelance_services",
        icon: Briefcase,
        href: ADMIN_ROUTES.freelanceServices,
      },
      {
        labelKey: "freelance_payouts",
        icon: Receipt,
        href: ADMIN_ROUTES.freelancePayouts,
        hideIf: (ctx) => ctx.paymentMode === "CLIENT_DIRECT",
      },
      {
        labelKey: "freelance_budget_limits",
        icon: Wallet,
        href: ADMIN_ROUTES.freelanceBudgetLimits,
      },
      {
        labelKey: "freelance_agents",
        icon: UserCog,
        href: ADMIN_ROUTES.freelanceAgents,
        hideIf: (ctx) => ctx.paymentMode === "CLIENT_DIRECT",
      },
    ],
  },
  {
    labelKey: "groups.reports",
    items: [
      {
        labelKey: "reports_plan_fact",
        icon: BarChart2,
        href: ADMIN_ROUTES.reportsPlanFact,
      },
      {
        labelKey: "reports_kpi",
        icon: TrendingUp,
        href: ADMIN_ROUTES.reportsKpi,
      },
      {
        labelKey: "reports_compare",
        icon: GitCompare,
        href: ADMIN_ROUTES.reportsCompare,
      },
    ],
  },
  {
    labelKey: "groups.stretch",
    items: [
      {
        labelKey: "ai_coach",
        icon: Bot,
        href: ADMIN_ROUTES.aiCoach,
        badge: "Beta",
        badgeVariant: "secondary",
      },
      {
        labelKey: "risk_rules",
        icon: AlertTriangle,
        href: ADMIN_ROUTES.riskRules,
        badge: "Beta",
        badgeVariant: "secondary",
      },
      {
        labelKey: "leaderboards",
        icon: Trophy,
        href: ADMIN_ROUTES.leaderboards,
        badge: "Beta",
        badgeVariant: "secondary",
      },
    ],
  },
  {
    labelKey: "groups.settings",
    items: [
      {
        labelKey: "settings_profile",
        icon: User,
        href: ADMIN_ROUTES.settingsProfile,
      },
      {
        labelKey: "settings_organization",
        icon: Building,
        href: ADMIN_ROUTES.settingsOrganization,
        visibleFor: ["NETWORK_OPS", "PLATFORM_ADMIN"],
      },
      {
        labelKey: "integrations",
        icon: Plug,
        href: ADMIN_ROUTES.integrations,
        visibleFor: ["NETWORK_OPS", "PLATFORM_ADMIN"],
      },
      {
        labelKey: "audit",
        icon: History,
        href: ADMIN_ROUTES.audit,
      },
      {
        labelKey: "notifications",
        icon: Bell,
        href: ADMIN_ROUTES.notifications,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// VISIBILITY HELPERS
// ═══════════════════════════════════════════════════════════════════

function isItemVisible(
  item: NavItem,
  role: FunctionalRole,
  ctx: { paymentMode: string; freelanceEnabled: boolean }
): boolean {
  // Check hideIf condition
  if (item.hideIf && item.hideIf(ctx)) {
    return false;
  }

  // Check visibleFor
  if (item.visibleFor && !item.visibleFor.includes(role)) {
    return false;
  }

  // Check hiddenFor
  if (item.hiddenFor && item.hiddenFor.includes(role)) {
    return false;
  }

  return true;
}

function isGroupVisible(
  group: NavGroup,
  role: FunctionalRole,
  ctx: { paymentMode: string; freelanceEnabled: boolean }
): boolean {
  // Check if freelance group should be hidden
  if (group.labelKey === "groups.freelance" && !ctx.freelanceEnabled) {
    return false;
  }

  // A group is visible if at least one item is visible
  return group.items.some((item) => isItemVisible(item, role, ctx));
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AdminSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user, pendingAISuggestionsCount } = useAuth();

  const navGroups = buildNavGroups(pendingAISuggestionsCount);

  const ctx = {
    paymentMode: user.organization.payment_mode,
    freelanceEnabled: user.organization.freelance_module_enabled,
  };

  // Check if a path is active
  const isActive = (href: string) => {
    // Handle query params in href
    const hrefPath = href.split("?")[0];
    const pathnameWithoutLocale = pathname.replace(/^\/(ru|en)/, "") || "/";

    // Exact match for dashboard
    if (hrefPath === "/dashboard") {
      return pathnameWithoutLocale === "/dashboard";
    }

    // For other paths, check if pathname starts with href path
    return pathnameWithoutLocale.startsWith(hrefPath);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="h-14 border-b border-border justify-center">
        <Link
          href={ADMIN_ROUTES.dashboard}
          className="flex items-center gap-2 px-2"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
            {user.organization.name}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => {
          if (!isGroupVisible(group, user.role, ctx)) {
            return null;
          }

          const visibleItems = group.items.filter((item) =>
            isItemVisible(item, user.role, ctx)
          );

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel>
                {t(group.labelKey)}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={t(item.labelKey)}
                          className={cn(
                            active && "border-l-[3px] border-l-primary rounded-l-none"
                          )}
                        >
                          <Link href={item.href}>
                            <Icon className="size-4" />
                            <span>{t(item.labelKey)}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.badge !== undefined && (
                          <SidebarMenuBadge>
                            <Badge
                              variant={item.badgeVariant || "default"}
                              className="h-5 min-w-5 px-1 text-xs"
                            >
                              {item.badge}
                            </Badge>
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium">
                {user.first_name[0]}
                {user.last_name[0]}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium truncate">
              {user.last_name} {user.first_name[0]}.
              {user.middle_name ? ` ${user.middle_name[0]}.` : ""}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {t(`role.${user.role}`, { defaultValue: user.role })}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
