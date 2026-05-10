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
  /** EN-перевод текста подсказки для билингв-демо. Fallback на `text`. */
  text_en?: string;
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
    text_en:
      "Start stocking from the back shelf. Watch rotation: new items go to the back, older items move forward. A photo report is required after you finish.",
    stats: { impressions: 312, applications: 187, helpful_rate: 0.71 },
    created_at: "2026-03-15T09:00:00+07:00",
  },
  {
    id: "hint-ai-002",
    work_type_id: 4,
    work_type_name: "Выкладка",
    version: 2,
    text: "При выкладке молочки: первый ряд — ближайшие сроки. Зазоры между пачками — не более 2 мм. Фасинг строго к покупателю. Полки без пыли до начала.",
    text_en:
      "When stocking dairy: the front row holds the nearest expiry dates. Keep gaps between packs under 2 mm. Facing strictly toward the customer. Shelves must be dust-free before you start.",
    stats: { impressions: 228, applications: 163, helpful_rate: 0.82 },
    created_at: "2026-04-02T09:00:00+07:00",
  },
  {
    id: "hint-ai-003",
    work_type_id: 4,
    work_type_name: "Выкладка",
    version: 3,
    text: "Excel-шаблон v3 загружен 28 апр. Включён новый чек-лист: контроль ценников во время выкладки (не отдельная задача). Сокращает возвраты на 30%.",
    text_en:
      "Excel template v3 was uploaded on Apr 28. It adds a new checklist: verify price tags during stocking (not as a separate task). Cuts returns by 30%.",
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
  /** EN-перевод имени правила для билингв-демо. */
  name_en?: string;
  description: string;
  /** EN-перевод описания правила для билингв-демо. */
  description_en?: string;
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
    name_en: "Perishables check — no inspection for >24h",
    description: "Если контроль сроков годности молочки не выполнялся более 24 часов — создать задачу автоматически.",
    description_en:
      "If dairy expiry-date checks have not been performed for over 24 hours, automatically create a task.",
    triggers: [{ metric: "hours_since_last_quality_check", operator: "gt", threshold: 24, unit: "ч" }],
    severity: "high",
    active: true,
  },
  {
    id: "rule-002",
    work_type_id: 4,
    work_type_name: "Выкладка",
    name: "OOS в категории выше нормы",
    name_en: "Category OOS above target",
    description: "Если OOS по категории превысил установленный стандарт (из настроек) — предложить задачу на доукладку.",
    description_en:
      "If the category OOS exceeds the configured standard (from settings), propose a restocking task.",
    triggers: [{ metric: "oos_pct", operator: "gt", threshold: 4, unit: "%" }],
    severity: "medium",
    active: true,
  },
  {
    id: "rule-003",
    work_type_id: 5,
    work_type_name: "Переоценка",
    name: "Ценники не обновлены после выгрузки",
    name_en: "Price tags not updated after export",
    description: "После выгрузки изменений цен из 1С — если за 4 часа задача на переоценку не создана, триггер.",
    description_en:
      "After a price-change export from 1C, trigger if no repricing task is created within 4 hours.",
    triggers: [{ metric: "hours_since_reprice_export", operator: "gt", threshold: 4, unit: "ч" }],
    severity: "medium",
    active: true,
  },
  {
    id: "rule-004",
    work_type_id: 6,
    work_type_name: "Инвентаризация",
    name: "Расхождение остатков выше допустимого",
    name_en: "Inventory discrepancy above tolerance",
    description: "Если расхождение по результатам инвентаризации превысило 2% — эскалация SUPERVISOR.",
    description_en:
      "If the inventory discrepancy exceeds 2%, escalate to SUPERVISOR.",
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
    title: "Реже пустые полки в молочке",
    title_en: "Fewer empty dairy shelves",
    description:
      "AI заметил по чекам последних 30 дней, что йогурт «Чудо» не продавался 4 часа при норме 6 продаж/час. По сети сейчас 6.2% пустых полок в молочке — цель 5.3% за неделю.",
    description_en:
      "AI saw on POS that ‘Chudo’ yoghurt did not sell for 4 hours despite a 6 sales/hour baseline. Network-wide 6.2% empty dairy shelves — goal 5.3% in a week.",
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
    ai_signal_source: "pos-cheque",
    ai_detection_method:
      "AI смотрит почасовые продажи молочки за 30 дней и ищет провалы больше 4 часов при норме 6 продаж/час. Если SKU не продавался 4+ часа в 3+ магазинах одновременно — выдвигает гипотезу OOS.",
    ai_detection_method_en:
      "AI scans hourly dairy sales over 30 days and flags 4h+ gaps when baseline is 6 sales/hour. SKU silent for 4+ hours in 3+ stores simultaneously triggers an OOS hypothesis.",
    ai_evidence: [
      {
        source: "pos-cheque",
        summary:
          "Йогурт «Чудо клубника 130г» молчал 4ч 12мин в 7 магазинах одновременно (28 апр, 11:00–15:12)",
        summary_en:
          "‘Chudo strawberry 130g’ silent for 4h 12min in 7 stores simultaneously (Apr 28, 11:00–15:12)",
        observed_from: "2026-04-28T11:00:00+07:00",
        observed_to: "2026-04-28T15:12:00+07:00",
        scope_hint: "SKU 102345 / Молочная зона / 7 магазинов",
        scope_hint_en: "SKU 102345 / Dairy zone / 7 stores",
      },
      {
        source: "erp-stock",
        summary:
          "ERP показывает остаток 0 в 5 из 7 магазинов; в остальных >40, но полка пустая — backroom-задача",
        summary_en:
          "ERP shows 0 stock in 5 of 7 stores; the other 2 have >40 but the shelf is empty — backroom task",
        observed_from: "2026-04-28T11:00:00+07:00",
        scope_hint: "Молочная зона",
        scope_hint_en: "Dairy zone",
      },
    ],
    money_impact: {
      amount: 900_000,
      period: "week",
      impact_type: "money",
      rationale_short: "Меньше пустых полок в молочке ≈ +900 000 ₽/нед",
      rationale_short_en: "Fewer empty dairy shelves ≈ +900,000 ₽/week",
      rationale_breakdown: [
        "Молочка даёт 30% выручки магазина (≈ 1.1 млн ₽/нед на магазин)",
        "Каждый 1% пустой полки = 4% потерянных продаж (Gruen/Corsten 2002)",
        "Возвращаем 22% потерь — остальное покупатель уносит к конкуренту (FMI/NACDS)",
        "0.9 п.п. × 4% × 30% × 3.6 млн × 132 магазина × 65% ответственности × 22% возврата ≈ 900 000 ₽/нед",
        "Сетевая выручка 25 млрд ₽/год (заказчик 2026-05) → ≈ 480 млн ₽/нед",
      ],
      rationale_breakdown_en: [
        "Dairy = 30% store revenue (≈ 1.1M ₽/week per store)",
        "Every 1% empty shelf = 4% lost sales (Gruen/Corsten 2002)",
        "Only 22% of lost sales return — the rest goes to competitors (FMI/NACDS)",
        "0.9pp × 4% × 30% × 3.6M × 132 stores × 65% store-controllable × 22% recapture ≈ 900,000 ₽/week",
        "Network revenue 25B ₽/year (customer 2026-05) → ≈ 480M ₽/week",
      ],
    },
  },
  {
    id: "goal-writeoffs-1",
    category: "WRITE_OFFS",
    title: "Меньше выбрасываем хлеб",
    title_en: "Less bakery thrown away",
    description:
      "AI заметил по остаткам и приёмкам, что хлеб в среднем залёживается на 1.5 дня больше нормы. Списания сейчас 3.8% — при норме 2.5%. Цель — 2.5% за 2 недели.",
    description_en:
      "AI saw on stock + receipts that bakery sits on shelves 1.5 days past target. Write-offs at 3.8% vs 2.5% norm. Goal: 2.5% in 2 weeks.",
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
    ai_signal_source: "erp-stock",
    ai_detection_method:
      "AI сопоставляет приёмки → остатки → продажи на 14-дневном окне и считает avg shelf-time на SKU vs срок годности. Если shelf-time > 70% срока годности — выдвигает goal на снижение списаний.",
    ai_detection_method_en:
      "AI joins receipts → stock → sales over 14d and computes avg shelf-time per SKU vs expiry. shelf-time > 70% of expiry triggers a write-off-reduction goal.",
    ai_evidence: [
      {
        source: "erp-stock",
        summary:
          "Хлеб «Бородинский 700г» в среднем 1д 12ч на полке при сроке годности 3д (40 магазинов)",
        summary_en:
          "‘Borodinsky 700g’ avg 1d 12h on shelf vs 3d expiry (40 stores)",
        observed_from: "2026-04-15",
        observed_to: "2026-04-29",
        scope_hint: "SKU 230111 / Хлебобулочка / 40 магазинов",
        scope_hint_en: "SKU 230111 / Bakery / 40 stores",
      },
      {
        source: "pos-cheque",
        summary:
          "Продажи хлеба после 19:00 падают на 60% — backroom не успевает вынести fresh",
        summary_en:
          "Bakery sales drop 60% after 19:00 — backroom can't keep up",
        observed_from: "2026-04-15",
        observed_to: "2026-04-29",
        scope_hint: "Хлебобулочка / вечерние пики",
        scope_hint_en: "Bakery / evening peaks",
      },
    ],
    money_impact: {
      amount: 450_000,
      period: "week",
      impact_type: "money",
      rationale_short: "−1.3 п.п. списаний хлеба ≈ −450 000 ₽/нед",
      rationale_short_en: "−1.3 pp bakery write-offs ≈ −450,000 ₽/week saved",
      rationale_breakdown: [
        "Хлеб = 6% выручки сети (Cybake bakery norm)",
        "Снижение списаний с 3.8% до 2.5% = 1.3 п.п. от категорийной выручки",
        "Свежий хлеб = +30% защиты маржи (нельзя восстановить как сухой)",
        "1.3% × 6% × 480 млн ₽/нед × 78% себестоимости × 65% × 1.3 fresh-bonus ≈ 450 000 ₽/нед",
      ],
      rationale_breakdown_en: [
        "Bakery = 6% network revenue (Cybake bakery norm)",
        "Cutting write-offs from 3.8% to 2.5% frees 1.3pp of category revenue",
        "Fresh bakery = +30% margin protection (can't be restored like ambient)",
        "1.3% × 6% × 480M ₽/week × 78% COGS × 65% × 1.3 fresh-bonus ≈ 450,000 ₽/week",
      ],
    },
  },
  {
    id: "goal-promo-1",
    category: "PROMO_QUALITY",
    title: "Промо-выкладка по стандарту",
    title_en: "Promo display by the book",
    description:
      "AI выявил по фото от Ивановой М.А. (5 мая, 09:15, эндкэп Г-1) и сравнению с benchmark group по чекам, что промо-выкладка отклоняется от стандарта на 42%. Цель — 15% к концу мая.",
    description_en:
      "AI detected via photo from M.A. Ivanova (May 5, 09:15, end-cap G-1) and POS benchmark-group comparison: promo deviates 42% from standard. Goal: 15% by end of May.",
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
    ai_signal_source: "mixed",
    ai_detection_method:
      "AI комбинирует две метрики: (1) CV-распознавание фото эндкэпа от сотрудника vs эталонная планограмма; (2) POS lift-comparison промо-SKU магазина vs benchmark группа. Совпадение detection > 0.7 = problem confirmed.",
    ai_detection_method_en:
      "AI combines two signals: (1) CV-recognised end-cap photo vs reference planogram; (2) POS lift-comparison of promo-SKU vs benchmark group. Detection match > 0.7 = problem confirmed.",
    ai_evidence: [
      {
        source: "photo-bonus",
        summary:
          "Иванова М.А. сняла фото эндкэпа в 09:15 — CV нашёл 8 из 14 SKU не на местах vs планограмма",
        summary_en:
          "M.A. Ivanova snapped end-cap photo at 09:15 — CV found 8 of 14 SKUs misplaced vs planogram",
        observed_from: "2026-05-05T09:15:00+07:00",
        scope_hint: "Эндкэп зона G-1 / Промо-выкладка май",
        scope_hint_en: "End-cap zone G-1 / May promo display",
        photo_url: "/mock-photos/g1-endcap-2026-05-05.jpg",
        photo_taken_by: "Иванова Мария Александровна",
        photo_taken_at: "2026-05-05T09:15:00+07:00",
      },
      {
        source: "pos-cheque",
        summary:
          "Продажи 8 промо-SKU в Г-1 на 27 п.п. ниже benchmark group (хайперы того же формата)",
        summary_en:
          "Sales of 8 promo SKUs in G-1 are 27pp below benchmark group (same-format hypers)",
        observed_from: "2026-04-29",
        observed_to: "2026-05-05",
        scope_hint: "8 промо-SKU / Г-1 Котовского / эндкэп",
        scope_hint_en: "8 promo SKUs / G-1 Kotovskogo / end-cap",
      },
    ],
    money_impact: {
      amount: 260_000,
      period: "month",
      impact_type: "money",
      rationale_short: "Промо по стандарту ≈ +260 000 ₽/мес конверсии",
      rationale_short_en: "On-standard promo ≈ +260,000 ₽/month conversion",
      rationale_breakdown: [
        "Гипер-store промо-зона = 15% × 18 млн ₽/мес = 2.7 млн ₽/мес",
        "Nielsen: каждый 1 п.п. compliance = +0.7% sales lift",
        "27 п.п. × 0.7% × 2.7 млн × 65% атрибуции ≈ 260 000 ₽/мес",
        "Сейчас в Г-1 Котовского 58% compliance, у лидеров — 91% (Nielsen 2024)",
      ],
      rationale_breakdown_en: [
        "Hyper-store promo zone = 15% × 18M ₽/mo = 2.7M ₽/mo",
        "Nielsen: each 1pp compliance = +0.7% lift",
        "27pp × 0.7% × 2.7M × 65% attribution ≈ 260,000 ₽/month",
        "G-1 Kotovskogo compliance 58%; leaders 91% (Nielsen 2024)",
      ],
    },
  },
  {
    id: "goal-price-1",
    category: "PRICE_ACCURACY",
    title: "Ноль ошибок в ценниках на алкоголь",
    title_en: "Zero alcohol price-tag mismatches",
    description:
      "AI выявил по сверке ERP master-цен с пробитыми ценами на чеках, что 7 SKU в алкогольной зоне расходятся (полка vs касса). Цель — 0 расхождений.",
    description_en:
      "AI found 7 alcohol SKUs where ERP master price ≠ POS receipt price (shelf vs checkout). Goal: zero mismatches.",
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
    ai_signal_source: "erp-price-master",
    ai_detection_method:
      "AI ежечасно сравнивает ERP master price с ценой на чеке после первой продажи каждого SKU. Mismatch = ценник на полке устарел и/или БД cash-системы не обновилась.",
    ai_detection_method_en:
      "AI hourly compares ERP master price vs POS receipt price after first sale per SKU. Mismatch = shelf tag outdated and/or cash-system DB not updated.",
    ai_evidence: [
      {
        source: "erp-price-master",
        summary:
          "Водка «Зимняя дорога 0.5л»: ERP master 369 ₽, на чеке пробивается 415 ₽ — 9 расхождений",
        summary_en:
          "‘Zimnyaya doroga 0.5L’ vodka: ERP master 369 ₽, POS rings 415 ₽ — 9 mismatches",
        observed_from: "2026-04-22",
        observed_to: "2026-04-25",
        scope_hint: "SKU 408712 / Алкоголь / СПАР Томск Ленина 80",
        scope_hint_en: "SKU 408712 / Alcohol / SPAR Tomsk Lenina 80",
      },
    ],
    money_impact: {
      amount: 75_000,
      period: "month",
      impact_type: "money",
      rationale_short: "Без ошибок в ценниках ≈ −75 000 ₽/мес",
      rationale_short_en: "No price-tag errors ≈ −75,000 ₽/month",
      rationale_breakdown: [
        "Каждая жалоба на ценник = ~5 400 ₽ компенсации (чек + сертификат лояльности)",
        "7 жалоб × 5 400 ₽ = 37 800 ₽ прямой экономии",
        "Wiser: каждый неверный ценник = 6% продаж SKU теряются за неделю",
        "+ потери продаж по 7 SKU за 4 недели на 25B-baseline ≈ 75 000 ₽/мес итого",
      ],
      rationale_breakdown_en: [
        "Each price complaint = ~5,400 ₽ (refund + voucher)",
        "7 complaints × 5,400 ₽ = 37,800 ₽ direct savings",
        "Wiser: every wrong tag loses 6% SKU sales/week",
        "+ sales-loss across 7 SKUs over 4 weeks on 25B baseline ≈ 75,000 ₽/month",
      ],
    },
  },
  {
    id: "goal-productivity-1",
    category: "PRODUCTIVITY",
    title: "Больше задач за смену в СПАР Новосибирск",
    title_en: "More tasks per shift at SPAR Novosibirsk",
    description:
      "AI заметил по WFM-телеметрии, что в магазине закрывается 82.6% задач при пиковом traffic'е недостаточное coverage. Цель — 88% к концу мая.",
    description_en:
      "AI saw on WFM telemetry that the store closes 82.6% of tasks while peak-traffic coverage is insufficient. Goal: 88% by end of May.",
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
    ai_signal_source: "wfm-schedule",
    ai_detection_method:
      "AI сопоставляет график смен с почасовым traffic'ом по чекам — flag'ает часы где coverage <0.7×traffic; находит избыток на спадах и недобор на пиках.",
    ai_detection_method_en:
      "AI matches shift schedule against hourly POS traffic — flags hours where coverage <0.7× traffic; finds overage on dips, shortage on peaks.",
    ai_evidence: [
      {
        source: "wfm-schedule",
        summary:
          "Закрытие задач 82.6% при apr-baseline'е сети 89.4% — discrepancy 6.8 п.п.",
        summary_en:
          "Task closure 82.6% vs network apr-baseline 89.4% — discrepancy 6.8pp",
        observed_from: "2026-04-01",
        observed_to: "2026-04-30",
        scope_hint: "СПАР Новосибирск, ул. Ленина 55",
        scope_hint_en: "SPAR Novosibirsk, Lenina 55",
      },
      {
        source: "pos-cheque",
        summary:
          "Пиковый traffic 17:00-19:00 покрыт 60% от нормы — 4 кассира при норме 6",
        summary_en:
          "Peak traffic 17:00-19:00 covered at 60% of norm — 4 cashiers vs 6",
        scope_hint: "Кассовая зона / будни 17-19",
        scope_hint_en: "Cash zone / weekdays 17-19",
      },
    ],
    money_impact: {
      amount: 128_000,
      period: "month",
      impact_type: "money",
      rationale_short: "+5.4 п.п. выполнения ≈ +128 000 ₽/мес",
      rationale_short_en: "+5.4 pp completion ≈ +128,000 ₽/month",
      rationale_breakdown: [
        "+5.4 п.п. выполнения = ~46 человеко-часов экономии в месяц",
        "Полная стоимость часа сотрудника = 350 ₽ (с ФОТ-нагрузкой 2026)",
        "46 ч × 350 ₽ = 16 100 ₽ прямая экономия",
        "+ продуктивность смены: BLS 2024 даёт +0.6% от ФОТ на каждый п.п. выполнения",
        "На 25B-baseline (480M ₽/нед) и hyper-store эффект ≈ 128 000 ₽/мес",
      ],
      rationale_breakdown_en: [
        "+5.4pp completion = ~46 person-hours saved/month",
        "Fully-loaded hour = 350 ₽ (RU 2026)",
        "46h × 350 ₽ = 16,100 ₽ direct savings",
        "+ BLS 2024: +0.6% labor uplift per pp completion",
        "On 25B baseline (480M ₽/week) for a hyper-store ≈ 128,000 ₽/month",
      ],
    },
  },
  {
    id: "goal-oos-completed",
    category: "OOS_REDUCTION",
    title: "Меньше пустых полок в заморозке",
    title_en: "Fewer empty frozen shelves",
    description:
      "Завершено: пустые полки в заморозке снизились с 8.1% до 4.7%. Цель была 5%. Главным сигналом стали фото от мерчендайзеров через бонус-задачи (CV-анализ).",
    description_en:
      "Completed: empty frozen shelves dropped from 8.1% to 4.7% (target 5%). Key signal: merchandiser bonus-task photos analysed by CV.",
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
    ai_signal_source: "photo-bonus",
    ai_detection_method:
      "AI генерирует бонус-задачи «сфоткай витрину Заморозки в утренний slot» 3 раза в неделю по сети; CV модель прогоняет фото и flag'ает пустые ячейки vs планограмма (Goodschecker accuracy 95%, Магнит pilot 98%).",
    ai_detection_method_en:
      "AI issues bonus tasks ‘snap frozen display in AM slot’ 3×/week network-wide; CV scans photos for empty cells vs planogram (Goodschecker 95% accuracy, Magnit pilot 98%).",
    ai_evidence: [
      {
        source: "photo-bonus",
        summary:
          "Соколова Н.И. сняла фото витрины «Заморозка-3» в 08:42 — CV нашёл 12 пустых ячеек (баклажаны, креветки)",
        summary_en:
          "N.I. Sokolova snapped frozen-3 display at 08:42 — CV found 12 empty cells (eggplant, shrimp)",
        observed_from: "2026-04-15T08:42:00+07:00",
        scope_hint: "Заморозка / категория овощи+морепродукты / 1 магазин",
        scope_hint_en: "Frozen / vegetables+seafood / 1 store",
        photo_url: "/mock-photos/frozen-display-2026-04-15.jpg",
        photo_taken_by: "Соколова Наталья Игоревна",
        photo_taken_at: "2026-04-15T08:42:00+07:00",
      },
      {
        source: "pos-cheque",
        summary:
          "Доступность заморозки выросла с 91.9% до 95.3% за 4 недели — потерь продаж на ~12 млн ₽/мес меньше",
        summary_en:
          "Frozen availability rose 91.9% → 95.3% over 4 weeks — ~12M ₽/month fewer lost sales",
        observed_from: "2026-04-01",
        observed_to: "2026-04-28",
        scope_hint: "Заморозка / вся сеть",
        scope_hint_en: "Frozen / network-wide",
      },
    ],
    money_impact: {
      amount: 2_800_000,
      period: "month",
      impact_type: "money",
      rationale_short: "−3.4 п.п. в заморозке ≈ +2.8 млн ₽/мес",
      rationale_short_en: "−3.4 pp frozen OOS ≈ +2.8M ₽/month",
      rationale_breakdown: [
        "Заморозка = 12% выручки сети (≈ 2.5 млрд ₽/мес на 25B baseline)",
        "1 п.п. пустых полок = 4% потерянных продаж в категории (Gruen/Corsten 2002)",
        "Цель перевыполнена: 4.7% < 5%, поэтому возврат продаж выше планового 22%",
        "3.4 п.п. × 4% × 12% × 2.5 млрд × 50% × 20% возврата ≈ 2.8 млн ₽/мес",
      ],
      rationale_breakdown_en: [
        "Frozen = 12% of network revenue (≈ 2.5B ₽/month on 25B baseline)",
        "1pp empty shelf = 4% lost category sales (Gruen/Corsten 2002)",
        "Goal overshot (4.7% < 5%), so recapture above 22%",
        "3.4pp × 4% × 12% × 2.5B × 50% × 20% recapture ≈ 2.8M ₽/month",
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
  /** EN-перевод заголовка задачи для билингв-демо. */
  title_en?: string;
  description: string;
  /** EN-перевод описания задачи для билингв-демо. */
  description_en?: string;
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
    title_en: "Urgent dairy restock — fridge 5",
    description: "OOS молочки в холодильнике 5 превысил норму. Выполнить доукладку и обновить ценники до 13:00.",
    description_en:
      "Dairy OOS in fridge 5 has exceeded the target. Restock and refresh price tags before 13:00.",
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
    title_en: "Perishables check in the dairy section",
    description: "Внеплановый обход холодильников 1–4, изъятие товаров с остатком срока ≤1 день, фотофиксация.",
    description_en:
      "Unplanned walk-through of fridges 1–4: pull items with ≤1 day shelf life left and submit a photo report.",
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
    title_en: "Stock promo items after delivery",
    description: "Акционный товар «Майские хиты» прибыл. Срочная выкладка на выделенные позиции по промо-схеме.",
    description_en:
      "The “May Hits” promo shipment has arrived. Urgent stocking onto designated positions per the promo planogram.",
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
    title_en: "End-of-day Fresh-zone inventory",
    description: "Сверка остатков Fresh-зоны по системе после закрытия. Исправить расхождения до начала ночной приёмки.",
    description_en:
      "Reconcile Fresh-zone stock against the system after close. Fix discrepancies before the night receiving shift starts.",
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
    title_en: "Verify dairy price tags after morning delivery",
    description: "AI предлагает бонусную задачу в рамках цели OOS: убедиться что все ценники на молочке актуальны после приёмки.",
    description_en:
      "AI proposes this bonus task under the OOS goal: confirm every dairy price tag is up to date after the delivery.",
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
