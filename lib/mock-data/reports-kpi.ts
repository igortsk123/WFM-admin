/**
 * @endpoint GET /api/reports/kpi
 * KPI metrics for the last month — network + 3 stores.
 * Sparklines: 30 data points each.
 */

const genSparkline = (base: number, variance: number, len = 30): number[] =>
  Array.from({ length: len }, () =>
    Math.round((base + (Math.random() * variance * 2 - variance)) * 10) / 10
  );

const genSparklineInt = (base: number, variance: number, len = 30): number[] =>
  Array.from({ length: len }, () =>
    Math.round(base + (Math.random() * variance * 2 - variance))
  );

export interface KpiMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
  change_pct: number;
  sparkline: number[];
}

export interface KpiPerformer {
  user_id: number;
  user_name: string;
  store_name: string;
  completion_rate: number;
  tasks_completed: number;
  on_time_rate: number;
  rating: number;
}

export interface KpiByDimension {
  id: number;
  label: string;
  completion_rate: number;
  tasks_total: number;
  on_time_rate: number;
}

export interface KpiReport {
  scope: "NETWORK" | "STORE";
  store_id?: number;
  store_name?: string;
  period_start: string;
  period_end: string;
  metrics: KpiMetric[];
  top_performers: KpiPerformer[];
  needs_support: KpiPerformer[];
  by_work_type: KpiByDimension[];
  by_zone: KpiByDimension[];
}

const PERIOD_START = "2026-04-01";
const PERIOD_END = "2026-04-30";

// ── Network KPI ────────────────────────────────────────────────────

export const MOCK_KPI_NETWORK: KpiReport = {
  scope: "NETWORK",
  period_start: PERIOD_START,
  period_end: PERIOD_END,
  metrics: [
    {
      key: "completion_rate",
      label: "Выполнение задач",
      value: 87.3,
      unit: "%",
      change_pct: +2.1,
      sparkline: genSparkline(87.3, 5),
    },
    {
      key: "return_rate",
      label: "Возврат на доработку",
      value: 5.8,
      unit: "%",
      change_pct: -0.7,
      sparkline: genSparkline(5.8, 1.5),
    },
    {
      key: "on_time_rate",
      label: "Выполнено вовремя",
      value: 91.2,
      unit: "%",
      change_pct: +1.4,
      sparkline: genSparkline(91.2, 4),
    },
    {
      key: "hours_plan",
      label: "Плановые часы",
      value: 4840,
      unit: "ч",
      change_pct: 0,
      sparkline: genSparklineInt(161, 15),
    },
    {
      key: "hours_actual",
      label: "Фактические часы",
      value: 4712,
      unit: "ч",
      change_pct: -2.6,
      sparkline: genSparklineInt(157, 18),
    },
    {
      key: "fot_ratio",
      label: "ФОТ факт / план",
      value: 97.4,
      unit: "%",
      change_pct: -2.6,
      sparkline: genSparkline(97.4, 2),
    },
  ],
  top_performers: [
    { user_id: 25, user_name: "Соловьева Ирина Дмитриевна", store_name: "Food City Томск Global Market", completion_rate: 98.1, tasks_completed: 53, on_time_rate: 97.8, rating: 4.9 },
    { user_id: 23, user_name: "Волкова Марина Олеговна", store_name: "СПАР Новосибирск, ул. Ленина 55", completion_rate: 96.4, tasks_completed: 47, on_time_rate: 95.0, rating: 4.8 },
    { user_id: 19, user_name: "Захарова Наталья Петровна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 95.7, tasks_completed: 51, on_time_rate: 94.5, rating: 4.7 },
    { user_id: 15, user_name: "Козлова Дарья Андреевна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 94.2, tasks_completed: 49, on_time_rate: 93.1, rating: 4.6 },
    { user_id: 17, user_name: "Медведева Татьяна Ивановна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 93.8, tasks_completed: 44, on_time_rate: 92.4, rating: 4.5 },
    { user_id: 21, user_name: "Кириллова Светлана Васильевна", store_name: "СПАР Новосибирск, ул. Ленина 55", completion_rate: 92.9, tasks_completed: 41, on_time_rate: 91.7, rating: 4.4 },
    { user_id: 18, user_name: "Федоров Алексей Николаевич", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 92.1, tasks_completed: 38, on_time_rate: 90.5, rating: 4.3 },
    { user_id: 24, user_name: "Лебедев Роман Александрович", store_name: "СПАР Томск, ул. Красноармейская 99", completion_rate: 91.5, tasks_completed: 42, on_time_rate: 90.1, rating: 4.2 },
    { user_id: 27, user_name: "Белова Юлия Сергеевна", store_name: "Food City Томск Global Market", completion_rate: 90.8, tasks_completed: 36, on_time_rate: 89.3, rating: 4.1 },
    { user_id: 20, user_name: "Попов Владимир Сергеевич", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 89.7, tasks_completed: 34, on_time_rate: 88.7, rating: 4.0 },
  ],
  needs_support: [
    { user_id: 22, user_name: "Степанов Андрей Борисович", store_name: "СПАР Новосибирск, ул. Ленина 55", completion_rate: 71.2, tasks_completed: 28, on_time_rate: 68.4, rating: 3.5 },
    { user_id: 26, user_name: "Гусев Павел Михайлович", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 73.5, tasks_completed: 31, on_time_rate: 71.0, rating: 3.7 },
    { user_id: 16, user_name: "Новиков Максим Юрьевич", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 75.8, tasks_completed: 29, on_time_rate: 72.3, rating: 3.8 },
    { user_id: 28, user_name: "Тихонов Игорь Васильевич", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 62.0, tasks_completed: 14, on_time_rate: 58.3, rating: 3.3 },
    { user_id: 29, user_name: "Орлов Виктор Павлович", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 78.1, tasks_completed: 22, on_time_rate: 74.6, rating: 3.9 },
  ],
  by_work_type: [
    { id: 4, label: "Выкладка", completion_rate: 91.2, tasks_total: 312, on_time_rate: 89.5 },
    { id: 5, label: "Переоценка", completion_rate: 88.7, tasks_total: 148, on_time_rate: 87.1 },
    { id: 6, label: "Инвентаризация", completion_rate: 82.4, tasks_total: 67, on_time_rate: 79.8 },
    { id: 11, label: "Контроль качества", completion_rate: 93.6, tasks_total: 184, on_time_rate: 92.3 },
    { id: 13, label: "Складские работы", completion_rate: 85.9, tasks_total: 221, on_time_rate: 84.2 },
    { id: 12, label: "Уборка", completion_rate: 96.1, tasks_total: 430, on_time_rate: 95.8 },
    { id: 2, label: "Касса", completion_rate: 97.3, tasks_total: 620, on_time_rate: 96.9 },
    { id: 3, label: "КСО (самокассы)", completion_rate: 96.8, tasks_total: 214, on_time_rate: 96.4 },
    { id: 9, label: "Мерчендайзинг (планограммы)", completion_rate: 89.4, tasks_total: 98, on_time_rate: 87.7 },
    { id: 10, label: "Ценообразование", completion_rate: 90.1, tasks_total: 87, on_time_rate: 88.5 },
    { id: 1, label: "Менеджерские операции", completion_rate: 84.3, tasks_total: 52, on_time_rate: 82.0 },
    { id: 7, label: "Другие работы", completion_rate: 79.6, tasks_total: 44, on_time_rate: 77.1 },
  ],
  by_zone: [
    { id: 1, label: "Торговый зал", completion_rate: 90.4, tasks_total: 842, on_time_rate: 89.1 },
    { id: 2, label: "Склад", completion_rate: 84.7, tasks_total: 287, on_time_rate: 83.2 },
    { id: 3, label: "Касса", completion_rate: 97.1, tasks_total: 634, on_time_rate: 96.7 },
    { id: 4, label: "Самокассы", completion_rate: 96.3, tasks_total: 214, on_time_rate: 95.9 },
    { id: 5, label: "Прикассовая зона", completion_rate: 93.8, tasks_total: 178, on_time_rate: 93.4 },
    { id: 6, label: "Холодильники", completion_rate: 88.2, tasks_total: 223, on_time_rate: 87.1 },
  ],
};

// ── Store KPI: SPAR-TOM-001 ────────────────────────────────────────

export const MOCK_KPI_STORE_1: KpiReport = {
  scope: "STORE",
  store_id: 1,
  store_name: "СПАР Томск, пр. Ленина 80",
  period_start: PERIOD_START,
  period_end: PERIOD_END,
  metrics: [
    { key: "completion_rate", label: "Выполнение задач", value: 89.1, unit: "%", change_pct: +3.2, sparkline: genSparkline(89.1, 5) },
    { key: "return_rate", label: "Возврат на доработку", value: 4.9, unit: "%", change_pct: -1.1, sparkline: genSparkline(4.9, 1.2) },
    { key: "on_time_rate", label: "Выполнено вовремя", value: 92.7, unit: "%", change_pct: +1.9, sparkline: genSparkline(92.7, 4) },
    { key: "hours_plan", label: "Плановые часы", value: 1240, unit: "ч", change_pct: 0, sparkline: genSparklineInt(41, 5) },
    { key: "hours_actual", label: "Фактические часы", value: 1198, unit: "ч", change_pct: -3.4, sparkline: genSparklineInt(40, 6) },
    { key: "fot_ratio", label: "ФОТ факт / план", value: 96.6, unit: "%", change_pct: -3.4, sparkline: genSparkline(96.6, 2) },
  ],
  top_performers: [
    { user_id: 19, user_name: "Захарова Наталья Петровна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 97.4, tasks_completed: 38, on_time_rate: 96.2, rating: 4.8 },
    { user_id: 15, user_name: "Козлова Дарья Андреевна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 95.2, tasks_completed: 41, on_time_rate: 93.8, rating: 4.6 },
    { user_id: 17, user_name: "Медведева Татьяна Ивановна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 93.7, tasks_completed: 36, on_time_rate: 92.1, rating: 4.5 },
    { user_id: 18, user_name: "Федоров Алексей Николаевич", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 91.8, tasks_completed: 33, on_time_rate: 90.4, rating: 4.3 },
    { user_id: 20, user_name: "Попов Владимир Сергеевич", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 90.1, tasks_completed: 29, on_time_rate: 88.9, rating: 4.1 },
    { user_id: 25, user_name: "Соловьева Ирина Дмитриевна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 89.5, tasks_completed: 27, on_time_rate: 88.0, rating: 4.0 },
    { user_id: 27, user_name: "Белова Юлия Сергеевна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 88.7, tasks_completed: 25, on_time_rate: 87.2, rating: 3.9 },
    { user_id: 24, user_name: "Лебедев Роман Александрович", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 88.0, tasks_completed: 31, on_time_rate: 86.5, rating: 3.9 },
    { user_id: 23, user_name: "Волкова Марина Олеговна", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 87.3, tasks_completed: 28, on_time_rate: 85.8, rating: 3.8 },
    { user_id: 26, user_name: "Гусев Павел Михайлович", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 86.8, tasks_completed: 24, on_time_rate: 85.0, rating: 3.8 },
  ],
  needs_support: [
    { user_id: 16, user_name: "Новиков Максим Юрьевич", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 74.2, tasks_completed: 22, on_time_rate: 71.5, rating: 3.7 },
    { user_id: 22, user_name: "Степанов Андрей Борисович", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 70.1, tasks_completed: 19, on_time_rate: 67.3, rating: 3.4 },
    { user_id: 29, user_name: "Орлов Виктор Павлович", store_name: "СПАР Томск, пр. Ленина 80", completion_rate: 76.5, tasks_completed: 18, on_time_rate: 73.2, rating: 3.8 },
  ],
  by_work_type: MOCK_KPI_NETWORK.by_work_type.map((d) => ({
    ...d,
    completion_rate: Math.round((d.completion_rate + (Math.random() * 4 - 2)) * 10) / 10,
    tasks_total: Math.round(d.tasks_total / 8),
  })),
  by_zone: MOCK_KPI_NETWORK.by_zone.map((d) => ({
    ...d,
    completion_rate: Math.round((d.completion_rate + (Math.random() * 4 - 2)) * 10) / 10,
    tasks_total: Math.round(d.tasks_total / 8),
  })),
};

// ── Store KPI: FC-TOM-001 ─────────────────────────────────────────

export const MOCK_KPI_STORE_7: KpiReport = {
  scope: "STORE",
  store_id: 7,
  store_name: "Food City Томск Global Market, пр. Ленина 217",
  period_start: PERIOD_START,
  period_end: PERIOD_END,
  metrics: [
    { key: "completion_rate", label: "Выполнение задач", value: 91.5, unit: "%", change_pct: +4.1, sparkline: genSparkline(91.5, 4) },
    { key: "return_rate", label: "Возврат на доработку", value: 4.2, unit: "%", change_pct: -1.4, sparkline: genSparkline(4.2, 1) },
    { key: "on_time_rate", label: "Выполнено вовремя", value: 93.8, unit: "%", change_pct: +2.3, sparkline: genSparkline(93.8, 3.5) },
    { key: "hours_plan", label: "Плановые часы", value: 1580, unit: "ч", change_pct: 0, sparkline: genSparklineInt(53, 7) },
    { key: "hours_actual", label: "Фактические часы", value: 1543, unit: "ч", change_pct: -2.3, sparkline: genSparklineInt(51, 8) },
    { key: "fot_ratio", label: "ФОТ факт / план", value: 97.7, unit: "%", change_pct: -2.3, sparkline: genSparkline(97.7, 1.5) },
  ],
  top_performers: [
    { user_id: 25, user_name: "Соловьева Ирина Дмитриевна", store_name: "Food City Томск Global Market", completion_rate: 98.2, tasks_completed: 52, on_time_rate: 97.6, rating: 4.9 },
    { user_id: 27, user_name: "Белова Юлия Сергеевна", store_name: "Food City Томск Global Market", completion_rate: 93.4, tasks_completed: 44, on_time_rate: 92.0, rating: 4.4 },
  ],
  needs_support: [
    { user_id: 26, user_name: "Гусев Павел Михайлович", store_name: "Food City Томск Global Market", completion_rate: 77.3, tasks_completed: 21, on_time_rate: 74.1, rating: 3.8 },
  ],
  by_work_type: MOCK_KPI_NETWORK.by_work_type.map((d) => ({
    ...d,
    completion_rate: Math.round((d.completion_rate + (Math.random() * 5 - 1)) * 10) / 10,
    tasks_total: Math.round(d.tasks_total / 7),
  })),
  by_zone: MOCK_KPI_NETWORK.by_zone.map((d) => ({
    ...d,
    completion_rate: Math.round((d.completion_rate + (Math.random() * 5 - 1)) * 10) / 10,
    tasks_total: Math.round(d.tasks_total / 7),
  })),
};

// ── Store KPI: SPAR-NSK-001 ───────────────────────────────────────

export const MOCK_KPI_STORE_4: KpiReport = {
  scope: "STORE",
  store_id: 4,
  store_name: "СПАР Новосибирск, ул. Ленина 55",
  period_start: PERIOD_START,
  period_end: PERIOD_END,
  metrics: [
    { key: "completion_rate", label: "Выполнение задач", value: 83.8, unit: "%", change_pct: -1.2, sparkline: genSparkline(83.8, 6) },
    { key: "return_rate", label: "Возврат на доработку", value: 7.1, unit: "%", change_pct: +1.8, sparkline: genSparkline(7.1, 2) },
    { key: "on_time_rate", label: "Выполнено вовремя", value: 87.4, unit: "%", change_pct: -0.9, sparkline: genSparkline(87.4, 5) },
    { key: "hours_plan", label: "Плановые часы", value: 1120, unit: "ч", change_pct: 0, sparkline: genSparklineInt(37, 6) },
    { key: "hours_actual", label: "Фактические часы", value: 1071, unit: "ч", change_pct: -4.4, sparkline: genSparklineInt(36, 7) },
    { key: "fot_ratio", label: "ФОТ факт / план", value: 95.6, unit: "%", change_pct: -4.4, sparkline: genSparkline(95.6, 2.5) },
  ],
  top_performers: [
    { user_id: 23, user_name: "Волкова Марина Олеговна", store_name: "СПАР Новосибирск, ул. Ленина 55", completion_rate: 96.1, tasks_completed: 46, on_time_rate: 94.7, rating: 4.8 },
    { user_id: 21, user_name: "Кириллова Светлана Васильевна", store_name: "СПАР Новосибирск, ул. Ленина 55", completion_rate: 91.4, tasks_completed: 39, on_time_rate: 90.2, rating: 4.3 },
  ],
  needs_support: [
    { user_id: 22, user_name: "Степанов Андрей Борисович", store_name: "СПАР Новосибирск, ул. Ленина 55", completion_rate: 68.9, tasks_completed: 24, on_time_rate: 65.1, rating: 3.4 },
    { user_id: 31, user_name: "Мельников Евгений Игоревич", store_name: "СПАР Новосибирск, ул. Ленина 55", completion_rate: 72.4, tasks_completed: 20, on_time_rate: 69.8, rating: 3.6 },
  ],
  by_work_type: MOCK_KPI_NETWORK.by_work_type.map((d) => ({
    ...d,
    completion_rate: Math.round((d.completion_rate - 3 + (Math.random() * 4 - 2)) * 10) / 10,
    tasks_total: Math.round(d.tasks_total / 9),
  })),
  by_zone: MOCK_KPI_NETWORK.by_zone.map((d) => ({
    ...d,
    completion_rate: Math.round((d.completion_rate - 3 + (Math.random() * 4 - 2)) * 10) / 10,
    tasks_total: Math.round(d.tasks_total / 9),
  })),
};
