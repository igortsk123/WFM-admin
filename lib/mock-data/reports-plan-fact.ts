/**
 * @endpoint GET /api/reports/plan-fact
 * Daily plan vs actual breakdown for 28 days (April 2026).
 * by_store (8 stores), by_user (top 15), by_work_type (12).
 */

export interface PlanFactDay {
  date: string;
  weekday: string;
  planned_hours: number;
  actual_hours: number;
  planned_tasks: number;
  completed_tasks: number;
  completion_rate: number;
}

export interface PlanFactByStore {
  store_id: number;
  store_name: string;
  days: PlanFactDay[];
  total_planned_hours: number;
  total_actual_hours: number;
  total_planned_tasks: number;
  total_completed_tasks: number;
  avg_completion_rate: number;
}

export interface PlanFactByUser {
  user_id: number;
  user_name: string;
  store_name: string;
  days: PlanFactDay[];
  total_planned: number;
  total_completed: number;
  avg_completion_rate: number;
}

export interface PlanFactByWorkType {
  work_type_id: number;
  work_type_name: string;
  days: PlanFactDay[];
  avg_completion_rate: number;
}

export interface PlanFactSummary {
  period_start: string;
  period_end: string;
  days: PlanFactDay[];
  by_store: PlanFactByStore[];
  by_user: PlanFactByUser[];
  by_work_type: PlanFactByWorkType[];
  worst_day: { date: string; completion_rate: number; reason: string };
  best_day: { date: string; completion_rate: number };
}

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

// April 1 2026 is Wednesday (day index 3)
const aprilDays: PlanFactDay[] = Array.from({ length: 28 }, (_, i) => {
  const d = new Date("2026-04-01");
  d.setDate(d.getDate() + i);
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  const baseHours = isWeekend ? 620 : 780;
  const baseTasks = isWeekend ? 210 : 265;
  const noise = Math.random() * 0.12 - 0.06;
  const plannedHours = Math.round(baseHours * (1 + noise));
  // April 9 — low completion (holiday shift chaos)
  const isLowDay = i === 8;
  const completionFactor = isLowDay ? 0.67 : 0.82 + Math.random() * 0.14;
  const actualHours = Math.round(plannedHours * completionFactor);
  const plannedTasks = Math.round(baseTasks * (1 + noise));
  const completedTasks = Math.round(plannedTasks * completionFactor);
  return {
    date: d.toISOString().split("T")[0],
    weekday: WEEKDAYS[d.getDay()],
    planned_hours: plannedHours,
    actual_hours: actualHours,
    planned_tasks: plannedTasks,
    completed_tasks: completedTasks,
    completion_rate: Math.round((completedTasks / plannedTasks) * 1000) / 10,
  };
});

const storeConfigs = [
  { store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", weight: 1.2 },
  { store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", weight: 0.8 },
  { store_id: 3, store_name: "СПАР Томск, пр. Фрунзе 92а", weight: 0.9 },
  { store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", weight: 1.3 },
  { store_id: 5, store_name: "СПАР Новосибирск, Красный пр. 200", weight: 1.0 },
  { store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", weight: 0.9 },
  { store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", weight: 1.4 },
  { store_id: 8, store_name: "Food City Томск, ул. Учебная 39", weight: 0.8 },
];

const mkStoreDays = (weight: number, perfBias: number): PlanFactDay[] =>
  aprilDays.map((d) => {
    const ph = Math.round((d.planned_hours / 8) * weight);
    const cr = Math.min(99, Math.max(50, d.completion_rate + perfBias + Math.random() * 6 - 3));
    const pt = Math.round((d.planned_tasks / 8) * weight);
    const ct = Math.round(pt * (cr / 100));
    return {
      date: d.date,
      weekday: d.weekday,
      planned_hours: ph,
      actual_hours: Math.round(ph * (cr / 100)),
      planned_tasks: pt,
      completed_tasks: ct,
      completion_rate: Math.round(cr * 10) / 10,
    };
  });

const byStore: PlanFactByStore[] = storeConfigs.map(({ store_id, store_name, weight }, idx) => {
  const perfBias = [1.5, -0.5, 0.5, -2.5, 0, -1, 3, -1][idx];
  const days = mkStoreDays(weight, perfBias);
  const totalPH = days.reduce((s, d) => s + d.planned_hours, 0);
  const totalAH = days.reduce((s, d) => s + d.actual_hours, 0);
  const totalPT = days.reduce((s, d) => s + d.planned_tasks, 0);
  const totalCT = days.reduce((s, d) => s + d.completed_tasks, 0);
  return {
    store_id,
    store_name,
    days,
    total_planned_hours: totalPH,
    total_actual_hours: totalAH,
    total_planned_tasks: totalPT,
    total_completed_tasks: totalCT,
    avg_completion_rate: Math.round((totalCT / totalPT) * 1000) / 10,
  };
});

const userConfigs = [
  { user_id: 15, user_name: "Козлова Дарья Андреевна", store_name: "СПАР Томск, пр. Ленина 80", bias: 5 },
  { user_id: 16, user_name: "Новиков Максим Юрьевич", store_name: "СПАР Томск, пр. Ленина 80", bias: -8 },
  { user_id: 17, user_name: "Медведева Татьяна Ивановна", store_name: "СПАР Томск, пр. Ленина 80", bias: 3 },
  { user_id: 18, user_name: "Федоров Алексей Николаевич", store_name: "СПАР Томск, пр. Ленина 80", bias: 1 },
  { user_id: 19, user_name: "Захарова Наталья Петровна", store_name: "СПАР Томск, пр. Ленина 80", bias: 6 },
  { user_id: 20, user_name: "Попов Владимир Сергеевич", store_name: "СПАР Томск, пр. Ленина 80", bias: 2 },
  { user_id: 21, user_name: "Кириллова Светлана Васильевна", store_name: "СПАР Новосибирск, ул. Ленина 55", bias: 3 },
  { user_id: 22, user_name: "Степанов Андрей Борисович", store_name: "СПАР Новосибирск, ул. Ленина 55", bias: -11 },
  { user_id: 23, user_name: "Волкова Марина Олеговна", store_name: "СПАР Новосибирск, ул. Ленина 55", bias: 7 },
  { user_id: 24, user_name: "Лебедев Роман Александрович", store_name: "СПАР Томск, ул. Красноармейская 99", bias: 1 },
  { user_id: 25, user_name: "Соловьева Ирина Дмитриевна", store_name: "Food City Томск Global Market", bias: 8 },
  { user_id: 26, user_name: "Гусев Павел Михайлович", store_name: "СПАР Томск, пр. Ленина 80", bias: -5 },
  { user_id: 27, user_name: "Белова Юлия Сергеевна", store_name: "Food City Томск Global Market", bias: 4 },
  { user_id: 29, user_name: "Орлов Виктор Павлович", store_name: "СПАР Томск, пр. Ленина 80", bias: -3 },
  { user_id: 31, user_name: "Мельников Евгений Игоревич", store_name: "СПАР Новосибирск, ул. Ленина 55", bias: -6 },
];

const byUser: PlanFactByUser[] = userConfigs.map(({ user_id, user_name, store_name, bias }) => {
  const days = aprilDays.map((d) => {
    const pt = Math.round(d.planned_tasks / 30 + Math.random() * 2);
    const cr = Math.min(100, Math.max(40, d.completion_rate + bias + Math.random() * 8 - 4));
    const ct = Math.round(pt * (cr / 100));
    return { date: d.date, weekday: d.weekday, planned_hours: 0, actual_hours: 0, planned_tasks: pt, completed_tasks: ct, completion_rate: Math.round(cr * 10) / 10 };
  });
  const totalP = days.reduce((s, d) => s + d.planned_tasks, 0);
  const totalC = days.reduce((s, d) => s + d.completed_tasks, 0);
  return {
    user_id,
    user_name,
    store_name,
    days,
    total_planned: totalP,
    total_completed: totalC,
    avg_completion_rate: Math.round((totalC / totalP) * 1000) / 10,
  };
});

const workTypeConfigs = [
  { id: 4, name: "Выкладка", bias: 3 },
  { id: 5, name: "Переоценка", bias: 1 },
  { id: 6, name: "Инвентаризация", bias: -4 },
  { id: 11, name: "Контроль качества", bias: 5 },
  { id: 13, name: "Складские работы", bias: -1 },
  { id: 12, name: "Уборка", bias: 7 },
  { id: 2, name: "Касса", bias: 9 },
  { id: 3, name: "КСО (самокассы)", bias: 8 },
  { id: 9, name: "Мерчендайзинг (планограммы)", bias: 2 },
  { id: 10, name: "Ценообразование", bias: 2 },
  { id: 1, name: "Менеджерские операции", bias: -2 },
  { id: 7, name: "Другие работы", bias: -6 },
];

const byWorkType: PlanFactByWorkType[] = workTypeConfigs.map(({ id, name, bias }) => {
  const days = aprilDays.map((d) => {
    const pt = Math.round(d.planned_tasks / 12 + Math.random() * 3);
    const cr = Math.min(100, Math.max(40, d.completion_rate + bias + Math.random() * 6 - 3));
    const ct = Math.round(pt * (cr / 100));
    return { date: d.date, weekday: d.weekday, planned_hours: 0, actual_hours: 0, planned_tasks: pt, completed_tasks: ct, completion_rate: Math.round(cr * 10) / 10 };
  });
  const totalP = days.reduce((s, d) => s + d.planned_tasks, 0);
  const totalC = days.reduce((s, d) => s + d.completed_tasks, 0);
  return {
    work_type_id: id,
    work_type_name: name,
    days,
    avg_completion_rate: Math.round((totalC / totalP) * 1000) / 10,
  };
});

export const MOCK_PLAN_FACT: PlanFactSummary = {
  period_start: "2026-04-01",
  period_end: "2026-04-28",
  days: aprilDays,
  by_store: byStore,
  by_user: byUser,
  by_work_type: byWorkType,
  worst_day: {
    date: "2026-04-09",
    completion_rate: aprilDays[8].completion_rate,
    reason: "Праздничный день — нестандартное расписание смен, массовые паузы",
  },
  best_day: {
    date: "2026-04-15",
    completion_rate: Math.max(...aprilDays.map((d) => d.completion_rate)),
  },
};
