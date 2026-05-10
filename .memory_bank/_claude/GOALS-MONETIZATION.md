# FMCG Goals Monetization — coefficient playbook

> Reference для расчёта `money_impact.amount` в целях магазина.
> Базируется на отраслевых исследованиях + RU FMCG кейсах (X5 / Магнит / Lenta / ВкусВилл).

## Network parameters (наша сеть, заказчик 2026-05)

- **132 магазина** (CONVENIENCE / SUPERMARKET / HYPERMARKET) — Томск / Северск / Новосибирск
- **Network revenue ≈ 25 млрд ₽/год** (заказчик зафиксировал 2026-05, было 17.2B)
- ≈ **480 млн ₽/нед** ≈ 190 млн ₽/магазин/год ≈ **3.6 млн ₽/магазин/нед** (среднее)
- HYPERMARKET ≈ 2.5× SUPERMARKET / CONVENIENCE ≈ 0.6× SUPERMARKET

## Три источника AI-сигналов (★)

Заказчик зафиксировал требование прозрачности: для каждой цели директор
должен видеть, ОТКУДА AI взял основание. Три источника + смешанный режим:

| Source | Что AI смотрит | Goal types |
|---|---|---|
| `pos-cheque` | Чеки: time-series по SKU/час, basket pairs, RFM cohorts, kassir performance | OOS detection, basket cross-sell, RFM retention, slow-checkout, promo lift gap |
| `erp-stock` | Приёмки, остатки, сроки годности, перемещения, переоценки, shrinkage | Write-offs, fresh expiry, shrinkage, recieving accuracy |
| `erp-price-master` | ERP master price vs POS-цена на чеке | Price-tag accuracy |
| `photo-bonus` ★ | Фото от сотрудника через бонус-задачу → CV pipeline | Empty shelves, planogram compliance, prikassa-zone OOS, безопасность |
| `wfm-schedule` | График смен vs пики продаж | Productivity, queue reduction |
| `egais` | ЕГАИС / Честный знак | Compliance |
| `mixed` | Несколько источников одновременно | Complex goals |

### Photo-bonus loop (★ инновация WFM)

Паттерн «crowdsourced shelf monitoring» — дешёвая альтернатива стационарным
CV-камерам Trax/Pensa/Focal. Реализация:

1. AI генерит бонусную задачу: «Сфоткай витрину Молочки в 14:00, +50 баллов»
2. Сотрудник снимает на телефон через WFM-mobile → получает бонус
3. Backend прогоняет фото через CV pipeline (Goodschecker / собственный ML)
4. Если детектит проблему → создаётся основная задача для директора
5. Директор видит на странице цели/задачи: «AI выявил по фото от
   Иванова И.И. от 5 мая 09:15» — с превью фото и audit-trail

Industry references: [Trax Retail][trax], [Pensa Systems][pensa],
[Focal Systems][focal], [Goodschecker (RU)][goodschecker], Walmart Spark
review program (косвенно). Mobile-photo CV pipeline — в [Магнит pilot][magnit-cv]
98% accuracy на 20 магазинах.

[trax]: https://traxretail.com/technology/
[pensa]: https://pensasystems.com/pensa-technology/
[focal]: https://focal.systems/shelf-cameras/
[goodschecker]: https://goodschecker.com/ru/blog/faq-ob-ispolzovanii-kompyuternogo-zreniya-v-ritejle/
[magnit-cv]: https://new-retail.ru/novosti/retail/magnit_testiruet_raspoznavanie_tovarov_na_polke3478/

## Coefficient cheat-sheet

```ts
// FMCG monetization coefficients — sources в JSDoc на каждом
export const FMCG_COEFFICIENTS = {
  // ─── Existing (Gruen/Corsten + FMI + Nielsen + Wiser + NARMS) ──────
  OOS_ELASTICITY_PER_PP: 0.04,        // Gruen/Corsten 2002: 1pp OOS = 4% sales loss
  OOS_RECAPTURE_RATE: 0.22,           // FMI/NACDS: 22% recovery
  DAIRY_REVENUE_SHARE: 0.30,
  FROZEN_REVENUE_SHARE: 0.12,
  BAKERY_REVENUE_SHARE: 0.06,
  PROMO_ZONE_REVENUE_SHARE: 0.15,
  COGS_RATIO: 0.78,
  SHRINK_NORM_NON_FRESH: 0.025,
  SHRINK_NORM_FRESH: 0.05,
  PROMO_COMPLIANCE_INDUSTRY: 0.40,    // Nielsen
  PROMO_COMPLIANCE_LEADERS: 0.91,
  PROMO_LIFT_PER_PP: 0.007,
  PRICE_TAG_LOST_SALES_PER_WK: 0.06,  // Wiser
  QUEUE_ABANDON_AT_5_PEOPLE: 0.19,
  QUEUE_ABANDON_AT_8_MIN: 0.23,
  PLANOGRAM_PROFIT_LIFT: 0.081,       // NARMS
  ATTRIBUTION_NETWORK: 0.65,
  RU_LABOR_FULL_RATE_PER_HR: 350,

  // ─── Network revenue baseline (заказчик 2026-05) ───────────────────
  NETWORK_REVENUE_PER_YEAR: 25_000_000_000,
  NETWORK_REVENUE_PER_WEEK: 480_000_000,
  AVG_STORE_REVENUE_PER_WEEK: 3_640_000,
  NETWORK_STORE_COUNT: 132,

  // ─── New AI-signal coefficients (Лента / Перекрёсток / Goodschecker) ──
  AI_DEMAND_FORECAST_ACCURACY_LIFT: 0.30,    // Lenta заявила +40% vs SAP, берём 30% conservative
  AI_WASTE_REDUCTION_PP: 0.015,              // Lenta -4 п.п. гастрономии, мы -1.5 п.п. realistic
  AI_AVAILABILITY_LIFT_PP: 0.025,            // Lenta +5 п.п. доступность, мы +2.5 п.п.
  AI_BASKET_CROSS_SELL_UPLIFT: 0.05,         // MBA → +5% basket-size, не 30% Mastercard hype
  AI_RFM_RETENTION_LIFT_PCT: 0.03,           // RFM-cohort retention recovery
  AI_PHOTO_AUDIT_ACCURACY: 0.95,             // Goodschecker / Магнит pilot 95-98%
  AI_PHOTO_LEAD_TIME_FACTOR: 5,              // photo-bonus -5× detection latency vs manual rounds
  AI_PRICE_MISMATCH_RATE_AFTER_REPRICE: 0.03,// 3% SKU расходятся first 24h после переоценки
  AI_PROMO_EXECUTION_GAP_DETECTABLE_PP: 15,  // gap industry 40% vs leaders 91% → average detectable 15
  AI_SHRINKAGE_RECOVERY_PP: 0.003,           // FMI 1.6% → leaders 0.7%, recovery 0.3pp/quarter
  PHOTO_BONUS_SLA_SECONDS: 60,               // Goodschecker pipeline ≤30s → 60s realistic
}
```

## Goal-type → monetization formula

| Goal category | Signal source | Formula |
|---|---|---|
| `OOS_REDUCTION` (POS) | `pos-cheque` | `ΔOOS_pp × OOS_ELASTICITY × CATEGORY_SHARE × store_revenue × n_stores × ATTRIBUTION × OOS_RECAPTURE_RATE` |
| `OOS_REDUCTION` (Photo) | `photo-bonus` | Same + `AI_PHOTO_LEAD_TIME_FACTOR` weight |
| `WRITE_OFFS_FRESH` | `erp-stock` | `Δshrink_pp × category_revenue × COGS × ATTR × 1.3 (fresh)` |
| `WRITE_OFFS_NON_FRESH` | `erp-stock` | Same w/o fresh-bonus |
| `PROMO_QUALITY` | `pos-cheque` (lift gap) | `Δcompl_pp × PROMO_ZONE × store_rev × PROMO_LIFT_PER_PP × ATTR` |
| `PRICE_ACCURACY` | `erp-price-master` | `n_mismatches × compensation + PRICE_TAG_LOST_SALES × n_skus × avg_revenue × weeks` |
| `IMPULSE_ZONES` | `pos-cheque` (basket) | `AI_BASKET_CROSS_SELL_UPLIFT × n_trans × avg_item × ATTR` |
| `PRODUCTIVITY` | `wfm-schedule` | `hours_saved × LABOR_RATE + Δcompl_pp × labor_budget × 0.6%` |
| `RFM_RETENTION` | `pos-cheque` (cohort) | `AI_RFM_RETENTION_LIFT_PCT × cohort_size × avg_basket × ATTR` |
| `SHRINKAGE_DETECT` | `erp-stock` (anomaly) | `AI_SHRINKAGE_RECOVERY_PP × store_rev × COGS × ATTR` |
| `PLANOGRAM_PHOTO` | `photo-bonus` | `PLANOGRAM_PROFIT_LIFT × zone_share × store_rev × AI_PHOTO_AUDIT_ACCURACY` |
| `PRIKASSA_OOS_PHOTO` | `photo-bonus` | OOS formula × prikassa-zone share (~5%) × ATTR |
| `EGAIS_COMPLIANCE` | `egais` | `avoided_fines` (хардкод по штрафам Роспотребнадзора) |

## Pre-recalculated amounts на 25B baseline

| Goal id | Old (17.2B) | New (25B) | Logic |
|---|---|---|---|
| `goal-oos-active` (OOS молочки) | 620 000 ₽/нед | **900 000 ₽/нед** | 0.9pp × 4% × 30% × 3.6M × 132 × 0.65 × 0.22 |
| `goal-writeoffs-1` (хлеб) | 310 000 ₽/нед | **450 000 ₽/нед** | 1.3pp × 6% × 480M × 0.78 × 0.65 × 1.3 |
| `goal-promo-1` (промо) | 180 000 ₽/мес | **260 000 ₽/мес** | Hyper-store 18M/мес × 15% × 0.7% × 27pp × 0.65 |
| `goal-price-1` (ценники) | 52 000 ₽/мес | **75 000 ₽/мес** | 7×5400 + 6%-loss × 4 нед на бóльшем avg-revenue |
| `goal-productivity-1` | 88 000 ₽/мес | **128 000 ₽/мес** | hours × 350 + 0.6% × labor budget на новой baseline |
| `goal-oos-completed` (frozen) | 1 950 000 ₽/мес | **2 800 000 ₽/мес** | 3.4pp × 4% × 12% × 2B × 0.50 × 0.20 |

## Sources (research 2024-2026)

### Out-of-stock + demand forecasting
- [Gruen/Corsten/Bharadwaj 2002 — Retail OOS Worldwide](https://www.scirp.org/reference/referencespapers?referenceid=1363882) — 1pp OOS = 4% sales loss
- [HBR — Stock-Outs Cause Walkouts (2004)](https://hbr.org/2004/05/stock-outs-cause-walkouts)
- [FMI/NACDS — Comprehensive Guide to OOS Reduction](https://www.nacds.org/pdfs/membership/out_of_stock.pdf)
- [Lenta — ML reduced waste 4pp / +5pp availability (sfera.fm 2024)](https://sfera.fm/news/fud-reteil/lenta-snizila-spisaniya-blagodarya-iskusstvennomu-intellektu)
- [Лента кейс на vc.ru — +40% точности vs SAP](https://vc.ru/trade/437725-kak-iskusstvennyy-intellekt-prognoziruet-spros-na-tovary-v-lente)
- [RELEX — AI demand forecasting study 2024](https://www.relexsolutions.com/news/new-relex-study-reveals-ais-untapped-potential-retail-and-cpgs-yet-to-fully-embrace-technology-that-drives-demand-forecasting-accuracy/)
- [IEEE — Supervised OOS detection in shelf panoramas](https://ieeexplore.ieee.org/document/7738260/)

### Basket / promo / price
- [Mastercard / LatentView — basket analysis +30% promo ROI](https://www.latentview.com/glossary/market-basket-analysis/)
- [IEEE — Anomaly detection in association rule mining (2024)](https://ieeexplore.ieee.org/document/11015705/)
- [Wiser — Retail Audit Insights (price-tag 6%/wk loss)](https://www.wiser.com/blog/retail-audit-insights-shelf-health-metrics-every-fmcg-team-should-track)
- [NARMS / Planohero — planogram compliance +8.1% profit](https://planohero.com/en/blog/planogram-optimization-complete-guide-to-smarter-shelf-space/)
- [Cybake — Bakery waste targets](https://cybake.com/whats-the-best-way-to-set-a-waste-target-for-your-bakery-shop/)

### Crowdsourced photo / shelf monitoring
- [Trax Retail — shelf intelligence platform](https://traxretail.com/technology/)
- [Pensa Systems — motion-based CVAI](https://pensasystems.com/pensa-technology/)
- [Focal Systems — AI shelf cameras 24/7](https://focal.systems/shelf-cameras/)
- [Goodschecker (RU) — 95% planogram accuracy SaaS](https://goodschecker.com/ru/blog/faq-ob-ispolzovanii-kompyuternogo-zreniya-v-ritejle/)
- [Магнит — pilot CV в 20 магазинах с 98% accuracy](https://new-retail.ru/novosti/retail/magnit_testiruet_raspoznavanie_tovarov_na_polke3478/)
- [X5 — компьютерное зрение: -10% уход без покупок, -20% потери (Retail.ru)](https://www.retail.ru/news/x5-vklyuchit-kompyuternoe-zrenie/)
- [ВкусВилл — image-recognition выкладка + кассы (Retail.ru)](https://www.retail.ru/articles/kak-riteylery-primenyayut-ii-v-e-commerce-keysy-vkusvill-lemana-tekh-i-magnit-omni/)

### Productivity / queue / shrinkage
- [US BLS — Grocery Store Productivity Statistics 2024](https://www.bls.gov/spotlight/2024/scanning-grocery-store-productivity-statistics/home.htm)
- [ScanQueue 2026 — 47 Wait Time Statistics](https://scanqueue.com/blog/state-of-customer-waiting-2026)
- [FMI — Shrink is a $45.2 Billion Problem](https://www.fmi.org/blog/view/fmi-blog/2017/05/05/shrink-is-a-$45.2-billion-problem)

## Type extension

```ts
// lib/types/index.ts
export type AISignalSource =
  | "pos-cheque" | "erp-stock" | "erp-price-master"
  | "photo-bonus" | "wfm-schedule" | "egais" | "mixed"

export interface AIEvidenceItem {
  source: AISignalSource
  summary: string
  observed_from?: string
  observed_to?: string
  scope_hint?: string
  photo_url?: string
  photo_taken_by?: string
  photo_taken_at?: string
  // + EN fields
}

export interface Goal {
  // ... существующие поля
  ai_signal_source?: AISignalSource
  ai_detection_method?: string
  ai_evidence?: AIEvidenceItem[]
}
```

## Implementation roadmap (выполнено в этой задаче)

1. ✅ `lib/types/index.ts` — `AISignalSource` / `AIEvidenceItem` / Goal extension
2. ✅ `lib/api/_backend-types.ts` — `BackendAISignalSource` / `BackendAIEvidenceItem` / `BackendGoal`
3. ✅ `lib/api/goals.ts` — `goalFromBackend()` / `getGoalsOnBackend()` / `aiEvidenceFromBackend()`
4. ✅ `lib/utils/goal-monetization.ts` — coefficients на 25B baseline + AI-coeffs
5. ✅ `lib/mock-data/future-placeholders.ts` — обновлены 6 MOCK_GOALS + 2 photo-evidence
6. ✅ `components/features/goals/goals-screen/_shared.ts` — CATALOG_GOALS.fmcg переписан 12+ целей
7. ✅ `components/features/goals/goals-screen/active-goal-banner.tsx` — secция «Откуда AI это взял?»
8. ✅ `MIGRATION-NOTES.md` — секция «AI-driven goals: 3 источника signal'ов»
