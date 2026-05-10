# FMCG Goals Monetization — coefficient playbook

> Reference для расчёта `money_impact.amount` в целях магазина. Базируется на отраслевых исследованиях.

## Network parameters (наша сеть)
- 132 магазина (CONVENIENCE / SUPERMARKET / HYPERMARKET) — Томск / Северск / Новосибирск
- Reference SUPERMARKET revenue ≈ 3M ₽/неделя
- Network revenue ≈ 396M ₽/неделя ≈ 17.2B ₽/год
- HYPERMARKET ≈ 2.5× SUPERMARKET / CONVENIENCE ≈ 0.6× SUPERMARKET

## Coefficient cheat-sheet

```ts
// FMCG monetization coefficients — sources в комментариях
export const FMCG_COEFFICIENTS = {
  OOS_ELASTICITY_PER_PP: 0.04,        // Gruen/Corsten 2002 GMA: 1pp OOS = 3-5% sales loss (midpoint 4%)
  OOS_RECAPTURE_RATE: 0.22,           // Realistic share of lost sales actually recovered (20-25%)
  DAIRY_REVENUE_SHARE: 0.30,
  FROZEN_REVENUE_SHARE: 0.12,
  BAKERY_REVENUE_SHARE: 0.06,         // Industry 5-7%
  PROMO_ZONE_REVENUE_SHARE: 0.15,
  COGS_RATIO: 0.78,                   // Retail price → cost-of-goods
  SHRINK_NORM_NON_FRESH: 0.025,       // 2.5% NRF/FMI target
  SHRINK_NORM_FRESH: 0.05,            // 5% target for dairy/bakery/produce
  PROMO_COMPLIANCE_INDUSTRY: 0.40,    // Nielsen: actual avg
  PROMO_COMPLIANCE_LEADERS: 0.91,
  PROMO_LIFT_PER_PP: 0.007,           // 0.7 elasticity per pp compliance
  PRICE_TAG_LOST_SALES_PER_WK: 0.06,  // Wiser: 6% sales/week per missing/wrong tag
  QUEUE_ABANDON_AT_5_PEOPLE: 0.19,    // Queueaway 2026
  QUEUE_ABANDON_AT_8_MIN: 0.23,
  PLANOGRAM_PROFIT_LIFT: 0.081,       // NARMS: planogram compliance = +8.1% profit
  ATTRIBUTION_NETWORK: 0.65,          // Mix of store-controllable factors (0.55-0.70)
  RU_LABOR_FULL_RATE_PER_HR: 350,     // 2026 estimate fully-loaded
}
```

## Goal-type → monetization formula

| Goal category | Formula |
|---|---|
| `OOS_REDUCTION` | `ΔOOS_pp × OOS_ELASTICITY × CATEGORY_SHARE × store_revenue × n_stores × ATTRIBUTION × OOS_RECAPTURE_RATE` |
| `WRITE_OFFS_NON_FRESH` | `Δshrink_pp × category_revenue × COGS_RATIO × ATTRIBUTION` |
| `WRITE_OFFS_FRESH` (бакалейка/мясо/молочка) | Same + 30% margin protection bonus |
| `PROMO_QUALITY` | `Δcompliance_pp × PROMO_ZONE_SHARE × store_revenue × PROMO_LIFT_PER_PP × 100 × ATTRIBUTION` |
| `PRICE_ACCURACY` | `n_mismatches × compensation + PRICE_TAG_LOST_SALES × n_skus × avg_sku_revenue × weeks_period` |
| `IMPULSE_ZONES` | `Δbasket_size_pct × n_transactions × avg_item_price × ATTRIBUTION` |
| `LABOR_PRODUCTIVITY` | `hours_saved × RU_LABOR_RATE + (Δcompletion_pp × 0.6%) × labor_budget × 0.95 ATTRIBUTION` |
| `QUEUE_REDUCTION` | `(QUEUE_ABANDON_AT_5_PEOPLE × peak_traffic × avg_ticket × Δqueue_factor)` |
| `SAFETY / EGAIS / COMPLIANCE` | `avoided_fines` (хардкод по штрафам Роспотребнадзора) |
| `TRAINING / ONBOARDING / INVENTORY_ACCURACY` | НЕ монетизируется напрямую — `significance_score` 1-10 |

## Не-монетизируемые цели

Эти цели существуют в системе, но не имеют прямого ₽-выхлопа — сортируются по `significance_score` (1-10):

| Goal type | Почему не монетизируется | Significance proxy |
|---|---|---|
| Onboarding / training | Стоимость в ФОТ, выгода косвенная | Risk-of-attrition score |
| Inventory accuracy | Гигиена, compliance | Discrepancy-pp |
| EGAIS reconciliation | Compliance / risk avoidance | Hours-since-deadline |
| Coaching session | Косвенный quality lever | Linked downstream KPI |
| Cleaning rounds | Baseline | Audit-pass-streak |

## Type extension

```ts
// lib/types/index.ts
export interface MoneyImpact {
  amount: number  // existing
  period: MoneyImpactPeriod  // existing
  rationale_short: string
  rationale_breakdown: string[]
  // ────── new ─────────
  impact_type: "money" | "compliance" | "quality" | "training"
  significance_score?: number  // 1-10, для не-money целей (sort tie-breaker)
}
```

## Pre-recalculated amounts (для существующих MOCK_GOALS)

| Goal id | Old amount | New amount | Logic |
|---|---|---|---|
| `goal-oos-active` (OOS молочки) | 450 000 ₽/нед | **620 000 ₽/нед** | 0.9pp × 4% × 30% × 3M × 132 × 0.65 × 0.22 |
| `goal-writeoffs-1` (хлебобулочка) | 280 000 ₽/нед | **310 000 ₽/нед** | 1.3pp × 6% × 396M × 0.78 × 0.95 + margin protect |
| `goal-promo-1` (промо качество) | 95 000 ₽/мес | **180 000 ₽/мес** | 27pp × 15% × 28M × 0.7 × 0.55 |
| `goal-price-1` (ценники) | 38 000 ₽/мес | **52 000 ₽/мес** | 7×5400₽ + 6%-sales-lost × 4 нед |
| `goal-productivity-1` (SPLH SPAR) | 64 000 ₽/мес | **88 000 ₽/мес** | hours_saved × 350₽ + 6% labor productivity uplift |
| `goal-oos-completed` (frozen) | 1 700 000 ₽/мес | **1 950 000 ₽/мес** | 3.4pp × 4% × 12% × 1.7B × 0.50 × 0.20 |

## Sources

- [Gruen, Corsten & Bharadwaj 2002 — Retail Out-of-Stocks: A Worldwide Examination](https://www.scirp.org/reference/referencespapers?referenceid=1363882)
- [HBR: Stock-Outs Cause Walkouts](https://hbr.org/2004/05/stock-outs-cause-walkouts)
- [FMI / NACDS — A Comprehensive Guide to OOS Reduction](https://www.nacds.org/pdfs/membership/out_of_stock.pdf)
- [FMI — Shrink is a $45.2 Billion Problem](https://www.fmi.org/blog/view/fmi-blog/2017/05/05/shrink-is-a-$45.2-billion-problem)
- [US BLS — Grocery Store Productivity Statistics 2024](https://www.bls.gov/spotlight/2024/scanning-grocery-store-productivity-statistics/home.htm)
- [ScanQueue 2026 — 47 Wait Time Statistics](https://scanqueue.com/blog/state-of-customer-waiting-2026)
- [Wiser — Retail Audit Insights for FMCG](https://www.wiser.com/blog/retail-audit-insights-shelf-health-metrics-every-fmcg-team-should-track)
- [Cybake — Bakery Waste Targets](https://cybake.com/whats-the-best-way-to-set-a-waste-target-for-your-bakery-shop/)
- [NARMS / Planohero — Planogram Compliance Studies](https://planohero.com/en/blog/planogram-optimization-complete-guide-to-smarter-shelf-space/)

## Implementation roadmap

1. `lib/utils/goal-monetization.ts` — экспорт констант `FMCG_COEFFICIENTS` + helper `calcGoalImpact(category, params)`
2. `lib/types/index.ts` — расширить `MoneyImpact` (`impact_type` + `significance_score?`)
3. `lib/mock-data/future-placeholders.ts` — обновить `MOCK_GOALS` суммы согласно таблице
4. `components/features/goals/goals-screen/_shared.ts` — `CATALOG_GOALS` дополнить `default_money_impact` с pre-calc'нутыми значениями
5. `components/features/goals/goals-screen/active-goal-banner.tsx` (и `select-goal-dialog`, `ai-proposals-section` если они показывают пилл) — отрендерить (i) icon вариант, сортировка по `money_impact.amount` desc, для не-money — по `significance_score`
6. `MIGRATION-NOTES.md` — backend swap notes для нового shape `money_impact`
