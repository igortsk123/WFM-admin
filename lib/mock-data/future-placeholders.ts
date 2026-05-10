import type { Goal, BonusBudget } from "@/lib/types";

/**
 * @endpoint GET /api/future/* — заглушки для экранов M1-M6.
 * aiHints, riskRules, goals, leaderboard, bonusBudgets, bonusTasks, payoutPeriods.
 */

// ══════════════════════════════════════════════════════════════════
// AI HINTS (упрощено: менеджер грузит Excel-шаблон)
// ══════════════════════════════════════════════════════════════════

export interface AIHint {
  id: string;
  work_type_id: number;
  work_type_name: string;
  version: number;
  text: string;
  stats: {
    impressions: number;
    applications: number;
    helpful_rate: number; // 0-1
  };
  created_at: string;
}

export const MOCK_AI_HINTS: AIHint[] = [
  {
    id: "hint-ai-001",
    work_type_id: 4,
    work_type_name: "Выкладка",
    version: 1,
    text: "Начинайте выкладку с дальней полки. Следите за ротацией: новые товары — назад, старые — вперёд. Фотофиксация после завершения обязательна.",
    stats: { impressions: 312, applications: 187, helpful_rate: 0.71 },
    created_at: "2026-03-15T09:00:00+07:00",
  },
  {
    id: "hint-ai-002",
    work_type_id: 4,
    work_type_name: "Выкладка",
    version: 2,
    text: "При выкладке молочки: первый ряд — ближайшие сроки. Зазоры между пачками — не более 2 мм. Фасинг строго к покупателю. Полки без пыли до начала.",
    stats: { impressions: 228, applications: 163, helpful_rate: 0.82 },
    created_at: "2026-04-02T09:00:00+07:00",
  },
  {
    id: "hint-ai-003",
    work_type_id: 4,
    work_type_name: "Выкладка",
    version: 3,
    text: "Excel-шаблон v3 загружен 28 апр. Включён новый чек-лист: контроль ценников во время выкладки (не отдельная задача). Сокращает возвраты на 30%.",
    stats: { impressions: 74, applications: 58, helpful_rate: 0.88 },
    created_at: "2026-04-28T09:00:00+07:00",
  },
];

// ══════════════════════════════════════════════════════════════════
// RISK RULES
// ══════════════════════════════════════════════════════════════════

export interface RiskRule {
  id: string;
  work_type_id: number;
  work_type_name: string;
  name: string;
  description: string;
  triggers: Array<{
    metric: string;
    operator: "gt" | "lt" | "gte" | "lte";
    threshold: number;
    unit: string;
  }>;
  severity: "low" | "medium" | "high";
  active: boolean;
}

export const MOCK_RISK_RULES: RiskRule[] = [
  {
    id: "rule-001",
    work_type_id: 11,
    work_type_name: "Контроль качества",
    name: "Контроль скоропорта — без проверки >24ч",
    description: "Если контроль сроков годности молочки не выполнялся более 24 часов — создать задачу автоматически.",
    triggers: [{ metric: "hours_since_last_quality_check", operator: "gt", threshold: 24, unit: "ч" }],
    severity: "high",
    active: true,
  },
  {
    id: "rule-002",
    work_type_id: 4,
    work_type_name: "Выкладка",
    name: "OOS в категории выше нормы",
    description: "Если OOS по категории превысил установленный стандарт (из настроек) — предложить задачу на доукладку.",
    triggers: [{ metric: "oos_pct", operator: "gt", threshold: 4, unit: "%" }],
    severity: "medium",
    active: true,
  },
  {
    id: "rule-003",
    work_type_id: 5,
    work_type_name: "Переоценка",
    name: "Ценники не обновлены после выгрузки",
    description: "После выгрузки изменений цен из 1С — если за 4 часа задача на переоценку не создана, триггер.",
    triggers: [{ metric: "hours_since_reprice_export", operator: "gt", threshold: 4, unit: "ч" }],
    severity: "medium",
    active: true,
  },
  {
    id: "rule-004",
    work_type_id: 6,
    work_type_name: "Инвентаризация",
    name: "Расхождение остатков выше допустимого",
    description: "Если расхождение по результатам инвентаризации превысило 2% — эскалация SUPERVISOR.",
    triggers: [{ metric: "inventory_discrepancy_pct", operator: "gt", threshold: 2, unit: "%" }],
    severity: "high",
    active: false,
  },
];

// ══════════════════════════════════════════════════════════════════
// GOALS (6 макроцелей)
// ══════════════════════════════════════════════════════════════════

export const MOCK_GOALS: Goal[] = [
  {
    id: "goal-oos-active",
    category: "OOS_REDUCTION",
    title: "Снизить OOS в молочке на 15% за неделю",
    description: "Активная цель: снизить Out-of-Stock в категории «Молочка» по сети с текущих 6.2% до 5.3% (−15%) за 7 дней.",
    starting_value: 6.2,
    target_value: 5.3,
    target_unit: "%",
    current_value: 5.9,
    direction: "decrease",
    status: "ACTIVE",
    scope: "NETWORK",
    proposed_by: "AI",
    selected_by: 4, // Романов
    selected_at: "2026-04-28T10:00:00+07:00",
    period_start: "2026-04-28",
    period_end: "2026-05-05",
    money_impact: {
      amount: 450_000,
      period: "week",
      rationale_short: "−15% OOS в молочке ≈ +450 000 ₽/неделя по сети",
      rationale_breakdown: [
        "Категория «Молочка»: ~30% выручки магазина (≈ 3 млн ₽/неделя в среднем)",
        "−1 п.п. OOS даёт +3–5% продаж в категории (исторический анализ POS)",
        "Сетевой эффект: 132 магазина × ~5% × коэф. атрибуции 0.7",
        "Итого: ≈ 450 000 ₽ дополнительной выручки в неделю при достижении 5.3%",
      ],
    },
  },
  {
    id: "goal-writeoffs-1",
    category: "WRITE_OFFS",
    title: "Снизить списания хлебобулочки до нормы",
    description: "Списания хлебобулочных изделий по сети 3.8% при норме 2.5%. Цель — снизить до 2.5% за 14 дней.",
    starting_value: 3.8,
    target_value: 2.5,
    target_unit: "%",
    current_value: 3.8,
    direction: "decrease",
    status: "PROPOSED",
    scope: "NETWORK",
    proposed_by: "AI",
    period_start: "2026-05-01",
    period_end: "2026-05-15",
    money_impact: {
      amount: 280_000,
      period: "week",
      rationale_short: "−1.3 п.п. списаний ≈ −280 000 ₽/неделя экономии",
      rationale_breakdown: [
        "Текущий объём списаний по сети: ~820 000 ₽/неделя в категории",
        "Снижение с 3.8% до 2.5% (норма) = −34% от текущих списаний",
        "132 магазина × средняя экономия 2 100 ₽/магазин/неделя",
        "Источник коэффициентов: исторический анализ списаний после внедрения FIFO-контроля",
      ],
    },
  },
  {
    id: "goal-promo-1",
    category: "PROMO_QUALITY",
    title: "Улучшить качество промо-выкладки Г-1 Котовского",
    description: "Проверки показали 42% несоответствий с промо-стандартом. Целевой уровень — 15% и ниже к концу мая.",
    starting_value: 42,
    target_value: 15,
    target_unit: "%",
    current_value: 42,
    direction: "decrease",
    status: "PROPOSED",
    scope: "STORE",
    store_id: 200,
    proposed_by: "AI",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    money_impact: {
      amount: 95_000,
      period: "month",
      rationale_short: "Промо-стандарт по магазину ≈ +95 000 ₽/месяц конверсии",
      rationale_breakdown: [
        "Промо-зоны генерируют ~15% месячной выручки магазина (~1.2 млн ₽)",
        "−27 п.п. несоответствий = +8% конверсии промо (по A/B данным)",
        "1.2 млн × 8% × коэф. атрибуции 1.0 ≈ 95 000 ₽/месяц",
        "Источник: post-promo lift analysis по аналогичным форматам",
      ],
    },
  },
  {
    id: "goal-price-1",
    category: "PRICE_ACCURACY",
    title: "Нулевые расхождения ценников в алкогольном отделе",
    description: "По итогам апрельской проверки — 7 ценников не совпали с ценой на кассе. Цель: 0 расхождений.",
    starting_value: 7,
    target_value: 0,
    target_unit: "шт.",
    current_value: 7,
    direction: "decrease",
    status: "PROPOSED",
    scope: "STORE",
    store_id: 1,
    proposed_by: "MANAGER",
    selected_by: 4,
    selected_at: "2026-04-25T14:00:00+07:00",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    money_impact: {
      amount: 38_000,
      period: "month",
      rationale_short: "0 жалоб на кассе ≈ −38 000 ₽/месяц компенсаций",
      rationale_breakdown: [
        "Средняя компенсация по жалобе на расхождение цены: ~5 400 ₽ (включая чек + сертификат)",
        "В апреле — 7 расхождений, исторический показатель 6–8 жалоб/месяц",
        "Цель 0 расхождений = ~38 000 ₽/месяц прямой экономии",
        "Не учтён репутационный эффект и churn-rate лояльных покупателей",
      ],
    },
  },
  {
    id: "goal-productivity-1",
    category: "PRODUCTIVITY",
    title: "Поднять процент выполнения СПАР Новосибирск до 88%",
    description: "Апрельский показатель SPAR-NSK-001 — 82.6%. Цель: достичь 88% к концу мая за счёт нормализации выполнения задач.",
    starting_value: 82.6,
    target_value: 88,
    target_unit: "%",
    current_value: 82.6,
    direction: "increase",
    status: "PROPOSED",
    scope: "STORE",
    store_id: 4,
    proposed_by: "AI",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    money_impact: {
      amount: 64_000,
      period: "month",
      rationale_short: "+5.4 п.п. выполнения задач ≈ +64 000 ₽/месяц на ФОТ",
      rationale_breakdown: [
        "+5.4 п.п. = ~32 чел.-часа сэкономленного бонусного времени в месяц",
        "Средняя ставка задачи: ~300 ₽/час",
        "32 ч × 300 ₽ + сокращение перерасхода ФОТ на хвостах смены ≈ 64 000 ₽/месяц",
        "Также косвенно: снижение OOS-инцидентов на 12% (по correlated KPI)",
      ],
    },
  },
  {
    id: "goal-oos-completed",
    category: "OOS_REDUCTION",
    title: "Снизить OOS в замороженных продуктах",
    description: "Завершённая цель: OOS по заморозке снизился с 8.1% до 4.7%. Целевой уровень — 5%.",
    starting_value: 8.1,
    target_value: 5.0,
    target_unit: "%",
    current_value: 4.7,
    direction: "decrease",
    status: "COMPLETED",
    scope: "NETWORK",
    proposed_by: "AI",
    selected_by: 3, // Соколова
    selected_at: "2026-04-01T09:00:00+07:00",
    period_start: "2026-04-01",
    period_end: "2026-04-28",
    money_impact: {
      amount: 1_700_000,
      period: "month",
      rationale_short: "−3.4 п.п. OOS в заморозке ≈ +1.7 млн ₽/месяц выручки",
      rationale_breakdown: [
        "Заморозка: ~12% месячной выручки (≈ 14 млн ₽ по сети)",
        "−3.4 п.п. OOS × 3.5% lift на п.п. ≈ +12% продаж в категории",
        "14 млн × 12% ≈ 1.7 млн ₽/месяц",
        "Цель завершена с overshoot (4.7% < 5.0%) — фактический эффект выше прогноза",
      ],
    },
  },
];

// ══════════════════════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════════════════════

export interface LeaderboardEntry {
  rank: number;
  entity_type: "USER" | "STORE";
  entity_id: number | string;
  entity_name: string;
  points: number;
  tasks_completed: number;
  bonus_tasks_completed: number;
  trend: "up" | "down" | "stable";
  trend_positions: number;
}

export const MOCK_LEADERBOARD_USERS: LeaderboardEntry[] = [
  { rank: 1, entity_type: "USER", entity_id: 25, entity_name: "Соловьева Ирина Дмитриевна", points: 1840, tasks_completed: 53, bonus_tasks_completed: 8, trend: "up", trend_positions: 2 },
  { rank: 2, entity_type: "USER", entity_id: 23, entity_name: "Волкова Марина Олеговна", points: 1720, tasks_completed: 47, bonus_tasks_completed: 6, trend: "stable", trend_positions: 0 },
  { rank: 3, entity_type: "USER", entity_id: 19, entity_name: "Захарова Наталья Петровна", points: 1680, tasks_completed: 51, bonus_tasks_completed: 5, trend: "up", trend_positions: 1 },
  { rank: 4, entity_type: "USER", entity_id: 15, entity_name: "Козлова Дарья Андреевна", points: 1590, tasks_completed: 49, bonus_tasks_completed: 7, trend: "down", trend_positions: 1 },
  { rank: 5, entity_type: "USER", entity_id: 21, entity_name: "Кириллова Светлана Васильевна", points: 1490, tasks_completed: 41, bonus_tasks_completed: 4, trend: "stable", trend_positions: 0 },
  { rank: 6, entity_type: "USER", entity_id: 17, entity_name: "Медведева Татьяна Ивановна", points: 1450, tasks_completed: 44, bonus_tasks_completed: 3, trend: "up", trend_positions: 2 },
  { rank: 7, entity_type: "USER", entity_id: 18, entity_name: "Федоров Алексей Николаевич", points: 1340, tasks_completed: 38, bonus_tasks_completed: 2, trend: "stable", trend_positions: 0 },
  { rank: 8, entity_type: "USER", entity_id: 24, entity_name: "Лебедев Роман Александрович", points: 1280, tasks_completed: 42, bonus_tasks_completed: 2, trend: "down", trend_positions: 1 },
  { rank: 9, entity_type: "USER", entity_id: 27, entity_name: "Белова Юлия Сергеевна", points: 1230, tasks_completed: 36, bonus_tasks_completed: 3, trend: "up", trend_positions: 3 },
  { rank: 10, entity_type: "USER", entity_id: 20, entity_name: "Попов Владимир Сергеевич", points: 1190, tasks_completed: 34, bonus_tasks_completed: 1, trend: "stable", trend_positions: 0 },
];

export const MOCK_LEADERBOARD_STORES: LeaderboardEntry[] = [
  { rank: 1, entity_type: "STORE", entity_id: 200, entity_name: "Г-1 Котовского 19/3 (ГМ)", points: 9840, tasks_completed: 412, bonus_tasks_completed: 28, trend: "up", trend_positions: 1 },
  { rank: 2, entity_type: "STORE", entity_id: 1, entity_name: "СПАР Томск, пр. Ленина 80", points: 9620, tasks_completed: 398, bonus_tasks_completed: 24, trend: "stable", trend_positions: 0 },
  { rank: 3, entity_type: "STORE", entity_id: 270, entity_name: "С-6 Мичурина 37 (П)", points: 8940, tasks_completed: 361, bonus_tasks_completed: 18, trend: "up", trend_positions: 2 },
  { rank: 4, entity_type: "STORE", entity_id: 6, entity_name: "СПАР Кемерово, пр. Советский 50", points: 8510, tasks_completed: 344, bonus_tasks_completed: 15, trend: "up", trend_positions: 1 },
  { rank: 5, entity_type: "STORE", entity_id: 2, entity_name: "СПАР Томск, ул. Красноармейская 99", points: 8320, tasks_completed: 337, bonus_tasks_completed: 12, trend: "stable", trend_positions: 0 },
  { rank: 6, entity_type: "STORE", entity_id: 3, entity_name: "СПАР Томск, пр. Фрунзе 92а", points: 8170, tasks_completed: 328, bonus_tasks_completed: 11, trend: "down", trend_positions: 1 },
  { rank: 7, entity_type: "STORE", entity_id: 4, entity_name: "СПАР Новосибирск, ул. Ленина 55", points: 7840, tasks_completed: 311, bonus_tasks_completed: 8, trend: "down", trend_positions: 2 },
  { rank: 8, entity_type: "STORE", entity_id: 5, entity_name: "СПАР Новосибирск, Красный пр. 200", points: 7510, tasks_completed: 298, bonus_tasks_completed: 6, trend: "down", trend_positions: 1 },
];

// ══════════════════════════════════════════════════════════════════
// BONUS BUDGETS
// ══════════════════════════════════════════════════════════════════

export const MOCK_BONUS_BUDGETS: BonusBudget[] = [
  {
    id: "budget-001",
    store_id: 1, // SPAR-TOM-001
    supervisor_id: 4,
    period_start: "2026-05-01",
    period_end: "2026-05-01",
    total_points: 800,
    spent_points: 350,
    source: "YESTERDAY_INCOMPLETE",
  },
  {
    id: "budget-002",
    store_id: 200, // LAMA Г-1 Котовского (ex FC-TOM-001)
    supervisor_id: 12,
    period_start: "2026-05-01",
    period_end: "2026-05-07",
    total_points: 1500,
    spent_points: 600,
    source: "SUPERVISOR_BUDGET",
  },
  {
    id: "budget-003",
    // Сетевой бюджет (без store_id)
    supervisor_id: 3,
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    total_points: 5000,
    spent_points: 1200,
    source: "SUPERVISOR_BUDGET",
  },
];

// ══════════════════════════════════════════════════════════════════
// BONUS TASKS
// ══════════════════════════════════════════════════════════════════

export interface BonusTask {
  id: string;
  title: string;
  description: string;
  store_id: number;
  store_name: string;
  work_type_id: number;
  work_type_name: string;
  assignee_id?: number;
  assignee_name?: string;
  bonus_points: number;
  budget_id: string;
  goal_id?: string | null;
  state: "ACTIVE" | "COMPLETED" | "PROPOSED";
  proposed_by: "AI" | "MANAGER";
  accepted_points?: number;
  created_at: string;
}

export const MOCK_BONUS_TASKS: BonusTask[] = [
  {
    id: "bonus-task-001",
    title: "Срочная доукладка молочки — холодильник 5",
    description: "OOS молочки в холодильнике 5 превысил норму. Выполнить доукладку и обновить ценники до 13:00.",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    work_type_id: 4,
    work_type_name: "Выкладка",
    assignee_id: 15,
    assignee_name: "Козлова Дарья Андреевна",
    bonus_points: 200,
    budget_id: "budget-001",
    goal_id: "goal-oos-active",
    state: "ACTIVE",
    proposed_by: "AI",
    created_at: "2026-05-01T08:30:00+07:00",
  },
  {
    id: "bonus-task-002",
    title: "Контроль скоропорта в молочном отделе",
    description: "Внеплановый обход холодильников 1–4, изъятие товаров с остатком срока ≤1 день, фотофиксация.",
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    work_type_id: 11,
    work_type_name: "Контроль качества",
    assignee_id: 25,
    assignee_name: "Соловьева Ирина Дмитриевна",
    bonus_points: 150,
    budget_id: "budget-002",
    goal_id: "goal-oos-active",
    state: "ACTIVE",
    proposed_by: "AI",
    created_at: "2026-05-01T09:00:00+07:00",
  },
  {
    id: "bonus-task-003",
    title: "Выкладка промо-товаров после поставки",
    description: "Акционный товар «Майские хиты» прибыл. Срочная выкладка на выделенные позиции по промо-схеме.",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    work_type_id: 4,
    work_type_name: "Выкладка",
    assignee_id: 18,
    assignee_name: "Федоров Алексей Николаевич",
    bonus_points: 180,
    budget_id: "budget-001",
    goal_id: null,
    state: "COMPLETED",
    proposed_by: "MANAGER",
    accepted_points: 180,
    created_at: "2026-04-30T14:00:00+07:00",
  },
  {
    id: "bonus-task-004",
    title: "Инвентаризация зоны Fresh по итогам дня",
    description: "Сверка остатков Fresh-зоны по системе после закрытия. Исправить расхождения до начала ночной приёмки.",
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    work_type_id: 6,
    work_type_name: "Инвентаризация",
    assignee_id: 27,
    assignee_name: "Белова Юлия Сергеевна",
    bonus_points: 100,
    budget_id: "budget-002",
    goal_id: null,
    state: "COMPLETED",
    proposed_by: "MANAGER",
    accepted_points: 100,
    created_at: "2026-04-29T18:00:00+07:00",
  },
  {
    id: "bonus-task-005",
    title: "Проверка ценников молочки после утренней приёмки",
    description: "AI предлагает бонусную задачу в рамках цели OOS: убедиться что все ценники на молочке актуальны после приёмки.",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    work_type_id: 10,
    work_type_name: "Ценообразование",
    bonus_points: 100,
    budget_id: "budget-001",
    goal_id: "goal-oos-active",
    state: "PROPOSED",
    proposed_by: "AI",
    created_at: "2026-05-01T10:00:00+07:00",
  },
];

// ══════════════════════════════════════════════════════════════════
// PAYOUT PERIODS (bonus, 1 балл = 1 рубль)
// ══════════════════════════════════════════════════════════════════

export type PayoutPeriodStatus = "OPEN" | "CALCULATING" | "READY" | "PAID";

export interface BonusPayoutPeriod {
  id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  store_id?: number;
  store_name?: string;
  status: PayoutPeriodStatus;
  total_points: number;
  total_rub: number;
  employees_count: number;
  paid_at?: string;
}

export interface BonusPayoutRow {
  period_id: string;
  user_id: number;
  user_name: string;
  store_name: string;
  tasks_completed: number;
  bonus_tasks_completed: number;
  points_earned: number;
  rub_amount: number;
  status: "PENDING" | "READY" | "PAID";
}

export const MOCK_PAYOUT_PERIODS: BonusPayoutPeriod[] = [
  {
    id: "payout-period-001",
    period_label: "Апрель 2026",
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    status: "READY",
    total_points: 14850,
    total_rub: 14850,
    employees_count: 15,
  },
  {
    id: "payout-period-002",
    period_label: "Март 2026",
    period_start: "2026-03-01",
    period_end: "2026-03-31",
    status: "CALCULATING",
    total_points: 0,
    total_rub: 0,
    employees_count: 0,
  },
  {
    id: "payout-period-003",
    period_label: "Февраль 2026",
    period_start: "2026-02-01",
    period_end: "2026-02-28",
    status: "PAID",
    total_points: 13200,
    total_rub: 13200,
    employees_count: 13,
    paid_at: "2026-03-05T12:00:00+07:00",
  },
];

export const MOCK_PAYOUT_ROWS: BonusPayoutRow[] = [
  { period_id: "payout-period-001", user_id: 25, user_name: "Соловьева Ирина Дмитриевна", store_name: "Г-1 Котовского 19/3 (ГМ)", tasks_completed: 53, bonus_tasks_completed: 8, points_earned: 1840, rub_amount: 1840, status: "READY" },
  { period_id: "payout-period-001", user_id: 23, user_name: "Волкова Марина Олеговна", store_name: "СПАР Новосибирск, ул. Ленина 55", tasks_completed: 47, bonus_tasks_completed: 6, points_earned: 1720, rub_amount: 1720, status: "READY" },
  { period_id: "payout-period-001", user_id: 19, user_name: "Захарова Наталья Петровна", store_name: "СПАР Томск, пр. Ленина 80", tasks_completed: 51, bonus_tasks_completed: 5, points_earned: 1680, rub_amount: 1680, status: "READY" },
  { period_id: "payout-period-001", user_id: 15, user_name: "Козлова Дарья Андреевна", store_name: "СПАР Томск, пр. Ленина 80", tasks_completed: 49, bonus_tasks_completed: 7, points_earned: 1590, rub_amount: 1590, status: "READY" },
  { period_id: "payout-period-001", user_id: 21, user_name: "Кириллова Светлана Васильевна", store_name: "СПАР Новосибирск, ул. Ленина 55", tasks_completed: 41, bonus_tasks_completed: 4, points_earned: 1490, rub_amount: 1490, status: "READY" },
  { period_id: "payout-period-001", user_id: 17, user_name: "Медведева Татьяна Ивановна", store_name: "СПАР Томск, пр. Ленина 80", tasks_completed: 44, bonus_tasks_completed: 3, points_earned: 1450, rub_amount: 1450, status: "READY" },
  { period_id: "payout-period-001", user_id: 18, user_name: "Федоров Алексей Николаевич", store_name: "СПАР Томск, пр. Ленина 80", tasks_completed: 38, bonus_tasks_completed: 2, points_earned: 1340, rub_amount: 1340, status: "READY" },
  { period_id: "payout-period-001", user_id: 24, user_name: "Лебедев Роман Александрович", store_name: "СПАР Томск, ул. Красноармейская 99", tasks_completed: 42, bonus_tasks_completed: 2, points_earned: 1280, rub_amount: 1280, status: "READY" },
  { period_id: "payout-period-001", user_id: 27, user_name: "Белова Юлия Сергеевна", store_name: "Г-1 Котовского 19/3 (ГМ)", tasks_completed: 36, bonus_tasks_completed: 3, points_earned: 1230, rub_amount: 1230, status: "READY" },
  { period_id: "payout-period-001", user_id: 20, user_name: "Попов Владимир Сергеевич", store_name: "СПАР Томск, пр. Ленина 80", tasks_completed: 34, bonus_tasks_completed: 1, points_earned: 1190, rub_amount: 1190, status: "READY" },
  { period_id: "payout-period-001", user_id: 22, user_name: "Степанов Андрей Борисович", store_name: "СПАР Новосибирск, ул. Ленина 55", tasks_completed: 28, bonus_tasks_completed: 0, points_earned: 720, rub_amount: 720, status: "READY" },
  { period_id: "payout-period-001", user_id: 26, user_name: "Гусев Павел Михайлович", store_name: "СПАР Томск, пр. Ленина 80", tasks_completed: 31, bonus_tasks_completed: 0, points_earned: 650, rub_amount: 650, status: "READY" },
  { period_id: "payout-period-001", user_id: 29, user_name: "Орлов Виктор Павлович", store_name: "СПАР Томск, пр. Ленина 80", tasks_completed: 22, bonus_tasks_completed: 1, points_earned: 580, rub_amount: 580, status: "READY" },
  { period_id: "payout-period-001", user_id: 31, user_name: "Мельников Евгений Игоревич", store_name: "СПАР Новосибирск, ул. Ленина 55", tasks_completed: 20, bonus_tasks_completed: 0, points_earned: 510, rub_amount: 510, status: "READY" },
  { period_id: "payout-period-001", user_id: 16, user_name: "Новиков Максим Юрьевич", store_name: "СПАР Томск, пр. Ленина 80", tasks_completed: 29, bonus_tasks_completed: 0, points_earned: 580, rub_amount: 580, status: "READY" },
];
