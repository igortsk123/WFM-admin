import type { AIChatThread, AIChatMessage } from "@/lib/types";

/**
 * @endpoint GET /api/ai/chat/threads + GET /api/ai/chat/threads/:id/messages
 * 8 AIChatThread + messages. One expanded thread (молочная ротация discussion).
 * 10+ canned mock responses for typical questions.
 */

const now = new Date("2026-05-01T10:00:00+07:00");
const at = (hoursBack: number) =>
  new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();

// ══════════════════════════════════════════════════════════════════
// THREADS
// ══════════════════════════════════════════════════════════════════

export const MOCK_AI_CHAT_THREADS: AIChatThread[] = [
  {
    id: "thread-001",
    user_id: 4,
    title: "Обсуждение: ротация молочки",
    context_type: "suggestion",
    context_id: "ai-sug-001",
    last_message_at: at(1),
    message_count: 6,
    created_at: at(3),
  },
  {
    id: "thread-002",
    user_id: 4,
    title: "OOS цель по молочке",
    context_type: "goal",
    context_id: "goal-oos-active",
    last_message_at: at(5),
    message_count: 4,
    created_at: at(8),
  },
  {
    id: "thread-003",
    user_id: 3,
    title: "Анализ списаний хлебобулочки",
    context_type: "suggestion",
    context_id: "ai-sug-002",
    last_message_at: at(12),
    message_count: 5,
    created_at: at(14),
  },
  {
    id: "thread-004",
    user_id: 12,
    title: "Промо-выкладка Food City",
    context_type: "goal",
    context_id: "goal-promo-1",
    last_message_at: at(24),
    message_count: 4,
    created_at: at(26),
  },
  {
    id: "thread-005",
    user_id: 4,
    title: "Что важно сегодня — СПАР Томск",
    context_type: "general",
    context_id: null,
    last_message_at: at(7),
    message_count: 4,
    created_at: at(8),
  },
  {
    id: "thread-006",
    user_id: 3,
    title: "Сравнение магазинов по OOS апрель",
    context_type: "chart",
    context_id: "chart-oos-april",
    last_message_at: at(48),
    message_count: 5,
    created_at: at(50),
  },
  {
    id: "thread-007",
    user_id: 12,
    title: "Откуда берутся данные OOS",
    context_type: "general",
    context_id: null,
    last_message_at: at(36),
    message_count: 3,
    created_at: at(37),
  },
  {
    id: "thread-008",
    user_id: 4,
    title: "Магазины с просрочкой сегодня",
    context_type: "general",
    context_id: null,
    last_message_at: at(2),
    message_count: 4,
    created_at: at(2.5),
  },
];

// ══════════════════════════════════════════════════════════════════
// MESSAGES — expanded thread-001 (ротация молочки)
// ══════════════════════════════════════════════════════════════════

export const MOCK_AI_CHAT_MESSAGES_THREAD_001: AIChatMessage[] = [
  {
    id: "msg-001-1",
    thread_id: "thread-001",
    role: "assistant",
    content: "Предлагаю создать задачу **«Внеплановая ротация молочки»** в СПАР Томск, пр. Ленина 80.\n\nСписания молочки за 7 дней выросли до **4.8%** при норме **2.0%** (стандарт). За последние 3 дня тренд ускоряется: +0.4% ежедневно.\n\nОжидаемый эффект от ротации сегодня вечером — снижение потерь на ₽4 200–6 800 в эту неделю.",
    content_en:
      "I suggest creating a task **“Unplanned dairy rotation”** at SPAR Tomsk, Lenina 80.\n\nDairy write-offs over the last 7 days have climbed to **4.8%** versus the **2.0%** target (standard). The trend has accelerated over the past 3 days: +0.4% per day.\n\nExpected impact from a rotation tonight: 4,200–6,800 ₽ in losses avoided this week.",
    attached_data: {
      data_type: "chart",
      payload: {
        type: "bar",
        title: "Списания молочки (7 дней), %",
        values: [2.1, 2.3, 2.8, 3.4, 4.1, 4.5, 4.8],
        norm: 2.0,
        labels: ["25 апр", "26 апр", "27 апр", "28 апр", "29 апр", "30 апр", "1 мая"],
        norm_label: "Норма (стандарт)",
      },
    },
    created_at: at(3),
  },
  {
    id: "msg-001-2",
    thread_id: "thread-001",
    role: "user",
    content: "А почему именно эти 8 SKU? Откуда ты знаешь что именно они проблемные?",
    content_en:
      "Why exactly those 8 SKUs? How do you know they are the problem ones?",
    created_at: at(2.8),
  },
  {
    id: "msg-001-3",
    thread_id: "thread-001",
    role: "assistant",
    content: "Смотрю на данные POS и складские остатки в совокупности. Вот топ-8 SKU по доле потерь за 7 дней:",
    content_en:
      "I'm cross-referencing POS data with back-room stock. Here are the top 8 SKUs by loss share over the last 7 days:",
    attached_data: {
      data_type: "table",
      payload: {
        columns: ["SKU", "Продано, шт", "Списано, шт", "Доля потерь"],
        rows: [
          ["Йогурт Чудо Клубника 125г", "842", "67", "7.4%"],
          ["Молоко Parmalat 1л", "634", "44", "6.5%"],
          ["Творог зерненый 5% 200г", "511", "38", "6.9%"],
          ["Сметана Простоквашино 20% 400г", "423", "31", "6.8%"],
          ["Кефир Bio Простоквашино 1% 1л", "398", "27", "6.3%"],
          ["Ряженка Вкусвилл 4% 500мл", "312", "23", "6.9%"],
          ["Масло Простоквашино 82.5% 200г", "289", "19", "6.2%"],
          ["Сыр Пошехонский 200г", "246", "17", "6.5%"],
        ],
      },
    },
    created_at: at(2.7),
  },
  {
    id: "msg-001-4",
    thread_id: "thread-001",
    role: "user",
    content: "Не согласен. У нас Food City неделю праздновал, паттерн искажён. Наш магазин работал в усиленном режиме — больше покупателей, больше продаж. Списания в % выросли но абсолютно не критично.",
    content_en:
      "I disagree. Food City had a week-long celebration nearby, the pattern is skewed. Our store ran on extended hours — more customers, more sales. The % went up but it's not critical at all.",
    created_at: at(2.5),
  },
  {
    id: "msg-001-5",
    thread_id: "thread-001",
    role: "assistant",
    content: "Спасибо за контекст! Уточняю модель. Если исключить период 27–30 апр (праздник), средние списания составят **3.1%** — это выше нормы 2%, но менее критично.\n\nПредлагаю альтернативу: вместо срочной ротации сегодня — плановый обход холодильников завтра утром (стандартное время, 20 мин). Это снизит риск без перегрузки команды в праздничный остаток.\n\nСоздать такую задачу?",
    content_en:
      "Thanks for the context! Refining the model. Excluding the Apr 27–30 holiday window, average write-offs come out to **3.1%** — still above the 2% target, but much less critical.\n\nAlternative idea: instead of an urgent rotation today, run a planned fridge walk-through tomorrow morning (standard slot, 20 min). That lowers the risk without overloading the team during the holiday tail.\n\nShall I create that task?",
    created_at: at(2.4),
  },
  {
    id: "msg-001-6",
    thread_id: "thread-001",
    role: "user",
    content: "Ок, не будем создавать сейчас. Отклоняю это предложение. Завтра создам сам плановую задачу.",
    content_en:
      "OK, let's not create one now. I'm rejecting this suggestion. I'll set up a planned task myself tomorrow.",
    helpful: false,
    created_at: at(1),
  },
];

// ══════════════════════════════════════════════════════════════════
// MESSAGES — thread-002 (goal OOS)
// ══════════════════════════════════════════════════════════════════

export const MOCK_AI_CHAT_MESSAGES_THREAD_002: AIChatMessage[] = [
  {
    id: "msg-002-1",
    thread_id: "thread-002",
    role: "user",
    content: "Объясни OOS — что это такое и как оно считается?",
    content_en: "Explain OOS — what is it and how is it calculated?",
    created_at: at(8),
  },
  {
    id: "msg-002-2",
    thread_id: "thread-002",
    role: "assistant",
    content: "**OOS (Out-of-Stock)** — это доля позиций ассортимента, которые должны быть на полке, но отсутствуют в момент проверки.\n\nКак считаем: \n1. Берём плановый ассортимент для зоны/полки (из настроек)\n2. Сверяем с фактическими остатками из POS и складских данных\n3. OOS% = (позиций с нулевым остатком / плановый ассортимент) × 100\n\nДля молочки нормой считается **≤4%** (настроено в Стандартах для ИИ). Сейчас у вас **6.2%** по сети.",
    content_en:
      "**OOS (Out-of-Stock)** is the share of assortment items that should be on the shelf but are missing at the time of the check.\n\nHow we calculate it:\n1. Take the planned assortment for the zone/shelf (from settings)\n2. Reconcile against actual stock from POS and warehouse data\n3. OOS% = (SKUs with zero stock / planned assortment) × 100\n\nThe target for dairy is **≤4%** (configured in AI Standards). You're currently at **6.2%** network-wide.",
    created_at: at(7.9),
  },
  {
    id: "msg-002-3",
    thread_id: "thread-002",
    role: "user",
    content: "А какие магазины сейчас с наибольшим OOS?",
    content_en: "Which stores currently have the highest OOS?",
    created_at: at(6),
  },
  {
    id: "msg-002-4",
    thread_id: "thread-002",
    role: "assistant",
    content: "По данным на сегодня утром (9:30):",
    content_en: "Based on this morning's data (9:30):",
    attached_data: {
      data_type: "table",
      payload: {
        columns: ["Магазин", "OOS молочки", "vs норма", "Тренд"],
        rows: [
          ["СПАР Томск, пр. Ленина 80", "6.8%", "+2.8pp", "↑ растёт"],
          ["СПАР Новосибирск, ул. Ленина 55", "7.1%", "+3.1pp", "↑ растёт"],
          ["Food City Томск Global Market", "5.4%", "+1.4pp", "→ стабильно"],
          ["СПАР Томск, ул. Красноармейская 99", "4.8%", "+0.8pp", "↓ снижается"],
          ["Food City Томск, ул. Учебная 39", "4.2%", "+0.2pp", "→ на уровне"],
        ],
      },
    },
    created_at: at(5.9),
  },
];

// ══════════════════════════════════════════════════════════════════
// MESSAGES — thread-005 (что важно сегодня)
// ══════════════════════════════════════════════════════════════════

export const MOCK_AI_CHAT_MESSAGES_THREAD_005: AIChatMessage[] = [
  {
    id: "msg-005-1",
    thread_id: "thread-005",
    role: "user",
    content: "Что важно сегодня по СПАР Томск?",
    content_en: "What's important today for SPAR Tomsk?",
    created_at: at(8),
  },
  {
    id: "msg-005-2",
    thread_id: "thread-005",
    role: "assistant",
    content: "**Топ-3 приоритета на сегодня:**\n\n1. **Холодильники 5–8** — нет проверки температуры 27 часов (норма: ежедневно). Риск высокий.\n\n2. **Молочка** — OOS 6.8% при норме 4%. Активна цель снижения OOS. Есть 2 бонусные задачи.\n\n3. **Ценники** — 23 SKU из выгрузки 27 апр не обновлены. Задача низкого приоритета, но риск жалоб на кассе.\n\nВсего открытых задач сегодня: **18**, из которых 3 просрочены по времени.",
    content_en:
      "**Top 3 priorities today:**\n\n1. **Fridges 5–8** — no temperature check for 27 hours (target: daily). High risk.\n\n2. **Dairy** — OOS 6.8% versus the 4% target. The OOS-reduction goal is active. Two bonus tasks are available.\n\n3. **Price tags** — 23 SKUs from the Apr 27 export are not yet updated. Low-priority task but a checkout-complaint risk.\n\nOpen tasks today: **18**, of which 3 are past their deadline.",
    created_at: at(7.9),
  },
  {
    id: "msg-005-3",
    thread_id: "thread-005",
    role: "user",
    content: "Покажи похожие случаи с OOS молочки в прошлом месяце",
    content_en: "Show similar dairy-OOS cases from last month",
    created_at: at(7.5),
  },
  {
    id: "msg-005-4",
    thread_id: "thread-005",
    role: "assistant",
    content: "В апреле было 3 аналогичных эпизода с OOS молочки выше 6%:",
    content_en:
      "There were 3 similar dairy-OOS episodes above 6% in April:",
    attached_data: {
      data_type: "table",
      payload: {
        columns: ["Дата", "OOS%", "Действие", "Результат"],
        rows: [
          ["3 апр", "6.4%", "Внеплановая ротация вечером", "Снизился до 3.1% за 2 дня"],
          ["11 апр", "7.2%", "Доукладка + смена планограммы", "Снизился до 4.0% за 3 дня"],
          ["22 апр", "6.0%", "Ничего не предпринято", "Держался 6.1–6.5% ещё 4 дня"],
        ],
      },
    },
    created_at: at(7.4),
  },
];

// ══════════════════════════════════════════════════════════════════
// MESSAGES — thread-006 (chart context)
// ══════════════════════════════════════════════════════════════════

export const MOCK_AI_CHAT_MESSAGES_THREAD_006: AIChatMessage[] = [
  {
    id: "msg-006-1",
    thread_id: "thread-006",
    role: "user",
    content: "Откуда эти данные в графике OOS?",
    content_en: "Where does the data in this OOS chart come from?",
    created_at: at(50),
  },
  {
    id: "msg-006-2",
    thread_id: "thread-006",
    role: "assistant",
    content: "**Источники данных для OOS-графика:**\n\n- **POS-данные** — из коннектора SPAR Томск (активен, 124 567 чеков/сут). Обновляется каждые 15 минут.\n- **Плановый ассортимент** — из настроек зон (Выкладка → Планограммы), обновляется вручную оператором.\n- **Склад** — из LAMA-коннектора (синхронизация раз в 4 ч).\n\nРасчёт OOS запускается каждый час. Последнее обновление: сегодня в 09:45.",
    content_en:
      "**Data sources for the OOS chart:**\n\n- **POS data** — from the SPAR Tomsk connector (active, 124,567 receipts/day). Updates every 15 minutes.\n- **Planned assortment** — from the zone settings (Stocking → Planograms), updated manually by an operator.\n- **Warehouse** — from the LAMA connector (sync every 4 hours).\n\nThe OOS calculation runs every hour. Last update: today at 09:45.",
    attached_data: {
      data_type: "document_excerpt",
      payload: {
        title: "Стандарт расчёта OOS — v2 (апрель 2026)",
        excerpt: "§3.1 Out-of-Stock считается как отношение SKU с нулевым остатком на полке к общему плановому ассортименту зоны. Данные обновляются каждые 60 минут из POS и каждые 240 минут из WMS...",
      },
    },
    created_at: at(49.8),
  },
  {
    id: "msg-006-3",
    thread_id: "thread-006",
    role: "user",
    content: "Норм, понял. А почему у SPAR-NSK ситуация хуже?",
    content_en: "Got it, thanks. Why is the situation worse at SPAR-NSK?",
    created_at: at(48.5),
  },
  {
    id: "msg-006-4",
    thread_id: "thread-006",
    role: "assistant",
    content: "По SPAR-NSK-001 есть два фактора:\n\n1. **LAMA-коннектор** последний раз синхронизировался 2 дня назад — плановый ассортимент устарел, OOS может быть завышен.\n2. **Процент принятия предложений** у супервайзера Романова И. А. упал с 78% до 31% за 3 дня — часть предложений по доукладке не принимается.\n\nРекомендую проверить интеграцию LAMA для магазина 4.",
    content_en:
      "Two factors are at play at SPAR-NSK-001:\n\n1. The **LAMA connector** last synced 2 days ago — the planned assortment is stale, so OOS may be overstated.\n2. Supervisor Romanov I. A.'s **suggestion-acceptance rate** dropped from 78% to 31% in 3 days — some restocking suggestions are not being accepted.\n\nRecommend checking the LAMA integration for store 4.",
    created_at: at(48),
  },
  {
    id: "msg-006-5",
    thread_id: "thread-006",
    role: "user",
    content: "Понятно, займусь.",
    content_en: "Understood, I'll take care of it.",
    helpful: true,
    created_at: at(48),
  },
];

// ══════════════════════════════════════════════════════════════════
// MESSAGES — thread-008 (магазины с просрочкой)
// ══════════════════════════════════════════════════════════════════

export const MOCK_AI_CHAT_MESSAGES_THREAD_008: AIChatMessage[] = [
  {
    id: "msg-008-1",
    thread_id: "thread-008",
    role: "user",
    content: "Какие магазины с просрочкой сегодня?",
    content_en: "Which stores have expiry risk today?",
    created_at: at(2.5),
  },
  {
    id: "msg-008-2",
    thread_id: "thread-008",
    role: "assistant",
    content: "По данным на 09:30 сегодня — выявлены риски просрочки в 3 магазинах:",
    content_en:
      "As of 09:30 today, expiry risks have been flagged at 3 stores:",
    attached_data: {
      data_type: "table",
      payload: {
        columns: ["Магазин", "Категория", "Риск SKU", "Статус задачи"],
        rows: [
          ["СПАР Томск, пр. Ленина 80", "Молочка", "14 SKU", "Задача не создана ⚠"],
          ["СПАР Новосибирск, ул. Ленина 55", "Хлебобулочка", "7 SKU", "В работе"],
          ["Food City Томск Global Market", "Молочка + Fresh", "9 SKU", "Задача не создана ⚠"],
        ],
      },
    },
    created_at: at(2.4),
  },
  {
    id: "msg-008-3",
    thread_id: "thread-008",
    role: "user",
    content: "Создай задачи для SPAR-TOM-001 и FC-TOM-001",
    content_en: "Create tasks for SPAR-TOM-001 and FC-TOM-001",
    created_at: at(2.2),
  },
  {
    id: "msg-008-4",
    thread_id: "thread-008",
    role: "assistant",
    content: "Создать задачи через чат пока не могу — это запланировано в следующем обновлении. \n\nНо вот готовые предложения, которые можно принять одним кликом в разделе **AI → Предложения**:\n- «Контроль скоропорта молочки» (ai-sug-001) — SPAR-TOM-001, высокий приоритет\n- «Контроль скоропорта в молочном отделе» (bonus-task-002) — FC-TOM-001, 150 баллов",
    content_en:
      "I can't create tasks straight from chat yet — that's planned for the next release.\n\nBut here are ready-to-go suggestions you can accept in one click under **AI → Suggestions**:\n- “Dairy perishables check” (ai-sug-001) — SPAR-TOM-001, high priority\n- “Perishables check in the dairy section” (bonus-task-002) — FC-TOM-001, 150 points",
    created_at: at(2),
  },
];

// ══════════════════════════════════════════════════════════════════
// CANNED RESPONSES (mock answers for common question patterns)
// ══════════════════════════════════════════════════════════════════

export interface CannedResponse {
  id: string;
  trigger_pattern: string;
  user_message: string;
  /** EN-перевод примера пользовательского запроса для билингв-демо. */
  user_message_en?: string;
  assistant_response: string;
  /** EN-перевод ответа ассистента для билингв-демо. */
  assistant_response_en?: string;
  attached_data?: AIChatMessage["attached_data"];
}

export const MOCK_CANNED_RESPONSES: CannedResponse[] = [
  {
    id: "canned-001",
    trigger_pattern: "откуда.*данные|источник.*данных",
    user_message: "Откуда эти данные?",
    user_message_en: "Where does this data come from?",
    assistant_response: "Данные поступают из трёх источников:\n1. **POS-коннектор** (чеки в реальном времени)\n2. **LAMA-планировщик** (смены и задачи)\n3. **Стандарты ИИ** (нормы из настроек организации)\n\nПоследнее обновление: 15 мин назад.",
    assistant_response_en:
      "The data flows in from three sources:\n1. **POS connector** (real-time receipts)\n2. **LAMA scheduler** (shifts and tasks)\n3. **AI Standards** (targets from the organisation's settings)\n\nLast update: 15 min ago.",
  },
  {
    id: "canned-002",
    trigger_pattern: "похожие.*случаи|аналогичные",
    user_message: "Покажи похожие случаи",
    user_message_en: "Show similar cases",
    assistant_response: "Нашёл 3 аналогичных ситуации за последние 30 дней. Среднее время реакции: 2 часа. В 2 из 3 случаев после выполнения задачи метрика вернулась в норму в течение 48 часов.",
    assistant_response_en:
      "Found 3 similar situations in the past 30 days. Average response time: 2 hours. In 2 of the 3 cases the metric returned to target within 48 hours after the task was completed.",
  },
  {
    id: "canned-003",
    trigger_pattern: "объясни.*oos|что.*oos",
    user_message: "Объясни OOS",
    user_message_en: "Explain OOS",
    assistant_response: "**OOS (Out-of-Stock)** — доля позиций ассортимента, отсутствующих на полке в момент проверки.\n\nФормула: `(SKU с нулевым остатком / плановый ассортимент) × 100%`\n\nНорма для вашей организации: **4%** (настроено в Стандартах для ИИ).",
    assistant_response_en:
      "**OOS (Out-of-Stock)** is the share of assortment items missing from the shelf at the time of the check.\n\nFormula: `(SKUs with zero stock / planned assortment) × 100%`\n\nTarget for your organisation: **4%** (configured in AI Standards).",
  },
  {
    id: "canned-004",
    trigger_pattern: "что важно сегодня|приоритеты",
    user_message: "Что важно сегодня?",
    user_message_en: "What's important today?",
    assistant_response: "**Топ-приоритеты сегодня:**\n1. Контроль температуры холодильников 5–8 (27ч без проверки)\n2. OOS молочки 6.8% — выше нормы\n3. 23 SKU с устаревшими ценниками\n\nВсего открытых задач: 18, из них 3 просрочены.",
    assistant_response_en:
      "**Top priorities today:**\n1. Temperature check on fridges 5–8 (27h without one)\n2. Dairy OOS 6.8% — above target\n3. 23 SKUs with stale price tags\n\nOpen tasks: 18, of which 3 are overdue.",
  },
  {
    id: "canned-005",
    trigger_pattern: "магазины.*просрочк|просрочк.*магазин",
    user_message: "Какие магазины с просрочкой?",
    user_message_en: "Which stores have expiry risk?",
    assistant_response: "Сегодня риски просрочки выявлены в СПАР Томск пр. Ленина (молочка, 14 SKU) и Food City Global Market (молочка+Fresh, 9 SKU). По Новосибирску задача уже создана.",
    assistant_response_en:
      "Today's expiry risks were flagged at SPAR Tomsk Lenina pr. (dairy, 14 SKUs) and Food City Global Market (dairy + fresh, 9 SKUs). The Novosibirsk task has already been created.",
  },
  {
    id: "canned-006",
    trigger_pattern: "списания.*норм|норм.*списани",
    user_message: "Какая норма списаний?",
    user_message_en: "What's the write-off target?",
    assistant_response: "Нормы из **Стандартов для ИИ** (настройки организации):\n- Молочка: **2.0%** в неделю\n- Хлебобулочка: **2.5%** в неделю\n- Fresh (овощи/фрукты): **3.0%** в неделю\n- Заморозка: **0.5%** в неделю\n\nЛюбую норму можно изменить в Настройки → Стандарты для ИИ.",
    assistant_response_en:
      "Targets from **AI Standards** (organisation settings):\n- Dairy: **2.0%** per week\n- Bakery: **2.5%** per week\n- Fresh (fruit & veg): **3.0%** per week\n- Frozen: **0.5%** per week\n\nAny target can be edited under Settings → AI Standards.",
  },
  {
    id: "canned-007",
    trigger_pattern: "почему предложил|почему эта задача",
    user_message: "Почему ты предложил именно эту задачу?",
    user_message_en: "Why did you suggest this particular task?",
    assistant_response: "Логика простая: сравниваю факт со стандартом. Когда отклонение превышает пороговое значение из настроек — формирую задачу с конкретным временем и исполнителем. Никакого чёрного ящика: можно нажать «Подробнее» и увидеть точные цифры.",
    assistant_response_en:
      "The logic is simple: I compare actuals to the standard. When the deviation exceeds the threshold from settings, I generate a task with a specific time and assignee. No black box — click “Details” to see the exact numbers.",
  },
  {
    id: "canned-008",
    trigger_pattern: "точность.*предложени|качество.*ии",
    user_message: "Насколько точны предложения ИИ?",
    user_message_en: "How accurate are the AI suggestions?",
    assistant_response: "За апрель: **73% принятых** предложений из 412 сгенерированных. Средняя точность растёт: в марте было 68%. Система учится на ваших правках — каждое принятое/отклонённое предложение улучшает следующие.",
    assistant_response_en:
      "For April: **73% acceptance** out of 412 generated suggestions. Accuracy is climbing: March was 68%. The system learns from your edits — every accepted/rejected suggestion improves the next ones.",
  },
  {
    id: "canned-009",
    trigger_pattern: "сравни магазины|лучший магазин",
    user_message: "Сравни магазины по выполнению задач",
    user_message_en: "Compare stores on task completion",
    assistant_response: "За апрель:\n\n**Лидеры:** Food City Томск Global Market (93.8%), СПАР Томск пр. Ленина 80 (91.4%)\n\n**Требуют внимания:** СПАР Новосибирск Красный пр. (80.1%), СПАР Новосибирск ул. Ленина (82.6%)\n\nПодробный отчёт: Отчёты → Сравнение магазинов",
    assistant_response_en:
      "For April:\n\n**Leaders:** Food City Tomsk Global Market (93.8%), SPAR Tomsk Lenina pr. 80 (91.4%)\n\n**Need attention:** SPAR Novosibirsk Krasny pr. (80.1%), SPAR Novosibirsk Lenina (82.6%)\n\nFull report: Reports → Store comparison",
  },
  {
    id: "canned-010",
    trigger_pattern: "как улучшить|рекомендации",
    user_message: "Как улучшить показатели магазина?",
    user_message_en: "How can I improve store performance?",
    assistant_response: "Три рычага с наибольшим эффектом по данным сети:\n1. **Вечерний контроль скоропорта** — снижает списания на 30–40%\n2. **Своевременная замена ценников** (<4ч после выгрузки) — снижает возвраты на кассе\n3. **Выкладка по OOS-приоритету** вместо планограммы — снижает OOS на 15–25%",
    assistant_response_en:
      "Three high-impact levers from network data:\n1. **Evening perishables check** — cuts write-offs by 30–40%\n2. **Timely price-tag refresh** (<4h after the export) — reduces checkout refunds\n3. **OOS-priority stocking** instead of strict planogram order — cuts OOS by 15–25%",
  },
  {
    id: "canned-011",
    trigger_pattern: "регламент|стандарт.*выкладк",
    user_message: "Покажи регламент выкладки",
    user_message_en: "Show the stocking standard",
    assistant_response: "Нашёл 2 подходящих документа:",
    assistant_response_en: "Found 2 relevant documents:",
    attached_data: {
      data_type: "document_excerpt",
      payload: {
        title: "Регламент выкладки молочной продукции v3",
        excerpt: "§2.1 Выкладка молочных продуктов производится по методу FIFO. Ближайшие к истечению сроки — на передний план...",
        file_url: "/documents/regulation-001.pdf",
        related: ["Стандарт переоценки и стикеровки v2"],
      },
    },
  },
  {
    id: "canned-012",
    trigger_pattern: "бонусные задачи|бонус.*баллы",
    user_message: "Что с бонусными задачами?",
    user_message_en: "What's the status of bonus tasks?",
    assistant_response: "Сейчас активны **2 бонусные задачи** на СПАР Томск (суммарно 350 баллов из 800 бюджета). Дополнительно ИИ предлагает 1 бонусную задачу в рамках цели OOS: 100 баллов за фотоотчёт полки молочки. Принять в разделе AI → Предложения.",
    assistant_response_en:
      "Currently **2 bonus tasks** are active at SPAR Tomsk (350 points total out of an 800-point budget). The AI is also proposing 1 bonus task under the OOS goal: 100 points for a dairy-shelf photo report. Accept it under AI → Suggestions.",
  },
];
