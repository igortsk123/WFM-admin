import {
  Sparkles,
  Target,
  TrendingDown,
  Package,
  Tag,
  Zap,
  Gauge,
} from "lucide-react";

import { DEMO_TOP_STORES } from "@/lib/api/_demo-stores";
import type { Goal, GoalCategory, MoneyImpact, User } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface GoalWithUser extends Goal {
  selected_by_user?: Pick<User, "id" | "first_name" | "last_name">;
}

export type PeriodFilter = "current" | "next" | "previous";

// ═══════════════════════════════════════════════════════════════════
// TRANSLATION HELPER TYPES
// ═══════════════════════════════════════════════════════════════════

export type GoalsT = (key: string, values?: Record<string, string | number>) => string;
export type CommonT = (key: string) => string;

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const CATEGORY_ICONS: Record<GoalCategory, typeof Target> = {
  OOS_REDUCTION: Package,
  WRITE_OFFS: TrendingDown,
  PROMO_QUALITY: Tag,
  PRICE_ACCURACY: Target,
  IMPULSE_ZONES: Zap,
  PRODUCTIVITY: Gauge,
  CUSTOM: Sparkles,
};

// Fake sparkline data for demo
export const SPARKLINE_DATA = [
  { v: 7.2 }, { v: 6.8 }, { v: 7.0 }, { v: 6.5 }, { v: 6.2 }, { v: 5.9 }, { v: 5.9 },
];

// Goal Catalog content
export interface CatalogGoal {
  title: string;
  /** EN-перевод заголовка для билингв-демо. */
  title_en?: string;
  when: string;
  /** EN-перевод сценария применения. */
  when_en?: string;
  period: string;
  tasks: string[];
  /** EN-перевод списка ключевых задач. */
  tasks_en?: string[];
  aiSource: string;
  /** EN-перевод источника данных ИИ. */
  aiSource_en?: string;
  /**
   * Дефолтный money_impact для тира «когда юзер кликает в каталоге».
   * Цифры — типовые для среднего магазина из FMCG monetization playbook.
   * Для производства/fashion пока нет полноценной модели — ставим
   * `impact_type: 'compliance' | 'quality'` со significance_score.
   */
  default_money_impact?: MoneyImpact;
}

export const CATALOG_GOALS: Record<"fmcg" | "fashion" | "production", CatalogGoal[]> = {
  fmcg: [
    {
      title: "Реже пустые полки на топовых товарах",
      title_en: "Fewer empty shelves on top SKUs",
      when: "Пустые полки при нормальных поставках",
      when_en: "Empty shelves despite normal deliveries",
      period: "4 нед",
      tasks: ["Обход полки", "Вынос со склада", "Пересчёт"],
      tasks_en: ["Shelf walk-through", "Pull from back-room", "Recount"],
      aiSource: "POS + Остатки",
      aiSource_en: "POS + Stock data",
      default_money_impact: {
        amount: 620_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Меньше пустых полок ≈ +620 000 ₽/нед по сети",
        rationale_short_en: "Fewer empty shelves ≈ +620,000 ₽/week network-wide",
        rationale_breakdown: [
          "Каждый 1 п.п. пустых полок = 4% потерянных продаж (Gruen/Corsten 2002)",
          "Возвращаем 22% потерь — остальное уходит к конкуренту (FMI/NACDS)",
          "Сеть из 132 магазинов × средний эффект на категорию ≈ 620 000 ₽/нед",
        ],
        rationale_breakdown_en: [
          "Every 1pp empty shelf = 4% lost sales (Gruen/Corsten 2002)",
          "22% of lost sales return — the rest goes to competitors (FMI/NACDS)",
          "132 stores × average per-category effect ≈ 620,000 ₽/week",
        ],
      },
    },
    {
      title: "Меньше выбрасываем и списываем",
      title_en: "Less written off and expired",
      when: "Списания выше нормы категории",
      when_en: "Write-offs above the category target",
      period: "4-6 нед",
      tasks: ["Ротация FIFO", "Уценка к порогу", "Контроль скоропорта"],
      tasks_en: ["FIFO rotation", "Threshold-based markdowns", "Perishables check"],
      aiSource: "POS + Остатки + сроки годности",
      aiSource_en: "POS + Stock + expiry dates",
      default_money_impact: {
        amount: 310_000,
        period: "week",
        impact_type: "money",
        rationale_short: "−1.3 п.п. списаний ≈ −310 000 ₽/нед",
        rationale_short_en: "−1.3 pp write-offs ≈ −310,000 ₽/week",
        rationale_breakdown: [
          "Категорийная выручка × 1.3 п.п. × 78% себестоимости (FMI norm)",
          "Свежие категории (молочка, хлеб) дают +30% защиты маржи",
          "65% эффекта зависит от магазина (остальное — поставщик/плановик)",
        ],
        rationale_breakdown_en: [
          "Category revenue × 1.3 pp × 78% COGS (FMI norm)",
          "Fresh categories (dairy, bakery) = +30% margin protection",
          "65% of effect is store-controllable (rest = supplier/planner)",
        ],
      },
    },
    {
      title: "Промо-выкладка по стандарту",
      title_en: "Promo display by the book",
      when: "Промо не выставляется вовремя",
      when_en: "Promos are not set up on time",
      period: "2-3 нед",
      tasks: ["Контроль старта промо", "Выкладка к 10:00"],
      tasks_en: ["Verify promo start", "Stocking complete by 10:00"],
      aiSource: "Промо + Остатки",
      aiSource_en: "Promo data + Stock",
      default_money_impact: {
        amount: 180_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Промо по стандарту ≈ +180 000 ₽/мес конверсии",
        rationale_short_en: "On-standard promo ≈ +180,000 ₽/month",
        rationale_breakdown: [
          "Промо-зона = 15% выручки магазина",
          "Каждый 1 п.п. соответствия = +0.7% продаж промо (Nielsen 2024)",
          "Лидеры отрасли держат 91%, средний ритейл — 40%",
        ],
        rationale_breakdown_en: [
          "Promo zone = 15% of store revenue",
          "Each 1pp compliance = +0.7% promo sales (Nielsen 2024)",
          "Industry leaders hold 91%, average retail — 40%",
        ],
      },
    },
    {
      title: "Ноль ошибок в ценниках",
      title_en: "Zero price-tag errors",
      when: "Жалобы на кассе на расхождения",
      when_en: "Checkout complaints about mismatches",
      period: "4 нед",
      tasks: ["Обход ценников после переоценки"],
      tasks_en: ["Price-tag walk-through after repricing"],
      aiSource: "Промо",
      aiSource_en: "Promo data",
      default_money_impact: {
        amount: 52_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Без ошибок в ценниках ≈ −52 000 ₽/мес",
        rationale_short_en: "No price-tag errors ≈ −52,000 ₽/month",
        rationale_breakdown: [
          "Каждая жалоба = ~5 400 ₽ компенсации (чек + сертификат)",
          "Wiser: каждый неверный ценник теряет 6% продаж SKU за неделю",
          "Прямая экономия + потери продаж за 4 недели",
        ],
        rationale_breakdown_en: [
          "Each complaint costs ~5,400 ₽ (refund + voucher)",
          "Wiser: every wrong tag loses 6% SKU sales per week",
          "Direct savings + 4-week sales-loss component",
        ],
      },
    },
    {
      title: "Больше товаров в чеке через импульсные зоны",
      title_en: "Bigger basket via impulse zones",
      when: "Низкий средний чек",
      when_en: "Low average basket size",
      period: "4 нед",
      tasks: ["Выкладка по планограмме"],
      tasks_en: ["Planogram-driven stocking"],
      aiSource: "POS — анализ среднего чека",
      aiSource_en: "POS — basket-size analysis",
      default_money_impact: {
        amount: 95_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Импульсные зоны по планограмме ≈ +95 000 ₽/мес",
        rationale_short_en: "Planogram-compliant impulse zones ≈ +95,000 ₽/month",
        rationale_breakdown: [
          "NARMS: соблюдение планограммы даёт +8.1% прибыли по зоне",
          "Импульсные зоны магазина = ~5% выручки",
          "8.1% × 5% × месячная выручка магазина × ответственность",
        ],
        rationale_breakdown_en: [
          "NARMS: planogram compliance lifts zone profit by 8.1%",
          "Impulse zones = ~5% of store revenue",
          "8.1% × 5% × monthly store revenue × attribution",
        ],
      },
    },
    {
      title: "Больше задач за смену",
      title_en: "More tasks per shift",
      when: "Много невыполненных задач",
      when_en: "Many tasks left unfinished",
      period: "4-8 нед",
      tasks: ["Скоростные задачи", "Маршруты обхода"],
      tasks_en: ["Quick-win tasks", "Walk-through routes"],
      aiSource: "Внутренняя телеметрия задач",
      aiSource_en: "Internal task telemetry",
      default_money_impact: {
        amount: 88_000,
        period: "month",
        impact_type: "money",
        rationale_short: "+5 п.п. выполнения ≈ +88 000 ₽/мес",
        rationale_short_en: "+5 pp completion ≈ +88,000 ₽/month",
        rationale_breakdown: [
          "Полная стоимость часа сотрудника = 350 ₽ (РФ 2026)",
          "Сэкономленные часы × ставка + продуктивность смены",
          "BLS 2024: +0.6% от ФОТ на каждый п.п. выполнения",
        ],
        rationale_breakdown_en: [
          "Fully-loaded hour cost = 350 ₽ (RU 2026 estimate)",
          "Hours saved × rate + shift productivity uplift",
          "BLS 2024: +0.6% labor uplift per pp completion",
        ],
      },
    },
  ],
  fashion: [
    {
      title: "Распродать сезонные остатки",
      title_en: "Sell down seasonal stock",
      when: "Коллекция залежалась более 60 дней",
      when_en: "Collection sitting over 60 days",
      period: "6-8 нед",
      tasks: ["Уценить", "Выставить в маркетинг-канал"],
      tasks_en: ["Mark down", "Push into the marketing channel"],
      aiSource: "Дата заведения карточки + продажи",
      aiSource_en: "Item creation date + sales",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "quality",
        significance_score: 7,
        rationale_short: "Эффект зависит от размера остатка — оценим после подключения",
        rationale_short_en: "Impact depends on stock size — assessed after integration",
        rationale_breakdown: [
          "Fashion-модель монетизации появится после подключения POS-данных",
          "Косвенный эффект: освобождение полки под новую коллекцию",
        ],
        rationale_breakdown_en: [
          "Fashion monetisation model coming after POS-data integration",
          "Indirect effect: shelf space freed for new collection",
        ],
      },
    },
    {
      title: "Поднять продажи отстающей категории",
      title_en: "Lift sales of a lagging category",
      when: "Категория отстаёт от плана",
      when_en: "Category trailing the plan",
      period: "4 нед",
      tasks: ["Выкладка фронтально", "Замена стикеров"],
      tasks_en: ["Front-facing display", "Refresh tags"],
      aiSource: "POS по категориям",
      aiSource_en: "POS by category",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "quality",
        significance_score: 6,
        rationale_short: "Прямой эффект пока не считаем — нужен fashion-POS",
        rationale_short_en: "Direct impact not yet calculated — needs fashion POS",
        rationale_breakdown: [
          "Эффект на категорию — индивидуальный, зависит от плана отдела",
        ],
        rationale_breakdown_en: [
          "Per-category impact varies with department plan",
        ],
      },
    },
    {
      title: "Меньше возвратов после примерки",
      title_en: "Fewer post-fitting returns",
      when: "Высокий % возвратов",
      when_en: "High return rate",
      period: "4 нед",
      tasks: ["Чек-листы примерки"],
      tasks_en: ["Fitting-room checklists"],
      aiSource: "POS + возвраты",
      aiSource_en: "POS + returns",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "quality",
        significance_score: 5,
        rationale_short: "Качественная цель: снижение возвратов = лояльность",
        rationale_short_en: "Quality goal: lower returns = customer loyalty",
        rationale_breakdown: [
          "Возвраты съедают маржу + время кассира",
          "Прямой ₽-эффект считаем при подключении POS-возвратов",
        ],
        rationale_breakdown_en: [
          "Returns eat margin + cashier time",
          "Direct ₽-impact computed once POS-returns are integrated",
        ],
      },
    },
    {
      title: "Чаще обновлять витрину",
      title_en: "Refresh the window display more often",
      when: "Витрина не обновлялась более 7 дней",
      when_en: "Window display not refreshed for over 7 days",
      period: "2 нед",
      tasks: ["Обновление витрины 2x в неделю"],
      tasks_en: ["Refresh the window display twice a week"],
      aiSource: "Внутренние данные",
      aiSource_en: "Internal data",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "compliance",
        significance_score: 4,
        rationale_short: "Регулярность витрины — гигиена, не прямой ₽",
        rationale_short_en: "Window cadence — hygiene, not direct ₽",
        rationale_breakdown: [
          "Регулярность важна для трафика, но прямую цифру не считаем",
        ],
        rationale_breakdown_en: [
          "Regularity drives traffic but direct number is hard to attribute",
        ],
      },
    },
  ],
  production: [
    {
      title: "Меньше брака на участке",
      title_en: "Lower defect rate at the line",
      when: "Брак выше нормы участка",
      when_en: "Defect rate above line target",
      period: "6-8 нед",
      tasks: ["Контроль качества", "Обучение"],
      tasks_en: ["Quality control", "Training"],
      aiSource: "Статистика операций цеха",
      aiSource_en: "Workshop operations statistics",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "quality",
        significance_score: 8,
        rationale_short: "Качественная цель цеха — снижение брака",
        rationale_short_en: "Workshop quality goal — defect reduction",
        rationale_breakdown: [
          "Прямой ₽-эффект зависит от стоимости единицы и тиража",
          "Production-модель монетизации появится позже",
        ],
        rationale_breakdown_en: [
          "Direct ₽-impact depends on unit cost and run size",
          "Production monetisation model coming later",
        ],
      },
    },
    {
      title: "Без хвостов в конце смены",
      title_en: "No end-of-shift backlog",
      when: "Много незавершённых заказов",
      when_en: "Many unfinished orders",
      period: "4 нед",
      tasks: ["Перераспределение заказов"],
      tasks_en: ["Reallocate orders"],
      aiSource: "Внутренняя телеметрия",
      aiSource_en: "Internal telemetry",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "quality",
        significance_score: 7,
        rationale_short: "Качественная цель — баланс загрузки смены",
        rationale_short_en: "Quality goal — shift balance",
        rationale_breakdown: [
          "Косвенный эффект: меньше переработок и потерь",
        ],
        rationale_breakdown_en: [
          "Indirect effect: less overtime and waste",
        ],
      },
    },
    {
      title: "Не срывать сроки отгрузки",
      title_en: "Hit shipping deadlines",
      when: "Срывы сроков",
      when_en: "Missed deadlines",
      period: "4 нед",
      tasks: ["Приоритизация заказов"],
      tasks_en: ["Order prioritisation"],
      aiSource: "План отгрузок",
      aiSource_en: "Shipping plan",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "compliance",
        significance_score: 9,
        rationale_short: "Compliance: SLA на отгрузку",
        rationale_short_en: "Compliance: shipping SLA",
        rationale_breakdown: [
          "Срыв = штрафы и неустойки по контракту",
          "Прямой ₽-эффект — индивидуально по контракту клиента",
        ],
        rationale_breakdown_en: [
          "Missed deadline = contractual penalties",
          "Direct ₽-impact varies per customer contract",
        ],
      },
    },
  ],
};

// Mock stores for scope filter
export const MOCK_SCOPE_OPTIONS = [
  { id: "network", name: "Вся сеть" },
  ...DEMO_TOP_STORES.slice(0, 3).map((s) => ({ id: String(s.id), name: s.name })),
];

export const GOAL_CATEGORIES: GoalCategory[] = [
  "OOS_REDUCTION",
  "WRITE_OFFS",
  "PROMO_QUALITY",
  "PRICE_ACCURACY",
  "IMPULSE_ZONES",
  "PRODUCTIVITY",
  "CUSTOM",
];
