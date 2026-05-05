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
  Bot,
  AlertTriangle,
  Trophy,
  User,
  Building,
  Plug,
  History,
  Bell,
  Ruler,
  ChevronRight,
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
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  hideIf?: (ctx: SidebarCtx) => boolean;
  sub?: NavItem[];
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
  /** Group-level visibility override — if false, whole group hidden */
  hideIf?: (ctx: SidebarCtx) => boolean;
  /** Only show group in development */
  devOnly?: boolean;
  badgeLabel?: string;
}

interface SidebarCtx {
  paymentMode: string;
  freelanceEnabled: boolean;
  aiEnabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// ROLE SETS
// ═══════════════════════════════════════════════════════════════════

const DECISION_MAKERS: FunctionalRole[] = [
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "PLATFORM_ADMIN",
];

const EFFICIENCY_ROLES: FunctionalRole[] = [
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "PLATFORM_ADMIN",
];

const OPS_ROLES: FunctionalRole[] = [
  "STORE_DIRECTOR",
  "SUPERVISOR",
  "REGIONAL",
  "NETWORK_OPS",
  "HR_MANAGER",
  "OPERATOR",
  "PLATFORM_ADMIN",
];

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION CONFIGURATION — 4 GROUPS
// ═══════════════════════════════════════════════════════════════════

const buildNavGroups = (pendingAISuggestionsCount: number): NavGroup[] => [
  // ─── 1. OPERATIONS ─────────────────────────────────────────────
  {
    labelKey: "groups.operations",
    items: [
      {
        labelKey: "dashboard",
        icon: LayoutDashboard,
        href: ADMIN_ROUTES.dashboard,
        visibleFor: OPS_ROLES,
      },
      {
        labelKey: "tasks",
        icon: CheckSquare,
        href: ADMIN_ROUTES.tasks,
        visibleFor: OPS_ROLES,
        sub: [
          {
            labelKey: "tasks_review",
            icon: ClipboardCheck,
            href: ADMIN_ROUTES.tasksReview,
            visibleFor: OPS_ROLES,
          },
          {
            labelKey: "subtasks_moderation",
            icon: ListChecks,
            href: ADMIN_ROUTES.subtasksModeration,
            visibleFor: OPS_ROLES,
          },
          {
            labelKey: "tasks_archive",
            icon: Archive,
            href: ADMIN_ROUTES.tasksArchive,
            visibleFor: OPS_ROLES,
          },
        ],
      },
      {
        labelKey: "schedule",
        icon: Calendar,
        href: ADMIN_ROUTES.schedule,
        visibleFor: OPS_ROLES,
      },
      {
        labelKey: "employees",
        icon: Users,
        href: ADMIN_ROUTES.employees,
        visibleFor: OPS_ROLES,
        sub: [
          {
            labelKey: "permissions",
            icon: Shield,
            href: ADMIN_ROUTES.permissions,
            visibleFor: OPS_ROLES,
          },
        ],
      },
      {
        labelKey: "stores",
        icon: Store,
        href: ADMIN_ROUTES.stores,
        visibleFor: ["NETWORK_OPS", "REGIONAL", "PLATFORM_ADMIN"],
      },
    ],
  },

  // ─── 2. EFFICIENCY & AI ─────────────────────────────────────────
  {
    labelKey: "groups.efficiency",
    items: [
      {
        labelKey: "ai_suggestions",
        icon: Sparkles,
        href: ADMIN_ROUTES.aiSuggestions,
        visibleFor: DECISION_MAKERS,
        badge: pendingAISuggestionsCount > 0 ? pendingAISuggestionsCount : undefined,
        badgeVariant: "default",
        hideIf: (ctx) => !ctx.aiEnabled,
      },
      {
        labelKey: "ai_chat",
        icon: MessageSquare,
        href: ADMIN_ROUTES.aiChat,
        visibleFor: DECISION_MAKERS,
        hideIf: (ctx) => !ctx.aiEnabled,
      },
      {
        labelKey: "goals",
        icon: Target,
        href: ADMIN_ROUTES.goals,
        visibleFor: EFFICIENCY_ROLES,
        hiddenFor: ["HR_MANAGER"],
      },
      {
        labelKey: "network_goals",
        icon: Network,
        href: ADMIN_ROUTES.networkGoals,
        visibleFor: ["NETWORK_OPS", "REGIONAL", "PLATFORM_ADMIN"],
      },
      {
        labelKey: "bonus_tasks",
        icon: Award,
        href: ADMIN_ROUTES.bonusTasks,
        visibleFor: EFFICIENCY_ROLES,
        hiddenFor: ["HR_MANAGER"],
      },
      {
        labelKey: "payouts",
        icon: CreditCard,
        href: ADMIN_ROUTES.payouts,
        visibleFor: EFFICIENCY_ROLES,
        hiddenFor: ["HR_MANAGER"],
      },
      {
        labelKey: "reports_plan_fact",
        icon: BarChart2,
        href: ADMIN_ROUTES.reportsPlanFact,
        visibleFor: EFFICIENCY_ROLES,
      },
      {
        labelKey: "reports_kpi",
        icon: BarChart2,
        href: ADMIN_ROUTES.reportsKpi,
        visibleFor: EFFICIENCY_ROLES,
      },
      {
        labelKey: "reports_compare",
        icon: BarChart2,
        href: ADMIN_ROUTES.reportsCompare,
        visibleFor: EFFICIENCY_ROLES,
      },
    ],
  },

  // ─── 3. FREELANCE ───────────────────────────────────────────────
  {
    labelKey: "groups.flexible",
    hideIf: (ctx) => !ctx.freelanceEnabled,
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
        hideIf: (ctx) => ctx.paymentMode !== "NOMINAL_ACCOUNT",
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
        hideIf: (ctx) => ctx.paymentMode !== "NOMINAL_ACCOUNT",
      },
      {
        labelKey: "freelance_freelancers",
        icon: Users,
        href: ADMIN_ROUTES.freelanceFreelancers,
      },
    ],
  },

  // ─── 4. CONFIGURATION ───────────────────────────────────────────
  {
    labelKey: "groups.config",
    items: [
      {
        labelKey: "taxonomy",
        icon: Layers,
        href: ADMIN_ROUTES.taxonomyWorkTypes,
        sub: [
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
        labelKey: "notifications",
        icon: Bell,
        href: ADMIN_ROUTES.notifications,
      },
      {
        labelKey: "integrations",
        icon: Plug,
        href: ADMIN_ROUTES.integrations,
        visibleFor: ["NETWORK_OPS", "PLATFORM_ADMIN"],
      },
      {
        labelKey: "settings",
        icon: User,
        href: ADMIN_ROUTES.settingsProfile,
        sub: [
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
        ],
      },
      {
        labelKey: "audit",
        icon: History,
        href: ADMIN_ROUTES.audit,
      },
    ],
  },
];

// ─── STRETCH (dev-only inside Efficiency & AI) ───────────────────

const STRETCH_ITEMS: NavItem[] = [
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
];

// ═══════════════════════════════════════════════════════════════════
// VISIBILITY HELPERS
// ═══════════════════════════════════════════════════════════════════

function isItemVisible(item: NavItem, role: FunctionalRole, ctx: SidebarCtx): boolean {
  if (item.hideIf?.(ctx)) return false;
  if (item.visibleFor && !item.visibleFor.includes(role)) return false;
  if (item.hiddenFor?.includes(role)) return false;
  return true;
}

function isGroupVisible(group: NavGroup, role: FunctionalRole, ctx: SidebarCtx): boolean {
  if (group.hideIf?.(ctx)) return false;
  if (group.devOnly && process.env.NODE_ENV !== "development") return false;
  return group.items.some((item) => isItemVisible(item, role, ctx));
}

// ═══════════════════════════════════════════════════════════════════
// SUB-ITEM COLLAPSIBLE
// ═══════════════════════════════════════════════════════════════════

interface CollapsibleNavItemProps {
  item: NavItem;
  role: FunctionalRole;
  ctx: SidebarCtx;
  isActive: (href: string) => boolean;
  t: ReturnType<typeof useTranslations<"nav">>;
}

function CollapsibleNavItem({ item, role, ctx, isActive, t }: CollapsibleNavItemProps) {
  const visibleSubs = item.sub?.filter((s) => isItemVisible(s, role, ctx)) ?? [];
  const parentActive = isActive(item.href);
  const anySubActive = visibleSubs.some((s) => isActive(s.href));
  const defaultOpen = parentActive || anySubActive;
  const Icon = item.icon;

  if (visibleSubs.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={parentActive}
          tooltip={t(item.labelKey as never)}
          className={cn(parentActive && "border-l-[3px] border-l-primary rounded-l-none")}
        >
          <Link href={item.href}>
            <Icon className="size-4" />
            <span>{t(item.labelKey as never)}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={parentActive || anySubActive}
            tooltip={t(item.labelKey as never)}
            className={cn(
              (parentActive || anySubActive) && "border-l-[3px] border-l-primary rounded-l-none"
            )}
          >
            <Icon className="size-4" />
            <span>{t(item.labelKey as never)}</span>
            <ChevronRight className="ml-auto size-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {visibleSubs.map((sub) => {
              const SubIcon = sub.icon;
              const subActive = isActive(sub.href);
              return (
                <SidebarMenuSubItem key={sub.href}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={subActive}
                    className={cn(subActive && "text-primary font-medium")}
                  >
                    <Link href={sub.href}>
                      <SubIcon className="size-3.5" />
                      <span>{t(sub.labelKey as never)}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function AdminSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user, pendingAISuggestionsCount } = useAuth();

  const navGroups = buildNavGroups(pendingAISuggestionsCount);

  const ctx: SidebarCtx = {
    paymentMode: user.organization.payment_mode,
    freelanceEnabled: user.organization.freelance_module_enabled,
    aiEnabled: (user.organization as { ai_module_enabled?: boolean }).ai_module_enabled ?? true,
  };

  const isActive = (href: string) => {
    const hrefPath = href.split("?")[0];
    const pathnameWithoutLocale = pathname.replace(/^\/(ru|en)/, "") || "/";
    if (hrefPath === "/dashboard") return pathnameWithoutLocale === "/dashboard";
    return pathnameWithoutLocale.startsWith(hrefPath);
  };

  const isDev = process.env.NODE_ENV === "development";

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
          if (!isGroupVisible(group, user.role, ctx)) return null;

          const visibleItems = group.items.filter((item) =>
            isItemVisible(item, user.role, ctx)
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel>{t(group.labelKey as never)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <CollapsibleNavItem
                      key={item.href}
                      item={item}
                      role={user.role}
                      ctx={ctx}
                      isActive={isActive}
                      t={t}
                    />
                  ))}

                  {/* Stretch / Beta items — Efficiency group only, dev only */}
                  {group.labelKey === "groups.efficiency" && isDev && (
                    <Collapsible className="group/stretch">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={t("groups.future" as never)}
                            className="text-muted-foreground"
                          >
                            <Trophy className="size-4" />
                            <span>{t("groups.future" as never)}</span>
                            <Badge
                              variant="secondary"
                              className="ml-auto h-4 px-1 text-[10px]"
                            >
                              {t("beta" as never)}
                            </Badge>
                            <ChevronRight className="size-3 transition-transform group-data-[state=open]/stretch:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {STRETCH_ITEMS.map((item) => {
                              const Icon = item.icon;
                              const active = isActive(item.href);
                              return (
                                <SidebarMenuSubItem key={item.href}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={active}
                                    className={cn(active && "text-primary font-medium")}
                                  >
                                    <Link href={item.href}>
                                      <Icon className="size-3.5" />
                                      <span>{t(item.labelKey as never)}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )}
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
              {t(`role.${user.role}` as Parameters<typeof t>[0])}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
