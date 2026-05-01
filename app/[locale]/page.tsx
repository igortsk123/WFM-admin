import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { TaskStateBadge } from "@/components/shared/task-state-badge"
import { ReviewStateBadge } from "@/components/shared/review-state-badge"
import { ShiftStateBadge } from "@/components/shared/shift-state-badge"
import { PermissionPill } from "@/components/shared/permission-pill"
import { RoleBadge } from "@/components/shared/role-badge"
import { WorkTypeBadge } from "@/components/shared/work-type-badge"
import type { TaskState, TaskReviewState, ShiftState, StoreZone, FunctionalRole } from "@/lib/types"

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">WFM Admin</h1>
        <p className="text-sm text-muted-foreground">
          Раздел 2 — Status badges &amp; display primitives
        </p>
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
