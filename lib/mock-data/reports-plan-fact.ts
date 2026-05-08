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
  city: string;
  employee_count: number;
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
  position: string;
  planned_hours: number;
  actual_hours: number;
  on_time_rate: number;
  days: PlanFactDay[];
  total_planned: number;
  total_completed: number;
  avg_completion_rate: number;
}

export interface PlanFactByWorkType {
  work_type_id: number;
  work_type_name: string;
  total_planned_hours: number;
  total_actual_hours: number;
  total_planned_tasks: number;
  total_completed_tasks: number;
  avg_duration: number; // minutes per task
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
  // Use deterministic noise to avoid hydration mismatches
  const noise = (((i * 7919) % 100) / 100) * 0.12 - 0.06;
  const plannedHours = Math.round(baseHours * (1 + noise));
  // April 9 — low completion (holiday shift chaos)
  const isLowDay = i === 8;
  const randFactor = (((i * 3571) % 100) / 100) * 0.14;
  const completionFactor = isLowDay ? 0.67 : 0.82 + randFactor;
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
  { store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", city: "Томск", weight: 1.2, employee_count: 48 },
  { store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", city: "Томск", weight: 0.8, employee_count: 32 },
  { store_id: 3, store_name: "СПАР Томск, пр. Фрунзе 92а", city: "Томск", weight: 0.9, employee_count: 36 },
  { store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", city: "Новосибирск", weight: 1.3, employee_count: 52 },
  { store_id: 5, store_name: "СПАР Новосибирск, Красный пр. 200", city: "Новосибирск", weight: 1.0, employee_count: 41 },
  { store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", city: "Кемерово", weight: 0.9, employee_count: 35 },
  { store_id: 200, store_name: "Г-1 Котовского 19/3 (ГМ)", city: "Томск", weight: 1.4, employee_count: 58 },
  { store_id: 270, store_name: "С-6 Мичурина 37 (П)", city: "Томск", weight: 0.8, employee_count: 30 },
];

const mkStoreDays = (weight: number, perfBias: number, idx: number): PlanFactDay[] =>
  aprilDays.map((d, i) => {
    const ph = Math.round((d.planned_hours / 8) * weight);
    const randNoise = (((i * idx * 1049) % 100) / 100) * 6 - 3;
    const cr = Math.min(99, Math.max(50, d.completion_rate + perfBias + randNoise));
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

const byStore: PlanFactByStore[] = storeConfigs.map(
  ({ store_id, store_name, city, weight, employee_count }, idx) => {
    const perfBias = [1.5, -0.5, 0.5, -2.5, 0, -1, 3, -1][idx];
    const days = mkStoreDays(weight, perfBias, idx + 1);
    const totalPH = days.reduce((s, d) => s + d.planned_hours, 0);
    const totalAH = days.reduce((s, d) => s + d.actual_hours, 0);
    const totalPT = days.reduce((s, d) => s + d.planned_tasks, 0);
    const totalCT = days.reduce((s, d) => s + d.completed_tasks, 0);
    return {
      store_id,
      store_name,
      city,
      employee_count,
      days,
      total_planned_hours: totalPH,
      total_actual_hours: totalAH,
      total_planned_tasks: totalPT,
      total_completed_tasks: totalCT,
      avg_completion_rate: Math.round((totalCT / totalPT) * 1000) / 10,
    };
  }
);

const POSITIONS = [
  "Продавец-кассир",
  "Мерчендайзер",
  "Кладовщик",
  "Старший продавец",
  "Оператор ККТ",
  "Товаровед",
];

const userConfigs = [
  { user_id: 15, user_name: "Козлова Дарья Андреевна", store_name: "СПАР Томск, пр. Ленина 80", bias: 5, pos_idx: 0 },
  { user_id: 16, user_name: "Новиков Максим Юрьевич", store_name: "СПАР Томск, пр. Ленина 80", bias: -8, pos_idx: 1 },
  { user_id: 17, user_name: "Медведева Татьяна Ивановна", store_name: "СПАР Томск, пр. Ленина 80", bias: 3, pos_idx: 0 },
  { user_id: 18, user_name: "Федоров Алексей Николаевич", store_name: "СПАР Томск, пр. Ленина 80", bias: 1, pos_idx: 2 },
  { user_id: 19, user_name: "Захарова Наталья Петровна", store_name: "СПАР Томск, пр. Ленина 80", bias: 6, pos_idx: 3 },
  { user_id: 20, user_name: "Попов Владимир Сергеевич", store_name: "СПАР Томск, пр. Ленина 80", bias: 2, pos_idx: 4 },
  { user_id: 21, user_name: "Кириллова Светлана Васильевна", store_name: "СПАР Новосибирск, ул. Ленина 55", bias: 3, pos_idx: 0 },
  { user_id: 22, user_name: "Степанов Андрей Борисович", store_name: "СПАР Новосибирск, ул. Ленина 55", bias: -11, pos_idx: 1 },
  { user_id: 23, user_name: "Волкова Марина Олеговна", store_name: "СПАР Новосибирск, ул. Ленина 55", bias: 7, pos_idx: 3 },
  { user_id: 24, user_name: "Лебедев Роман Александрович", store_name: "СПАР Томск, ул. Красноармейская 99", bias: 1, pos_idx: 2 },
  { user_id: 25, user_name: "Соловьева Ирина Дмитриевна", store_name: "Г-1 Котовского 19/3 (ГМ)", bias: 8, pos_idx: 5 },
  { user_id: 26, user_name: "Гусев Павел Михайлович", store_name: "СПАР Томск, пр. Ленина 80", bias: -5, pos_idx: 1 },
  { user_id: 27, user_name: "Белова Юлия Сергеевна", store_name: "Г-1 Котовского 19/3 (ГМ)", bias: 4, pos_idx: 0 },
  { user_id: 29, user_name: "Орлов Виктор Павлович", store_name: "СПАР Томск, пр. Ленина 80", bias: -3, pos_idx: 2 },
  { user_id: 31, user_name: "Мельников Евгений Игоревич", store_name: "СПАР Новосибирск, ул. Ленина 55", bias: -6, pos_idx: 4 },
];

const byUser: PlanFactByUser[] = userConfigs.map(
  ({ user_id, user_name, store_name, bias, pos_idx }, uIdx) => {
    const days = aprilDays.map((d, i) => {
      const pt = Math.round(d.planned_tasks / 30 + (((i * uIdx * 997) % 100) / 100) * 2);
      const randNoise = (((i * uIdx * 1301) % 100) / 100) * 8 - 4;
      const cr = Math.min(100, Math.max(40, d.completion_rate + bias + randNoise));
      const ct = Math.round(pt * (cr / 100));
      return {
        date: d.date,
        weekday: d.weekday,
        planned_hours: 0,
        actual_hours: 0,
        planned_tasks: pt,
        completed_tasks: ct,
        completion_rate: Math.round(cr * 10) / 10,
      };
    });
    const totalP = days.reduce((s, d) => s + d.planned_tasks, 0);
    const totalC = days.reduce((s, d) => s + d.completed_tasks, 0);
    const basePlannedHours = 160 + ((user_id * 13) % 40);
    const crFactor = (totalC / totalP);
    const actualHours = Math.round(basePlannedHours * (0.85 + crFactor * 0.2));
    const onTimeRate = Math.round(Math.min(100, 70 + bias * 1.5 + ((user_id * 17) % 20)));
    return {
      user_id,
      user_name,
      store_name,
      position: POSITIONS[pos_idx],
      planned_hours: basePlannedHours,
      actual_hours: actualHours,
      on_time_rate: onTimeRate,
      days,
      total_planned: totalP,
      total_completed: totalC,
      avg_completion_rate: Math.round((totalC / totalP) * 1000) / 10,
    };
  }
);

const workTypeConfigs = [
  { id: 4, name: "Выкладка", bias: 3, avg_duration: 45 },
  { id: 5, name: "Переоценка", bias: 1, avg_duration: 20 },
  { id: 6, name: "Инвентаризация", bias: -4, avg_duration: 90 },
  { id: 11, name: "Контроль качества", bias: 5, avg_duration: 30 },
  { id: 13, name: "Складские работы", bias: -1, avg_duration: 60 },
  { id: 12, name: "Уборка", bias: 7, avg_duration: 35 },
  { id: 2, name: "Касса", bias: 9, avg_duration: 25 },
  { id: 3, name: "КСО (самокассы)", bias: 8, avg_duration: 15 },
  { id: 9, name: "Мерчендайзинг (планограммы)", bias: 2, avg_duration: 55 },
  { id: 10, name: "Ценообразование", bias: 2, avg_duration: 40 },
  { id: 1, name: "Менеджерские операции", bias: -2, avg_duration: 70 },
  { id: 7, name: "Другие работы", bias: -6, avg_duration: 50 },
];

const byWorkType: PlanFactByWorkType[] = workTypeConfigs.map(
  ({ id, name, bias, avg_duration }, wtIdx) => {
    const days = aprilDays.map((d, i) => {
      const pt = Math.round(d.planned_tasks / 12 + (((i * wtIdx * 1237) % 100) / 100) * 3);
      const randNoise = (((i * wtIdx * 1543) % 100) / 100) * 6 - 3;
      const cr = Math.min(100, Math.max(40, d.completion_rate + bias + randNoise));
      const ct = Math.round(pt * (cr / 100));
      return {
        date: d.date,
        weekday: d.weekday,
        planned_hours: 0,
        actual_hours: 0,
        planned_tasks: pt,
        completed_tasks: ct,
        completion_rate: Math.round(cr * 10) / 10,
      };
    });
    const totalP = days.reduce((s, d) => s + d.planned_tasks, 0);
    const totalC = days.reduce((s, d) => s + d.completed_tasks, 0);
    const basePlannedHours = Math.round((totalP * avg_duration) / 60);
    const crFactor = totalC / totalP;
    const totalActualHours = Math.round(basePlannedHours * crFactor);
    return {
      work_type_id: id,
      work_type_name: name,
      total_planned_hours: basePlannedHours,
      total_actual_hours: totalActualHours,
      total_planned_tasks: totalP,
      total_completed_tasks: totalC,
      avg_duration,
      days,
      avg_completion_rate: Math.round((totalC / totalP) * 1000) / 10,
    };
  }
);

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
