import { Target } from "lucide-react"

import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores"
import { ADMIN_ROUTES } from "@/lib/constants/routes"
import type { GoalCategory } from "@/lib/types"
import type { ActivityItem } from "@/components/shared/activity-feed"

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface KpiData {
  value: number
  diff: number
  trend: number[]
}

export interface ReviewQueueItem {
  id: string
  title: string
  assignee: string
  submittedAt: Date
  overdueMinutes?: number
}

export interface AnomalyItem {
  id: string
  store: string
  message: string
  severity: "warning" | "critical"
}

export interface DayAlert {
  id: string
  message: string
  link?: string
}

export interface MorningBriefTask {
  id: string
  title: string
  workType: string
  estimatedMinutes: number
  assignee?: string
}

export interface GoalProgress {
  id: string
  storeId: number
  storeName: string
  category: GoalCategory
  title: string
  progress: number
}

export interface AISuggestion {
  id: string
  title: string
  storeName: string
  urgency: "high" | "medium"
}

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════

export const OPERATIONS_KPI: Record<string, KpiData> = {
  tasksToday: { value: 87, diff: 12, trend: [65, 72, 78, 80, 85, 82, 87] },
  completed: { value: 54, diff: 5, trend: [40, 45, 48, 50, 52, 53, 54] },
  onReview: { value: 9, diff: 0, trend: [8, 10, 7, 9, 8, 9, 9] },
  fotVsPlan: { value: 97.4, diff: -2.6, trend: [95, 96, 94, 97, 98, 97, 97.4] },
}

export const HR_KPI: Record<string, KpiData> = {
  activeEmployees: { value: 156, diff: 3, trend: [150, 152, 153, 154, 155, 155, 156] },
  onProbation: { value: 12, diff: 0, trend: [10, 11, 12, 11, 12, 12, 12] },
  terminatedMonth: { value: 4, diff: -2, trend: [6, 5, 5, 4, 4, 4, 4] },
  turnoverRate: { value: 8.5, diff: -1.2, trend: [10, 9.5, 9, 9, 8.8, 8.6, 8.5] },
}

export const REVIEW_QUEUE: ReviewQueueItem[] = [
  { id: "1", title: "Выкладка молочной продукции", assignee: "Иванов И.", submittedAt: new Date(Date.now() - 45 * 60 * 1000), overdueMinutes: 15 },
  { id: "2", title: "Проверка ценников", assignee: "Петров А.", submittedAt: new Date(Date.now() - 30 * 60 * 1000) },
  { id: "3", title: "Инвентаризация склада", assignee: "Сидорова М.", submittedAt: new Date(Date.now() - 25 * 60 * 1000) },
  { id: "4", title: "Уборка торгового зала", assignee: "Козлов В.", submittedAt: new Date(Date.now() - 20 * 60 * 1000), overdueMinutes: 5 },
  { id: "5", title: "Приёмка товара", assignee: "Новикова Е.", submittedAt: new Date(Date.now() - 15 * 60 * 1000) },
]

export const ANOMALIES: AnomalyItem[] = [
  { id: "1", store: DEMO_TOP_STORES[0]?.name ?? "Магазин", message: "OOS молочная группа +15% к норме", severity: "critical" },
  { id: "2", store: DEMO_TOP_STORES[1]?.name ?? "Магазин", message: "3 невыхода за неделю", severity: "warning" },
  { id: "3", store: DEMO_TOP_STORES[2]?.name ?? "Магазин", message: "Списания хлеб +8%", severity: "warning" },
]

export const DAY_ALERTS: DayAlert[] = [
  { id: "1", message: "8 ч на паузе у задачи «Переоценка»", link: ADMIN_ROUTES.taskDetail("task-1") },
  { id: "2", message: "Нет смен на завтра в зоне Касса", link: ADMIN_ROUTES.schedule },
  { id: "3", message: "Возвраты по Иванов И. — 3 подряд", link: ADMIN_ROUTES.employeeDetail("emp-1") },
]

export const ACTIVITY_ITEMS: ActivityItem[] = [
  { id: "1", timestamp: new Date(Date.now() - 5 * 60 * 1000), actor: "Иванов И.", action: "завершил задачу «Выкладка молочной продукции»", type: "TASK_COMPLETED", link: ADMIN_ROUTES.taskDetail("1") },
  { id: "2", timestamp: new Date(Date.now() - 12 * 60 * 1000), actor: "Петров А.", action: "отправил на проверку «Проверка ценников»", type: "TASK_COMPLETED", link: ADMIN_ROUTES.taskDetail("2") },
  { id: "3", timestamp: new Date(Date.now() - 25 * 60 * 1000), actor: "Система", action: "обнаружила аномалию: OOS молочная группа", type: "AI", link: ADMIN_ROUTES.aiSuggestions },
  { id: "4", timestamp: new Date(Date.now() - 35 * 60 * 1000), actor: "Сидорова М.", action: "начала задачу «Инвентаризация склада»", type: "TASK_CREATED", link: ADMIN_ROUTES.taskDetail("3") },
  { id: "5", timestamp: new Date(Date.now() - 45 * 60 * 1000), actor: "Козлов В.", action: "поставил задачу на паузу", type: "TASK_BLOCKED", link: ADMIN_ROUTES.taskDetail("4") },
  { id: "6", timestamp: new Date(Date.now() - 55 * 60 * 1000), actor: "Новикова Е.", action: "открыла смену", type: "EMPLOYEE", link: ADMIN_ROUTES.schedule },
  { id: "7", timestamp: new Date(Date.now() - 65 * 60 * 1000), actor: "ИИ-аналитика", action: "предложила новую цель: Снижение OOS", type: "GOAL", link: ADMIN_ROUTES.aiSuggestions },
  { id: "8", timestamp: new Date(Date.now() - 75 * 60 * 1000), actor: "Морозов Д.", action: "завершил задачу «Приёмка товара»", type: "TASK_COMPLETED", link: ADMIN_ROUTES.taskDetail("5") },
  { id: "9", timestamp: new Date(Date.now() - 85 * 60 * 1000), actor: "Волкова А.", action: "добавила комментарий к задаче", type: "COMMENT", link: ADMIN_ROUTES.taskDetail("6") },
  { id: "10", timestamp: new Date(Date.now() - 95 * 60 * 1000), actor: "Кузнецов С.", action: "архивировал задачу «Уборка склада»", type: "TASK_ARCHIVED", link: ADMIN_ROUTES.tasksArchive },
  { id: "11", timestamp: new Date(Date.now() - 105 * 60 * 1000), actor: "Система", action: "синхронизировала расписание из LAMA", type: "SYSTEM" },
  { id: "12", timestamp: new Date(Date.now() - 115 * 60 * 1000), actor: "Лебедева О.", action: "создала новую задачу", type: "TASK_CREATED", link: ADMIN_ROUTES.taskDetail("7") },
]

export const PLAN_FACT_DATA = [
  { day: "Пн", plan: 210, fact: 195 },
  { day: "Вт", plan: 220, fact: 235 },
  { day: "Ср", plan: 215, fact: 210 },
  { day: "Чт", plan: 225, fact: 220 },
  { day: "Пт", plan: 230, fact: 225 },
  { day: "Сб", plan: 180, fact: 175 },
  { day: "Вс", plan: 150, fact: 155 },
]

export const MORNING_BRIEF_STORE_DIRECTOR = {
  shiftUtilization: { onShift: 8, total: 9, late: 1, freeNow: 2, overloaded: 1 },
  plannedTasks: [
    { id: "1", title: "Выкладка молочной продукции", workType: "Выкладка", estimatedMinutes: 45 },
    { id: "2", title: "Проверка ценников в зале", workType: "Аудит", estimatedMinutes: 30 },
    { id: "3", title: "Приёмка утренней поставки", workType: "Приёмка", estimatedMinutes: 60, assignee: "Иванов И." },
  ] as MorningBriefTask[],
  reviewTasks: [
    { id: "4", title: "Инвентаризация склада", workType: "Инвентаризация", estimatedMinutes: 90, assignee: "Сидорова М." },
    { id: "5", title: "Уборка торгового зала", workType: "Уборка", estimatedMinutes: 30, assignee: "Козлов В." },
  ] as MorningBriefTask[],
  bonusTasks: [
    { id: "6", title: "Переоценка скоропорта", workType: "Переоценка", estimatedMinutes: 20 },
    { id: "7", title: "Доп. выкладка промо", workType: "Выкладка", estimatedMinutes: 25 },
  ] as MorningBriefTask[],
}

export const MORNING_BRIEF_SUPERVISOR = {
  anomalies: ANOMALIES,
  goalsProgress: [
    { id: "g1", storeId: DEMO_TOP_STORES[0]?.id ?? 0, storeName: DEMO_TOP_STORES[0]?.name ?? "", category: "OOS_REDUCTION" as GoalCategory, title: "Снижение OOS молочной группы", progress: 68 },
    { id: "g2", storeId: DEMO_TOP_STORES[1]?.id ?? 0, storeName: DEMO_TOP_STORES[1]?.name ?? "", category: "WRITE_OFFS" as GoalCategory, title: "Снижение списаний хлеб", progress: 45 },
  ] as GoalProgress[],
  urgentSuggestions: [
    { id: "s1", title: `Переоценка скоропорта в ${DEMO_TOP_STORES[0]?.name ?? ""}`, storeName: DEMO_TOP_STORES[0]?.name ?? "", urgency: "high" as const },
    { id: "s2", title: "Доп. смена на выкладку", storeName: DEMO_TOP_STORES[1]?.name ?? "", urgency: "medium" as const },
  ] as AISuggestion[],
  bonusTasksTomorrow: 12,
}

export const ACTIVE_GOAL = {
  id: "goal-1",
  category: "OOS_REDUCTION" as GoalCategory,
  title: "Снижение OOS молочной группы до 2%",
  progress: 68,
  storeId: 1,
}

export type MorningBriefStoreDirectorData = typeof MORNING_BRIEF_STORE_DIRECTOR
export type MorningBriefSupervisorData = typeof MORNING_BRIEF_SUPERVISOR
export type ActiveGoal = typeof ACTIVE_GOAL

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

export function getGreetingKey(): "greeting_morning" | "greeting_afternoon" | "greeting_evening" {
  const hour = new Date().getHours()
  if (hour < 12) return "greeting_morning"
  if (hour < 18) return "greeting_afternoon"
  return "greeting_evening"
}

export function isMorningBriefTime(): boolean {
  const hour = new Date().getHours()
  return hour < 11
}

export function formatDateLong(locale: string): string {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(now)
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(now)
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${date}`
}

export function formatMinutesAgo(minutes: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  return rtf.format(-minutes, "minute")
}

export const GOAL_CATEGORY_ICON: Record<GoalCategory, typeof Target> = {
  OOS_REDUCTION: Target,
  WRITE_OFFS: Target,
  PROMO_QUALITY: Target,
  PRICE_ACCURACY: Target,
  IMPULSE_ZONES: Target,
  PRODUCTIVITY: Target,
  CUSTOM: Target,
}
