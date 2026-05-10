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
import type {
  AISignalSource,
  Goal,
  GoalCategory,
  GoalTier,
  MoneyImpact,
  PilotWave,
  User,
} from "@/lib/types";

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
   * Главный источник AI-сигнала для этой цели — для compact-чипа.
   * Если signal'ов несколько (mixed) — указываем mixed и в `aiSource` пишем
   * текстом «POS + ERP + фото». Используется в UI для рендера иконки.
   */
  ai_signal_source?: AISignalSource;
  /**
   * Конкретный механизм детекции (1-2 строки) — что именно AI «смотрит»,
   * чтобы предложить эту цель. Рендерится в expandable секции «Откуда AI это взял?».
   */
  ai_detection_method?: string;
  /** EN-перевод ai_detection_method. */
  ai_detection_method_en?: string;
  /**
   * Дефолтный money_impact для тира «когда юзер кликает в каталоге».
   * Цифры — типовые для среднего магазина из FMCG monetization playbook.
   * Для производства/fashion пока нет полноценной модели — ставим
   * `impact_type: 'compliance' | 'quality'` со significance_score.
   */
  default_money_impact?: MoneyImpact;
  /**
   * Уровень приоритета в портфеле AI-целей (deep-research отчёт).
   *  - `priority`  — одна из 5 foundation-целей (OOS, phantom, fresh,
   *                  post-promo, slow-moving). Идут наверх каталога.
   *  - `secondary` — расширенные сценарии (cross-sell, RFM, ЕГАИС и т.п.)
   *
   * Если не задано — UI считает `secondary`.
   */
  tier?: GoalTier;
  /**
   * Волна пилотирования (A/B/C/D) из roadmap'а. Только для `tier: "priority"`.
   * См. `.memory_bank/_claude/AI-GOALS-ROADMAP.md`.
   */
  pilot_wave?: PilotWave;
}

export const CATALOG_GOALS: Record<"fmcg" | "fashion" | "production", CatalogGoal[]> = {
  fmcg: [
    // ════════════════════════════════════════════════════════════════════
    // PRIORITY-5 (deep-research foundation, Wave A/B/C/D)
    // Источник: .memory_bank/business/deep-research-report.md
    // Сетевая выручка 25 млрд ₽/год = 480,8 млн ₽/нед.
    // ════════════════════════════════════════════════════════════════════

    // ────────── Wave A — OOS в high-velocity SKU ──────────
    {
      title: "Меньше пустых полок в ходовом ассортименте",
      title_en: "Fewer empty shelves in fast-movers",
      when: "AI заметил по чекам провалы продаж в ходовых товарах больше 4 часов",
      when_en: "AI saw 4+ hour POS sales gaps in fast-moving SKUs",
      period: "8 нед",
      tasks: [
        "Обход полки",
        "Вынос из подсобки",
        "Срочная коррекция остатка",
        "Перенос между магазинами",
      ],
      tasks_en: [
        "Shelf walk-through",
        "Pull from back-room",
        "Urgent stock correction",
        "Inter-store transfer",
      ],
      aiSource: "Чеки + остатки + поставки",
      aiSource_en: "POS + stock + delivery logs",
      ai_signal_source: "mixed",
      ai_detection_method:
        "AI каждый день смотрит почасовые продажи по 600 ходовым товарам, остатки на полке и недопоставки. Если ожидаемый спрос есть, а продаж нет — выдвигает гипотезу «нет товара на полке» и приоритизирует по сумме упущенной выручки.",
      ai_detection_method_en:
        "Each day AI reviews hourly sales for 600 fast-movers, on-hand stock and delivery shortfalls. When demand is expected but sales are absent, it flags ‘shelf out-of-stock’ and ranks by revenue at risk.",
      tier: "priority",
      pilot_wave: "A",
      default_money_impact: {
        amount: 810_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Меньше пустых полок в ходовых ≈ +810 000 ₽/нед по сети",
        rationale_short_en: "Fewer empty fast-mover shelves ≈ +810,000 ₽/week network-wide",
        rationale_breakdown: [
          "Сетевая выручка 25 млрд ₽/год → 480,8 млн ₽/нед",
          "Берём 35% выручки — это ходовые товары (600 SKU)",
          "Снижаем долю пустых полок на 1 п.п. (с 6,0% до 5,0%)",
          "Возвращаем 0,482 от потерь (мировая норма 4,0% упущенных продаж при 8,3% пустых полок, Gruen/Corsten 2002)",
          "480,8 млн × 35% × 1 п.п. × 0,482 ≈ 810 000 ₽/нед",
        ],
        rationale_breakdown_en: [
          "Network revenue 25B ₽/year → 480.8M ₽/week",
          "35% of revenue comes from fast-movers (600 SKUs)",
          "Cut empty-shelf rate by 1pp (6.0% → 5.0%)",
          "Recover 0.482 of the loss (global norm 4.0% lost sales at 8.3% empty shelves, Gruen/Corsten 2002)",
          "480.8M × 35% × 1pp × 0.482 ≈ 810,000 ₽/week",
        ],
      },
    },

    // ────────── Wave A — Phantom stock (скрытое отсутствие на полке) ──────────
    {
      title: "Скрытое отсутствие на полке (по системе есть, на полке нет)",
      title_en: "Hidden out-of-stock (system says yes, shelf says no)",
      when: "AI заметил товары с остатком ≥1 шт и нулевыми продажами при норме ≥3 шт/день",
      when_en: "AI saw SKUs with stock ≥1 and zero sales against ≥3/day baseline",
      period: "10 нед",
      tasks: [
        "Точечный пересчёт",
        "Поиск в подсобке",
        "Корректировка остатка в учётной системе",
        "Тикет на причину расхождения",
      ],
      tasks_en: [
        "Targeted recount",
        "Search the back-room",
        "Adjust book stock in ERP",
        "Root-cause ticket",
      ],
      aiSource: "Учётная система + чеки + аудиты",
      aiSource_en: "ERP + POS + audit feedback",
      ai_signal_source: "mixed",
      ai_detection_method:
        "AI каждый день после 14:00 сверяет остатки в учётной системе с продажами по чекам. Если у товара есть остаток, ожидаемая норма ≥3 шт/день, а продаж за день ноль — товар попадает в список «скрытое отсутствие». На каждый создаётся подзадача: «найти и отчитаться (на полке / в подсобке / списан / не нашли)».",
      ai_detection_method_en:
        "Each day after 14:00 AI reconciles ERP stock against POS sales. SKUs with stock, a ≥3/day baseline and zero sales today become ‘hidden out-of-stock’. One subtask per SKU: locate (shelf / back-room / written-off / not found).",
      tier: "priority",
      pilot_wave: "A",
      default_money_impact: {
        amount: 280_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Скрытое отсутствие на полке ≈ +280 000 ₽/нед восстановленной выручки",
        rationale_short_en: "Hidden out-of-stock ≈ +280,000 ₽/week recovered",
        rationale_breakdown: [
          "Сетевая выручка 480,8 млн ₽/нед",
          "Берём 25% выручки — топ-1 000 самых ходовых товаров",
          "Норма скрытого отсутствия = 0,8% упущенных продаж",
          "Снижаем на 28,9% (с 4,5% до 3,2% подозрительных товаро-дней)",
          "480,8 млн × 25% × 0,8% × 28,9% ≈ 280 000 ₽/нед",
          "Источник: исследования по точности остатков (ECR Retail Loss, INFORMS), классическая работа по phantom stockout",
        ],
        rationale_breakdown_en: [
          "Network revenue 480.8M ₽/week",
          "25% scope (top-1,000 fast-movers)",
          "Hidden out-of-stock baseline = 0.8% lost sales",
          "Reduce by 28.9% (4.5% → 3.2% suspicious SKU-store-days)",
          "480.8M × 25% × 0.8% × 28.9% ≈ 280,000 ₽/week",
          "Source: inventory-accuracy studies (ECR Retail Loss, INFORMS), phantom stockout literature",
        ],
      },
    },

    // ────────── Wave B — Списания во fresh ──────────
    {
      title: "Меньше списаний в свежих категориях",
      title_en: "Less waste in fresh categories",
      when: "AI заметил по приёмкам и срокам, что свежие категории лежат слишком долго",
      when_en: "AI saw fresh items sitting on shelf past target",
      period: "12 нед",
      tasks: [
        "Первый пришёл — первый ушёл",
        "Ранняя уценка",
        "Снижение следующего заказа",
        "Перенос в магазин с лучшими продажами",
      ],
      tasks_en: [
        "FIFO rotation",
        "Earlier markdown",
        "Cut next order",
        "Move to a higher-velocity store",
      ],
      aiSource: "Учётная система + сроки + чеки",
      aiSource_en: "ERP + expiry + POS",
      ai_signal_source: "erp-stock",
      ai_detection_method:
        "AI смотрит остатки свежих категорий по дате приёмки и сроку годности, считает сколько товар лежит на полке и сравнивает со скоростью продаж. Если запас закроет спрос дольше срока годности — рекомендует уценку или меньший следующий заказ.",
      ai_detection_method_en:
        "AI tracks fresh stock by receipt date and expiry, computes shelf-time and compares with sell-through. If cover exceeds shelf life, it recommends markdown or a smaller next order.",
      tier: "priority",
      pilot_wave: "B",
      default_money_impact: {
        amount: 350_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Снижение списаний в свежих ≈ −350 000 ₽/нед потерь",
        rationale_short_en: "Less fresh waste ≈ −350,000 ₽/week saved",
        rationale_breakdown: [
          "Сетевая выручка 480,8 млн ₽/нед",
          "Берём 18% выручки — свежие категории (хлеб, молочка, готовая еда, овощи-фрукты)",
          "Снижаем списания на 0,4 п.п. (с 2,2% до 1,8% от продаж этих категорий)",
          "480,8 млн × 18% × 0,4 п.п. ≈ 350 000 ₽/нед",
          "Источник: ECR Retail Loss (27 магазинов Европа), INFORMS по 10 000 магазинов",
        ],
        rationale_breakdown_en: [
          "Network revenue 480.8M ₽/week",
          "18% fresh scope (bakery, dairy, ready-to-eat, produce)",
          "Cut write-offs by 0.4pp (2.2% → 1.8% of fresh sales)",
          "480.8M × 18% × 0.4pp ≈ 350,000 ₽/week",
          "Source: ECR Retail Loss (27 stores in Europe), INFORMS 10,000-store study",
        ],
      },
    },

    // ────────── Wave C — Остатки после промо ──────────
    {
      title: "Остатки после акции",
      title_en: "Post-promo leftovers",
      when: "AI заметил по продажам и поставкам, что после акций остаётся слишком много товара",
      when_en: "AI saw too much stock left over after promos",
      period: "8-10 нед",
      tasks: [
        "Коррекция распределения до старта акции",
        "Ребаланс на 2-й день",
        "Ранняя уценка после акции",
        "Перенос остатка в другой магазин",
      ],
      tasks_en: [
        "Pre-promo allocation correction",
        "D+2 rebalance",
        "Early post-promo markdown",
        "Transfer leftover to another store",
      ],
      aiSource: "Чеки + поставки + календарь акций",
      aiSource_en: "POS + deliveries + promo calendar",
      ai_signal_source: "mixed",
      ai_detection_method:
        "AI заранее прогнозирует продажи акционных товаров по магазину, учитывает докупки в нагрузку и сдвиг покупательских моментов. После старта смотрит как фактические продажи отличаются от плана и предлагает скорректировать распределение, пока остаток ещё можно успеть продать без уценки.",
      ai_detection_method_en:
        "AI forecasts promo sell-through per store, accounts for cross-sell uplift and shifted purchase timing, then tracks fact vs plan during the campaign and recommends re-allocation while leftover can still sell without markdown.",
      tier: "priority",
      pilot_wave: "C",
      default_money_impact: {
        amount: 2_000_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Остатки после акции ≈ +2,00 млн ₽/мес спасённой выручки",
        rationale_short_en: "Post-promo leftovers ≈ +2.00M ₽/month preserved",
        rationale_breakdown: [
          "Сетевая выручка 480,8 млн ₽/нед",
          "Берём 12% выручки — товары в централизованных акциях",
          "Снижаем непроданные остатки на 4 п.п. (с 16% до 12% к D+7)",
          "Эта часть остатков обычно теряет 20% маржи на уценке",
          "480,8 млн × 12% × 4 п.п. × 20% ≈ 0,46 млн ₽/нед = 2,00 млн ₽/мес",
          "Источник: исследования по cannibalization/halo в акциях, McKinsey по совместной оптимизации цены и заказа",
        ],
        rationale_breakdown_en: [
          "Network revenue 480.8M ₽/week",
          "12% promo scope (centrally managed campaigns)",
          "Cut residual stock by 4pp (16% → 12% at D+7)",
          "Residual typically loses 20% margin to markdown",
          "480.8M × 12% × 4pp × 20% ≈ 0.46M ₽/week = 2.00M ₽/month",
          "Source: cannibalization/halo studies in promo, McKinsey on joint price + replenishment optimization",
        ],
      },
    },

    // ────────── Wave D — Slow-moving inventory ──────────
    {
      title: "Залежавшийся товар",
      title_en: "Slow-moving stock",
      when: "AI заметил товары, которые лежат больше 45 дней без сезонной причины",
      when_en: "AI saw SKUs sitting over 45 days with no seasonal reason",
      period: "16 нед",
      tasks: [
        "Уценка",
        "Перевод в другой магазин",
        "Заморозка автозаказа",
        "Вывод из ассортимента",
      ],
      tasks_en: [
        "Markdown",
        "Inter-store transfer",
        "Freeze auto-reorder",
        "Delist review",
      ],
      aiSource: "Учётная система + чеки + сезонный календарь",
      aiSource_en: "ERP + POS + seasonal calendar",
      ai_signal_source: "erp-stock",
      ai_detection_method:
        "AI каждую неделю смотрит остатки которые лежат больше 45 дней без сезонной причины и считает: сколько денег заморожено, какие товары можно уценить, что перевести в другой магазин, что вывести из ассортимента.",
      ai_detection_method_en:
        "Each week AI scans stock sitting over 45 days with no seasonal reason and computes: capital frozen, what to mark down, what to transfer between stores, what to delist.",
      tier: "priority",
      pilot_wave: "D",
      default_money_impact: {
        amount: 110_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Залежавшийся товар ≈ +110 000 ₽/нед + единоразовое высвобождение 12 млн ₽",
        rationale_short_en: "Slow-moving stock ≈ +110,000 ₽/week + 12M ₽ one-off capital release",
        rationale_breakdown: [
          "У сети залежавшегося товара на ~42 млн ₽ (по моделированию: 1,33 млрд ₽ среднего запаса × 3,2% старше 45 дней)",
          "Цель — сократить до 30 млн ₽, то есть высвободить 12 млн ₽ оборотных средств одним махом",
          "Стоимость хранения 15% годовых от объёма пула: 42 млн × 15% / 52 нед ≈ 0,12 млн ₽/нед",
          "Избежание уценки на новых поступлениях: 42 млн × 10% / 16 нед ≈ 0,26 млн ₽/нед, в среднем по горизонту 110 000 ₽/нед",
          "Итого: 110 000 ₽/нед постоянной экономии + 12 млн ₽ единоразового высвобождения капитала",
          "Источник: IHL по inventory distortion, peer gross margin 22,3% (X5/Магнит 2025)",
        ],
        rationale_breakdown_en: [
          "Network slow-moving stock pool ≈ 42M ₽ (modelled: 1.33B ₽ avg inventory × 3.2% over 45 days)",
          "Goal: cut to 30M ₽, releasing 12M ₽ of working capital one-off",
          "Carrying cost 15% p.a. on the pool: 42M × 15% / 52w ≈ 0.12M ₽/week",
          "Avoided markdown on new receipts: 42M × 10% / 16w ≈ 0.26M ₽/week, averaging 110,000 ₽/week across the horizon",
          "Total: 110,000 ₽/week recurring + 12M ₽ one-off capital release",
          "Source: IHL inventory distortion studies; peer gross margin 22.3% (X5/Magnit 2025)",
        ],
      },
    },

    // ════════════════════════════════════════════════════════════════════
    // SECONDARY (расширенные сценарии — catalog для клиента, не пилотируем
    // первой волной). Цифры оставлены как есть, добавлен `tier: "secondary"`.
    // ════════════════════════════════════════════════════════════════════

    // ────────── POS-cheque сигналы ──────────
    {
      title: "Реже пустые полки в молочке",
      title_en: "Fewer empty dairy shelves",
      when: "AI заметил по чекам провалы продаж по молочке больше 4 часов",
      when_en: "AI saw 4+ hour gaps in dairy POS sales",
      period: "4 нед",
      tasks: ["Обход полки", "Вынос со склада", "Пересчёт"],
      tasks_en: ["Shelf walk-through", "Pull from back-room", "Recount"],
      aiSource: "POS-чеки (поиск необычных провалов)",
      aiSource_en: "POS receipts (anomaly detection)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI смотрит почасовые продажи молочки за 30 дней и ищет провалы больше 4 часов при норме 6 продаж/час",
      ai_detection_method_en:
        "AI scans hourly dairy sales over 30 days and flags 4h+ gaps when the baseline is 6 sales/hour",
      tier: "secondary",
      default_money_impact: {
        amount: 900_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Меньше пустых полок в молочке ≈ +900 000 ₽/нед по сети",
        rationale_short_en: "Fewer empty dairy shelves ≈ +900,000 ₽/week network-wide",
        rationale_breakdown: [
          "Молочка = 30% выручки магазина (≈ 1.1 млн ₽/нед на магазин)",
          "Каждый 1 п.п. пустой полки = 4% потерянных продаж (Gruen/Corsten 2002)",
          "Возвращаем 22% потерь (FMI/NACDS)",
          "0.9 п.п. × 4% × 30% × 3.6 млн × 132 магазина × 65% × 22% ≈ 900 000 ₽/нед",
        ],
        rationale_breakdown_en: [
          "Dairy = 30% store revenue (≈ 1.1M ₽/week per store)",
          "Each 1pp empty shelf = 4% lost sales (Gruen/Corsten 2002)",
          "We recapture 22% (FMI/NACDS)",
          "0.9pp × 4% × 30% × 3.6M × 132 stores × 65% × 22% ≈ 900,000 ₽/week",
        ],
      },
    },
    {
      title: "Больше товаров в чеке (продажа в нагрузку)",
      title_en: "Bigger basket (cross-sell)",
      when: "AI выявил по чекам сильную пару товаров без размещения рядом",
      when_en: "AI found a strong product pair without shelf adjacency",
      period: "4 нед",
      tasks: ["Перевыкладка по схеме", "Тест дополнительных стикеров"],
      tasks_en: ["Re-layout per planogram", "BTL sticker test"],
      aiSource: "Чеки (анализ корзины)",
      aiSource_en: "POS receipts (basket analysis)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI ищет в чеках за 90 дней пары товаров которые встречаются вместе в 18%+ корзин и проверяет, рядом ли они на полке",
      ai_detection_method_en:
        "AI scans 90 days of receipts for product pairs in 18%+ baskets and checks shelf adjacency",
      tier: "secondary",
      default_money_impact: {
        amount: 140_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Продажа в нагрузку после перевыкладки ≈ +140 000 ₽/мес по сети",
        rationale_short_en: "Cross-sell after re-layout ≈ +140,000 ₽/month network-wide",
        rationale_breakdown: [
          "Mastercard/LatentView: анализ корзины даёт +5% к среднему чеку",
          "5% × средний чек 850 ₽ × ~110k чеков/нед на магазин × 4 нед",
          "× 132 магазина × 65% вклад магазина ≈ 140 000 ₽/мес",
        ],
        rationale_breakdown_en: [
          "Mastercard/LatentView: market-basket analysis delivers +5% basket size",
          "5% × avg receipt 850 ₽ × ~110k tx/week per store × 4 weeks",
          "× 132 stores × 65% attribution ≈ 140,000 ₽/month",
        ],
      },
    },
    {
      title: "Промо-выкладка по стандарту (плохо исполняют)",
      title_en: "Promo display by the standard (execution gap)",
      when: "AI заметил что продажи акционных товаров магазина X на 27 п.п. ниже похожих магазинов",
      when_en: "AI saw promo sales 27pp below comparable stores",
      period: "2-3 нед",
      tasks: ["Контроль старта акции", "Выкладка к 10:00"],
      tasks_en: ["Verify promo start", "Stocking complete by 10:00"],
      aiSource: "Чеки (сравнение продаж)",
      aiSource_en: "POS receipts (lift comparison)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI сравнивает продажи акционных товаров магазина с похожими магазинами (того же формата) — разрыв >15 п.п. = плохо исполняют",
      ai_detection_method_en:
        "AI compares promo-SKU sales vs comparable stores (same format); a 15pp+ gap signals an execution problem",
      tier: "secondary",
      default_money_impact: {
        amount: 260_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Промо по стандарту ≈ +260 000 ₽/мес",
        rationale_short_en: "On-standard promo ≈ +260,000 ₽/month",
        rationale_breakdown: [
          "Промо-зона гипермаркета = 15% × 18 млн ₽/мес = 2.7 млн ₽/мес",
          "Nielsen: каждый 1 п.п. соблюдения стандарта = +0.7% продаж",
          "27 п.п. разрыв × 0.7% × 2.7 млн × 65% вклад магазина ≈ 260 000 ₽/мес",
          "Лидеры держат 91% соблюдения, средний ритейл — 40%",
        ],
        rationale_breakdown_en: [
          "Hyper-store promo zone = 15% × 18M ₽/mo = 2.7M ₽/mo",
          "Nielsen: each 1pp compliance = +0.7% lift",
          "27pp gap × 0.7% × 2.7M × 65% attribution ≈ 260,000 ₽/month",
          "Leaders hold 91% compliance, average retail — 40%",
        ],
      },
    },
    {
      title: "Удержание постоянных покупателей",
      title_en: "Retain loyal customers",
      when: "AI выявил падение частоты визитов на 8% у группы постоянных покупателей за 4 недели",
      when_en: "AI saw an 8% drop in visit frequency among loyal shoppers over 4 weeks",
      period: "8 нед",
      tasks: ["Анализ последних чеков группы", "Целевой push"],
      tasks_en: ["Analyse recent receipts of the group", "Targeted push"],
      aiSource: "Чеки (группы постоянных покупателей)",
      aiSource_en: "POS receipts (loyal shopper cohorts)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI делит покупателей на группы по давности, частоте и сумме покупок за 12 недель и ищет группу с падением частоты визитов",
      ai_detection_method_en:
        "AI segments shoppers by recency, frequency and spend over 12 weeks and finds groups with dropping visit frequency",
      tier: "secondary",
      default_money_impact: {
        amount: 195_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Возврат группы постоянных ≈ +195 000 ₽/мес на магазин",
        rationale_short_en: "Restoring loyal cohort ≈ +195,000 ₽/month per store",
        rationale_breakdown: [
          "Постоянные покупатели ≈ 25% подходящих визитов, средний чек 1 100 ₽",
          "3% возврата × размер группы × 4 нед",
          "Применяется к топ-10 магазинам сети, вклад магазина 65%",
        ],
        rationale_breakdown_en: [
          "Loyal cohort ≈ 25% of eligible visits, avg ticket 1,100 ₽",
          "3% retention × cohort size × 4 weeks",
          "Applied to top-10 network stores, attribution 65%",
        ],
      },
    },
    {
      title: "Скорость работы кассира",
      title_en: "Cashier scanning speed",
      when: "AI заметил что у кассира время на чек выше среднего по смене на 35%",
      when_en: "AI saw cashier scanning time 35% above shift average",
      period: "4 нед",
      tasks: ["Разбор с сотрудником", "Перенаправление трафика на кассу самообслуживания"],
      tasks_en: ["Coaching session", "Redirect traffic to self-checkout"],
      aiSource: "Чеки (время по каждому кассиру)",
      aiSource_en: "POS receipts (per-cashier timestamps)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI смотрит время от открытия до закрытия каждого чека по каждому кассиру и сравнивает со среднесменным — отставание выше 25% = подозрение",
      ai_detection_method_en:
        "AI checks per-cashier open→close timestamps vs shift median; >25% above is flagged",
      tier: "secondary",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "training",
        significance_score: 6,
        rationale_short:
          "Разбор с сотрудником: качественный эффект, прямой ₽ через скорость очереди",
        rationale_short_en:
          "Coaching: quality effect, indirect ₽ via shift productivity",
        rationale_breakdown: [
          "ScanQueue 2026: +1 минута на чек = +23% покупателей уходят без покупки в пик",
          "Прямой ₽ считается через ускорение очереди (см. цель «Больше задач за смену»)",
          "Сколько успевают за смену — норма из BLS 2024",
        ],
        rationale_breakdown_en: [
          "ScanQueue 2026: +1 min per receipt = +23% abandonment at peaks",
          "Direct ₽ flows via queue speedup (see ‘More tasks per shift’ goal)",
          "BLS 2024 productivity coefficient applies",
        ],
      },
    },
    {
      title: "Восстановление среднего чека",
      title_en: "Restore basket size",
      when: "AI заметил что средний чек упал на 7% за 3 недели",
      when_en: "AI saw 7% basket-size drop over 3 weeks",
      period: "6 нед",
      tasks: ["Проверка выкладки акций", "Тест выкладки на торцевых полках"],
      tasks_en: ["Promo display audit", "End-cap test"],
      aiSource: "Чеки (среднее значение по дням)",
      aiSource_en: "POS receipts (time-series mean)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI отслеживает средний чек за 7 дней и помечает падение больше 5% от обычного уровня за 30 дней",
      ai_detection_method_en:
        "AI tracks rolling-7d basket size and flags >5% drop from the 30-day baseline",
      tier: "secondary",
      default_money_impact: {
        amount: 320_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Восстановление чека ≈ +320 000 ₽/мес по сети",
        rationale_short_en: "Basket restoration ≈ +320,000 ₽/month network-wide",
        rationale_breakdown: [
          "Возврат 7% среднего чека: 7% × средний чек 850 ₽ × кол-во чеков",
          "Применяем к топ-30 магазинам где сработал детект, вклад магазина 65%",
          "Реалистичный возврат — 60% от падения за 6 недель",
        ],
        rationale_breakdown_en: [
          "Recovering 7% basket: 7% × avg receipt 850 ₽ × tx count",
          "Applied to top-30 detected stores, attribution 65%",
          "Realistic recovery: 60% of the gap over 6 weeks",
        ],
      },
    },

    // ────────── Скрытое отсутствие (mixed POS+ERP) — оставлено как catalog ──────────
    {
      title: "Проверка подозрительных товаров",
      title_en: "Check suspicious SKUs",
      when: "AI заметил что у товара есть остаток ≥1 шт, но за сегодня 0 продаж при норме ≥3/день",
      when_en: "AI saw SKUs with stock ≥1 but 0 sales today against ≥3/day baseline",
      period: "ежедневно",
      tasks: ["Подзадача на каждый товар: «найти на полке / в подсобке» с отчётом"],
      tasks_en: ["Subtask per SKU: locate (shelf/back-room) with status report"],
      aiSource: "Учётная система + чеки (скрытое отсутствие)",
      aiSource_en: "ERP stock + POS receipts (phantom OOS detection)",
      ai_signal_source: "mixed",
      ai_detection_method:
        "Каждый день после 14:00 AI сверяет остатки с продажами по чекам — товары с остатком ≥1, нулевыми продажами за день и нормой ≥3 шт/день за последние 14 дней попадают в список «подозрительных». На каждый создаётся подзадача: «найти и отчитаться (на полке / в подсобке / списан / не нашли)»",
      ai_detection_method_en:
        "Daily after 14:00 AI joins ERP stock with POS sales — SKUs with stock ≥1, zero sales today and ≥3/day baseline over 14d become suspicious. One subtask per SKU: locate (shelf / back-room / written-off / not found) with report",
      tier: "secondary",
      default_money_impact: {
        amount: 1_100_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Скрытое отсутствие на полке ≈ +1 100 000 ₽/нед скрытой выручки",
        rationale_short_en: "Phantom OOS detection ≈ +1,100,000 ₽/week recovered",
        rationale_breakdown: [
          "Скрытое отсутствие (по системе есть, на полке нет) — 1.5-3% дополнительных потерь сверху обычных пустых полок",
          "Берём 1.5% × 30% затронутых категорий (молочка/бакалея/хоз) × 480 млн ₽/нед сеть",
          "× 60% возврата (быстрая реакция в день обнаружения)",
          "× 65% вклад магазина ≈ 1 100 000 ₽/нед",
          "Источник: IRI/Nielsen 2023 — обычный обход полки скрытое отсутствие не видит, ловится только сверкой учётной системы с чеками",
        ],
        rationale_breakdown_en: [
          "Phantom OOS (system says yes, shelf says no) — 1.5-3% hidden OOS on top of classic OOS",
          "We take 1.5% phantom × 30% affected categories (dairy/bakery/household) × 480M ₽/week network",
          "× 60% recovery (same-day reaction puts SKU back on shelf before close)",
          "× 65% store attribution ≈ 1,100,000 ₽/week",
          "Source: IRI/Nielsen 2023 — phantom OOS is invisible to classic shelf-scan, only caught via ERP↔POS cross-check",
        ],
      },
    },

    // ────────── Учётная система (расширенные сценарии) ──────────
    {
      title: "Меньше выбрасываем хлеб (приёмка и срок)",
      title_en: "Less bakery thrown away (receipt vs expiry)",
      when: "AI заметил по приёмкам что хлеб залёживается на 1.5 дня больше нормы",
      when_en: "AI saw bakery sitting 1.5 days past target",
      period: "4-6 нед",
      tasks: ["Первый пришёл — первый ушёл", "Уценка к порогу", "Контроль свежести"],
      tasks_en: ["FIFO rotation", "Threshold-based markdowns", "Perishables check"],
      aiSource: "Учётная система + сроки годности + чеки",
      aiSource_en: "ERP stock + expiry + POS",
      ai_signal_source: "erp-stock",
      ai_detection_method:
        "AI сопоставляет приёмки → остатки → продажи на 14-дневном окне и считает, сколько товар лежит на полке относительно срока годности",
      ai_detection_method_en:
        "AI joins receipts → stock → sales over 14d and computes shelf-time per SKU vs expiry",
      tier: "secondary",
      default_money_impact: {
        amount: 450_000,
        period: "week",
        impact_type: "money",
        rationale_short: "−1.3 п.п. списаний хлеба ≈ −450 000 ₽/нед",
        rationale_short_en: "−1.3pp bakery write-offs ≈ −450,000 ₽/week saved",
        rationale_breakdown: [
          "Хлеб = 6% выручки сети (норма Cybake)",
          "1.3% × 6% × 480 млн ₽ × 78% себестоимости × 65% × 1.3 (свежесть)",
          "Свежий хлеб даёт +30% защиты маржи (нельзя восстановить как сухой)",
          "≈ 450 000 ₽/нед экономии на сети",
        ],
        rationale_breakdown_en: [
          "Bakery = 6% network revenue (Cybake norm)",
          "1.3% × 6% × 480M ₽ × 78% COGS × 65% × 1.3 fresh-bonus",
          "Fresh bakery: +30% margin protection",
          "≈ 450,000 ₽/week network-wide savings",
        ],
      },
    },
    {
      title: "Точность приёмки и заявок",
      title_en: "Receiving accuracy (request vs delivery)",
      when: "AI заметил что приёмка от поставщика расходится с заявкой больше 3% по штукам",
      when_en: "AI saw delivery vs request gap exceed 3% by units",
      period: "4 нед",
      tasks: ["Сверка с накладной", "Передать поставщику"],
      tasks_en: ["Reconcile invoice", "Escalate to supplier"],
      aiSource: "Приёмки + заявки",
      aiSource_en: "ERP delivery + request data",
      ai_signal_source: "erp-stock",
      ai_detection_method:
        "AI сравнивает заявку с фактической приёмкой по каждому товару и помечает расхождение >3%",
      ai_detection_method_en:
        "AI compares PO vs actual receiving per SKU and flags >3% delta",
      tier: "secondary",
      default_money_impact: {
        amount: 85_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Точная приёмка ≈ −85 000 ₽/мес недопоставок",
        rationale_short_en: "Accurate receiving ≈ −85,000 ₽/month",
        rationale_breakdown: [
          "По индустрии — 1-2% расхождения по заявкам в средней сети, наша оценка 2.5%",
          "0.5% × 480 млн / 4 нед × 78% себестоимости × 65% вклад магазина ≈ 85 000 ₽/мес",
        ],
        rationale_breakdown_en: [
          "Industry: 1-2% PO discrepancy in mid-size networks, we estimate 2.5%",
          "0.5% × 480M / 4 weeks × 78% COGS × 65% attribution ≈ 85,000 ₽/month",
        ],
      },
    },
    {
      title: "Возврат потерь без чека",
      title_en: "Recover no-receipt losses",
      when: "AI заметил что разница остатков и продаж по чекам больше нормы потерь",
      when_en: "AI saw stock-vs-sales delta above the shrink norm",
      period: "8 нед",
      tasks: ["Внеплановая инвентаризация", "Видео-проверка зоны"],
      tasks_en: ["Off-cycle inventory", "Zone video audit"],
      aiSource: "Учётная система + чеки",
      aiSource_en: "ERP stock + POS",
      ai_signal_source: "erp-stock",
      ai_detection_method:
        "AI считает (остаток начала − остаток конца − продажи по чекам) = неучтённая потеря; сравнивает с нормой потерь по категории",
      ai_detection_method_en:
        "AI computes (start_stock − end_stock − POS_sales) = unaccounted loss; compares to category shrink norm",
      tier: "secondary",
      default_money_impact: {
        amount: 230_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Возврат 0.3 п.п. потерь ≈ −230 000 ₽/мес",
        rationale_short_en: "Recovering 0.3pp shrinkage ≈ −230,000 ₽/month",
        rationale_breakdown: [
          "FMI: 1.6% средняя норма потерь, лидеры 0.7% — реалистичный возврат 0.3 п.п.",
          "0.3% × 480 млн ₽/нед × 4 нед × 78% себестоимости × 65% ≈ 230 000 ₽/мес",
          "Применимо к категориям с высокими потерями (косметика, алкоголь)",
        ],
        rationale_breakdown_en: [
          "FMI: 1.6% avg shrink, leaders 0.7% — recovery 0.3pp realistic",
          "0.3% × 480M ₽/week × 4 weeks × 78% COGS × 65% ≈ 230,000 ₽/month",
          "Applies to high-shrink categories (cosmetics, alcohol)",
        ],
      },
    },
    {
      title: "Точность ценников (учётная система и кассы)",
      title_en: "Price-tag accuracy (ERP master vs POS)",
      when: "AI выявил расхождение цены в учётной системе и цены пробитой на чеке",
      when_en: "AI found ERP master vs POS price mismatch",
      period: "4 нед",
      tasks: ["Обход ценников после переоценки", "Тестовая проверка кассы"],
      tasks_en: ["Price-tag walk after repricing", "POS test scan"],
      aiSource: "Цены в учётной системе + чеки",
      aiSource_en: "ERP price master + POS",
      ai_signal_source: "erp-price-master",
      ai_detection_method:
        "AI каждый час сравнивает цену в учётной системе с ценой на чеке после первой продажи товара; алерт если цена на чеке не равна цене в системе",
      ai_detection_method_en:
        "AI hourly compares ERP master price vs POS receipt price after first sale; alerts on mismatch",
      tier: "secondary",
      default_money_impact: {
        amount: 75_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Без ошибок в ценниках ≈ −75 000 ₽/мес",
        rationale_short_en: "No price-tag errors ≈ −75,000 ₽/month",
        rationale_breakdown: [
          "Каждая жалоба = ~5 400 ₽ компенсации (чек + сертификат лояльности)",
          "Wiser: каждый неверный ценник = 6% продаж товара теряются за неделю",
          "7 жалоб × 5 400 + 6%-потери × 7 товаров × 4 нед на сети 25 млрд ₽ ≈ 75 000 ₽/мес",
        ],
        rationale_breakdown_en: [
          "Each complaint = ~5,400 ₽ (refund + voucher)",
          "Wiser: every wrong tag loses 6% SKU sales/week",
          "7 complaints × 5,400 + 6%-loss × 7 SKUs × 4 weeks on 25B baseline ≈ 75,000 ₽/month",
        ],
      },
    },

    // ────────── Photo-bonus сигналы (4 штуки) ──────────
    {
      title: "Полки у касс по фото от сотрудника",
      title_en: "Checkout-side shelves via employee photos",
      when: "AI выявил по фото от сотрудника пустые места в импульсной зоне",
      when_en: "AI detected empty spots in impulse zone from employee photo",
      period: "4 нед",
      tasks: ["Бонус-задача «Сфоткай зону у касс»", "Выкладка по детектам"],
      tasks_en: ["Bonus task ‘Snap checkout zone’", "Restock per detection"],
      aiSource: "Фото от сотрудника + распознавание (Goodschecker / собств.)",
      aiSource_en: "Employee photo + CV (Goodschecker / own)",
      ai_signal_source: "photo-bonus",
      ai_detection_method:
        "AI создаёт бонус-задачу «Сфоткай зону у касс в 14:00»; распознавание прогоняет фото и находит пустые ячейки по схеме выкладки (точность Goodschecker 95%)",
      ai_detection_method_en:
        "AI issues a bonus task ‘Snap checkout zone at 14:00’; CV scans the photo for empty cells vs planogram (Goodschecker 95% accuracy)",
      tier: "secondary",
      default_money_impact: {
        amount: 85_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Зона у касс по фото ≈ +85 000 ₽/мес",
        rationale_short_en: "Photo-driven checkout zone ≈ +85,000 ₽/month",
        rationale_breakdown: [
          "Зона у касс = ~5% выручки магазина (импульсная)",
          "NARMS: соблюдение схемы выкладки +8.1% прибыли по зоне",
          "8.1% × 5% × 480 млн × 65% × 95% точность фото / 12 мес ≈ 85 000 ₽/мес",
          "+ ускорение в 5 раз против ежедневного обхода (Trax/Pensa)",
        ],
        rationale_breakdown_en: [
          "Checkout zone ≈ 5% of store revenue (impulse)",
          "NARMS: planogram compliance +8.1% zone profit",
          "8.1% × 5% × 480M × 65% × 95% photo-accuracy / 12 mo ≈ 85,000 ₽/month",
          "+ 5× faster detection vs daily round (Trax/Pensa)",
        ],
      },
    },
    {
      title: "Витрина молочки по фото от сотрудника",
      title_en: "Dairy display via employee photos",
      when: "AI заметил по фото пустые места в холодильнике молочки",
      when_en: "AI detected empty cells in dairy fridge from photo",
      period: "4 нед",
      tasks: ["Бонус-задача «Сфоткай молочку утром»", "Выкладка"],
      tasks_en: ["Bonus task ‘Snap dairy in AM’", "Restock"],
      aiSource: "Фото + распознавание + остатки",
      aiSource_en: "Photo + CV + ERP stock",
      ai_signal_source: "mixed",
      ai_detection_method:
        "AI комбинирует результат распознавания фото и остаток в системе: пустота на полке + остаток >40 = задача на подсобку (вынести); пустота + остаток 0 = проблема с заявкой/приёмкой",
      ai_detection_method_en:
        "AI combines CV photo result + ERP stock: empty + stock>40 = back-room task; empty + stock=0 = ordering/receiving problem",
      tier: "secondary",
      default_money_impact: {
        amount: 380_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Молочка по фото ≈ +380 000 ₽/нед на сети",
        rationale_short_en: "Photo-driven dairy ≈ +380,000 ₽/week network-wide",
        rationale_breakdown: [
          "Молочка = 30% выручки × 480 млн ₽/нед = 144 млн ₽/нед",
          "0.4 п.п. ускорение реакции × 4% эластичность × 144 млн × 65% × 22%",
          "× точность распознавания фото 95% ≈ 380 000 ₽/нед",
        ],
        rationale_breakdown_en: [
          "Dairy = 30% revenue × 480M ₽/week = 144M ₽/week",
          "0.4pp faster reaction × 4% elasticity × 144M × 65% × 22%",
          "× 95% photo accuracy ≈ 380,000 ₽/week",
        ],
      },
    },
    {
      title: "Соответствие схеме выкладки (проверка по фото)",
      title_en: "Planogram compliance (photo audit)",
      when: "AI выявил по фото отклонения от схемы выкладки на акционных товарах",
      when_en: "AI detected planogram deviations on promo SKUs from photos",
      period: "6 нед",
      tasks: ["Бонус «Сфоткай торцевую полку»", "Корректировка по детектам"],
      tasks_en: ["Bonus ‘Snap end-cap’", "Adjust per detections"],
      aiSource: "Фото + распознавание против схемы выкладки",
      aiSource_en: "Photo + CV vs planogram",
      ai_signal_source: "photo-bonus",
      ai_detection_method:
        "AI сравнивает распознанные на фото товары с эталонной схемой выкладки — разрыв >10% позиций = задача мерчендайзеру (Магнит pilot 98% точности)",
      ai_detection_method_en:
        "AI compares CV-recognised SKUs on photo vs reference planogram — 10%+ gap = merchandiser task (Magnit pilot 98% accuracy)",
      tier: "secondary",
      default_money_impact: {
        amount: 165_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Схема выкладки по фото ≈ +165 000 ₽/мес",
        rationale_short_en: "Photo-driven planogram ≈ +165,000 ₽/month",
        rationale_breakdown: [
          "NARMS: соблюдение схемы выкладки +8.1% прибыли по зоне",
          "Промо-зона = 15% × 480 млн × 4.33 нед/мес = 311 млн ₽/мес",
          "Реалистичный возврат 0.5% × 311 млн × 65% × 95% точность фото ≈ 165 000 ₽/мес",
        ],
        rationale_breakdown_en: [
          "NARMS: planogram compliance +8.1% zone profit",
          "Promo zone = 15% × 480M × 4.33 wks/mo = 311M ₽/mo",
          "Realistic recovery 0.5% × 311M × 65% × 95% photo-accuracy ≈ 165,000 ₽/mo",
        ],
      },
    },
    {
      title: "Безопасность зоны (фото от сотрудника)",
      title_en: "Zone safety (employee photo)",
      when: "AI обнаружил по фото препятствие в проходе или мокрый пол",
      when_en: "AI detected aisle obstruction or wet floor from photo",
      period: "4 нед",
      tasks: ["Бонус «Обход зоны»", "Уборка / убрать препятствие"],
      tasks_en: ["Bonus ‘Zone walk-through’", "Clean / clear obstacle"],
      aiSource: "Фото + распознавание (мусор/жидкость)",
      aiSource_en: "Photo + CV (debris/liquid detection)",
      ai_signal_source: "photo-bonus",
      ai_detection_method:
        "Модель распознавания находит на фото мусор, разлитую жидкость, упавшие коробки — алерт директору + бонус-баллы сотруднику за обнаружение",
      ai_detection_method_en:
        "CV detects debris, spilled liquid, fallen boxes on photo — alerts director + bonus points for the employee",
      tier: "secondary",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "compliance",
        significance_score: 9,
        rationale_short: "Соблюдение нормы: безопасность покупателя",
        rationale_short_en: "Compliance: customer safety",
        rationale_breakdown: [
          "Избежание штрафов: до 50 000 ₽ за случай травмы (Роспотребнадзор)",
          "Реальный ₽-эффект: предотвращённые иски (~1 млн ₽ среднее)",
          "Сортируется по значимости, не по ₽-эффекту",
        ],
        rationale_breakdown_en: [
          "Avoided fines: up to 50,000 ₽ per injury case (Rospotrebnadzor)",
          "Real ₽: prevented lawsuits (~1M ₽ avg)",
          "Sorted by significance, not money_impact",
        ],
      },
    },

    // ────────── График смен / mixed ──────────
    {
      title: "Больше задач за смену",
      title_en: "More tasks per shift",
      when: "AI заметил низкий процент закрытия задач — пики продаж покрыты слабо",
      when_en: "AI saw low task closure rate + weak peak coverage",
      period: "4-8 нед",
      tasks: ["Быстрые задачи", "Маршруты обхода"],
      tasks_en: ["Quick-win tasks", "Walk-through routes"],
      aiSource: "График смен + пики продаж по чекам",
      aiSource_en: "WFM telemetry + POS peaks",
      ai_signal_source: "wfm-schedule",
      ai_detection_method:
        "AI сопоставляет график смен с почасовым потоком покупателей по чекам — помечает часы где покрытие меньше 70% от потока",
      ai_detection_method_en:
        "AI matches shift schedule against hourly POS traffic — flags hours where coverage <0.7× traffic",
      tier: "secondary",
      default_money_impact: {
        amount: 128_000,
        period: "month",
        impact_type: "money",
        rationale_short: "+5 п.п. выполнения ≈ +128 000 ₽/мес",
        rationale_short_en: "+5pp completion ≈ +128,000 ₽/month",
        rationale_breakdown: [
          "Полная стоимость часа = 350 ₽ (РФ 2026)",
          "BLS 2024: +0.6% к фонду оплаты труда на каждый п.п. выполнения",
          "Сэкономленные часы × ставка + сколько успевают за смену на сети 25 млрд ₽ ≈ 128 000 ₽/мес",
        ],
        rationale_breakdown_en: [
          "Fully-loaded hour = 350 ₽ (RU 2026)",
          "BLS 2024: +0.6% labor uplift per pp completion",
          "Hours saved × rate + productivity uplift on 25B baseline ≈ 128,000 ₽/month",
        ],
      },
    },
    {
      title: "Контроль ЕГАИС / Честный знак",
      title_en: "EGAIS / Chestny Znak compliance",
      when: "AI обнаружил расхождение между документом ЕГАИС и физическим остатком",
      when_en: "AI found mismatch between EGAIS doc and physical stock",
      period: "2 нед",
      tasks: ["Сверка алкоголь-зала", "Корректировка ЕГАИС"],
      tasks_en: ["Reconcile alcohol section", "Update EGAIS"],
      aiSource: "ЕГАИС + учётная система + сверка",
      aiSource_en: "EGAIS + ERP + reconciliation",
      ai_signal_source: "egais",
      ai_detection_method:
        "AI каждый день сверяет балансы ЕГАИС с остатками учётной системы; помечает при расхождении >2 бутылки",
      ai_detection_method_en:
        "AI daily reconciles EGAIS balances vs ERP stock; flags >2-bottle delta",
      tier: "secondary",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "compliance",
        significance_score: 10,
        rationale_short: "Соблюдение нормы ЕГАИС: избегаем штрафы 150-300 тыс ₽",
        rationale_short_en: "EGAIS compliance: avoid 150-300k ₽ fines",
        rationale_breakdown: [
          "ФЗ-171: штраф за расхождение 150 000 — 300 000 ₽ за инцидент",
          "Реальный ₽-эффект: 1-2 случая в год на сеть = ~500 000 ₽/год избежанных штрафов",
          "Сортируется по значимости",
        ],
        rationale_breakdown_en: [
          "Federal Law 171: 150,000 — 300,000 ₽ fine per incident",
          "Real ₽: 1-2 cases/year network-wide = ~500,000 ₽/year avoided",
          "Sorted by significance",
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
