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
import type { Goal, GoalCategory, User } from "@/lib/types";

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
}

export const CATALOG_GOALS: Record<"fmcg" | "fashion" | "production", CatalogGoal[]> = {
  fmcg: [
    {
      title: "Снизить OOS по топ-SKU",
      title_en: "Reduce OOS on top SKUs",
      when: "Пустые полки при нормальных поставках",
      when_en: "Empty shelves despite normal deliveries",
      period: "4 нед",
      tasks: ["Обход полки", "Вынос со склада", "Пересчёт"],
      tasks_en: ["Shelf walk-through", "Pull from back-room", "Recount"],
      aiSource: "POS + Остатки",
      aiSource_en: "POS + Stock data",
    },
    {
      title: "Снизить списания и просрочку",
      title_en: "Cut write-offs and expiry",
      when: "Списания выше нормы категории",
      when_en: "Write-offs above the category target",
      period: "4-6 нед",
      tasks: ["Ротация FIFO", "Уценка к порогу", "Контроль скоропорта"],
      tasks_en: ["FIFO rotation", "Threshold-based markdowns", "Perishables check"],
      aiSource: "POS + Остатки + сроки годности",
      aiSource_en: "POS + Stock + expiry dates",
    },
    {
      title: "Качество промо-исполнения",
      title_en: "Promo execution quality",
      when: "Промо не выставляется вовремя",
      when_en: "Promos are not set up on time",
      period: "2-3 нед",
      tasks: ["Контроль старта промо", "Выкладка к 10:00"],
      tasks_en: ["Verify promo start", "Stocking complete by 10:00"],
      aiSource: "Промо + Остатки",
      aiSource_en: "Promo data + Stock",
    },
    {
      title: "Точность ценников",
      title_en: "Price-tag accuracy",
      when: "Жалобы на кассе на расхождения",
      when_en: "Checkout complaints about mismatches",
      period: "4 нед",
      tasks: ["Обход ценников после переоценки"],
      tasks_en: ["Price-tag walk-through after repricing"],
      aiSource: "Промо",
      aiSource_en: "Promo data",
    },
    {
      title: "Импульсные зоны",
      title_en: "Impulse zones",
      when: "Низкий средний чек",
      when_en: "Low average basket size",
      period: "4 нед",
      tasks: ["Выкладка по планограмме"],
      tasks_en: ["Planogram-driven stocking"],
      aiSource: "POS — анализ среднего чека",
      aiSource_en: "POS — basket-size analysis",
    },
    {
      title: "Производительность смены",
      title_en: "Shift productivity",
      when: "Много невыполненных задач",
      when_en: "Many tasks left unfinished",
      period: "4-8 нед",
      tasks: ["Скоростные задачи", "Маршруты обхода"],
      tasks_en: ["Quick-win tasks", "Walk-through routes"],
      aiSource: "Внутренняя телеметрия задач",
      aiSource_en: "Internal task telemetry",
    },
  ],
  fashion: [
    {
      title: "Снизить остатки сезонной коллекции",
      title_en: "Reduce seasonal-collection stock",
      when: "Коллекция залежалась более 60 дней",
      when_en: "Collection sitting over 60 days",
      period: "6-8 нед",
      tasks: ["Уценить", "Выставить в маркетинг-канал"],
      tasks_en: ["Mark down", "Push into the marketing channel"],
      aiSource: "Дата заведения карточки + продажи",
      aiSource_en: "Item creation date + sales",
    },
    {
      title: "Увеличить продажи трикотажа",
      title_en: "Grow knitwear sales",
      when: "Категория отстаёт от плана",
      when_en: "Category trailing the plan",
      period: "4 нед",
      tasks: ["Выкладка фронтально", "Замена стикеров"],
      tasks_en: ["Front-facing display", "Refresh tags"],
      aiSource: "POS по категориям",
      aiSource_en: "POS by category",
    },
    {
      title: "Снизить возвраты после примерки",
      title_en: "Cut returns after fitting",
      when: "Высокий % возвратов",
      when_en: "High return rate",
      period: "4 нед",
      tasks: ["Чек-листы примерки"],
      tasks_en: ["Fitting-room checklists"],
      aiSource: "POS + возвраты",
      aiSource_en: "POS + returns",
    },
    {
      title: "Скорость ротации витрины",
      title_en: "Window-display rotation cadence",
      when: "Витрина не обновлялась более 7 дней",
      when_en: "Window display not refreshed for over 7 days",
      period: "2 нед",
      tasks: ["Обновление витрины 2x в неделю"],
      tasks_en: ["Refresh the window display twice a week"],
      aiSource: "Внутренние данные",
      aiSource_en: "Internal data",
    },
  ],
  production: [
    {
      title: "Снизить долю брака на участке",
      title_en: "Cut defect rate at the line",
      when: "Брак выше нормы участка",
      when_en: "Defect rate above line target",
      period: "6-8 нед",
      tasks: ["Контроль качества", "Обучение"],
      tasks_en: ["Quality control", "Training"],
      aiSource: "Статистика операций цеха",
      aiSource_en: "Workshop operations statistics",
    },
    {
      title: "Сократить хвосты в конце смены",
      title_en: "Shrink end-of-shift backlog",
      when: "Много незавершённых заказов",
      when_en: "Many unfinished orders",
      period: "4 нед",
      tasks: ["Перераспределение заказов"],
      tasks_en: ["Reallocate orders"],
      aiSource: "Внутренняя телеметрия",
      aiSource_en: "Internal telemetry",
    },
    {
      title: "Соответствие срокам отгрузки",
      title_en: "On-time shipping compliance",
      when: "Срывы сроков",
      when_en: "Missed deadlines",
      period: "4 нед",
      tasks: ["Приоритизация заказов"],
      tasks_en: ["Order prioritisation"],
      aiSource: "План отгрузок",
      aiSource_en: "Shipping plan",
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
