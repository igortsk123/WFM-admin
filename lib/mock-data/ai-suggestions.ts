import type { AISuggestion } from "@/lib/types";

/**
 * @endpoint GET /api/ai/suggestions
 *
 * Реалистичный набор AI-предложений для демо клиенту.
 *
 * Каждое предложение собрано из плотных сигналов: остатки/выкладка,
 * продажи и пиковые часы, поставки, баланс штат/внештат, отклонения
 * у конкретных сотрудников, кросс-сетевые паттерны.
 *
 * Магазины и ФИО — из живой выгрузки LAMA (см. _lama-real.ts);
 * метрики (остатки, продажи, медианы) — правдоподобные плейсхолдеры
 * до интеграции с реальными источниками.
 */

const now = new Date("2026-05-07T10:00:00+07:00");
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) =>
  new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_AI_SUGGESTIONS: AISuggestion[] = [
  // ── PENDING / Сигнал «Остатки» (3) ─────────────────────────────────

  {
    id: "ai-sug-001",
    type: "TASK_SUGGESTION",
    title: "Остатки молочки в Г-1 Котовского ниже 20% — проверка сроков",
    title_en:
      "Dairy stock at G-1 Kotovskogo below 20% — check expiry dates",
    description:
      "Остатки молочной категории в магазине Г-1 Котовского 19/3 (ГМ) упали до 18% — впервые за 7 дней (предыдущий минимум 35%). Рекомендую внеплановую проверку сроков годности и переоценку.",
    description_en:
      "Dairy stock at G-1 Kotovskogo 19/3 (Hyper) has dropped to 18% — the first such reading in 7 days (previous low 35%). Recommend an unplanned expiry-date check plus repricing.",
    rationale:
      "Сигнал из системы остатков: уровень 18% на 06:30, тренд вниз 4 дня подряд (35% → 29% → 24% → 18%). Поставка следующая только в среду. До поставки риск истечения сроков по 12 SKU. Янович Алёна Сергеевна (медиана выкладки молочки 30 мин — на 25% быстрее коллег по смене) выходит сегодня в 08:00, идеально подходит для задачи.",
    rationale_en:
      "Signal from the stock system: 18% at 06:30, declining 4 days in a row (35% → 29% → 24% → 18%). Next delivery is not due until Wednesday. Until then, expiry risk on 12 SKUs. Yanovich Alyona Sergeevna (median dairy stocking time 30 min — 25% faster than shift peers) starts at 08:00 today, an ideal match for the task.",
    proposed_payload: {
      title: "Проверка сроков молочки + переоценка",
      type: "PLANNED",
      work_type_id: 11,
      work_type_name: "Контроль качества",
      store_id: 200,
      zone_id: 6,
      planned_minutes: 45,
      requires_photo: true,
      acceptance_policy: "MANUAL",
      time_start: "08:00:00",
      time_end: "08:45:00",
      suggested_assignee_id: 308,
      suggested_assignee_name: "Янович Алёна Сергеевна",
    },
    context_data: {
      anomaly_metric: "stock_dairy_pct",
      chart_data: {
        type: "line",
        label: "Остатки молочки, % (7 дней)",
        values: [62, 55, 48, 41, 35, 29, 18],
        norm: 35,
      },
      related_skus: [
        "Молоко Простоквашино 2.5% 930мл",
        "Кефир Большая Кружка 1%",
        "Творог зерненый 5% 200г",
      ],
    },
    status: "PENDING",
    priority: "high",
    target_object_type: "STORE",
    target_object_ids: [200],
    created_at: hoursAgo(2),
  },

  {
    id: "ai-sug-002",
    type: "TASK_SUGGESTION",
    title: "Доукладка алкоголя из подсобки — У-22 Коммунистический 143",
    title_en:
      "Restock spirits from back-room — U-22 Kommunisticheskiy 143",
    description:
      "Полочные остатки крепкого алкоголя ниже 30% по 18 позициям. На складе магазина — достаточный запас (4 паллеты после поставки в пятницу). Доукладка восстановит ассортимент.",
    description_en:
      "Shelf stock of spirits is below 30% across 18 SKUs. The store back-room has plenty of inventory (4 pallets from Friday's delivery). Restocking will restore the assortment.",
    rationale:
      "Сигнал из остатков по полке + складу: на полке OOS 18 SKU, на складе остаток 220 единиц. Без доукладки до открытия в субботу потеря выручки оценивается в 28–32 тыс. ₽. Подходит Куренков Иван Сергеевич — есть допуск к крепкому алкоголю и опыт работы с этой категорией (медиана 22 мин на палет).",
    rationale_en:
      "Signal from shelf + back-room stock: 18 SKUs OOS on the shelf, 220 units in the back-room. Without restocking before Saturday's opening, the revenue hit is estimated at 28–32 K ₽. Kurenkov Ivan Sergeevich is a strong fit — he holds spirits clearance and has experience in this category (median 22 min per pallet).",
    proposed_payload: {
      title: "Доукладка крепкого алкоголя из подсобки",
      type: "PLANNED",
      work_type_id: 4,
      work_type_name: "Выкладка",
      store_id: 207,
      zone_id: 1,
      product_category_name: "Алкоголь крепкий",
      planned_minutes: 50,
      requires_photo: true,
      acceptance_policy: "MANUAL",
      time_start: "07:30:00",
      time_end: "08:20:00",
      suggested_assignee_id: 303,
      suggested_assignee_name: "Куренков Иван Сергеевич",
    },
    context_data: {
      anomaly_metric: "alcohol_shelf_oos_count",
      chart_data: {
        type: "bar",
        label: "OOS по крепкому алкоголю, SKU",
        values: [4, 6, 9, 11, 14, 16, 18],
        norm: 5,
      },
      related_skus: [
        "Водка Хортица 0.5",
        "Коньяк Старый Кёнигсберг 5* 0.5",
        "Виски Bell's 0.7",
      ],
    },
    status: "PENDING",
    priority: "high",
    target_object_type: "STORE",
    target_object_ids: [207],
    created_at: hoursAgo(3),
  },

  {
    id: "ai-sug-003",
    type: "TASK_SUGGESTION",
    title: "Уценка хлеба к закрытию в У-05 Лазарева 1",
    title_en: "Mark down bread before close at U-05 Lazareva 1",
    description:
      "За час до закрытия в зале остаётся 47% дневной выпечки против норматива 15%. Без уценки риск списания на 9 800 ₽.",
    description_en:
      "An hour before close, 47% of the day's bakery is still on the floor versus a 15% target. Without a markdown there is a 9,800 ₽ write-off risk.",
    rationale:
      "Сигнал из POS: продажи хлебобулочки сегодня –22% относительно медианы среды. Завоз был стандартный, поэтому остатки выше нормы. Уценка 30% к 21:00 по статистике распродаёт 70% остатка за час и снижает списания в 4 раза.",
    rationale_en:
      "POS signal: today's bakery sales are −22% versus a typical Wednesday. The delivery was standard, so the surplus is supply-side. A 30% markdown at 21:00 historically sells 70% of the surplus within an hour and cuts write-offs by a factor of 4.",
    proposed_payload: {
      title: "Уценка хлеба и выпечки к закрытию",
      type: "PLANNED",
      work_type_id: 5,
      work_type_name: "Переоценка",
      store_id: 209,
      zone_id: 1,
      planned_minutes: 20,
      requires_photo: false,
      acceptance_policy: "MANUAL",
      time_start: "21:00:00",
      time_end: "21:20:00",
      discount_percent: 30,
    },
    context_data: {
      anomaly_metric: "bread_end_of_day_remainder_pct",
      chart_data: {
        type: "line",
        label: "Остаток хлеба на конец дня, % от завоза",
        values: [18, 21, 32, 28, 41, 44, 47],
        norm: 15,
      },
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE",
    target_object_ids: [209],
    created_at: hoursAgo(5),
  },

  // ── PENDING / Сигнал «Продажи и пиковые часы» (3) ─────────────────

  {
    id: "ai-sug-004",
    type: "TASK_SUGGESTION",
    title: "Дополнительный КСО в субботу — У-20 Вокзальная 41",
    title_en: "Extra self-checkout on Saturday — U-20 Vokzalnaya 41",
    description:
      "Продажи в зоне «Касса» в субботу выросли на 18% относительно медианы недели. На пиковых часах 14:00–18:00 прогнозируется очередь >6 человек. Рекомендую вывести дополнительного кассира на КСО.",
    description_en:
      "Saturday checkout-zone sales are up 18% versus the week's median. During the 14:00–18:00 peak the forecast queue is >6 customers. Recommend bringing a second cashier onto the self-checkout line.",
    rationale:
      "Сигнал из POS: суббота 03 мая — +18% к медиане субботы (рост связан с акцией ВкусВилл по соседству). Норматив очереди — не более 4 человек. Свободен Ситдиков Азиз Хамидович (ставка 0.75, текущая загрузка 4.2 ч из 6 в субботу), есть допуск к КСО.",
    rationale_en:
      "POS signal: Saturday May 3 was +18% above the Saturday median (boosted by a neighbouring VkusVill promo). The queue target is no more than 4 customers. Sitdikov Aziz Khamidovich is available (0.75 FTE, currently 4.2 of 6 hours booked on Saturday) and holds self-checkout clearance.",
    proposed_payload: {
      title: "Доп.смена на КСО в субботу 14:00–18:00",
      type: "PLANNED",
      work_type_id: 14,
      work_type_name: "Касса",
      store_id: 205,
      zone_id: 2,
      planned_minutes: 240,
      requires_photo: false,
      acceptance_policy: "MANUAL",
      time_start: "14:00:00",
      time_end: "18:00:00",
      suggested_assignee_id: 354,
      suggested_assignee_name: "Акименко Алексей Андреевич",
    },
    context_data: {
      anomaly_metric: "saturday_sales_growth_pct",
      chart_data: {
        type: "bar",
        label: "Продажи в зоне Касса, тыс. ₽ по часам субботы",
        values: [18, 22, 31, 44, 58, 67, 71, 64, 48, 32, 24, 18],
        norm: 50,
      },
    },
    status: "PENDING",
    priority: "high",
    target_object_type: "STORE",
    target_object_ids: [205],
    created_at: hoursAgo(4),
  },

  {
    id: "ai-sug-005",
    type: "TASK_SUGGESTION",
    title: "Усилить выкладку фреш-1 утром в Г-2 Беринга 10",
    title_en: "Boost fresh-1 morning stocking at G-2 Beringa 10",
    description:
      "Продажи фруктов и овощей в утреннее окно 09:00–12:00 за неделю выросли на 14%. Текущий график выкладки заканчивает зону к 09:30 — задерживается реакция на «утренний» спрос.",
    description_en:
      "Fruit and vegetable sales in the 09:00–12:00 morning window are up 14% week-on-week. The current stocking schedule wraps fresh-1 by 09:30, lagging behind morning demand.",
    rationale:
      "Сигнал из POS + сценарий выкладки: рост продаж +14% в окне 9–12, но завершение выкладки фреш-1 — 09:30. Сдвиг старта на 07:30 даст полную полку к открытию в 08:00. Подходит Орлова Ирина Юрьевна (медиана выкладки фреш 25 мин на стеллаж — лучший показатель в магазине).",
    rationale_en:
      "Signal from POS + stocking schedule: sales +14% in the 09–12 window, but fresh-1 stocking only finishes at 09:30. Shifting the start to 07:30 yields a full shelf by the 08:00 opening. Orlova Irina Yurievna is a fit (median fresh stocking 25 min per rack — best in the store).",
    proposed_payload: {
      title: "Раннее открытие выкладки фреш-1 (07:30)",
      type: "PLANNED",
      work_type_id: 4,
      work_type_name: "Выкладка",
      store_id: 201,
      zone_id: 1,
      planned_minutes: 90,
      requires_photo: true,
      acceptance_policy: "MANUAL",
      time_start: "07:30:00",
      time_end: "09:00:00",
      suggested_assignee_id: 330,
      suggested_assignee_name: "Орлова Ирина Юрьевна",
    },
    context_data: {
      anomaly_metric: "fresh_morning_sales_growth_pct",
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE",
    target_object_ids: [201],
    created_at: hoursAgo(7),
  },

  {
    id: "ai-sug-006",
    type: "INSIGHT",
    title: "Снеки в У-03 Фрунзе 120 — рост продаж +9% четвёртую неделю",
    title_en:
      "Snacks at U-03 Frunze 120 — sales up +9% for the fourth week",
    description:
      "Категория «Снеки» показывает устойчивый рост в У-03 Фрунзе 120 (Новосибирск). Похоже, эффект от перестановки полки в марте сохраняется.",
    description_en:
      "The Snacks category shows steady growth at U-03 Frunze 120 (Novosibirsk). The shelf rearrangement effect from March seems to be holding.",
    rationale:
      "Сигнал из POS: рост по категории четвёртую неделю подряд (+9.4% к среднему за квартал). Норматив завоза не пересматривался. Рекомендую увеличить плановый завоз на 8–10% и поставить задачу выкладки на ежедневной основе вместо текущей через день.",
    rationale_en:
      "POS signal: category growth for the fourth week running (+9.4% versus the quarterly average). The replenishment baseline has not been revised. Recommend raising planned replenishment by 8–10% and switching stocking from every-other-day to daily.",
    proposed_payload: {},
    context_data: {
      anomaly_metric: "snacks_sales_growth_pct",
      chart_data: {
        type: "bar",
        label: "Рост продаж снеков по неделям, %",
        values: [9.1, 9.3, 9.4, 9.4],
      },
    },
    status: "PENDING",
    priority: "low",
    target_object_type: "STORE",
    target_object_ids: [211],
    created_at: hoursAgo(9),
  },

  // ── PENDING / Сигнал «Поставки» (2) ────────────────────────────────

  {
    id: "ai-sug-007",
    type: "TASK_SUGGESTION",
    title: "Приёмка алкогольной поставки завтра 09:30 — У-05 Лазарева 1",
    title_en:
      "Receive spirits delivery tomorrow at 09:30 — U-05 Lazareva 1",
    description:
      "Завтра в 09:30 ожидается поставка крепкого алкоголя (4 паллеты, ~280 SKU). Рекомендую назначить приёмку и выкладку с 09:00 до 12:00.",
    description_en:
      "A spirits shipment (4 pallets, ~280 SKUs) is expected tomorrow at 09:30. Recommend scheduling receiving and stocking from 09:00 to 12:00.",
    rationale:
      "Сигнал из расписания поставок: завтра 09:30 — алкоголь, поставщик «АлкоГрупп», 4 паллеты. Параллельно нужно сверить ЕГАИС в течение 4 часов. Подходит Алмаз Юлианна Владимировна (медиана приёмки 22 мин на палет, есть допуск к ЕГАИС). Время выполнения — 2.5 ч (приёмка 1.5 + выкладка фреш-1 1.0).",
    rationale_en:
      "Delivery schedule signal: tomorrow 09:30 — spirits from supplier AlcoGroup, 4 pallets. The EGAIS reconciliation must be completed within 4 hours. Almaz Yulianna Vladimirovna is a fit (median receiving time 22 min per pallet, holds EGAIS clearance). Total effort 2.5 h (receiving 1.5 + fresh-1 stocking 1.0).",
    proposed_payload: {
      title: "Приёмка + выкладка алкогольной поставки",
      type: "PLANNED",
      work_type_id: 13,
      work_type_name: "Приёмка",
      store_id: 209,
      zone_id: 5,
      planned_minutes: 150,
      requires_photo: true,
      acceptance_policy: "MANUAL",
      time_start: "09:00:00",
      time_end: "11:30:00",
      suggested_assignee_id: 322,
      suggested_assignee_name: "Лебединская Анна Александровна",
    },
    context_data: {
      anomaly_metric: "incoming_delivery_alcohol",
      related_skus: ["Поставка АлкоГрупп №АЛ-2026-05-08", "4 паллеты"],
    },
    status: "PENDING",
    priority: "high",
    target_object_type: "STORE",
    target_object_ids: [209],
    created_at: hoursAgo(1),
  },

  {
    id: "ai-sug-008",
    type: "TASK_SUGGESTION",
    title: "Сверка ЕГАИС после вчерашней поставки — С-5 Академический 13",
    title_en:
      "Reconcile EGAIS after yesterday's delivery — S-5 Akademichesky 13",
    description:
      "Вчерашняя алкогольная поставка принята, но ЕГАИС-документы не подтверждены. До вечерней продажи (от 22:00 ограничение) — 6 часов. Риск штрафа.",
    description_en:
      "Yesterday's spirits shipment was received but the EGAIS documents have not been confirmed. Six hours remain before the 22:00 sales restriction kicks in. There is a fine risk.",
    rationale:
      "Сигнал из системы документооборота: поставка №АЛ-2026-05-06 принята в 14:40 (06 мая), документы ЕГАИС не подтверждены — превышен норматив 4 часа. Если не подтвердить до 22:00 — продажа алкоголя блокируется. Задача быстрая (15 мин), но критична.",
    rationale_en:
      "Document-flow signal: shipment AL-2026-05-06 was received at 14:40 on May 6, EGAIS documents are still unconfirmed — past the 4-hour SLA. If not confirmed by 22:00, alcohol sales are blocked. The task is quick (15 min) but critical.",
    proposed_payload: {
      title: "Подтвердить ЕГАИС по поставке от 06 мая",
      type: "PLANNED",
      work_type_id: 13,
      work_type_name: "Приёмка",
      store_id: 212,
      zone_id: 5,
      planned_minutes: 15,
      requires_photo: false,
      acceptance_policy: "MANUAL",
      time_start: "16:00:00",
      time_end: "16:15:00",
    },
    context_data: {
      anomaly_metric: "egais_pending_hours",
      chart_data: {
        type: "single_value",
        label: "Часов без подтверждения ЕГАИС",
        value: 25,
        norm: 4,
      },
    },
    status: "PENDING",
    priority: "high",
    target_object_type: "STORE",
    target_object_ids: [212],
    created_at: hoursAgo(1),
  },

  // ── PENDING / Сигнал «Баланс штат vs внештат» (2) ─────────────────

  {
    id: "ai-sug-009",
    type: "INSIGHT",
    title: "У-17 Бела Куна 26/1 — внештат закрыл 23% часов недели",
    title_en:
      "U-17 Bela Kuna 26/1 — freelancers covered 23% of weekly hours",
    description:
      "На неделе 28 апр – 04 мая внештатные сотрудники закрыли 23% рабочих часов (норматив ≤15%). Среди штата есть недозагруженные.",
    description_en:
      "During the week of Apr 28 – May 4, freelancers covered 23% of working hours (target ≤15%). Several staff employees are under-utilised.",
    rationale:
      "Сигнал из табеля + графика смен: 23% часов недели — внештат (норма ≤15%, превышение 8 п.п.). Среди штата Гринкевич Наталья Александровна работает 4 дня по 0.75 ставки и недогружена на 2 ч/день. Если переключить 2 задачи переоценки и инвентаризации с внештата на неё — экономия ~1 800 ₽/день, или ~9 000 ₽ за рабочую неделю.",
    rationale_en:
      "Timesheet + shift-plan signal: 23% of the week's hours went to freelancers (target ≤15%, 8 pp over). On staff, Grinkevich Natalia Alexandrovna works 4 days at 0.75 FTE and is 2 h/day under-loaded. Moving 2 repricing and inventory tasks from freelance to her saves ~1,800 ₽/day, or ~9,000 ₽ per working week.",
    proposed_payload: {},
    context_data: {
      anomaly_metric: "freelance_hours_share_pct",
      chart_data: {
        type: "bar",
        label: "Доля внештата по неделям, %",
        values: [12, 14, 13, 15, 18, 21, 23],
        norm: 15,
      },
    },
    status: "PENDING",
    priority: "high",
    target_object_type: "STORE",
    target_object_ids: [215],
    created_at: hoursAgo(11),
  },

  {
    id: "ai-sug-010",
    type: "TASK_SUGGESTION",
    title: "Догрузить штатного сотрудника — У-17 Бела Куна 26/1",
    title_en:
      "Top up a staff employee's load — U-17 Bela Kuna 26/1",
    description:
      "Перевести 2 задачи переоценки с внештата на Гринкевич Н. А. в среду и пятницу — выровняет загрузку и снизит расходы.",
    description_en:
      "Move 2 repricing tasks from freelance to Grinkevich N. A. on Wednesday and Friday — this evens out the load and lowers costs.",
    rationale:
      "Дополняет инсайт по балансу внештат/штат: Гринкевич Н. А. имеет допуск «Переоценка», сейчас занята 4.5 из 6 ч в среду. Свободное окно 13:00–15:00 покрывает 2 задачи. Внештатник за тот же объём получает 2 × 900 ₽ = 1 800 ₽, штат — уже оплачено по графику.",
    rationale_en:
      "Complements the freelance/staff balance insight: Grinkevich N. A. holds the Repricing clearance and is booked 4.5 of 6 hours on Wednesday. Her 13:00–15:00 free window covers both tasks. A freelancer would cost 2 × 900 ₽ = 1,800 ₽ for the same volume, while staff hours are already paid through the roster.",
    proposed_payload: {
      title: "Переоценка зоны бакалея + молочка",
      type: "PLANNED",
      work_type_id: 5,
      work_type_name: "Переоценка",
      store_id: 215,
      zone_id: 1,
      planned_minutes: 120,
      requires_photo: false,
      acceptance_policy: "MANUAL",
      time_start: "13:00:00",
      time_end: "15:00:00",
      suggested_assignee_id: 311,
      suggested_assignee_name: "Гринкевич Наталья Александровна",
    },
    context_data: {
      anomaly_metric: "underloaded_staff_hours",
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE",
    target_object_ids: [215],
    created_at: hoursAgo(11),
  },

  // ── PENDING / Сигнал «Эффективность сотрудника» (2) ───────────────

  {
    id: "ai-sug-011",
    type: "INSIGHT",
    title: "Романенко Т. И. — доля одобренных задач упала с 92% до 64%",
    title_en:
      "Romanenko T. I. — task approval rate dropped from 92% to 64%",
    description:
      "За последние 3 дня доля одобренных задач у Романенко Татьяны Ивановны снизилась с 92% до 64% при пороге 70%. Возможна перегрузка или проблема с обучением.",
    description_en:
      "Over the last 3 days, Romanenko Tatiana Ivanovna's approval rate fell from 92% to 64% against a 70% threshold. Possible overload or training gap.",
    rationale:
      "Сигнал из системы проверки: 5 дней назад сотрудник переключён на новую операцию «КСО» (раньше работала на выкладке фреш-1). Падение качества совпадает по дате. Рекомендую назначить наставник-сессию с управляющим или временно снизить нагрузку на 1 задачу/смена до 70% доли одобрения.",
    rationale_en:
      "Review-system signal: 5 days ago she was reassigned to the self-checkout operation (previously worked on fresh-1 stocking). The quality drop lines up with that date. Recommend scheduling a mentor session with the store manager or temporarily reducing her load by 1 task/shift until the approval rate is back at 70%.",
    proposed_payload: {},
    context_data: {
      anomaly_metric: "approval_rate_drop_pct",
      chart_data: {
        type: "line",
        label: "Доля одобренных задач, %",
        values: [92, 91, 88, 82, 74, 68, 64],
        norm: 70,
      },
    },
    status: "PENDING",
    priority: "high",
    target_object_type: "STORE",
    target_object_ids: [205],
    created_at: hoursAgo(6),
  },

  {
    id: "ai-sug-012",
    type: "BONUS_TASK_SUGGESTION",
    title: "Бонус: наставник-сессия для Романенко Т. И.",
    title_en: "Bonus: mentor session for Romanenko T. I.",
    description:
      "Бонусная задача для управляющего магазином — провести 30-минутный разбор операций КСО с Романенко Т. И. 250 баллов.",
    description_en:
      "Bonus task for the store manager — run a 30-minute self-checkout walkthrough with Romanenko T. I. Worth 250 points.",
    rationale:
      "Связано с инсайтом про падение доли одобренных задач. Раннее обучение быстрее восстановит показатели и не даст потерять сотрудника. Управляющий У-20 Вокзальная — Каримова Виктория Владимировна, есть опыт обучения по КСО.",
    rationale_en:
      "Tied to the approval-rate-drop insight. Early coaching restores performance faster and reduces attrition risk. The U-20 Vokzalnaya manager Karimova Viktoria Vladimirovna has prior experience training on self-checkout.",
    proposed_payload: {
      title: "Наставник-сессия по КСО (30 мин)",
      type: "BONUS",
      bonus_points: 250,
      goal_id: "goal-quality-q2",
      work_type_id: 16,
      work_type_name: "Обучение",
      store_id: 205,
      planned_minutes: 30,
      suggested_assignee_id: 314,
      suggested_assignee_name: "Каримова Виктория Владимировна",
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE",
    target_object_ids: [205],
    created_at: hoursAgo(6),
  },

  // ── PENDING / Сигнал «Кросс-сетевой паттерн» (2) ──────────────────

  {
    id: "ai-sug-013",
    type: "INSIGHT",
    title: "Инвентаризация в 4 магазинах — на 30% дольше норматива",
    title_en: "Inventory at 4 stores runs 30% over target",
    description:
      "В магазинах 0033, 0034, 0036, 0042 (УФ-8 Иркутский 42, У-33 Киевская 109/1, У-24 Ленина 1а, УФ-10 Смирнова 38) задачи «Инвентаризация» выполняются на 30% дольше норматива четвёртую неделю. Возможно, норматив занижен.",
    description_en:
      "At stores 0033, 0034, 0036, 0042 (UF-8 Irkutsky 42, U-33 Kievskaya 109/1, U-24 Lenina 1a, UF-10 Smirnova 38) inventory tasks have run 30% over target for the fourth week. The target may be set too low.",
    rationale:
      "Сигнал из медиан выполнения: норматив инвентаризации — 60 мин, фактическая медиана по 4 магазинам — 78 мин (+30%). Все 4 магазина — формат «Универсам Фрунзе» с одинаковой схемой зала. Гипотезы: 1) норматив занижен и нужно пересмотреть на 75 мин; 2) персонал не освоил новую процедуру (запущена 28 апр). Рекомендую запустить корректирующую задачу «Обучение процедурам инвентаризации» по сети либо пересмотреть стандарт.",
    rationale_en:
      "Median-execution signal: inventory target is 60 min, the actual median across the 4 stores is 78 min (+30%). All four are the “Universam Frunze” format with the same floor layout. Hypotheses: (1) the target is too low and should move to 75 min; (2) staff haven't fully adopted the new procedure (rolled out Apr 28). Recommend either launching a network-wide “Inventory procedure training” task or revising the standard.",
    proposed_payload: {},
    context_data: {
      anomaly_metric: "inventory_duration_drift_pct",
      chart_data: {
        type: "bar",
        label: "Медиана инвентаризации, мин (4 магазина)",
        values: [78, 76, 81, 77],
        norm: 60,
      },
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE_LIST",
    target_object_ids: [232, 233, 235, 241],
    created_at: daysAgo(1),
  },

  {
    id: "ai-sug-014",
    type: "INSIGHT",
    title: "Промо-выкладка по средам в Г-1 и Г-2 — completion 67%",
    title_en:
      "Wednesday promo merchandising at G-1 and G-2 — 67% completion",
    description:
      "В двух гипермаркетах (Г-1 Котовского, Г-2 Беринга) системное падение исполнения промо-выкладки по средам — 67% против норматива 85%+.",
    description_en:
      "Across two hypermarkets (G-1 Kotovskogo, G-2 Beringa) Wednesday promo merchandising is systematically falling — 67% versus the 85%+ target.",
    rationale:
      "Сигнал из статистики выполнения: «Мерчендайзинг (планограммы)» по средам — 67% (за 4 недели). Совпадает со сменой графика старшего смены 07 апр. В остальные дни недели в этих же магазинах — 89% и 92%. Гипотеза: новый старший не закладывает время на промо в среду. Рекомендую пересмотреть график или усилить акцент в дневном инструктаже среды.",
    rationale_en:
      "Execution-stats signal: planogram merchandising on Wednesdays runs at 67% (4-week average). The drop coincides with the shift-leader rotation on Apr 7. Other weekdays at the same stores hold 89% and 92%. Hypothesis: the new shift leader is not budgeting time for Wednesday promo. Recommend reworking the schedule or emphasising promo in the Wednesday daily briefing.",
    proposed_payload: {},
    context_data: {
      anomaly_metric: "promo_merch_wednesday_completion_pct",
      chart_data: {
        type: "bar",
        label: "Completion промо-выкладки по дням недели, %",
        values: [89, 91, 67, 90, 92, 85, 78],
        norm: 85,
      },
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE_LIST",
    target_object_ids: [200, 201],
    created_at: daysAgo(2),
  },

  // ── PENDING / Сигнал «Цели и KPI» (2) ─────────────────────────────

  {
    id: "ai-sug-015",
    type: "GOAL_SUGGESTION",
    title: "Снизить OOS в категории молочки по сети до 4%",
    title_en: "Cut network-wide dairy OOS to 4%",
    description:
      "За апрель средний OOS молочки по сети составил 6.2% — на 55% выше нормы 4%. Тренд ухудшения 3 недели подряд. Рекомендую активировать сетевую цель.",
    description_en:
      "April network-wide dairy OOS averaged 6.2% — 55% above the 4% target. The trend has been worsening for 3 weeks. Recommend activating a network goal.",
    rationale:
      "Сигнал из агрегата по сети: OOS молочки 6.2% (норма 4%), ухудшение 3 недели подряд. По регионам: Томск 5.4%, Северск 6.8%, Новосибирск 6.5%. Сетевая цель сфокусирует бонусные задачи и доукладку. Прогноз: при достижении нормы — рост выручки молочки на 6–8% за период (потерянные продажи возвращаются).",
    rationale_en:
      "Network-aggregate signal: dairy OOS 6.2% (target 4%), declining for 3 weeks running. By region: Tomsk 5.4%, Seversk 6.8%, Novosibirsk 6.5%. A network goal will focus bonus tasks and restocking. Forecast: hitting the target lifts dairy revenue by 6–8% over the period (lost sales return).",
    proposed_payload: {
      category: "OOS_REDUCTION",
      target_value: 4.0,
      target_unit: "%",
      period_days: 14,
      scope: "NETWORK",
      product_category: "Молочка",
    },
    context_data: {
      anomaly_metric: "network_dairy_oos_pct",
      chart_data: {
        type: "trend",
        label: "OOS молочки по сети, %",
        values: [3.8, 4.1, 4.5, 5.0, 5.4, 5.8, 6.2],
        norm: 4.0,
      },
    },
    status: "PENDING",
    priority: "high",
    target_object_type: "NETWORK",
    target_object_ids: [],
    created_at: daysAgo(1),
  },

  {
    id: "ai-sug-016",
    type: "GOAL_SUGGESTION",
    title: "Снизить списания фреш-категории до 2.5% в 3 магазинах",
    title_en: "Cut fresh write-offs to 2.5% across 3 stores",
    description:
      "Списания фреш выше нормы в У-22 Коммунистический, У-05 Лазарева и У-03 Фрунзе. По остальным магазинам сети показатели в норме — точечная цель эффективнее сетевой.",
    description_en:
      "Fresh-category write-offs are above target at U-22 Kommunisticheskiy, U-05 Lazareva and U-03 Frunze. The rest of the network is on target — a focused goal will outperform a network-wide one.",
    rationale:
      "Сигнал из выборки магазинов: списания фреш — У-22 3.9%, У-05 3.2%, У-03 4.1% (норма 2.5%). В остальных 19 магазинах — норма. Локальная цель на 14 дней с поддержкой бонусных задач даст быстрый результат без перегрузки сети. Прогнозируемая экономия — 18–22 тыс. ₽/неделю по 3 магазинам.",
    rationale_en:
      "Per-store signal: fresh write-offs — U-22 3.9%, U-05 3.2%, U-03 4.1% (target 2.5%). The other 19 stores are on target. A focused 14-day goal backed by bonus tasks delivers fast results without straining the network. Forecast saving 18–22 K ₽/week across the 3 stores.",
    proposed_payload: {
      category: "WRITE_OFFS",
      target_value: 2.5,
      target_unit: "%",
      period_days: 14,
      scope: "STORE_LIST",
      store_ids: [207, 209, 211],
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE_LIST",
    target_object_ids: [207, 209, 211],
    created_at: daysAgo(2),
  },

  // ── PENDING / Сигнал «Бонус-задачи под цель» (2) ──────────────────

  {
    id: "ai-sug-017",
    type: "BONUS_TASK_SUGGESTION",
    title: "Бонус: фотоотчёт полки молочки — Г-1 Котовского",
    title_en: "Bonus: dairy shelf photo report — G-1 Kotovskogo",
    description:
      "Бонусная задача под сетевую цель снижения OOS молочки. Зафиксировать состояние полки до и после доукладки. 150 баллов.",
    description_en:
      "Bonus task under the network dairy-OOS goal. Capture the shelf condition before and after restocking. Worth 150 points.",
    rationale:
      "Прямой вклад в цель goal-oos-active: фотоотчёт даёт ИИ свежие данные для анализа OOS-тренда. Бонус 150 баллов мотивирует выполнение в первой половине дня (когда покупатели чаще фотографируют пустую полку и публикуют в соцсети).",
    rationale_en:
      "Direct contribution to goal-oos-active: the photo report feeds the AI with fresh data for the OOS-trend model. The 150-point bonus encourages morning execution (when shoppers are more likely to photograph empty shelves and post on social media).",
    proposed_payload: {
      title: "Фотоотчёт полки молочки до/после",
      type: "BONUS",
      bonus_points: 150,
      goal_id: "goal-oos-active",
      work_type_id: 4,
      store_id: 200,
      planned_minutes: 10,
      requires_photo: true,
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE",
    target_object_ids: [200],
    created_at: hoursAgo(8),
  },

  {
    id: "ai-sug-018",
    type: "BONUS_TASK_SUGGESTION",
    title: "Бонус: проверка ценников молочного отдела — У-22 Коммунистический",
    title_en:
      "Bonus: dairy-section price-tag check — U-22 Kommunisticheskiy",
    description:
      "Бонусная задача под цель снижения списаний фреш. Сверка актуальности ценников после переоценки 5 мая. 200 баллов.",
    description_en:
      "Bonus task under the fresh-write-off goal. Verify price-tag accuracy after the May 5 repricing. Worth 200 points.",
    rationale:
      "Неверный ценник в молочной зоне маскирует OOS и снижает конверсию (покупатель не находит цену → не берёт). По выгрузке от 05 мая изменены 14 SKU — ценники в зале не обновлены. Быстрая проверка (12 мин) даёт двойную отдачу: цель + соблюдение регламента ФЗ.",
    rationale_en:
      "An incorrect dairy price tag hides OOS and lowers conversion (no visible price → no purchase). The May 5 export changed 14 SKUs but the floor tags have not been updated. The quick check (12 min) delivers a double benefit: goal contribution plus regulatory compliance.",
    proposed_payload: {
      title: "Сверка ценников молочки по выгрузке от 5 мая",
      type: "BONUS",
      bonus_points: 200,
      goal_id: "goal-fresh-writeoffs",
      work_type_id: 5,
      store_id: 207,
      planned_minutes: 12,
      requires_photo: false,
    },
    status: "PENDING",
    priority: "medium",
    target_object_type: "STORE",
    target_object_ids: [207],
    created_at: hoursAgo(10),
  },

  // ── ACCEPTED (4 — для статистики) ──────────────────────────────────

  {
    id: "ai-sug-019",
    type: "TASK_SUGGESTION",
    title: "Доукладка фруктов и овощей — У-20 Вокзальная 41",
    title_en: "Restock fruit and vegetables — U-20 Vokzalnaya 41",
    description:
      "OOS фрукты/овощи 5.1% при норме 3.5%. Есть остатки на складе.",
    description_en:
      "Fruit & vegetables OOS at 5.1% versus a 3.5% target. Back-room stock is available.",
    rationale:
      "Сигнал из остатков: складской запас 180 кг покрывает потребность дня. Без доукладки — потеря 14–18 тыс. ₽ выручки.",
    rationale_en:
      "Stock signal: 180 kg back-room inventory covers the day's demand. Without restocking, the revenue loss is 14–18 K ₽.",
    proposed_payload: {
      work_type_id: 4,
      store_id: 205,
      planned_minutes: 25,
      suggested_assignee_id: 320,
    },
    status: "ACCEPTED",
    priority: "medium",
    target_object_type: "STORE",
    target_object_ids: [205],
    created_at: daysAgo(5),
    decided_at: daysAgo(5),
    decided_by: 4,
  },

  {
    id: "ai-sug-020",
    type: "TASK_SUGGESTION",
    title: "Внеплановая инвентаризация кондитерки — У-22 Коммунистический",
    title_en:
      "Unplanned confectionery inventory — U-22 Kommunisticheskiy",
    description:
      "Расхождение остатков кондитерки по системе и физическому пересчёту 3.1% (норма 1%).",
    description_en:
      "Confectionery stock discrepancy of 3.1% between the system and the physical count (target 1%).",
    rationale:
      "Сигнал из POS + WMS: системный остаток 412 единиц, физический пересчёт 399. Расхождение требует внеплановой инвентаризации до конца недели.",
    rationale_en:
      "POS + WMS signal: system shows 412 units, physical count shows 399. The variance warrants an unplanned inventory before week-end.",
    proposed_payload: {
      work_type_id: 6,
      store_id: 207,
      planned_minutes: 60,
      suggested_assignee_id: 374,
    },
    context_data: { anomaly_metric: "inventory_discrepancy_pct" },
    status: "ACCEPTED",
    priority: "high",
    target_object_type: "STORE",
    target_object_ids: [207],
    created_at: daysAgo(4),
    decided_at: daysAgo(4),
    decided_by: 4,
    decision_comment:
      "Принято с правками: время выполнения увеличено до 90 мин",
  },

  {
    id: "ai-sug-021",
    type: "GOAL_SUGGESTION",
    title: "Снизить OOS заморозки по сети до 4%",
    title_en: "Cut network-wide frozen OOS to 4%",
    description: "OOS заморозки 8.1% по сети — выше нормы в 2 раза.",
    description_en:
      "Network-wide frozen-products OOS at 8.1% — twice the target.",
    rationale:
      "Сигнал из агрегата: тренд ухудшения 2 недели. Сетевая цель закроет проблему за 14 дней.",
    rationale_en:
      "Aggregate signal: worsening trend over 2 weeks. A network goal can resolve the issue within 14 days.",
    proposed_payload: { category: "OOS_REDUCTION", target_value: 4.0 },
    status: "ACCEPTED",
    priority: "high",
    target_object_type: "NETWORK",
    target_object_ids: [],
    created_at: daysAgo(32),
    decided_at: daysAgo(32),
    decided_by: 3,
  },

  {
    id: "ai-sug-022",
    type: "BONUS_TASK_SUGGESTION",
    title: "Бонус: выкладка заморозки из остатков склада",
    title_en: "Bonus: stock frozen items from back-room inventory",
    description: "Бонусная задача в рамках цели OOS заморозки. 200 баллов.",
    description_en:
      "Bonus task under the frozen-OOS goal. Worth 200 points.",
    rationale:
      "На складе остаток заморозки 35 единиц, на полке OOS. Бонус ускоряет восстановление.",
    rationale_en:
      "Back-room frozen stock at 35 units while the shelf is OOS. The bonus accelerates restocking.",
    proposed_payload: {
      type: "BONUS",
      bonus_points: 200,
      goal_id: "goal-oos-completed",
      work_type_id: 4,
    },
    status: "ACCEPTED",
    priority: "medium",
    target_object_type: "STORE",
    target_object_ids: [207],
    created_at: daysAgo(15),
    decided_at: daysAgo(15),
    decided_by: 4,
  },

  // ── REJECTED (8 — с decision_reason для статистики) ───────────────

  ...[
    {
      id: "ai-sug-r01",
      title: "Уборка склада перед поставкой — Г-1 Котовского",
      title_en: "Back-room cleanup before delivery — G-1 Kotovskogo",
      reason: "Не релевантно сейчас",
      comment: "Поставка перенесена на следующий день — задача потеряла смысл",
    },
    {
      id: "ai-sug-r02",
      title: "Контроль промо-стеллажей — У-05 Лазарева",
      title_en: "Promo-rack inspection — U-05 Lazareva",
      reason: "Уже в работе",
      comment: "Аналогичная задача создана вручную утром",
    },
    {
      id: "ai-sug-r03",
      title: "Переоценка кисломолочки — С-5 Академический",
      title_en: "Repricing for cultured dairy — S-5 Akademichesky",
      reason: "Не релевантно сейчас",
      comment: "Акция стартует только 12 мая — слишком рано",
    },
    {
      id: "ai-sug-r04",
      title: "Инвентаризация заморозки — У-17 Бела Куна",
      title_en: "Frozen inventory — U-17 Bela Kuna",
      reason: "Уже в работе",
      comment: "",
    },
    {
      id: "ai-sug-r05",
      title: "Доукладка снеков из подсобки — У-03 Фрунзе",
      title_en: "Restock snacks from back-room — U-03 Frunze",
      reason: "Не согласен с анализом",
      comment:
        "Полка фактически заполнена — данные POS отстают от пересчёта на 2 дня",
    },
    {
      id: "ai-sug-r06",
      title: "Усилить выкладку промо-зоны 3 — Г-2 Беринга",
      title_en: "Reinforce promo-zone 3 stocking — G-2 Beringa",
      reason: "Не согласен с анализом",
      comment:
        "Зона переделана по новой планограмме 28 апр — старый эталон неактуален",
    },
    {
      id: "ai-sug-r07",
      title: "Обход торгового зала перед обедом — У-22 Коммунистический",
      title_en: "Pre-lunch sales-floor walkthrough — U-22 Kommunisticheskiy",
      reason: "Слишком общее",
      comment:
        "Нет конкретного триггера — что именно проверять, не указано",
    },
    {
      id: "ai-sug-r08",
      title: "Контроль кассовой зоны после сбоя — У-20 Вокзальная",
      title_en: "Checkout-zone check after the outage — U-20 Vokzalnaya",
      reason: "Не релевантно сейчас",
      comment: "Технический сбой устранён инженером, контроль не нужен",
    },
  ].map(({ id, title, title_en, reason, comment }, idx): AISuggestion => ({
    id,
    type: "TASK_SUGGESTION",
    title,
    title_en,
    description: "Задача предложена ИИ — отклонена менеджером.",
    description_en: "Task suggested by AI — rejected by the manager.",
    rationale: "Аномалия зафиксирована, но менеджер счёл предложение неактуальным.",
    rationale_en:
      "Anomaly detected, but the manager judged the suggestion not relevant.",
    proposed_payload: {
      work_type_id: 4 + (idx % 5),
      store_id: 200 + (idx % 6),
    },
    status: "REJECTED",
    priority: (["high", "medium", "low"] as const)[idx % 3],
    target_object_type: "STORE",
    target_object_ids: [200 + (idx % 6)],
    created_at: daysAgo(1 + idx),
    decided_at: daysAgo(1 + idx),
    decided_by: idx % 2 === 0 ? 4 : 12,
    decision_reason: reason,
    decision_comment: comment || undefined,
  })),
];
