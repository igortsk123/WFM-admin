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
    description:
      "Остатки молочной категории в магазине Г-1 Котовского 19/3 (ГМ) упали до 18% — впервые за 7 дней (предыдущий минимум 35%). Рекомендую внеплановую проверку сроков годности и переоценку.",
    rationale:
      "Сигнал из системы остатков: уровень 18% на 06:30, тренд вниз 4 дня подряд (35% → 29% → 24% → 18%). Поставка следующая только в среду. До поставки риск истечения сроков по 12 SKU. Янович Алёна Сергеевна (медиана выкладки молочки 30 мин — на 25% быстрее коллег по смене) выходит сегодня в 08:00, идеально подходит для задачи.",
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
    description:
      "Полочные остатки крепкого алкоголя ниже 30% по 18 позициям. На складе магазина — достаточный запас (4 паллеты после поставки в пятницу). Доукладка восстановит ассортимент.",
    rationale:
      "Сигнал из остатков по полке + складу: на полке OOS 18 SKU, на складе остаток 220 единиц. Без доукладки до открытия в субботу потеря выручки оценивается в 28–32 тыс. ₽. Подходит Куренков Иван Сергеевич — есть допуск к крепкому алкоголю и опыт работы с этой категорией (медиана 22 мин на палет).",
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
    description:
      "За час до закрытия в зале остаётся 47% дневной выпечки против норматива 15%. Без уценки риск списания на 9 800 ₽.",
    rationale:
      "Сигнал из POS: продажи хлебобулочки сегодня –22% относительно медианы среды. Завоз был стандартный, поэтому остатки выше нормы. Уценка 30% к 21:00 по статистике распродаёт 70% остатка за час и снижает списания в 4 раза.",
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
    description:
      "Продажи в зоне «Касса» в субботу выросли на 18% относительно медианы недели. На пиковых часах 14:00–18:00 прогнозируется очередь >6 человек. Рекомендую вывести дополнительного кассира на КСО.",
    rationale:
      "Сигнал из POS: суббота 03 мая — +18% к медиане субботы (рост связан с акцией ВкусВилл по соседству). Норматив очереди — не более 4 человек. Свободен Ситдиков Азиз Хамидович (ставка 0.75, текущая загрузка 4.2 ч из 6 в субботу), есть допуск к КСО.",
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
    description:
      "Продажи фруктов и овощей в утреннее окно 09:00–12:00 за неделю выросли на 14%. Текущий график выкладки заканчивает зону к 09:30 — задерживается реакция на «утренний» спрос.",
    rationale:
      "Сигнал из POS + сценарий выкладки: рост продаж +14% в окне 9–12, но завершение выкладки фреш-1 — 09:30. Сдвиг старта на 07:30 даст полную полку к открытию в 08:00. Подходит Орлова Ирина Юрьевна (медиана выкладки фреш 25 мин на стеллаж — лучший показатель в магазине).",
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
    description:
      "Категория «Снеки» показывает устойчивый рост в У-03 Фрунзе 120 (Новосибирск). Похоже, эффект от перестановки полки в марте сохраняется.",
    rationale:
      "Сигнал из POS: рост по категории четвёртую неделю подряд (+9.4% к среднему за квартал). Норматив завоза не пересматривался. Рекомендую увеличить плановый завоз на 8–10% и поставить задачу выкладки на ежедневной основе вместо текущей через день.",
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
    description:
      "Завтра в 09:30 ожидается поставка крепкого алкоголя (4 паллеты, ~280 SKU). Рекомендую назначить приёмку и выкладку с 09:00 до 12:00.",
    rationale:
      "Сигнал из расписания поставок: завтра 09:30 — алкоголь, поставщик «АлкоГрупп», 4 паллеты. Параллельно нужно сверить ЕГАИС в течение 4 часов. Подходит Алмаз Юлианна Владимировна (медиана приёмки 22 мин на палет, есть допуск к ЕГАИС). Время выполнения — 2.5 ч (приёмка 1.5 + выкладка фреш-1 1.0).",
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
    description:
      "Вчерашняя алкогольная поставка принята, но ЕГАИС-документы не подтверждены. До вечерней продажи (от 22:00 ограничение) — 6 часов. Риск штрафа.",
    rationale:
      "Сигнал из системы документооборота: поставка №АЛ-2026-05-06 принята в 14:40 (06 мая), документы ЕГАИС не подтверждены — превышен норматив 4 часа. Если не подтвердить до 22:00 — продажа алкоголя блокируется. Задача быстрая (15 мин), но критична.",
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
    description:
      "На неделе 28 апр – 04 мая внештатные сотрудники закрыли 23% рабочих часов (норматив ≤15%). Среди штата есть недозагруженные.",
    rationale:
      "Сигнал из табеля + графика смен: 23% часов недели — внештат (норма ≤15%, превышение 8 п.п.). Среди штата Гринкевич Наталья Александровна работает 4 дня по 0.75 ставки и недогружена на 2 ч/день. Если переключить 2 задачи переоценки и инвентаризации с внештата на неё — экономия ~1 800 ₽/день, или ~9 000 ₽ за рабочую неделю.",
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
    description:
      "Перевести 2 задачи переоценки с внештата на Гринкевич Н. А. в среду и пятницу — выровняет загрузку и снизит расходы.",
    rationale:
      "Дополняет инсайт по балансу внештат/штат: Гринкевич Н. А. имеет допуск «Переоценка», сейчас занята 4.5 из 6 ч в среду. Свободное окно 13:00–15:00 покрывает 2 задачи. Внештатник за тот же объём получает 2 × 900 ₽ = 1 800 ₽, штат — уже оплачено по графику.",
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
    description:
      "За последние 3 дня доля одобренных задач у Романенко Татьяны Ивановны снизилась с 92% до 64% при пороге 70%. Возможна перегрузка или проблема с обучением.",
    rationale:
      "Сигнал из системы проверки: 5 дней назад сотрудник переключён на новую операцию «КСО» (раньше работала на выкладке фреш-1). Падение качества совпадает по дате. Рекомендую назначить наставник-сессию с управляющим или временно снизить нагрузку на 1 задачу/смена до 70% доли одобрения.",
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
    description:
      "Бонусная задача для управляющего магазином — провести 30-минутный разбор операций КСО с Романенко Т. И. 250 баллов.",
    rationale:
      "Связано с инсайтом про падение доли одобренных задач. Раннее обучение быстрее восстановит показатели и не даст потерять сотрудника. Управляющий У-20 Вокзальная — Каримова Виктория Владимировна, есть опыт обучения по КСО.",
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
    description:
      "В магазинах 0033, 0034, 0036, 0042 (УФ-8 Иркутский 42, У-33 Киевская 109/1, У-24 Ленина 1а, УФ-10 Смирнова 38) задачи «Инвентаризация» выполняются на 30% дольше норматива четвёртую неделю. Возможно, норматив занижен.",
    rationale:
      "Сигнал из медиан выполнения: норматив инвентаризации — 60 мин, фактическая медиана по 4 магазинам — 78 мин (+30%). Все 4 магазина — формат «Универсам Фрунзе» с одинаковой схемой зала. Гипотезы: 1) норматив занижен и нужно пересмотреть на 75 мин; 2) персонал не освоил новую процедуру (запущена 28 апр). Рекомендую запустить корректирующую задачу «Обучение процедурам инвентаризации» по сети либо пересмотреть стандарт.",
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
    description:
      "В двух гипермаркетах (Г-1 Котовского, Г-2 Беринга) системное падение исполнения промо-выкладки по средам — 67% против норматива 85%+.",
    rationale:
      "Сигнал из статистики выполнения: «Мерчендайзинг (планограммы)» по средам — 67% (за 4 недели). Совпадает со сменой графика старшего смены 07 апр. В остальные дни недели в этих же магазинах — 89% и 92%. Гипотеза: новый старший не закладывает время на промо в среду. Рекомендую пересмотреть график или усилить акцент в дневном инструктаже среды.",
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
    description:
      "За апрель средний OOS молочки по сети составил 6.2% — на 55% выше нормы 4%. Тренд ухудшения 3 недели подряд. Рекомендую активировать сетевую цель.",
    rationale:
      "Сигнал из агрегата по сети: OOS молочки 6.2% (норма 4%), ухудшение 3 недели подряд. По регионам: Томск 5.4%, Северск 6.8%, Новосибирск 6.5%. Сетевая цель сфокусирует бонусные задачи и доукладку. Прогноз: при достижении нормы — рост выручки молочки на 6–8% за период (потерянные продажи возвращаются).",
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
    description:
      "Списания фреш выше нормы в У-22 Коммунистический, У-05 Лазарева и У-03 Фрунзе. По остальным магазинам сети показатели в норме — точечная цель эффективнее сетевой.",
    rationale:
      "Сигнал из выборки магазинов: списания фреш — У-22 3.9%, У-05 3.2%, У-03 4.1% (норма 2.5%). В остальных 19 магазинах — норма. Локальная цель на 14 дней с поддержкой бонусных задач даст быстрый результат без перегрузки сети. Прогнозируемая экономия — 18–22 тыс. ₽/неделю по 3 магазинам.",
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
    description:
      "Бонусная задача под сетевую цель снижения OOS молочки. Зафиксировать состояние полки до и после доукладки. 150 баллов.",
    rationale:
      "Прямой вклад в цель goal-oos-active: фотоотчёт даёт ИИ свежие данные для анализа OOS-тренда. Бонус 150 баллов мотивирует выполнение в первой половине дня (когда покупатели чаще фотографируют пустую полку и публикуют в соцсети).",
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
    description:
      "Бонусная задача под цель снижения списаний фреш. Сверка актуальности ценников после переоценки 5 мая. 200 баллов.",
    rationale:
      "Неверный ценник в молочной зоне маскирует OOS и снижает конверсию (покупатель не находит цену → не берёт). По выгрузке от 05 мая изменены 14 SKU — ценники в зале не обновлены. Быстрая проверка (12 мин) даёт двойную отдачу: цель + соблюдение регламента ФЗ.",
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
    description:
      "OOS фрукты/овощи 5.1% при норме 3.5%. Есть остатки на складе.",
    rationale:
      "Сигнал из остатков: складской запас 180 кг покрывает потребность дня. Без доукладки — потеря 14–18 тыс. ₽ выручки.",
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
    description:
      "Расхождение остатков кондитерки по системе и физическому пересчёту 3.1% (норма 1%).",
    rationale:
      "Сигнал из POS + WMS: системный остаток 412 единиц, физический пересчёт 399. Расхождение требует внеплановой инвентаризации до конца недели.",
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
    description: "OOS заморозки 8.1% по сети — выше нормы в 2 раза.",
    rationale:
      "Сигнал из агрегата: тренд ухудшения 2 недели. Сетевая цель закроет проблему за 14 дней.",
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
    description: "Бонусная задача в рамках цели OOS заморозки. 200 баллов.",
    rationale:
      "На складе остаток заморозки 35 единиц, на полке OOS. Бонус ускоряет восстановление.",
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
      reason: "Не релевантно сейчас",
      comment: "Поставка перенесена на следующий день — задача потеряла смысл",
    },
    {
      id: "ai-sug-r02",
      title: "Контроль промо-стеллажей — У-05 Лазарева",
      reason: "Уже в работе",
      comment: "Аналогичная задача создана вручную утром",
    },
    {
      id: "ai-sug-r03",
      title: "Переоценка кисломолочки — С-5 Академический",
      reason: "Не релевантно сейчас",
      comment: "Акция стартует только 12 мая — слишком рано",
    },
    {
      id: "ai-sug-r04",
      title: "Инвентаризация заморозки — У-17 Бела Куна",
      reason: "Уже в работе",
      comment: "",
    },
    {
      id: "ai-sug-r05",
      title: "Доукладка снеков из подсобки — У-03 Фрунзе",
      reason: "Не согласен с анализом",
      comment:
        "Полка фактически заполнена — данные POS отстают от пересчёта на 2 дня",
    },
    {
      id: "ai-sug-r06",
      title: "Усилить выкладку промо-зоны 3 — Г-2 Беринга",
      reason: "Не согласен с анализом",
      comment:
        "Зона переделана по новой планограмме 28 апр — старый эталон неактуален",
    },
    {
      id: "ai-sug-r07",
      title: "Обход торгового зала перед обедом — У-22 Коммунистический",
      reason: "Слишком общее",
      comment:
        "Нет конкретного триггера — что именно проверять, не указано",
    },
    {
      id: "ai-sug-r08",
      title: "Контроль кассовой зоны после сбоя — У-20 Вокзальная",
      reason: "Не релевантно сейчас",
      comment: "Технический сбой устранён инженером, контроль не нужен",
    },
  ].map(({ id, title, reason, comment }, idx): AISuggestion => ({
    id,
    type: "TASK_SUGGESTION",
    title,
    description: "Задача предложена ИИ — отклонена менеджером.",
    rationale: "Аномалия зафиксирована, но менеджер счёл предложение неактуальным.",
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
