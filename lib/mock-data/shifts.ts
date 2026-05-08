import type { Shift } from "@/lib/types";
import { REAL_LAMA_SHIFTS } from "./_lama-shifts";

/**
 * @endpoint GET /api/shifts
 * 30 shifts across 4 days (2 past, today, tomorrow).
 * ALL shifts come from LAMA (read-only in admin — manager does NOT create shifts).
 *
 * Status distribution:
 *   8  NEW    — planned for tomorrow (2026-05-02)
 *   6  OPENED — currently running (2026-05-01, today)
 *  16  CLOSED — yesterday (2026-04-30) + some from today already ended
 *
 * Special cases:
 *   - One CLOSED shift with late_minutes=15
 *   - One CLOSED shift with overtime_minutes=20
 *   - One OPENED shift force-closed (status=CLOSED, actual_end past planned_end)
 *   - One shift with has_conflict=true (overlapping with another)
 *
 * Users reference MOCK_USERS (ids 15–27 are WORKER, ids 5–10 are STORE_DIRECTOR).
 * Stores: 1=SPAR-TOM-001, 2=SPAR-TOM-002, 4=SPAR-NSK-001, 200=Г-1 Котовского 19/3 (ГМ).
 */

// Dates (Asia/Tomsk UTC+7, so ISO dates are offset accordingly)
const TODAY     = "2026-05-01";
const YESTERDAY = "2026-04-30";
const DAY_BEFORE= "2026-04-29";
const TOMORROW  = "2026-05-02";

// Typed helper to extend Shift with extra demo flags
interface ShiftMock extends Shift {
  has_conflict?: boolean;
}

export const MOCK_SHIFTS: ShiftMock[] = [

  // ═══════════════════════════════════════════════════════════════
  // CLOSED — 2 дня назад (2026-04-29)  — 4 смены
  // ═══════════════════════════════════════════════════════════════

  {
    id: 1001,
    plan_id: 9001,
    status: "CLOSED",
    user_id: 15,
    user_name: "Козлова Дарья Андреевна",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: DAY_BEFORE,
    planned_start: `${DAY_BEFORE}T08:00:00+07:00`,
    planned_end:   `${DAY_BEFORE}T16:00:00+07:00`,
    actual_start:  `${DAY_BEFORE}T08:02:00+07:00`,
    actual_end:    `${DAY_BEFORE}T16:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 1002,
    plan_id: 9002,
    status: "CLOSED",
    user_id: 16,
    user_name: "Новиков Максим Юрьевич",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 2,
    zone_name: "Склад",
    shift_date: DAY_BEFORE,
    planned_start: `${DAY_BEFORE}T09:00:00+07:00`,
    planned_end:   `${DAY_BEFORE}T17:00:00+07:00`,
    actual_start:  `${DAY_BEFORE}T09:00:00+07:00`,
    actual_end:    `${DAY_BEFORE}T17:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 1003,
    plan_id: 9003,
    status: "CLOSED",
    user_id: 21,
    user_name: "Кириллова Светлана Васильевна",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: DAY_BEFORE,
    planned_start: `${DAY_BEFORE}T10:00:00+07:00`,
    planned_end:   `${DAY_BEFORE}T18:00:00+07:00`,
    actual_start:  `${DAY_BEFORE}T10:00:00+07:00`,
    actual_end:    `${DAY_BEFORE}T18:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 1004,
    plan_id: 9004,
    status: "CLOSED",
    user_id: 22,
    user_name: "Степанов Андрей Борисович",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 2,
    zone_name: "Склад",
    shift_date: DAY_BEFORE,
    planned_start: `${DAY_BEFORE}T07:00:00+07:00`,
    planned_end:   `${DAY_BEFORE}T15:00:00+07:00`,
    actual_start:  `${DAY_BEFORE}T07:00:00+07:00`,
    actual_end:    `${DAY_BEFORE}T15:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // CLOSED — вчера (2026-04-30)  — 12 смен
  // ═══════════════════════════════════════════════════════════════

  /** CLOSED, late_minutes=15 */
  {
    id: 2001,
    plan_id: 9010,
    status: "CLOSED",
    user_id: 15,
    user_name: "Козлова Дарья Андреевна",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T08:00:00+07:00`,
    planned_end:   `${YESTERDAY}T16:00:00+07:00`,
    actual_start:  `${YESTERDAY}T08:15:00+07:00`,
    actual_end:    `${YESTERDAY}T16:00:00+07:00`,
    late_minutes: 15,
    overtime_minutes: 0,
  },
  /** CLOSED, overtime_minutes=20 */
  {
    id: 2002,
    plan_id: 9011,
    status: "CLOSED",
    user_id: 17,
    user_name: "Медведева Татьяна Ивановна",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 5,
    zone_name: "Прикассовая зона",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T09:00:00+07:00`,
    planned_end:   `${YESTERDAY}T17:00:00+07:00`,
    actual_start:  `${YESTERDAY}T09:00:00+07:00`,
    actual_end:    `${YESTERDAY}T17:20:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 20,
  },
  {
    id: 2003,
    plan_id: 9012,
    status: "CLOSED",
    user_id: 18,
    user_name: "Федоров Алексей Николаевич",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 2,
    zone_name: "Склад",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T06:00:00+07:00`,
    planned_end:   `${YESTERDAY}T14:00:00+07:00`,
    actual_start:  `${YESTERDAY}T06:00:00+07:00`,
    actual_end:    `${YESTERDAY}T14:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2004,
    plan_id: 9013,
    status: "CLOSED",
    user_id: 19,
    user_name: "Захарова Наталья Петровна",
    store_id: 2,
    store_name: "СПАР Томск, ул. Красноармейская 99",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T08:00:00+07:00`,
    planned_end:   `${YESTERDAY}T16:00:00+07:00`,
    actual_start:  `${YESTERDAY}T08:00:00+07:00`,
    actual_end:    `${YESTERDAY}T16:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2005,
    plan_id: 9014,
    status: "CLOSED",
    user_id: 20,
    user_name: "Попов Владимир Сергеевич",
    store_id: 2,
    store_name: "СПАР Томск, ул. Красноармейская 99",
    zone_id: 3,
    zone_name: "Касса",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T14:00:00+07:00`,
    planned_end:   `${YESTERDAY}T22:00:00+07:00`,
    actual_start:  `${YESTERDAY}T14:00:00+07:00`,
    actual_end:    `${YESTERDAY}T22:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2006,
    plan_id: 9015,
    status: "CLOSED",
    user_id: 21,
    user_name: "Кириллова Светлана Васильевна",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T09:00:00+07:00`,
    planned_end:   `${YESTERDAY}T17:00:00+07:00`,
    actual_start:  `${YESTERDAY}T09:00:00+07:00`,
    actual_end:    `${YESTERDAY}T17:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2007,
    plan_id: 9016,
    status: "CLOSED",
    user_id: 22,
    user_name: "Степанов Андрей Борисович",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 2,
    zone_name: "Склад",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T07:00:00+07:00`,
    planned_end:   `${YESTERDAY}T15:00:00+07:00`,
    actual_start:  `${YESTERDAY}T07:00:00+07:00`,
    actual_end:    `${YESTERDAY}T15:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2008,
    plan_id: 9017,
    status: "CLOSED",
    user_id: 23,
    user_name: "Волкова Марина Олеговна",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T13:00:00+07:00`,
    planned_end:   `${YESTERDAY}T21:00:00+07:00`,
    actual_start:  `${YESTERDAY}T13:00:00+07:00`,
    actual_end:    `${YESTERDAY}T21:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2009,
    plan_id: 9018,
    status: "CLOSED",
    user_id: 24,
    user_name: "Лебедев Роман Александрович",
    store_id: 2,
    store_name: "СПАР Томск, ул. Красноармейская 99",
    zone_id: 2,
    zone_name: "Склад",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T06:00:00+07:00`,
    planned_end:   `${YESTERDAY}T14:00:00+07:00`,
    actual_start:  `${YESTERDAY}T06:00:00+07:00`,
    actual_end:    `${YESTERDAY}T14:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2010,
    plan_id: 9019,
    status: "CLOSED",
    user_id: 25,
    user_name: "Соловьева Ирина Дмитриевна",
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T08:00:00+07:00`,
    planned_end:   `${YESTERDAY}T16:00:00+07:00`,
    actual_start:  `${YESTERDAY}T08:00:00+07:00`,
    actual_end:    `${YESTERDAY}T16:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2011,
    plan_id: 9020,
    status: "CLOSED",
    user_id: 26,
    user_name: "Гусев Павел Михайлович",
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    zone_id: 3,
    zone_name: "Касса",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T14:00:00+07:00`,
    planned_end:   `${YESTERDAY}T22:00:00+07:00`,
    actual_start:  `${YESTERDAY}T14:00:00+07:00`,
    actual_end:    `${YESTERDAY}T22:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 2012,
    plan_id: 9021,
    status: "CLOSED",
    user_id: 27,
    user_name: "Белова Юлия Сергеевна",
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T06:00:00+07:00`,
    planned_end:   `${YESTERDAY}T14:00:00+07:00`,
    actual_start:  `${YESTERDAY}T06:00:00+07:00`,
    actual_end:    `${YESTERDAY}T14:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // OPENED — сегодня (2026-05-01, текущие)  — 6 смен
  // ═══════════════════════════════════════════════════════════════

  {
    id: 3001,
    plan_id: 9030,
    status: "OPENED",
    user_id: 15,
    user_name: "Козлова Дарья Андреевна",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: TODAY,
    planned_start: `${TODAY}T08:00:00+07:00`,
    planned_end:   `${TODAY}T16:00:00+07:00`,
    actual_start:  `${TODAY}T08:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 3002,
    plan_id: 9031,
    status: "OPENED",
    user_id: 18,
    user_name: "Федоров Алексей Николаевич",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 2,
    zone_name: "Склад",
    shift_date: TODAY,
    planned_start: `${TODAY}T06:00:00+07:00`,
    planned_end:   `${TODAY}T14:00:00+07:00`,
    actual_start:  `${TODAY}T06:02:00+07:00`,
    late_minutes: 2,
    overtime_minutes: 0,
  },
  {
    id: 3003,
    plan_id: 9032,
    status: "OPENED",
    user_id: 19,
    user_name: "Захарова Наталья Петровна",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: TODAY,
    planned_start: `${TODAY}T10:00:00+07:00`,
    planned_end:   `${TODAY}T18:00:00+07:00`,
    actual_start:  `${TODAY}T10:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 3004,
    plan_id: 9033,
    status: "OPENED",
    user_id: 21,
    user_name: "Кириллова Светлана Васильевна",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 2,
    zone_name: "Склад",
    shift_date: TODAY,
    planned_start: `${TODAY}T07:00:00+07:00`,
    planned_end:   `${TODAY}T15:00:00+07:00`,
    actual_start:  `${TODAY}T07:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 3005,
    plan_id: 9034,
    status: "OPENED",
    user_id: 25,
    user_name: "Соловьева Ирина Дмитриевна",
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: TODAY,
    planned_start: `${TODAY}T09:00:00+07:00`,
    planned_end:   `${TODAY}T17:00:00+07:00`,
    actual_start:  `${TODAY}T09:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  /** OPENED с конфликтом (has_conflict=true — перекрывается с другой сменой по времени) */
  {
    id: 3006,
    plan_id: 9035,
    status: "OPENED",
    user_id: 22,
    user_name: "Степанов Андрей Борисович",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: TODAY,
    planned_start: `${TODAY}T08:00:00+07:00`,
    planned_end:   `${TODAY}T16:00:00+07:00`,
    actual_start:  `${TODAY}T08:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
    has_conflict: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // CLOSED — сегодня (закрытые, уже завершённые дневные смены)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Force-closed: status=CLOSED, но actual_end > planned_end.
   * Смена формально ещё открыта по плану, но LAMA закрыл принудительно.
   */
  {
    id: 3010,
    plan_id: 9040,
    status: "CLOSED",
    user_id: 16,
    user_name: "Новиков Максим Юрьевич",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: TODAY,
    planned_start: `${TODAY}T07:00:00+07:00`,
    planned_end:   `${TODAY}T09:00:00+07:00`,
    actual_start:  `${TODAY}T07:00:00+07:00`,
    actual_end:    `${TODAY}T11:30:00+07:00`,   // far beyond planned_end
    late_minutes: 0,
    overtime_minutes: 150,
  },
  {
    id: 3011,
    plan_id: 9041,
    status: "CLOSED",
    user_id: 20,
    user_name: "Попов Владимир Сергеевич",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 4,
    zone_name: "Самокассы",
    shift_date: TODAY,
    planned_start: `${TODAY}T08:00:00+07:00`,
    planned_end:   `${TODAY}T10:00:00+07:00`,
    actual_start:  `${TODAY}T08:00:00+07:00`,
    actual_end:    `${TODAY}T10:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // NEW — завтра (2026-05-02)  — 8 смен
  // ═══════════════════════════════════════════════════════════════

  {
    id: 4001,
    plan_id: 9050,
    status: "NEW",
    user_id: 15,
    user_name: "Козлова Дарья Андреевна",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T08:00:00+07:00`,
    planned_end:   `${TOMORROW}T16:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 4002,
    plan_id: 9051,
    status: "NEW",
    user_id: 16,
    user_name: "Новиков Максим Юрьевич",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 2,
    zone_name: "Склад",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T09:00:00+07:00`,
    planned_end:   `${TOMORROW}T17:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 4003,
    plan_id: 9052,
    status: "NEW",
    user_id: 17,
    user_name: "Медведева Татьяна Ивановна",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 5,
    zone_name: "Прикассовая зона",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T07:00:00+07:00`,
    planned_end:   `${TOMORROW}T15:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 4004,
    plan_id: 9053,
    status: "NEW",
    user_id: 20,
    user_name: "Попов Владимир Сергеевич",
    store_id: 2,
    store_name: "СПАР Томск, ул. Красноармейская 99",
    zone_id: 3,
    zone_name: "Касса",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T14:00:00+07:00`,
    planned_end:   `${TOMORROW}T22:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 4005,
    plan_id: 9054,
    status: "NEW",
    user_id: 22,
    user_name: "Степанов Андрей Борисович",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T08:00:00+07:00`,
    planned_end:   `${TOMORROW}T16:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 4006,
    plan_id: 9055,
    status: "NEW",
    user_id: 23,
    user_name: "Волкова Марина Олеговна",
    store_id: 4,
    store_name: "СПАР Новосибирск, ул. Ленина 55",
    zone_id: 6,
    zone_name: "Холодильники",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T06:00:00+07:00`,
    planned_end:   `${TOMORROW}T14:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 4007,
    plan_id: 9056,
    status: "NEW",
    user_id: 26,
    user_name: "Гусев Павел Михайлович",
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    zone_id: 3,
    zone_name: "Касса",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T09:00:00+07:00`,
    planned_end:   `${TOMORROW}T17:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },
  {
    id: 4008,
    plan_id: 9057,
    status: "NEW",
    user_id: 27,
    user_name: "Белова Юлия Сергеевна",
    store_id: 200,
    store_name: "Г-1 Котовского 19/3 (ГМ)",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T14:00:00+07:00`,
    planned_end:   `${TOMORROW}T22:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // SUBSTITUTE shifts (подработка) — штатные сотрудники подменяют
  // в другом магазине того же юрлица в свой выходной. Должность та же,
  // ЗП штатная. На pie chart циклограмм — канал PART_TIME.
  // ═══════════════════════════════════════════════════════════════
  {
    id: 4101,
    plan_id: 9101,
    status: "NEW",
    user_id: 15, // Козлова Дарья — штатный кассир в store 1 (СПАР Ленина 80)
    user_name: "Козлова Дарья Андреевна",
    store_id: 2, // вышла подработать в store 2 (СПАР Красноармейская 99)
    store_name: "СПАР Томск, ул. Учебная 8",
    zone_id: 3,
    zone_name: "Касса",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T09:00:00+07:00`,
    planned_end: `${TOMORROW}T17:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
    shift_kind: "SUBSTITUTE",
    home_store_id: 1,
  },
  {
    id: 4102,
    plan_id: 9102,
    status: "OPENED",
    user_id: 17, // Орлов Антон — старший кассир в store 2
    user_name: "Орлов Антон Викторович",
    store_id: 1, // подработал в магазине 1
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 3,
    zone_name: "Касса",
    shift_date: TODAY,
    planned_start: `${TODAY}T08:00:00+07:00`,
    planned_end: `${TODAY}T16:00:00+07:00`,
    actual_start: `${TODAY}T08:05:00+07:00`,
    late_minutes: 5,
    overtime_minutes: 0,
    shift_kind: "SUBSTITUTE",
    home_store_id: 2,
  },
  {
    id: 4103,
    plan_id: 9103,
    status: "CLOSED",
    user_id: 19, // Зайцев Никита — обычно store 3
    user_name: "Зайцев Никита Олегович",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 1,
    zone_name: "Торговый зал",
    shift_date: YESTERDAY,
    planned_start: `${YESTERDAY}T10:00:00+07:00`,
    planned_end: `${YESTERDAY}T18:00:00+07:00`,
    actual_start: `${YESTERDAY}T10:00:00+07:00`,
    actual_end: `${YESTERDAY}T18:15:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 15,
    shift_kind: "SUBSTITUTE",
    home_store_id: 3,
  },
  {
    id: 4104,
    plan_id: 9104,
    status: "NEW",
    user_id: 21, // Лаврова Анна — обычно store 4 (Abricos)
    user_name: "Лаврова Анна Кирилловна",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    zone_id: 100, // LAMA-зона Фреш 1
    zone_name: "Фреш 1",
    shift_date: TOMORROW,
    planned_start: `${TOMORROW}T07:00:00+07:00`,
    planned_end: `${TOMORROW}T15:00:00+07:00`,
    late_minutes: 0,
    overtime_minutes: 0,
    shift_kind: "SUBSTITUTE",
    home_store_id: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // Generated full May 2026 schedule (3-31 May)
  // 7 stores × 3 смены × 29 дней = ~600 shifts
  // CLOSED для прошлых дат, NEW для будущих
  // ═══════════════════════════════════════════════════════════════
  ...generateMayShifts(),

  // ═══════════════════════════════════════════════════════════════
  // 2436 LAMA shifts на текущую неделю (Пн 5/4 — Вс 5/10), все 593 emp.
  // Admin: пн-пт 09-18; Executor: 2/2 ранняя/поздняя по user_id mod 4.
  // ═══════════════════════════════════════════════════════════════
  ...REAL_LAMA_SHIFTS,
];

// ═══════════════════════════════════════════════════════════════════
// May 2026 generator — cycles through 18 worker users × 7 stores
// ═══════════════════════════════════════════════════════════════════

function generateMayShifts(): ShiftMock[] {
  const result: ShiftMock[] = [];
  let nextId = 5000;
  let nextPlanId = 10000;

  // Источники: 18 worker user IDs (id 15-32 — это диапазон WORKER в моках)
  const workerIds: number[] = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 28, 29, 30, 31, 32, 33, 34, 35];
  const userNames: Record<number, string> = {
    15: "Козлова Дарья Андреевна",
    16: "Новиков Максим Юрьевич",
    17: "Орлов Антон Викторович",
    18: "Волкова Мария Александровна",
    19: "Зайцев Никита Олегович",
    20: "Сергеев Игорь Дмитриевич",
    21: "Лаврова Анна Кирилловна",
    22: "Тимофеев Денис Романович",
    23: "Гусева Полина Игоревна",
    24: "Пономарёв Артём Сергеевич",
    28: "Соловьёва Вера Николаевна",
    29: "Кудряшов Олег Михайлович",
    30: "Никитина Ольга Львовна",
    31: "Виноградов Илья Викторович",
    32: "Лебедева Татьяна Юрьевна",
    33: "Большаков Кирилл Алексеевич",
    34: "Петрова Юлия Александровна",
    35: "Носов Андрей Степанович",
  };

  // 7 магазинов из MOCK_STORES
  const stores = [
    { id: 1, name: "СПАР Томск, пр. Ленина 80" },
    { id: 2, name: "СПАР Томск, ул. Учебная 8" },
    { id: 3, name: "СПАР Северск, ул. Курчатова 5" },
    { id: 4, name: "Abricos Томск, пр. Кирова 51" },
    { id: 5, name: "СПАР Новосибирск, ул. Кошурникова 22" },
    { id: 6, name: "Первоцвет Томск, пр. Мира 76" },
    { id: 200, name: "Г-1 Котовского 19/3 (ГМ)" },
  ];

  const zones = [
    { id: 1, name: "Торговый зал" },
    { id: 2, name: "Склад" },
    { id: 3, name: "Касса" },
  ];

  // 3 смены в день: утро (08-16), день (10-19), вечер (14-22)
  const shiftWindows: Array<[string, string]> = [
    ["08:00:00", "16:00:00"],
    ["10:00:00", "19:00:00"],
    ["14:00:00", "22:00:00"],
  ];

  // MOCK_TODAY = 2026-05-01. CLOSED для дат < 1, NEW для > 1, OPENED для сегодня
  // Здесь генерим 3-31 мая (29 дней)
  for (let day = 3; day <= 31; day++) {
    const dateStr = `2026-05-${String(day).padStart(2, "0")}`;
    const isPast = day < 1; // never past for these dates
    const isToday = false;

    stores.forEach((store, storeIdx) => {
      shiftWindows.forEach(([start, end], shiftIdx) => {
        // pick worker by deterministic round-robin
        const workerIdx = (day * 7 + storeIdx * 3 + shiftIdx) % workerIds.length;
        const userId = workerIds[workerIdx];
        const zone = zones[(day + storeIdx + shiftIdx) % zones.length];

        const shift: ShiftMock = {
          id: nextId++,
          plan_id: nextPlanId++,
          // Все майские генерим как NEW (planned future) — для current смены
          // already есть в основном MOCK_SHIFTS
          status: isPast ? "CLOSED" : isToday ? "OPENED" : "NEW",
          user_id: userId,
          user_name: userNames[userId] ?? `Сотрудник #${userId}`,
          store_id: store.id,
          store_name: store.name,
          zone_id: zone.id,
          zone_name: zone.name,
          shift_date: dateStr,
          planned_start: `${dateStr}T${start}+07:00`,
          planned_end: `${dateStr}T${end}+07:00`,
          late_minutes: 0,
          overtime_minutes: 0,
        };

        result.push(shift);
      });
    });
  }

  return result;
}
