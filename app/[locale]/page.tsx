import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { ShiftStateBadge } from "@/components/shared/shift-state-badge"
import { PermissionPill } from "@/components/shared/permission-pill"
import { RoleBadge } from "@/components/shared/role-badge"
import { WorkTypeBadge } from "@/components/shared/work-type-badge"
import { PageHeader } from "@/components/shared/page-header"
import { KpiCard } from "@/components/shared/kpi-card"
import { EntitySummaryCard } from "@/components/shared/entity-summary-card"
import { ActivityFeed } from "@/components/shared/activity-feed"
import { EmptyState } from "@/components/shared/empty-state"
import { ShoppingCart, Users, TrendingUp, Package, ClipboardList } from "lucide-react"
import type { TaskState, TaskReviewState, ShiftState, StoreZone, FunctionalRole } from "@/lib/types"
import type { ActivityItem } from "@/components/shared/activity-feed"

const TASK_STATES: TaskState[] = ["DRAFT", "OPEN", "IN_PROGRESS", "PAUSED", "BLOCKED", "COMPLETED", "ARCHIVED"]
const REVIEW_STATES: TaskReviewState[] = ["NONE", "PENDING", "APPROVED", "REJECTED", "NEEDS_REVISION"]
const SHIFT_STATES: ShiftState[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]
const ZONES: StoreZone[] = ["CASHIER", "SALES_FLOOR", "WAREHOUSE", "OFFICE", "PRODUCTION", "RECEIVING", "CLEANING"]
const ROLES: FunctionalRole[] = [
  "NETWORK_OPS", "REGIONAL", "SUPERVISOR", "STORE_DIRECTOR",
  "HR_MANAGER", "OPERATOR", "WORKER", "AGENT", "PLATFORM_ADMIN",
]
const WORK_TYPES = [
  { id: 0, name: "Переоценка" },
  { id: 1, name: "OOS-проверка" },
  { id: 2, name: "Инвентаризация" },
  { id: 3, name: "Мерчандайзинг" },
  { id: 4, name: "Разгрузка" },
  { id: 5, name: "Клининг" },
  { id: 6, name: "Переоценка 2" },
]

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 3 * 60_000),
    actor: "Иванова А.В.",
    action: "завершила задачу «Переоценка молочного отдела»",
    type: "TASK_COMPLETED",
    link: "/tasks/1",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 35 * 60_000),
    actor: "Петров Д.С.",
    action: "заблокировал задачу «OOS-проверка заморозки»",
    type: "TASK_BLOCKED",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 2 * 60 * 60_000),
    actor: "ИИ-аналитика",
    action: "предложила новую задачу по инвентаризации",
    type: "AI",
    link: "/ai/suggestions",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 26 * 60 * 60_000),
    actor: "Сидорова Н.К.",
    action: "создала цель «Снизить OOS до 2%»",
    type: "GOAL",
  },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

export default async function HomePage() {
  const t = await getTranslations("nav")
  const tc = await getTranslations("common")

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-8 font-sans">
      <PageHeader
        title="WFM Admin"
        subtitle="Раздел 3 — Layout &amp; feedback primitives"
        breadcrumbs={[
          { label: "WFM Admin", href: "/" },
          { label: "Компоненты" },
        ]}
        actions={
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
            v0 Preview
          </span>
        }
      />

      {/* KPI Cards */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          KpiCard — positive / negative / sparkline
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Выручка"
            value="₽1 248 400"
            diff={12}
            trend={[40, 45, 38, 52, 60, 58, 72, 80]}
            icon={ShoppingCart}
          />
          <KpiCard
            label="Сотрудники"
            value="147"
            diff={-3}
            trend={[60, 58, 55, 57, 53, 50, 49, 47]}
            icon={Users}
          />
          <KpiCard
            label="Цели выполнено"
            value="8 / 12"
            diff={5}
            trend={[3, 4, 5, 5, 6, 7, 8, 8]}
            icon={TrendingUp}
          />
          <KpiCard
            label="OOS"
            value="3.2%"
            icon={Package}
          />
        </div>
      </section>

      {/* Entity Summary Cards */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          EntitySummaryCard — employee / store / task
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <EntitySummaryCard
            title="Иванова Анна Викторовна"
            subtitle="Кассир · SPAR Томск, ул. Мира 34"
            status={{ label: "Активен", className: "bg-success/10 text-success border-success/20" }}
            badges={[{ label: "Штатный" }, { label: "Касса" }]}
            avatar={{ fallback: "ИА" }}
            link="/employees/1"
          />
          <EntitySummaryCard
            title="SPAR Новосибирск, ул. Ленина 12"
            subtitle="Супермаркет · Новосибирск"
            status={{ label: "Открыт", className: "bg-success/10 text-success border-success/20" }}
            badges={[{ label: "FMCG" }, { label: "52 сотрудника" }]}
          />
          <EntitySummaryCard
            title="Переоценка молочного отдела"
            subtitle="Срок: 28 апр 2026 · Торговый зал"
            status={{ label: "В работе", className: "bg-info/10 text-info border-info/20" }}
            badges={[{ label: "Регулярная" }, { label: "Срочная", className: "bg-destructive/10 text-destructive border-destructive/20" }]}
            link="/tasks/1"
          />
          <EntitySummaryCard
            title="Food City Томск Global Market"
            subtitle="Гипермаркет · Томск"
            status={{ label: "На паузе", className: "bg-warning/10 text-warning border-warning/20" }}
            badges={[{ label: "Fashion" }]}
            avatar={{ fallback: "FC" }}
          />
        </div>
      </section>

      {/* Activity Feed */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          ActivityFeed — type-specific icons, relative time
        </h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <ActivityFeed items={MOCK_ACTIVITY} />
        </div>
      </section>

      {/* Empty State */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          EmptyState — icon + title + description + CTA
        </h2>
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={ClipboardList}
            title="Задачи не найдены"
            description="Нет задач соответствующих фильтрам. Измените критерии поиска или создайте новую задачу."
            action={{ label: "Создать задачу", icon: ClipboardList }}
          />
        </div>
      </section>

      <div className="border-t border-border pt-4">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Раздел 2 — Badges (предыдущий)
        </h2>
      </div>

      <Section title="TaskStateBadge — task.state">
        <div className="flex w-full flex-wrap gap-2">
          {TASK_STATES.map((s) => (
            <TaskStateBadge key={s} state={s} />
          ))}
        </div>
        <div className="flex w-full flex-wrap gap-2 pt-1">
          {TASK_STATES.map((s) => (
            <TaskStateBadge key={s} state={s} size="sm" />
          ))}
        </div>
      </Section>

      <Section title="ReviewStateBadge — task.review (NONE renders null)">
        {REVIEW_STATES.map((r) => (
          <ReviewStateBadge key={r} reviewState={r} />
        ))}
      </Section>

      <Section title="ShiftStateBadge — shift.state (IN_PROGRESS has pulse dot)">
        {SHIFT_STATES.map((s) => (
          <ShiftStateBadge key={s} state={s} />
        ))}
      </Section>

      <Section title="PermissionPill — permission.zones">
        {ZONES.map((z) => (
          <PermissionPill key={z} permission={z} />
        ))}
      </Section>

      <Section title="RoleBadge — role.functional">
        {ROLES.map((r) => (
          <RoleBadge key={r} role={r} />
        ))}
      </Section>

      <Section title="WorkTypeBadge — variant=light (id % 6 → 6 colour schemes)">
        {WORK_TYPES.map((wt) => (
          <WorkTypeBadge key={wt.id} workType={wt} variant="light" />
        ))}
      </Section>

      <Section title="WorkTypeBadge — variant=bright">
        {WORK_TYPES.map((wt) => (
          <WorkTypeBadge key={wt.id} workType={wt} variant="bright" />
        ))}
      </Section>

      <nav className="rounded-xl border border-border bg-card p-6">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          {tc("language")}: RU / EN
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          {(["dashboard", "tasks", "goals", "schedule", "employees"] as const).map((key) => (
            <li key={key}>
              <Link
                href={`/${key}` as Parameters<typeof Link>[0]["href"]}
                className="text-primary underline-offset-4 hover:underline"
              >
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
