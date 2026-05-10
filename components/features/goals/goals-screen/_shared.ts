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
  MoneyImpact,
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
}

export const CATALOG_GOALS: Record<"fmcg" | "fashion" | "production", CatalogGoal[]> = {
  fmcg: [
    // ────────── POS-cheque сигналы (6 штук) ──────────
    {
      title: "Реже пустые полки в молочке",
      title_en: "Fewer empty dairy shelves",
      when: "AI заметил по чекам провалы продаж по молочке больше 4 часов",
      when_en: "AI saw 4+ hour gaps in dairy POS sales",
      period: "4 нед",
      tasks: ["Обход полки", "Вынос со склада", "Пересчёт"],
      tasks_en: ["Shelf walk-through", "Pull from back-room", "Recount"],
      aiSource: "POS-чеки (anomaly detection)",
      aiSource_en: "POS receipts (anomaly detection)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI смотрит почасовые продажи молочки за 30 дней и ищет провалы больше 4 часов при норме 6 продаж/час",
      ai_detection_method_en:
        "AI scans hourly dairy sales over 30 days and flags 4h+ gaps when the baseline is 6 sales/hour",
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
      title: "Больше товаров в чеке (basket cross-sell)",
      title_en: "Bigger basket (cross-sell)",
      when: "AI выявил по чекам сильную пару SKU без размещения рядом",
      when_en: "AI found strongly-correlated SKU pair without adjacency",
      period: "4 нед",
      tasks: ["Перевыкладка по планограмме", "Тест BTL-стикеров"],
      tasks_en: ["Planogram re-layout", "BTL sticker test"],
      aiSource: "POS-чеки (basket analysis)",
      aiSource_en: "POS receipts (basket analysis)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI ищет в 90-дневной выборке чеков пары SKU встречающиеся вместе в 18%+ чеков и проверяет, рядом ли они на полке",
      ai_detection_method_en:
        "AI scans 90 days of receipts for SKU pairs in 18%+ baskets and checks if they share shelf adjacency",
      default_money_impact: {
        amount: 140_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Cross-sell после перевыкладки ≈ +140 000 ₽/мес по сети",
        rationale_short_en: "Cross-sell after re-layout ≈ +140,000 ₽/month network-wide",
        rationale_breakdown: [
          "Mastercard/LatentView: basket analysis даёт +5% incremental basket-size",
          "5% × средний чек 850 ₽ × ~110k транзакций/нед на магазин × 4 нед",
          "× 132 магазина × 65% атрибуции ≈ 140 000 ₽/мес",
        ],
        rationale_breakdown_en: [
          "Mastercard/LatentView: MBA delivers +5% incremental basket size",
          "5% × avg receipt 850 ₽ × ~110k tx/week per store × 4 weeks",
          "× 132 stores × 65% attribution ≈ 140,000 ₽/month",
        ],
      },
    },
    {
      title: "Промо-выкладка по стандарту (gap к benchmark)",
      title_en: "Promo display by the benchmark",
      when: "AI заметил что продажи промо-SKU магазина X на 27 п.п. ниже benchmark group",
      when_en: "AI saw promo-SKU sales 27pp below benchmark group",
      period: "2-3 нед",
      tasks: ["Контроль старта промо", "Выкладка к 10:00"],
      tasks_en: ["Verify promo start", "Stocking complete by 10:00"],
      aiSource: "POS-чеки (lift comparison)",
      aiSource_en: "POS receipts (lift comparison)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI сравнивает продажи промо-SKU магазина с benchmark-группой (магазины того же формата) — gap >15 п.п. = execution problem",
      ai_detection_method_en:
        "AI compares promo-SKU sales to a benchmark group (same-format stores); a 15pp+ gap signals execution problem",
      default_money_impact: {
        amount: 260_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Промо по стандарту ≈ +260 000 ₽/мес конверсии",
        rationale_short_en: "On-standard promo ≈ +260,000 ₽/month",
        rationale_breakdown: [
          "Hyper-store промо-зона = 15% × 18 млн ₽/мес = 2.7 млн ₽/мес",
          "Nielsen: каждый 1 п.п. compliance = +0.7% sales lift",
          "27 п.п. gap × 0.7% × 2.7 млн × 65% атрибуции ≈ 260 000 ₽/мес",
          "Лидеры держат 91% compliance, средний ритейл — 40%",
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
      title: "Удержание лояльных покупателей (RFM cohort)",
      title_en: "Retain loyal customers (RFM cohort)",
      when: "AI выявил падение visit frequency на -8% у local-cohort за 4 недели",
      when_en: "AI saw -8% visit frequency drop in local cohort over 4 weeks",
      period: "8 нед",
      tasks: ["Анализ последних чеков cohort'а", "Целевой push"],
      tasks_en: ["Analyse recent cohort receipts", "Targeted push"],
      aiSource: "POS-чеки (RFM cohorts)",
      aiSource_en: "POS receipts (RFM cohorts)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI разрезает покупателей по RFM (recency / frequency / monetary) за 12 недель и ищет cohort с падением частоты визитов",
      ai_detection_method_en:
        "AI segments shoppers by RFM (recency/frequency/monetary) across 12 weeks and finds cohorts with dropping visit frequency",
      default_money_impact: {
        amount: 195_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Возврат RFM cohort'а ≈ +195 000 ₽/мес на магазин",
        rationale_short_en: "Restoring RFM cohort ≈ +195,000 ₽/month per store",
        rationale_breakdown: [
          "Loyal cohort ≈ 25% от eligible visits, средний чек 1 100 ₽",
          "AI_RFM_RETENTION_LIFT_PCT = 3% возврата × cohort_size × 4 нед",
          "Применяется к топ-10 магазинам сети, attribution 65%",
        ],
        rationale_breakdown_en: [
          "Loyal cohort ≈ 25% of eligible visits, avg ticket 1,100 ₽",
          "AI_RFM_RETENTION_LIFT_PCT = 3% × cohort × 4 weeks",
          "Applied to top-10 network stores, attribution 65%",
        ],
      },
    },
    {
      title: "Скорость работы кассира (slow checkout)",
      title_en: "Cashier scanning speed (slow checkout)",
      when: "AI заметил что у кассира X время сканирования / чек выше median смены на 35%",
      when_en: "AI saw cashier X scanning time/receipt 35% above shift median",
      period: "4 нед",
      tasks: ["Coaching session", "Перенаправление трафика на КС"],
      tasks_en: ["Coaching session", "Redirect traffic to self-checkout"],
      aiSource: "POS-чеки (per-cashier time-stamps)",
      aiSource_en: "POS receipts (per-cashier timestamps)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI смотрит таймстемпы открытие→закрытие чека по каждому кассиру и сравнивает с median смены — outliers выше 25% = подозрение",
      ai_detection_method_en:
        "AI checks per-cashier open→close timestamps vs shift median; outliers >25% above are flagged",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "training",
        significance_score: 6,
        rationale_short:
          "Coaching: качественный эффект, прямой ₽ через продуктивность смены",
        rationale_short_en:
          "Coaching: quality effect, indirect ₽ via shift productivity",
        rationale_breakdown: [
          "ScanQueue 2026: +1 минута на чек = +23% abandonment при пиках",
          "Прямой ₽ считается через ускорение очереди (см. PRODUCTIVITY)",
          "BLS 2024 productivity coefficient — позже",
        ],
        rationale_breakdown_en: [
          "ScanQueue 2026: +1 min per receipt = +23% abandonment at peaks",
          "Direct ₽ flows via queue speedup (see PRODUCTIVITY goal)",
          "BLS 2024 productivity coefficient applies",
        ],
      },
    },
    {
      title: "Восстановление среднего чека (basket-size trend)",
      title_en: "Restore basket size (trend reversal)",
      when: "AI заметил что средний чек упал на 7% за 3 недели",
      when_en: "AI saw 7% basket-size drop over 3 weeks",
      period: "6 нед",
      tasks: ["Аудит выкладки промо", "Тест выкладки на эндах"],
      tasks_en: ["Promo display audit", "End-cap test"],
      aiSource: "POS-чеки (time-series mean)",
      aiSource_en: "POS receipts (time-series mean)",
      ai_signal_source: "pos-cheque",
      ai_detection_method:
        "AI отслеживает rolling-7d среднего чека и flag'ает падение >5% от 30-дневного baseline'а",
      ai_detection_method_en:
        "AI tracks rolling-7d basket size and flags >5% drop from 30-day baseline",
      default_money_impact: {
        amount: 320_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Восстановление чека ≈ +320 000 ₽/мес по сети",
        rationale_short_en: "Basket restoration ≈ +320,000 ₽/month network-wide",
        rationale_breakdown: [
          "Возврат 7% basket-size: 7% × средний чек 850 ₽ × кол-во транзакций",
          "Применяем к топ-30 магазинам где детект сработал, attribution 65%",
          "Realistic recovery 60% от gap'а за 6 недель",
        ],
        rationale_breakdown_en: [
          "Recovering 7% basket: 7% × avg receipt 850 ₽ × tx count",
          "Applied to top-30 detected stores, attribution 65%",
          "Realistic recovery: 60% of the gap over 6 weeks",
        ],
      },
    },

    // ────────── Phantom OOS (mixed POS+ERP) — флагман AI-цели ──────────
    {
      title: "Проверка подозрительных товаров",
      title_en: "Check suspicious SKUs",
      when: "AI заметил что у SKU есть остаток ≥1 шт, но за сегодня 0 продаж при норме ≥3/день",
      when_en: "AI saw SKUs with stock ≥1 but 0 sales today against ≥3/day baseline",
      period: "ежедневно",
      tasks: ["Подзадача на каждый SKU: «найти на полке / в подсобке» с отчётом"],
      tasks_en: ["Subtask per SKU: locate (shelf/back-room) with status report"],
      aiSource: "ERP остатки + POS чеки (phantom OOS detection)",
      aiSource_en: "ERP stock + POS receipts (phantom OOS detection)",
      ai_signal_source: "mixed",
      ai_detection_method:
        "Каждый день после 14:00 AI пересекает остатки ERP с продажами по чекам — SKU с остатком ≥1, продажами 0 за день и базовой нормой ≥3 продаж/день за последние 14 дней попадают в список «подозрительных». На каждый SKU создаётся подзадача: «найти и отчитаться (на полке / в подсобке / списан / не нашли)»",
      ai_detection_method_en:
        "Daily after 14:00 AI joins ERP stock with POS sales — SKUs with stock ≥1, zero sales today and ≥3/day baseline over 14d become suspicious. One subtask per SKU: locate (shelf / back-room / written-off / not found) with report",
      default_money_impact: {
        amount: 1_100_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Phantom OOS детект ≈ +1 100 000 ₽/нед скрытой выручки",
        rationale_short_en: "Phantom OOS detection ≈ +1,100,000 ₽/week recovered",
        rationale_breakdown: [
          "Phantom OOS (товар по системе есть, по факту нет) — 1.5-3% дополнительных скрытых OOS поверх классических",
          "Берём 1.5% phantom × 30% затронутых категорий (молочка/бакалея/хоз) × 480 млн ₽/нед сеть",
          "× 60% recovery (быстрая реакция в день обнаружения, до конца дня товар на полке)",
          "× 65% attribution магазину ≈ 1 100 000 ₽/нед",
          "Источник: IRI/Nielsen 2023 — phantom OOS невидим для классического shelf-scan, ловится только cross-check'ом ERP↔POS",
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

    // ────────── ERP-сигналы (4 штуки) ──────────
    {
      title: "Меньше выбрасываем хлеб (приёмка vs срок)",
      title_en: "Less bakery thrown away (receipt vs expiry)",
      when: "AI заметил по приёмкам что хлеб залёживается на 1.5 дня больше нормы",
      when_en: "AI saw bakery sitting 1.5 days past target",
      period: "4-6 нед",
      tasks: ["Ротация FIFO", "Уценка к порогу", "Контроль скоропорта"],
      tasks_en: ["FIFO rotation", "Threshold-based markdowns", "Perishables check"],
      aiSource: "ERP остатки + сроки годности + POS",
      aiSource_en: "ERP stock + expiry + POS",
      ai_signal_source: "erp-stock",
      ai_detection_method:
        "AI сопоставляет приёмки → остатки → продажи на 14-дневном окне и считает avg shelf-time на SKU vs срок годности",
      ai_detection_method_en:
        "AI joins receipts → stock → sales over 14d and computes avg shelf-time per SKU vs expiry",
      default_money_impact: {
        amount: 450_000,
        period: "week",
        impact_type: "money",
        rationale_short: "−1.3 п.п. списаний хлеба ≈ −450 000 ₽/нед",
        rationale_short_en: "−1.3pp bakery write-offs ≈ −450,000 ₽/week saved",
        rationale_breakdown: [
          "Хлеб = 6% выручки сети (Cybake bakery norm)",
          "1.3% × 6% × 480 млн ₽ × 78% себестоимости × 65% × 1.3 fresh-bonus",
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
      title: "Точность приёмки vs заявка",
      title_en: "Receiving accuracy (request vs delivery)",
      when: "AI заметил что приёмка от поставщика расходится с заявкой больше 3% по штукам",
      when_en: "AI saw delivery vs request gap exceed 3% by units",
      period: "4 нед",
      tasks: ["Сверка с накладной", "Эскалация поставщику"],
      tasks_en: ["Reconcile invoice", "Escalate to supplier"],
      aiSource: "ERP приёмки + заявки",
      aiSource_en: "ERP delivery + request data",
      ai_signal_source: "erp-stock",
      ai_detection_method:
        "AI сравнивает заявку (PO) с фактической приёмкой по каждому SKU и flag'ает delta >3%",
      ai_detection_method_en:
        "AI compares PO vs actual receiving per SKU and flags >3% delta",
      default_money_impact: {
        amount: 85_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Точная приёмка ≈ −85 000 ₽/мес недопоставок",
        rationale_short_en: "Accurate receiving ≈ −85,000 ₽/month",
        rationale_breakdown: [
          "Industry: 1-2% PO discrepancy на средней сети, наша оценка 2.5%",
          "0.5% × 480 млн / 4 нед × COGS 78% × 65% attribution ≈ 85 000 ₽/мес",
        ],
        rationale_breakdown_en: [
          "Industry: 1-2% PO discrepancy in mid-size networks, we estimate 2.5%",
          "0.5% × 480M / 4 weeks × 78% COGS × 65% attribution ≈ 85,000 ₽/month",
        ],
      },
    },
    {
      title: "Recovery shrinkage (потери без чека)",
      title_en: "Shrinkage recovery (no-receipt loss)",
      when: "AI заметил по ERP что delta остатков − sales > shrinkage normа",
      when_en: "AI saw ERP delta stock − sales above shrink norm",
      period: "8 нед",
      tasks: ["Внеплановая инвентаризация", "Видео-аудит зоны"],
      tasks_en: ["Off-cycle inventory", "Zone video audit"],
      aiSource: "ERP остатки + POS",
      aiSource_en: "ERP stock + POS",
      ai_signal_source: "erp-stock",
      ai_detection_method:
        "AI считает (остаток_начала − остаток_конца) − продажи_по_чекам = неучтённая потеря; сравнивает со SHRINK_NORM по категории",
      ai_detection_method_en:
        "AI computes (start_stock − end_stock) − POS_sales = unaccounted loss; compares to SHRINK_NORM per category",
      default_money_impact: {
        amount: 230_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Возврат 0.3 п.п. shrinkage ≈ −230 000 ₽/мес",
        rationale_short_en: "Recovering 0.3pp shrinkage ≈ −230,000 ₽/month",
        rationale_breakdown: [
          "FMI: 1.6% средний shrink, лидеры 0.7% — recovery 0.3 п.п. realistic",
          "0.3% × 480 млн ₽/нед × 4 нед × 78% COGS × 65% ≈ 230 000 ₽/мес",
          "Применимо к категориям с высокой shrink-rate (косметика, алкоголь)",
        ],
        rationale_breakdown_en: [
          "FMI: 1.6% avg shrink, leaders 0.7% — recovery 0.3pp realistic",
          "0.3% × 480M ₽/week × 4 weeks × 78% COGS × 65% ≈ 230,000 ₽/month",
          "Applies to high-shrink categories (cosmetics, alcohol)",
        ],
      },
    },
    {
      title: "Точность ценников (ERP master vs POS)",
      title_en: "Price-tag accuracy (ERP master vs POS)",
      when: "AI выявил расхождение ERP master-цены и цены пробитой на чеке",
      when_en: "AI found ERP master vs POS price mismatch",
      period: "4 нед",
      tasks: ["Обход ценников после переоценки", "Тест пробития"],
      tasks_en: ["Price-tag walk after repricing", "POS test scan"],
      aiSource: "ERP price master + POS",
      aiSource_en: "ERP price master + POS",
      ai_signal_source: "erp-price-master",
      ai_detection_method:
        "AI ежечасно sравнивает ERP master price с ценой на чеке после первой продажи SKU; alert если price_pos != price_erp",
      ai_detection_method_en:
        "AI hourly compares ERP master price vs POS receipt price after first sale; alerts on mismatch",
      default_money_impact: {
        amount: 75_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Без ошибок в ценниках ≈ −75 000 ₽/мес",
        rationale_short_en: "No price-tag errors ≈ −75,000 ₽/month",
        rationale_breakdown: [
          "Каждая жалоба = ~5 400 ₽ компенсации (чек + сертификат лояльности)",
          "Wiser: каждый неверный ценник = 6% продаж SKU теряются за неделю",
          "7 жалоб × 5 400 + 6%-loss × 7 SKU × 4 нед на 25B-baseline ≈ 75 000 ₽/мес",
        ],
        rationale_breakdown_en: [
          "Each complaint = ~5,400 ₽ (refund + voucher)",
          "Wiser: every wrong tag loses 6% SKU sales/week",
          "7 complaints × 5,400 + 6%-loss × 7 SKU × 4 weeks on 25B baseline ≈ 75,000 ₽/month",
        ],
      },
    },

    // ────────── Photo-bonus сигналы (4 штуки) ──────────
    {
      title: "Полки прикассы по фото от сотрудника",
      title_en: "Prikassa shelves via employee photos",
      when: "AI выявил по фото от сотрудника пустые места в импульсной зоне",
      when_en: "AI detected empty spots in impulse zone from employee photo",
      period: "4 нед",
      tasks: ["Бонус-задача «Сфоткай прикассу»", "Выкладка по детектам"],
      tasks_en: ["Bonus task ‘Snap prikassa’", "Restock per detection"],
      aiSource: "Фото от сотрудника + CV (Goodschecker / собств.)",
      aiSource_en: "Employee photo + CV (Goodschecker / own)",
      ai_signal_source: "photo-bonus",
      ai_detection_method:
        "AI генерит бонус-задачу «Сфоткай прикассу в 14:00»; CV прогоняет фото и детектит пустые ячейки vs планограмма (Goodschecker accuracy 95%)",
      ai_detection_method_en:
        "AI issues a bonus task ‘Snap prikassa at 14:00’; CV scans the photo for empty cells vs planogram (Goodschecker 95% accuracy)",
      default_money_impact: {
        amount: 85_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Прикасса по фото ≈ +85 000 ₽/мес",
        rationale_short_en: "Photo-driven prikassa ≈ +85,000 ₽/month",
        rationale_breakdown: [
          "Прикасса = ~5% выручки магазина (импульсная зона)",
          "NARMS: соблюдение планограммы +8.1% прибыли по зоне",
          "8.1% × 5% × 480 млн × 65% × 95% photo-accuracy / 12 мес ≈ 85 000 ₽/мес",
          "+ ускорение detection в 5× vs daily round (Trax/Pensa)",
        ],
        rationale_breakdown_en: [
          "Prikassa ≈ 5% of store revenue (impulse zone)",
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
      aiSource: "Фото + CV + ERP остатки",
      aiSource_en: "Photo + CV + ERP stock",
      ai_signal_source: "mixed",
      ai_detection_method:
        "AI комбинирует CV-результат фото + ERP-остаток: пустота на полке + остаток >40 = backroom задача (вынести); пустота + остаток 0 = заявка/приёмка проблема",
      ai_detection_method_en:
        "AI combines CV photo result + ERP stock: empty + stock>40 = backroom task; empty + stock=0 = ordering/receiving problem",
      default_money_impact: {
        amount: 380_000,
        period: "week",
        impact_type: "money",
        rationale_short: "Молочка по фото ≈ +380 000 ₽/нед на сети",
        rationale_short_en: "Photo-driven dairy ≈ +380,000 ₽/week network-wide",
        rationale_breakdown: [
          "Молочка = 30% выручки × 480 млн ₽/нед = 144 млн ₽/нед",
          "0.4 п.п. ускорение reaction × 4% elasticity × 144 млн × 65% × 22%",
          "× AI_PHOTO_AUDIT_ACCURACY 95% ≈ 380 000 ₽/нед",
        ],
        rationale_breakdown_en: [
          "Dairy = 30% revenue × 480M ₽/week = 144M ₽/week",
          "0.4pp faster reaction × 4% elasticity × 144M × 65% × 22%",
          "× AI_PHOTO_AUDIT_ACCURACY 95% ≈ 380,000 ₽/week",
        ],
      },
    },
    {
      title: "Соответствие планограмме (CV-аудит фото)",
      title_en: "Planogram compliance (photo CV audit)",
      when: "AI выявил по фото отклонения от планограммы в выкладке акционных SKU",
      when_en: "AI detected planogram deviations on promo SKUs from photos",
      period: "6 нед",
      tasks: ["Бонус «Сфоткай эндкэп»", "Корректировка по детектам"],
      tasks_en: ["Bonus ‘Snap end-cap’", "Adjust per detections"],
      aiSource: "Фото + CV vs планограмма",
      aiSource_en: "Photo + CV vs planogram",
      ai_signal_source: "photo-bonus",
      ai_detection_method:
        "AI сравнивает CV-распознавание SKU на фото с эталонной планограммой — gap >10% items = задача мерчендайзеру (Магнит pilot 98% accuracy)",
      ai_detection_method_en:
        "AI compares CV-recognised SKUs on photo vs reference planogram — 10%+ gap = merchandiser task (Magnit pilot 98% accuracy)",
      default_money_impact: {
        amount: 165_000,
        period: "month",
        impact_type: "money",
        rationale_short: "Планограмма по фото ≈ +165 000 ₽/мес",
        rationale_short_en: "Photo-driven planogram ≈ +165,000 ₽/month",
        rationale_breakdown: [
          "NARMS: planogram compliance +8.1% profit по зоне",
          "Промо-зона = 15% × 480 млн × 4.33 нед/мес = 311 млн ₽/мес",
          "Realistic recovery 0.5% × 311 млн × 65% × 95% photo-accuracy ≈ 165 000 ₽/мес",
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
      tasks: ["Бонус «Обход зоны»", "Уборка / эвакуация препятствия"],
      tasks_en: ["Bonus ‘Zone walk-through’", "Clean / clear obstacle"],
      aiSource: "Фото + CV (детект мусора/жидкости)",
      aiSource_en: "Photo + CV (debris/liquid detection)",
      ai_signal_source: "photo-bonus",
      ai_detection_method:
        "CV модель детектит на фото мусор, разлитую жидкость, упавшие коробки — alert директору + бонус-баллы сотруднику за обнаружение",
      ai_detection_method_en:
        "CV detects debris, spilled liquid, fallen boxes on photo — alerts director + bonus points for the employee",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "compliance",
        significance_score: 9,
        rationale_short: "Compliance: безопасность покупателя",
        rationale_short_en: "Compliance: customer safety",
        rationale_breakdown: [
          "Avoided fines: до 50 000 ₽ за случай травмы (Роспотребнадзор)",
          "Реальный ₽-эффект: предотвращённые иски (~1 млн ₽ среднее)",
          "Сортируется по significance, не money_impact",
        ],
        rationale_breakdown_en: [
          "Avoided fines: up to 50,000 ₽ per injury case (Rospotrebnadzor)",
          "Real ₽: prevented lawsuits (~1M ₽ avg)",
          "Sorted by significance, not money_impact",
        ],
      },
    },

    // ────────── WFM telemetry / mixed (2 штуки) ──────────
    {
      title: "Больше задач за смену",
      title_en: "More tasks per shift",
      when: "AI заметил низкий процент закрытия задач + пики продаж покрыты слабо",
      when_en: "AI saw low task closure rate + weak peak coverage",
      period: "4-8 нед",
      tasks: ["Скоростные задачи", "Маршруты обхода"],
      tasks_en: ["Quick-win tasks", "Walk-through routes"],
      aiSource: "WFM telemetry + POS пики",
      aiSource_en: "WFM telemetry + POS peaks",
      ai_signal_source: "wfm-schedule",
      ai_detection_method:
        "AI сопоставляет график смен с почасовым traffic'ом по чекам — flag'ает часы где coverage <0.7×traffic",
      ai_detection_method_en:
        "AI matches shift schedule against hourly POS traffic — flags hours where coverage <0.7× traffic",
      default_money_impact: {
        amount: 128_000,
        period: "month",
        impact_type: "money",
        rationale_short: "+5 п.п. выполнения ≈ +128 000 ₽/мес",
        rationale_short_en: "+5pp completion ≈ +128,000 ₽/month",
        rationale_breakdown: [
          "Полная стоимость часа = 350 ₽ (РФ 2026)",
          "BLS 2024: +0.6% от ФОТ на каждый п.п. выполнения",
          "Сэкономленные часы × ставка + продуктивность смены на 25B baseline ≈ 128 000 ₽/мес",
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
      when: "AI обнаружил расхождение между ЕГАИС-документом и физическим остатком",
      when_en: "AI found mismatch between EGAIS doc and physical stock",
      period: "2 нед",
      tasks: ["Сверка алкоголь-зала", "Корректировка ЕГАИС"],
      tasks_en: ["Reconcile alcohol section", "Update EGAIS"],
      aiSource: "ЕГАИС + ERP + сверка",
      aiSource_en: "EGAIS + ERP + reconciliation",
      ai_signal_source: "egais",
      ai_detection_method:
        "AI ежедневно сверяет ЕГАИС-балансы с ERP остатками; flag при delta >2 бутылки",
      ai_detection_method_en:
        "AI daily reconciles EGAIS balances vs ERP stock; flags >2-bottle delta",
      default_money_impact: {
        amount: 0,
        period: "month",
        impact_type: "compliance",
        significance_score: 10,
        rationale_short: "Compliance ЕГАИС: avoid штрафы 150-300k ₽",
        rationale_short_en: "EGAIS compliance: avoid 150-300k ₽ fines",
        rationale_breakdown: [
          "ФЗ-171: штраф за расхождение 150 000 — 300 000 ₽ за инцидент",
          "Real ₽-effect: 1-2 случая в год на сеть = ~500 000 ₽/год avoided",
          "Сортируется по significance",
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
