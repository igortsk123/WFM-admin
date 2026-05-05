import { getTranslations } from "next-intl/server"
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Calendar,
  Users,
  Store,
  Sparkles,
  MessageSquare,
  Award,
  CreditCard,
  FileSignature,
  BarChart2,
  Layers,
  Bell,
  Settings,
  Plug,
  History,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface NavLinkItem {
  labelKey: string
  href: string
  icon: React.ElementType
  status?: "ready" | "in-progress" | "planned"
  badge?: string
}

interface NavGroup {
  titleKey: string
  items: NavLinkItem[]
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION GROUPS
// ═══════════════════════════════════════════════════════════════════

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "hub.operations",
    items: [
      { labelKey: "dashboard", href: ADMIN_ROUTES.dashboard, icon: LayoutDashboard, status: "ready" },
      { labelKey: "tasks", href: ADMIN_ROUTES.tasks, icon: CheckSquare, status: "ready" },
      { labelKey: "task_new", href: ADMIN_ROUTES.taskNew, icon: CheckSquare, status: "ready" },
      { labelKey: "task_detail_demo", href: ADMIN_ROUTES.taskDetail("t-1042"), icon: CheckSquare, status: "ready" },
      { labelKey: "tasks_review", href: ADMIN_ROUTES.tasksReview, icon: CheckSquare, status: "planned" },
      { labelKey: "subtasks_moderation", href: ADMIN_ROUTES.subtasksModeration, icon: CheckSquare, status: "ready" },
      { labelKey: "schedule", href: ADMIN_ROUTES.schedule, icon: Calendar, status: "ready" },
      { labelKey: "shift_detail_demo", href: ADMIN_ROUTES.shiftDetail("3001"), icon: Calendar, status: "ready", badge: "Demo" },
      { labelKey: "employees", href: ADMIN_ROUTES.employees, icon: Users, status: "ready" },
      { labelKey: "employee_new", href: ADMIN_ROUTES.employeeNew, icon: Users, status: "ready" },
      { labelKey: "users", href: ADMIN_ROUTES.employeeDetail("101"), icon: Users, status: "ready", badge: "Demo" },
      { labelKey: "permissions", href: ADMIN_ROUTES.permissions, icon: Users, status: "ready" },
      { labelKey: "stores", href: ADMIN_ROUTES.stores, icon: Store, status: "ready" },
      { labelKey: "store_detail_demo", href: ADMIN_ROUTES.storeDetail("1"), icon: Store, status: "ready", badge: "Demo" },
    ],
  },
  {
    titleKey: "hub.efficiency",
    items: [
      { labelKey: "ai_suggestions", href: ADMIN_ROUTES.aiSuggestions, icon: Sparkles, status: "planned" },
      { labelKey: "ai_chat", href: ADMIN_ROUTES.aiChat, icon: MessageSquare, status: "planned" },
      { labelKey: "goals", href: ADMIN_ROUTES.goals, icon: Target, status: "planned" },
      { labelKey: "network_goals", href: ADMIN_ROUTES.networkGoals, icon: Target, status: "planned" },
      { labelKey: "bonus_tasks", href: ADMIN_ROUTES.bonusTasks, icon: Award, status: "planned" },
      { labelKey: "payouts", href: ADMIN_ROUTES.payouts, icon: CreditCard, status: "planned" },
      { labelKey: "reports_kpi", href: ADMIN_ROUTES.reportsKpi, icon: BarChart2, status: "planned" },
    ],
  },
  {
    titleKey: "hub.freelance",
    items: [
      { labelKey: "freelance_dashboard", href: ADMIN_ROUTES.freelanceDashboard, icon: Users, status: "planned" },
      { labelKey: "freelance_applications", href: ADMIN_ROUTES.freelanceApplications, icon: FileSignature, status: "planned" },
      { labelKey: "freelance_services", href: ADMIN_ROUTES.freelanceServices, icon: CheckSquare, status: "planned" },
      { labelKey: "freelance_payouts", href: ADMIN_ROUTES.freelancePayouts, icon: CreditCard, status: "planned" },
      { labelKey: "freelance_agents", href: ADMIN_ROUTES.freelanceAgents, icon: Users, status: "planned" },
    ],
  },
  {
    titleKey: "hub.configuration",
    items: [
      { labelKey: "taxonomy_work_types", href: ADMIN_ROUTES.taxonomyWorkTypes, icon: Layers, status: "ready" },
      { labelKey: "taxonomy_zones", href: ADMIN_ROUTES.taxonomyZones, icon: Layers, status: "ready" },
      { labelKey: "taxonomy_positions", href: ADMIN_ROUTES.taxonomyPositions, icon: Layers, status: "ready" },
      { labelKey: "taxonomy_hints", href: ADMIN_ROUTES.hints, icon: Layers, status: "ready" },
      { labelKey: "regulations", href: ADMIN_ROUTES.regulations, icon: Layers, status: "ready" },
      { labelKey: "notifications", href: ADMIN_ROUTES.notifications, icon: Bell, status: "ready" },
      { labelKey: "integrations", href: ADMIN_ROUTES.integrations, icon: Plug, status: "planned" },
      { labelKey: "settings_profile", href: ADMIN_ROUTES.settingsProfile, icon: Settings, status: "ready" },
      { labelKey: "audit", href: ADMIN_ROUTES.audit, icon: History, status: "planned" },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: NavLinkItem["status"] }) {
  if (!status) return null

  const config = {
    ready: { label: "Ready", className: "bg-success/10 text-success border-success/20" },
    "in-progress": { label: "In Progress", className: "bg-warning/10 text-warning border-warning/20" },
    planned: { label: "Planned", className: "bg-muted text-muted-foreground border-border" },
  }

  const { label, className } = config[status]

  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", className)}>
      {label}
    </Badge>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════

export default async function NavigationPage() {
  const t = await getTranslations("nav")

  return (
    <div className="space-y-6">
      <PageHeader
        title="WFM Admin"
        subtitle="Navigation Hub — Screen Overview"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {NAV_GROUPS.map((group) => (
          <Card key={group.titleKey}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t(group.titleKey as Parameters<typeof t>[0])}</CardTitle>
              <CardDescription className="text-xs">
                {group.items.length} screens
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent group"
                  >
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t(item.labelKey as Parameters<typeof t>[0])}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.href}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
