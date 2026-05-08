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
export const CATALOG_GOALS = {
  fmcg: [
    {
      title: "Снизить OOS по топ-SKU",
      when: "Пустые полки при нормальных поставках",
      period: "4 нед",
      tasks: ["Обход полки", "Вынос со склада", "Пересчёт"],
      aiSource: "POS + Остатки",
    },
    {
      title: "Снизить списания и просрочку",
      when: "Списания выше нормы категории",
      period: "4-6 нед",
      tasks: ["Ротация FIFO", "Уценка к порогу", "Контроль скоропорта"],
      aiSource: "POS + Остатки + сроки годности",
    },
    {
      title: "Качество промо-исполнения",
      when: "Промо не выставляется вовремя",
      period: "2-3 нед",
      tasks: ["Контроль старта промо", "Выкладка к 10:00"],
      aiSource: "Промо + Остатки",
    },
    {
      title: "Точность ценников",
      when: "Жалобы на кассе на расхождения",
      period: "4 нед",
      tasks: ["Обход ценников после переоценки"],
      aiSource: "Промо",
    },
    {
      title: "Импульсные зоны",
      when: "Низкий средний чек",
      period: "4 нед",
      tasks: ["Выкладка по планограмме"],
      aiSource: "POS — анализ среднего чека",
    },
    {
      title: "Производительность смены",
      when: "Много невыполненных задач",
      period: "4-8 нед",
      tasks: ["Скоростные задачи", "Маршруты обхода"],
      aiSource: "Внутренняя телеметрия задач",
    },
  ],
  fashion: [
    {
      title: "Снизить остатки сезонной коллекции",
      when: "Коллекция залежалась более 60 дней",
      period: "6-8 нед",
      tasks: ["Уценить", "Выставить в маркетинг-канал"],
      aiSource: "Дата заведения карточки + продажи",
    },
    {
      title: "Увеличить продажи трикотажа",
      when: "Категория отстаёт от плана",
      period: "4 нед",
      tasks: ["Выкладка фронтально", "Замена стикеров"],
      aiSource: "POS по категориям",
    },
    {
      title: "Снизить возвраты после примерки",
      when: "Высокий % возвратов",
      period: "4 нед",
      tasks: ["Чек-листы примерки"],
      aiSource: "POS + возвраты",
    },
    {
      title: "Скорость ротации витрины",
      when: "Витрина не обновлялась более 7 дней",
      period: "2 нед",
      tasks: ["Обновление витрины 2x в неделю"],
      aiSource: "Внутренние данные",
    },
  ],
  production: [
    {
      title: "Снизить долю брака на участке",
      when: "Брак выше нормы участка",
      period: "6-8 нед",
      tasks: ["Контроль качества", "Обучение"],
      aiSource: "Статистика операций цеха",
    },
    {
      title: "Сократить хвосты в конце смены",
      when: "Много незавершённых заказов",
      period: "4 нед",
      tasks: ["Перераспределение заказов"],
      aiSource: "Внутренняя телеметрия",
    },
    {
      title: "Соответствие срокам отгрузки",
      when: "Срывы сроков",
      period: "4 нед",
      tasks: ["Приоритизация заказов"],
      aiSource: "План отгрузок",
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
