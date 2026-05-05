import type { Notification } from "@/lib/types";

/**
 * @endpoint GET /api/notifications
 * 18 notifications — mix of TASK_REVIEW / TASK_REJECTED / TASK_STATE_CHANGED / GENERIC.
 * Последние 7 дней. Mix is_read true/false.
 */

const now = new Date("2026-05-01T10:00:00+07:00");
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) =>
  new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_NOTIFICATIONS: Notification[] = [
  // ── TASK_REVIEW (6) ─────────────────────────────────────────────
  {
    id: "notif-001",
    user_id: 4, // Романов (SUPERVISOR)
    category: "TASK_REVIEW",
    title: "Задача завершена и ждёт проверки",
    body: "Козлова Дарья завершила «Выкладка молочной полки в холодильнике 3» и отправила на проверку.",
    data: { task_id: "task-006", store_id: 1, assignee_id: 15 },
    link: "/tasks/task-006",
    is_read: false,
    is_archived: false,
    created_at: hoursAgo(1),
  },
  {
    id: "notif-002",
    user_id: 4,
    category: "TASK_REVIEW",
    title: "Задача завершена и ждёт проверки",
    body: "Новиков Максим завершил «Выкладка пива по планограмме» и отправил на проверку.",
    data: { task_id: "task-007", store_id: 1, assignee_id: 16 },
    link: "/tasks/task-007",
    is_read: false,
    is_archived: false,
    created_at: hoursAgo(2),
  },
  {
    id: "notif-003",
    user_id: 5, // Иванов (STORE_DIRECTOR)
    category: "TASK_REVIEW",
    title: "Задача завершена и ждёт проверки",
    body: "Степанов Андрей завершил «Переоценка кондитерки по выгрузке от 27 апр» и отправил на проверку.",
    data: { task_id: "task-008", store_id: 1, assignee_id: 19 },
    link: "/tasks/task-008",
    is_read: true,
    is_archived: false,
    created_at: hoursAgo(5),
  },
  {
    id: "notif-004",
    user_id: 4,
    category: "TASK_REVIEW",
    title: "Задача завершена и ждёт проверки",
    body: "Кириллова Светлана завершила «Инвентаризация заморозки» — приложена фотография акта.",
    data: { task_id: "task-012", store_id: 4, assignee_id: 21, has_photo: true },
    link: "/tasks/task-012",
    is_read: false,
    is_archived: false,
    created_at: hoursAgo(3),
  },
  {
    id: "notif-005",
    user_id: 12, // Тарасова (SUPERVISOR Food City)
    category: "TASK_REVIEW",
    title: "Задача завершена и ждёт проверки",
    body: "Соловьева Ирина завершила «Подготовка зоны выпечки» и отправила на проверку.",
    data: { task_id: "task-011", store_id: 7, assignee_id: 25 },
    link: "/tasks/task-011",
    is_read: true,
    is_archived: false,
    created_at: daysAgo(1),
  },
  {
    id: "notif-006",
    user_id: 4,
    category: "TASK_REVIEW",
    title: "Задача завершена и ждёт проверки",
    body: "Волкова Марина завершила «Проверка сроков годности молочки» — требуется проверка фото.",
    data: { task_id: "task-005", store_id: 4, assignee_id: 23, has_photo: true },
    link: "/tasks/task-005",
    is_read: false,
    is_archived: false,
    created_at: daysAgo(2),
  },

  // ── TASK_REJECTED (4) ───────────────────────────────────────────
  {
    id: "notif-007",
    user_id: 17, // Медведева (WORKER)
    category: "TASK_REJECTED",
    title: "Задача отклонена — требуется повторное выполнение",
    body: "Инвентаризация бакалеи отклонена: «Отчёт неполный — не хватает скан-листа участка 5. Пересчитать и приложить фото.»",
    data: { task_id: "task-016", reviewer_id: 4, reviewer_name: "Романов И. А." },
    link: "/tasks/task-016",
    is_read: false,
    is_archived: false,
    created_at: hoursAgo(4),
  },
  {
    id: "notif-008",
    user_id: 19, // Захарова (WORKER)
    category: "TASK_REJECTED",
    title: "Задача отклонена — требуется повторное выполнение",
    body: "Замена ценников на акционных стеллажах отклонена: «Ценники на стеллаже 12 не обновлены. Повторить.»",
    data: { task_id: "task-020", reviewer_id: 5, reviewer_name: "Иванов А. С." },
    link: "/tasks/task-020",
    is_read: true,
    is_archived: false,
    created_at: daysAgo(1),
  },
  {
    id: "notif-009",
    user_id: 24, // Лебедев (WORKER)
    category: "TASK_REJECTED",
    title: "Задача отклонена — требуется повторное выполнение",
    body: "Приёмка алкоголя от Сибирского винного дома отклонена: «Акт расхождения по 3 позициям не приложен. Уточнить с поставщиком.»",
    data: { task_id: "task-014", reviewer_id: 4, reviewer_name: "Романов И. А." },
    link: "/tasks/task-014",
    is_read: true,
    is_archived: false,
    created_at: daysAgo(3),
  },
  {
    id: "notif-010",
    user_id: 22, // Степанов (WORKER)
    category: "TASK_REJECTED",
    title: "Задача отклонена — требуется повторное выполнение",
    body: "Замена ценников после переоценки отклонена: «Обновлено 18 из 23 SKU. Проверить стеллажи 4, 7.»",
    data: { task_id: "task-023", reviewer_id: 7, reviewer_name: "Сидоров К. М." },
    link: "/tasks/task-023",
    is_read: false,
    is_archived: false,
    created_at: daysAgo(2),
  },

  // ── TASK_STATE_CHANGED (5) ──────────────────────────────────────
  {
    id: "notif-011",
    user_id: 5,
    category: "TASK_STATE_CHANGED",
    title: "Задача автоматически принята",
    body: "«Открытие зоны самообслуживания» (политика авто-приёмки) — принята автоматически. Исполнитель: Попов Владимир.",
    data: { task_id: "task-010", auto: true, assignee_id: 20 },
    link: "/tasks/task-010",
    is_read: true,
    is_archived: false,
    created_at: hoursAgo(6),
  },
  {
    id: "notif-012",
    user_id: 5,
    category: "TASK_STATE_CHANGED",
    title: "Задача автоматически принята",
    body: "«Уборка прикассовой зоны» (политика авто-приёмки) — принята автоматически. Исполнитель: Медведева Татьяна.",
    data: { task_id: "task-013", auto: true, assignee_id: 17 },
    link: "/tasks/task-013",
    is_read: true,
    is_archived: false,
    created_at: daysAgo(1),
  },
  {
    id: "notif-013",
    user_id: 4,
    category: "TASK_STATE_CHANGED",
    title: "Задача переведена в статус «В работе»",
    body: "Федоров Алексей приступил к «Приёмка молочки от ООО «Деревенское молочко»».",
    data: { task_id: "task-004", new_state: "IN_PROGRESS", assignee_id: 18 },
    link: "/tasks/task-004",
    is_read: false,
    is_archived: false,
    created_at: hoursAgo(8),
  },
  {
    id: "notif-014",
    user_id: 12,
    category: "TASK_STATE_CHANGED",
    title: "Задача автоматически принята",
    body: "«Заказ расходников» выполнен и автоматически принят системой.",
    data: { task_id: "task-003", auto: true, assignee_id: 15 },
    link: "/tasks/task-003",
    is_read: true,
    is_archived: false,
    created_at: daysAgo(4),
  },
  {
    id: "notif-015",
    user_id: 4,
    category: "TASK_STATE_CHANGED",
    title: "Задача приостановлена",
    body: "Кириллова Светлана поставила на паузу «Заказ на расходники РЦ Новосибирск»: ожидает подтверждения бюджета.",
    data: { task_id: "task-015", new_state: "PAUSED", assignee_id: 21 },
    link: "/tasks/task-015",
    is_read: false,
    is_archived: false,
    created_at: daysAgo(5),
  },

  // ── AI_SUGGESTION_NEW (3) ───────────────────────────────────────
  {
    id: "notif-ai-001",
    user_id: 4, // Романов (SUPERVISOR)
    category: "AI_SUGGESTION_NEW",
    title: "ИИ предложил задачу: Переоценка молочки после промо",
    body: "Зафиксировано отклонение sell-through на 18% ниже нормы в категории «Молочная». Предлагается задача по переоценке 23 SKU в холодильнике 2.",
    data: { suggestion_id: "sugg-001", store_id: 1, suggestion_type: "TASK_SUGGESTION" },
    link: "/ai/suggestions?id=sugg-001",
    is_read: false,
    is_archived: false,
    created_at: hoursAgo(2),
  },
  {
    id: "notif-ai-002",
    user_id: 4,
    category: "AI_SUGGESTION_NEW",
    title: "ИИ предложил цель: Снижение OOS в бакалее",
    body: "Выявлено OOS 11,4% против нормы 6% в группе «Бакалея». ИИ предлагает цель — снизить до 7% за 3 недели через ежедневный мониторинг и задачи по приёмке.",
    data: { suggestion_id: "sugg-002", store_id: 1, suggestion_type: "GOAL_SUGGESTION" },
    link: "/ai/suggestions?id=sugg-002",
    is_read: false,
    is_archived: false,
    created_at: hoursAgo(14),
  },
  {
    id: "notif-ai-003",
    user_id: 3, // Соколова (NETWORK_OPS)
    category: "AI_SUGGESTION_NEW",
    title: "ИИ предложил бонусную задачу: Выкладка нового промо-острова",
    body: "Промо-остров «Пиво + снеки» не выставлен в SPAR Новосибирск (Гоголя) — акция стартует завтра. ИИ предлагает бонусную задачу для работника зала.",
    data: { suggestion_id: "sugg-003", store_id: 4, suggestion_type: "BONUS_TASK_SUGGESTION" },
    link: "/ai/suggestions?id=sugg-003",
    is_read: true,
    is_archived: false,
    created_at: daysAgo(1),
  },

  // ── AI_ANOMALY (2) ──────────────────────────────────────────────
  {
    id: "notif-ai-004",
    user_id: 3, // Соколова (NETWORK_OPS)
    category: "AI_ANOMALY",
    title: "Аномалия: низкий accept rate у супервайзера Романова",
    body: "За последние 14 дней Романов И. А. принял только 12% предложений ИИ (норма 55–70%). Возможно, модель неадекватна для scope SPAR Томск — рекомендуется обратная связь.",
    data: { supervisor_id: 4, accept_rate_pct: 12, period_days: 14 },
    link: "/ai/suggestions",
    is_read: false,
    is_archived: false,
    created_at: daysAgo(2),
  },
  {
    id: "notif-ai-005",
    user_id: 3,
    category: "AI_ANOMALY",
    title: "Аномалия: источник данных POS не обновлялся 48 часов",
    body: "Коннектор POS для SPAR Томск (ул. Учебная) не синхронизировался 48 ч. Предложения ИИ для этого магазина могут быть устаревшими.",
    data: { connector_id: "conn-pos-001", store_id: 1, gap_hours: 48 },
    link: "/integrations",
    is_read: true,
    is_archived: false,
    created_at: daysAgo(3),
  },

  // ── GENERIC (3) ─────────────────────────────────────────────────
  {
    id: "notif-016",
    user_id: 4,
    category: "GENERIC",
    title: "Синхронизация с планировщиком завершена",
    body: "LAMA-коннектор успешно выгрузил расписание на неделю 5–11 мая. Импортировано 47 смен по 8 магазинам.",
    data: { connector_type: "PLANNER", shifts_imported: 47, stores_count: 8 },
    link: "/settings/integrations",
    is_read: true,
    is_archived: false,
    created_at: daysAgo(1),
  },
  {
    id: "notif-017",
    user_id: 3, // Соколова (NETWORK_OPS)
    category: "GENERIC",
    title: "Обновление системы WFM Admin 2.4.1",
    body: "Доступно обновление: улучшена скорость загрузки отчётов, исправлены мелкие баги в модуле задач.",
    data: { version: "2.4.1", changelog_url: "/changelog" },
    is_read: false,
    is_archived: false,
    created_at: daysAgo(3),
  },
  {
    id: "notif-018",
    user_id: 3,
    category: "GENERIC",
    title: "Плановое техническое обслуживание",
    body: "3 мая 2026 с 02:00 до 04:00 (МСК) запланированы технические работы. Сервис будет недоступен.",
    data: { maintenance_start: "2026-05-03T02:00:00Z", maintenance_end: "2026-05-03T04:00:00Z" },
    is_read: true,
    is_archived: false,
    created_at: daysAgo(6),
  },
];
