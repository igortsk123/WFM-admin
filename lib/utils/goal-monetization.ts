/**
 * FMCG Goals Monetization — coefficient cheat-sheet & helper.
 *
 * Reference for calculating `MoneyImpact.amount` on retail goals.
 * Sources are cited in JSDoc on each constant. Full playbook with formulas
 * lives in `.memory_bank/_claude/GOALS-MONETIZATION.md`.
 *
 * Network parameters (current SPAR/LAMA tenant — обновлено по факту заказчика 2026-05):
 *   132 stores (CONVENIENCE / SUPERMARKET / HYPERMARKET) — Томск/Северск/Новосибирск
 *   network revenue ≈ 25B ₽/year (заказчик зафиксировал 2026-05)
 *   ≈ 480M ₽/week ≈ 190M ₽/store/year ≈ 3.6M ₽/store/week (среднее)
 *   HYPERMARKET ≈ 2.5× SUPERMARKET / CONVENIENCE ≈ 0.6× SUPERMARKET
 *
 * IMPORTANT: in real backend integration these coefficients live server-side
 * (ML/finance team owns them). Admin keeps a mirror so demos work without
 * the backend service. When backend ships `GET /goals/:id/money-impact`
 * we drop this file.
 */

import type { GoalCategory, MoneyImpact, MoneyImpactPeriod } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────
// COEFFICIENTS
// ─────────────────────────────────────────────────────────────────────

/**
 * Industry coefficients used in the formulas below.
 * Each value is documented with its source — see `Sources` section in
 * `.memory_bank/_claude/GOALS-MONETIZATION.md`.
 */
export const FMCG_COEFFICIENTS = {
  /** 1pp OOS = 3-5% sales loss in category. Midpoint 4%. Gruen/Corsten 2002 GMA. */
  OOS_ELASTICITY_PER_PP: 0.04,
  /** Realistic share of lost OOS sales actually recovered (20-25%). FMI/NACDS. */
  OOS_RECAPTURE_RATE: 0.22,
  /** Share of store revenue from dairy category. */
  DAIRY_REVENUE_SHARE: 0.30,
  /** Share of store revenue from frozen products. */
  FROZEN_REVENUE_SHARE: 0.12,
  /** Share of store revenue from bakery (industry 5-7%). */
  BAKERY_REVENUE_SHARE: 0.06,
  /** Share of revenue generated in promo zones. */
  PROMO_ZONE_REVENUE_SHARE: 0.15,
  /** Retail price → cost of goods. */
  COGS_RATIO: 0.78,
  /** Shrink target for non-fresh categories (FMI 2.5%). */
  SHRINK_NORM_NON_FRESH: 0.025,
  /** Shrink target for fresh (dairy/bakery/produce). */
  SHRINK_NORM_FRESH: 0.05,
  /** Industry-average promo compliance (Nielsen). */
  PROMO_COMPLIANCE_INDUSTRY: 0.40,
  /** Best-in-class promo compliance. */
  PROMO_COMPLIANCE_LEADERS: 0.91,
  /** Sales lift per pp of promo compliance (≈0.7 elasticity → 0.7%). */
  PROMO_LIFT_PER_PP: 0.007,
  /** Sales lost per week per missing/wrong price tag (Wiser). */
  PRICE_TAG_LOST_SALES_PER_WK: 0.06,
  /** Customer abandonment rate at 5+ people in queue (ScanQueue 2026). */
  QUEUE_ABANDON_AT_5_PEOPLE: 0.19,
  /** Customer abandonment rate at 8+ minute wait. */
  QUEUE_ABANDON_AT_8_MIN: 0.23,
  /** Profit lift from full planogram compliance (NARMS). */
  PLANOGRAM_PROFIT_LIFT: 0.081,
  /** Mix of store-controllable factors (0.55-0.70). Used as attribution weight. */
  ATTRIBUTION_NETWORK: 0.65,
  /** Russian fully-loaded labor rate per hour (2026 estimate). */
  RU_LABOR_FULL_RATE_PER_HR: 350,

  // ─── Network revenue baseline (заказчик 2026-05) ───────────────────
  /** Annual network revenue, ₽ — official customer figure 2026-05. */
  NETWORK_REVENUE_PER_YEAR: 25_000_000_000,
  /** Weekly network revenue, ₽ — derived from 25B/52w. */
  NETWORK_REVENUE_PER_WEEK: 480_000_000,
  /** Average store weekly revenue, ₽ — 480M / 132 stores. */
  AVG_STORE_REVENUE_PER_WEEK: 3_640_000,
  /** Total stores in the network. */
  NETWORK_STORE_COUNT: 132,

  // ─── AI signal × goal — новые коэффициенты ─────────────────────────
  // Источники и обоснование — JSDoc на каждом константе (см. ниже).

  /**
   * Demand-forecast accuracy lift из ML (vs SAP / классические методы).
   * Lenta заявила +40% по точности vs SAP при переключении на ML
   * (vc.ru/sfera.fm 2024-2025). Берём консервативно 0.30 как realistic для
   * среднего ритейлера. POS+ERP-сигнал → точность спроса на SKU/день.
   */
  AI_DEMAND_FORECAST_ACCURACY_LIFT: 0.30,

  /**
   * Снижение списаний после внедрения ML-прогноза спроса (POS+ERP сигнал).
   * Lenta: -4 п.п. списаний по гастрономии (sfera.fm 2024).
   * Берём -1.5 п.п. как realistic базу для нашей сети (мы не Lenta).
   */
  AI_WASTE_REDUCTION_PP: 0.015,

  /**
   * Снижение OOS на бонусных промо-SKU после внедрения ML availability.
   * Lenta: +5 п.п. доступности на акционных товарах (vc.ru 2024).
   * Применяем 0.025 (2.5 п.п.) для нашего масштаба.
   */
  AI_AVAILABILITY_LIFT_PP: 0.025,

  /**
   * Cross-sell uplift от basket analysis (POS чеки → MBA → planogram tweak).
   * Mastercard: +30% promotional ROI у retailer'а (LatentView/Quantzig 2024).
   * Берём 0.05 (5%) как realistic incremental basket-size, не тащим 30%.
   */
  AI_BASKET_CROSS_SELL_UPLIFT: 0.05,

  /**
   * RFM-cohort retention эффект — частота визитов loyal cohort.
   * Industry норма (Harte-Hanks / LatentView): -8% retention у local FMCG
   * cohort при недостатке товаров → goal: вернуть -3% разрыв.
   */
  AI_RFM_RETENTION_LIFT_PCT: 0.03,

  /**
   * Точность распознавания planogram-compliance по фото от сотрудника.
   * Goodschecker (RU SaaS) заявляет 95%+ accuracy на shelf images.
   * Магнит: пилот в 20 магазинах с 98% accuracy (new-retail.ru 2023).
   * Используем как weight при подсчёте photo-detected issues.
   */
  AI_PHOTO_AUDIT_ACCURACY: 0.95,

  /**
   * Лифт detection latency из crowdsourced photo-bonus loop vs manual rounds.
   * Trax/Pensa: -10× раз быстрее обнаружения OOS vs daily manager round
   * (traxretail.com case studies). Photo-bonus loop ≈ -5× (мы не CV cameras).
   * Используется в OOS lead-time goals — каждый сэкономленный час до фикса.
   */
  AI_PHOTO_LEAD_TIME_FACTOR: 5,

  /**
   * Контроль расхождений ERP master vs POS price (ERP-сигнал).
   * Wiser: 6%/нед потерь на каждом неверном ценнике. Реальная частота
   * расхождений после переоценки в РФ-сети ≈ 2-4% от SKU first 24h.
   */
  AI_PRICE_MISMATCH_RATE_AFTER_REPRICE: 0.03,

  /**
   * Promo execution gap — от benchmark group по чекам.
   * IRI/Nielsen: средний ритейл держит 40% promo compliance, лидеры 91%.
   * AI вычисляет gap по сравнению promo-SKU sales[store X] vs
   * benchmark group[similar-format avg].
   */
  AI_PROMO_EXECUTION_GAP_DETECTABLE_PP: 15,

  /**
   * Shrinkage detection (inventory delta − sales = неучтённая потеря).
   * FMI: 1.6% средний shrink, лидеры 0.7%. AI находит anomalies (ERP delta
   * без чека). Realistic recovery ≈ 0.3 п.п. за квартал внимания.
   */
  AI_SHRINKAGE_RECOVERY_PP: 0.003,

  /**
   * SLA на подтверждение фото-задачи (бонус-loop).
   * 30-90 сек на CV pipeline (Goodschecker заявляет ≤30 сек).
   * Используется в UI для расчёта «когда придёт ответ».
   */
  PHOTO_BONUS_SLA_SECONDS: 60,
} as const;

// ─────────────────────────────────────────────────────────────────────
// HELPER TYPES
// ─────────────────────────────────────────────────────────────────────

/** Discriminated union of supported impact-calculation params. */
export type GoalImpactParams =
  | {
      kind: "OOS_REDUCTION";
      /** Percentage-point reduction in OOS (e.g. 0.9 means −0.9pp). */
      delta_pp: number;
      /** Category share of revenue (e.g. 0.30 for dairy). */
      category_share: number;
      /** Reference store revenue per week, ₽. */
      store_revenue: number;
      /** Number of stores in the network. */
      n_stores: number;
    }
  | {
      kind: "WRITE_OFFS";
      /** Percentage-point reduction in write-offs (e.g. 1.3). */
      delta_pp: number;
      /** Category revenue per week, ₽. */
      category_revenue: number;
      /** Set true for fresh categories (dairy/bakery/meat) — adds 30% margin bonus. */
      is_fresh?: boolean;
    }
  | {
      kind: "PROMO_QUALITY";
      /** Percentage-point improvement in promo compliance (e.g. 27). */
      delta_pp: number;
      /** Promo zone share of monthly store revenue. */
      promo_zone_share: number;
      /** Store monthly revenue, ₽. */
      store_revenue: number;
    }
  | {
      kind: "PRICE_ACCURACY";
      /** Number of price-tag mismatches eliminated. */
      n_mismatches: number;
      /** Average compensation per complaint, ₽. */
      compensation_per_complaint: number;
      /** Optional sales-loss component params. */
      n_skus?: number;
      avg_sku_revenue?: number;
      weeks_period?: number;
    }
  | {
      kind: "PRODUCTIVITY";
      /** Hours saved per period. */
      hours_saved: number;
      /** Optional task-completion uplift. */
      delta_completion_pp?: number;
      labor_budget?: number;
    };

/** Result of `calcGoalImpact`. */
export interface GoalImpactResult {
  amount: number;
  period: MoneyImpactPeriod;
  rationale_short: string;
  rationale_breakdown: string[];
}

// ─────────────────────────────────────────────────────────────────────
// HELPER FUNCTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate the money-impact (₽) of achieving a goal.
 *
 * Formulas live in the playbook (`.memory_bank/_claude/GOALS-MONETIZATION.md`),
 * one per `GoalCategory`:
 *
 * | Category          | Formula                                                                    |
 * |-------------------|----------------------------------------------------------------------------|
 * | OOS_REDUCTION     | Δpp × OOS_ELASTICITY × category_share × store_revenue × n_stores ×        |
 * |                   |   ATTRIBUTION × OOS_RECAPTURE_RATE                                         |
 * | WRITE_OFFS        | Δpp × category_revenue × COGS_RATIO × ATTRIBUTION (×1.3 if fresh)         |
 * | PROMO_QUALITY     | Δpp × promo_zone_share × store_revenue × PROMO_LIFT_PER_PP × 100 ×        |
 * |                   |   ATTRIBUTION                                                              |
 * | PRICE_ACCURACY    | n_mismatches × compensation + sales_loss_component                         |
 * | PRODUCTIVITY      | hours_saved × LABOR_RATE + Δcompletion_pp × labor_budget × 0.6%           |
 *
 * Sources: Gruen/Corsten 2002, FMI/NACDS, Nielsen, Wiser, NARMS, BLS 2024.
 */
export function calcGoalImpact(
  category: GoalCategory,
  params: GoalImpactParams,
): GoalImpactResult {
  const C = FMCG_COEFFICIENTS;

  switch (params.kind) {
    case "OOS_REDUCTION": {
      const { delta_pp, category_share, store_revenue, n_stores } = params;
      // Δpp × elasticity × cat-share × store-rev × n-stores × attribution × recapture
      const amount = Math.round(
        delta_pp *
          C.OOS_ELASTICITY_PER_PP *
          category_share *
          store_revenue *
          n_stores *
          C.ATTRIBUTION_NETWORK *
          C.OOS_RECAPTURE_RATE,
      );
      return {
        amount,
        period: "week",
        rationale_short: `−${delta_pp.toFixed(1)} п.п. OOS ≈ +${formatRub(amount)} ₽/нед по сети`,
        rationale_breakdown: [
          `Доля категории в выручке магазина: ${(category_share * 100).toFixed(0)}%`,
          `Эластичность OOS: 1 п.п. = +${(C.OOS_ELASTICITY_PER_PP * 100).toFixed(0)}% продаж (Gruen/Corsten 2002)`,
          `Сеть: ${n_stores} магазинов × ${formatRub(store_revenue)} ₽/нед`,
          `Атрибуция: ${(C.ATTRIBUTION_NETWORK * 100).toFixed(0)}% × возврат покупателя ${(C.OOS_RECAPTURE_RATE * 100).toFixed(0)}%`,
        ],
      };
    }
    case "WRITE_OFFS": {
      const { delta_pp, category_revenue, is_fresh } = params;
      const freshBonus = is_fresh ? 1.3 : 1.0;
      // Δpp × cat-revenue × COGS × attribution × fresh-bonus
      const amount = Math.round(
        (delta_pp / 100) *
          category_revenue *
          C.COGS_RATIO *
          C.ATTRIBUTION_NETWORK *
          freshBonus,
      );
      return {
        amount,
        period: "week",
        rationale_short: `−${delta_pp.toFixed(1)} п.п. списаний ≈ −${formatRub(amount)} ₽/нед экономии`,
        rationale_breakdown: [
          `Снижение списаний на ${delta_pp.toFixed(1)} п.п. от выручки категории`,
          `Категорийная выручка: ${formatRub(category_revenue)} ₽/нед`,
          `Себестоимость: ${(C.COGS_RATIO * 100).toFixed(0)}% от розницы (FMI norm)`,
          is_fresh
            ? "Свежая категория: +30% защиты маржи"
            : "Сухая категория: без бонуса маржи",
        ],
      };
    }
    case "PROMO_QUALITY": {
      const { delta_pp, promo_zone_share, store_revenue } = params;
      // Δpp × promo-share × store-rev × lift-per-pp × 100 × attribution
      const amount = Math.round(
        delta_pp *
          promo_zone_share *
          store_revenue *
          C.PROMO_LIFT_PER_PP *
          100 *
          C.ATTRIBUTION_NETWORK,
      );
      return {
        amount,
        period: "month",
        rationale_short: `+${delta_pp.toFixed(0)} п.п. соответствия промо ≈ +${formatRub(amount)} ₽/мес`,
        rationale_breakdown: [
          `Промо-зона: ${(promo_zone_share * 100).toFixed(0)}% выручки магазина (${formatRub(store_revenue * promo_zone_share)} ₽/мес)`,
          `Лифт ${(C.PROMO_LIFT_PER_PP * 100).toFixed(1)}% на каждый п.п. соответствия (Nielsen)`,
          `Δ${delta_pp.toFixed(0)} п.п. × лифт × атрибуция ${(C.ATTRIBUTION_NETWORK * 100).toFixed(0)}%`,
        ],
      };
    }
    case "PRICE_ACCURACY": {
      const {
        n_mismatches,
        compensation_per_complaint,
        n_skus = 0,
        avg_sku_revenue = 0,
        weeks_period = 4,
      } = params;
      // Direct savings + sales-loss component (Wiser 6%/wk)
      const directSavings = n_mismatches * compensation_per_complaint;
      const salesLoss = Math.round(
        n_skus * avg_sku_revenue * C.PRICE_TAG_LOST_SALES_PER_WK * weeks_period,
      );
      const amount = directSavings + salesLoss;
      return {
        amount,
        period: "month",
        rationale_short: `0 расхождений ≈ −${formatRub(amount)} ₽/мес компенсаций`,
        rationale_breakdown: [
          `${n_mismatches} расхождений × ${formatRub(compensation_per_complaint)} ₽ компенсация = ${formatRub(directSavings)} ₽`,
          ...(salesLoss > 0
            ? [
                `Wiser: 6% продаж в неделю теряется на каждом неверном ценнике`,
                `${n_skus} SKU × ${formatRub(avg_sku_revenue)} × 6% × ${weeks_period} нед = ${formatRub(salesLoss)} ₽`,
              ]
            : []),
        ],
      };
    }
    case "PRODUCTIVITY": {
      const { hours_saved, delta_completion_pp = 0, labor_budget = 0 } = params;
      // hours × labor-rate + Δcompletion × budget × 0.6% (BLS 2024)
      const laborSavings = hours_saved * C.RU_LABOR_FULL_RATE_PER_HR;
      const completionGain = Math.round(
        delta_completion_pp * 0.006 * labor_budget,
      );
      const amount = Math.round(laborSavings + completionGain);
      return {
        amount,
        period: "month",
        rationale_short: `+${hours_saved} ч экономии ≈ +${formatRub(amount)} ₽/мес`,
        rationale_breakdown: [
          `${hours_saved} часов × ${formatRub(C.RU_LABOR_FULL_RATE_PER_HR)} ₽/час = ${formatRub(laborSavings)} ₽`,
          ...(delta_completion_pp > 0
            ? [
                `+${delta_completion_pp} п.п. выполнения × 0.6% от ФОТ × ${formatRub(labor_budget)} ₽ = ${formatRub(completionGain)} ₽`,
                `Источник: BLS 2024 grocery productivity statistics`,
              ]
            : []),
        ],
      };
    }
    default: {
      // Exhaustiveness check — unknown category falls back to zero.
      const _exhaustive: never = params;
      void _exhaustive;
      return {
        amount: 0,
        period: "month",
        rationale_short: `Неизвестная категория ${category}`,
        rationale_breakdown: [],
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// CONVENIENCE FACTORIES
// ─────────────────────────────────────────────────────────────────────

/**
 * Build a `MoneyImpact` payload (без `_en` переводов и значений) из результата calc.
 * Удобно для catalog default-ов, mock-данных и hard-coded карточек в UI.
 */
export function buildMoneyImpact(
  result: GoalImpactResult,
  opts: {
    impact_type?: MoneyImpact["impact_type"];
    significance_score?: number;
    rationale_short_en?: string;
    rationale_breakdown_en?: string[];
  } = {},
): MoneyImpact {
  return {
    amount: result.amount,
    period: result.period,
    rationale_short: result.rationale_short,
    rationale_breakdown: result.rationale_breakdown,
    impact_type: opts.impact_type ?? "money",
    significance_score: opts.significance_score,
    rationale_short_en: opts.rationale_short_en,
    rationale_breakdown_en: opts.rationale_breakdown_en,
  };
}

// ─────────────────────────────────────────────────────────────────────
// INTERNAL
// ─────────────────────────────────────────────────────────────────────

function formatRub(value: number): string {
  // Thousands separator (non-breaking space, RU style). Used inside rationale.
  return Math.round(value).toLocaleString("ru-RU").replace(/\s/g, " ");
}
