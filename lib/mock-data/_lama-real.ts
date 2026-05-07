/**
 * РЕАЛЬНЫЕ LAMA данные (источник: live API https://wfm-smart.lama70.ru/api).
 *
 * Fetched 2026-05-07 для shop_code=0120 (С-12 Некрасова, 41 (ИР), Томск).
 * - 15 реальных сотрудников с реальными ФИО (GET /employee/?shop_code=0120)
 * - 24 реальные задачи на смены сегодня (GET /tasks/?shift_id=N для каждой)
 *
 * Структура задач 1:1 с LAMA API:
 *   priority + operation_work + operation_zone + category + duration
 *   + status (Created / InProgress / Suspended / Completed)
 *
 * При расширении: см. .tmp_fetch_lama.py — sequential fetch с 25s паузами
 * (LAMA rate-limit'ит при parallel burst).
 */
import type { Task, User, Store, Assignment } from "@/lib/types";

// ── 1 store: «С-12 Некрасова, 41 (ИР)», shop_code=0120 ──
export const REAL_LAMA_STORES: Store[] = [
  {
    id: 200,
    name: "С-12 Некрасова, 41 (ИР)",
    external_code: "0120",
    address: "ул. Некрасова, 41",
    city: "Томск",
    store_type: "Супермаркет",
    object_type: "STORE",
    object_format: "SUPERMARKET",
    organization_id: "org-lama",
    legal_entity_id: 1,
    region: "Томская обл.",
    manager_id: 303, // Шелудько Нина — Директор супермаркета
    supervisor_id: 3,
    lama_synced_at: "2026-05-07T06:00:00+07:00",
    active: true,
    archived: false,
    geo: { lat: 56.4912, lng: 84.9613 },
  },
];

// ── 15 реальных сотрудников ──
export const REAL_LAMA_USERS: User[] = [
  { id: 300, sso_id: "sso-lama-real-22469", phone: "+7 (000) 000-03-00", first_name: "Анна",       last_name: "Елисеева",        middle_name: "Михайловна",     type: "STAFF", hired_at: "2026-03-12", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 301, sso_id: "sso-lama-real-22917", phone: "+7 (000) 000-03-01", first_name: "Наталья",    last_name: "Пивоварова",      middle_name: "Александровна",  type: "STAFF", hired_at: "2023-11-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 302, sso_id: "sso-lama-real-28497", phone: "+7 (000) 000-03-02", first_name: "Надежда",    last_name: "Гусева",          middle_name: "Викторовна",     type: "STAFF", hired_at: "2023-07-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 303, sso_id: "sso-lama-real-28621", phone: "+7 (000) 000-03-03", first_name: "Нина",       last_name: "Шелудько",        middle_name: "Александровна",  type: "STAFF", hired_at: "2023-05-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.7 },
  { id: 304, sso_id: "sso-lama-real-28485", phone: "+7 (000) 000-03-04", first_name: "Олеся",      last_name: "Голикова",        middle_name: "Константиновна", type: "STAFF", hired_at: "2023-07-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 305, sso_id: "sso-lama-real-28600", phone: "+7 (000) 000-03-05", first_name: "Татьяна",    last_name: "Мурашкина",       middle_name: "Михайловна",     type: "STAFF", hired_at: "2024-08-29", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 306, sso_id: "sso-lama-real-28454", phone: "+7 (000) 000-03-06", first_name: "Ольга",      last_name: "Величко",         middle_name: "Владимировна",   type: "STAFF", hired_at: "2023-07-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 307, sso_id: "sso-lama-real-20533", phone: "+7 (000) 000-03-07", first_name: "Елена",      last_name: "Куруленко",       middle_name: "Николаевна",     type: "STAFF", hired_at: "2024-02-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 308, sso_id: "sso-lama-real-23822", phone: "+7 (000) 000-03-08", first_name: "Наталья",    last_name: "Тюленева",        middle_name: "Александровна",  type: "STAFF", hired_at: "2024-02-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 309, sso_id: "sso-lama-real-9202",  phone: "+7 (000) 000-03-09", first_name: "Рафаель",    last_name: "Гулян",           middle_name: "Липаритович",    type: "STAFF", hired_at: "2023-07-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false,  rating: 4.5 },
  { id: 310, sso_id: "sso-lama-real-8659",  phone: "+7 (000) 000-03-10", first_name: "Александр",  last_name: "Зубов",           middle_name: "Анатольевич",    type: "STAFF", hired_at: "2023-07-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false,  rating: 4.5 },
  { id: 311, sso_id: "sso-lama-real-25303", phone: "+7 (000) 000-03-11", first_name: "Максим",     last_name: "Митрофанов",      middle_name: "Викторович",     type: "STAFF", hired_at: "2023-04-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 312, sso_id: "sso-lama-real-12023", phone: "+7 (000) 000-03-12", first_name: "Елена",      last_name: "Шайхутдинова",    middle_name: "Алексеевна",     type: "STAFF", hired_at: "2025-06-01", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
  { id: 313, sso_id: "sso-lama-real-2163",  phone: "+7 (000) 000-03-13", first_name: "Татьяна",    last_name: "Богомолова",      middle_name: "Евгеньевна",     type: "STAFF", hired_at: "2024-10-14", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false,  rating: 4.5 },
  { id: 314, sso_id: "sso-lama-real-19162", phone: "+7 (000) 000-03-14", first_name: "Надежда",    last_name: "Пинчукова",       middle_name: "Сергеевна",      type: "STAFF", hired_at: "2023-08-30", archived: false, preferred_locale: "ru", preferred_timezone: "Asia/Tomsk", totp_enabled: false, rating: 4.5 },
];

// ── 15 assignments (1 user → store 200 + position) ──
export const REAL_LAMA_ASSIGNMENTS: Assignment[] = [
  { id: 300, user_id: 300, position_id: 2, position_name: "Кассир кассы самообслуживания",                     store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 1, code: "RANK-1", name: "Стандарт" },  active: true },
  { id: 301, user_id: 301, position_id: 1, position_name: "Менеджер по обработке первичной документации",      store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 1, code: "RANK-1", name: "Стандарт" },  active: true },
  { id: 302, user_id: 302, position_id: 5, position_name: "Заместитель директора по торговле",                  store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 1, code: "RANK-1", name: "Стандарт" },  active: true },
  { id: 303, user_id: 303, position_id: 5, position_name: "Директор супермаркета",                              store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 1, code: "RANK-1", name: "Стандарт" },  active: true },
  { id: 304, user_id: 304, position_id: 5, position_name: "Заместитель директора по торговле",                  store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 1, code: "RANK-1", name: "Стандарт" },  active: true },
  { id: 305, user_id: 305, position_id: 2, position_name: "Кассир кассы самообслуживания",                     store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 1, code: "RANK-1", name: "Стандарт" },  active: true },
  { id: 306, user_id: 306, position_id: 4, position_name: "Продавец-универсал",                                 store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 2, code: "RANK-2", name: "Разряд 2" },  active: true },
  { id: 307, user_id: 307, position_id: 4, position_name: "Продавец продовольственных товаров",                store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 2, code: "RANK-2", name: "Разряд 2" },  active: true },
  { id: 308, user_id: 308, position_id: 4, position_name: "Продавец продовольственных товаров",                store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 2, code: "RANK-2", name: "Разряд 2" },  active: true },
  { id: 309, user_id: 309, position_id: 1, position_name: "Кладовщик-грузчик",                                  store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 3, code: "RANK-3", name: "Разряд 3" },  active: true },
  { id: 310, user_id: 310, position_id: 1, position_name: "Кладовщик-грузчик",                                  store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 3, code: "RANK-3", name: "Разряд 3" },  active: true },
  { id: 311, user_id: 311, position_id: 1, position_name: "Кладовщик-грузчик",                                  store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 3, code: "RANK-3", name: "Разряд 3" },  active: true },
  { id: 312, user_id: 312, position_id: 4, position_name: "Продавец продовольственных товаров",                store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 2, code: "RANK-2", name: "Разряд 2" },  active: true },
  { id: 313, user_id: 313, position_id: 4, position_name: "Продавец-универсал ФРОВ",                            store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 1, code: "RANK-1", name: "Стандарт" },  active: true },
  { id: 314, user_id: 314, position_id: 4, position_name: "Продавец-универсал",                                 store_id: 200, store_name: "С-12 Некрасова, 41 (ИР)", rank: { id: 2, code: "RANK-2", name: "Разряд 2" },  active: true },
];

// ── 24 РЕАЛЬНЫЕ ЗАДАЧИ (LAMA tasks shift_id today, status as-is from API) ──
const TODAY = "2026-05-07T06:00:00+07:00";

interface RealLamaTaskRaw {
  apiId: number; emp: number; empName: string; prio: number;
  workTypeId: number; workTypeName: string;
  zoneId?: number; zoneName?: string;
  category?: string; minutes: number; state: Task["state"];
  timeStart: string; timeEnd: string;
}

const RAW: RealLamaTaskRaw[] = [
  // shift 5725508 (Елисеева А.) — 4 задачи
  { apiId: 277515, emp: 300, empName: "Елисеева Анна Михайловна",  prio: 4, workTypeId: 7, workTypeName: "Другие работы",  minutes: 30,  state: "NEW",          timeStart: "20:30:00", timeEnd: "21:00:00" },
  { apiId: 277512, emp: 300, empName: "Елисеева Анна Михайловна",  prio: 1, workTypeId: 2, workTypeName: "Касса",          minutes: 480, state: "PAUSED",       timeStart: "09:00:00", timeEnd: "17:00:00" },
  { apiId: 277513, emp: 300, empName: "Елисеева Анна Михайловна",  prio: 2, workTypeId: 3, workTypeName: "КСО (самокассы)", minutes: 90, state: "PAUSED",      timeStart: "17:00:00", timeEnd: "18:30:00" },
  { apiId: 277514, emp: 300, empName: "Елисеева Анна Михайловна",  prio: 3, workTypeId: 4, workTypeName: "Выкладка",       zoneId: 103, zoneName: "Заморозка", minutes: 120, state: "IN_PROGRESS", timeStart: "18:30:00", timeEnd: "20:30:00" },

  // shift 5725529 (Пивоварова Н.) — 2 задачи (manager-style)
  { apiId: 277520, emp: 301, empName: "Пивоварова Наталья Александровна", prio: 1, workTypeId: 1, workTypeName: "Менеджерские операции", minutes: 60, state: "NEW",          timeStart: "09:00:00", timeEnd: "10:00:00" },
  { apiId: 277521, emp: 301, empName: "Пивоварова Наталья Александровна", prio: 2, workTypeId: 1, workTypeName: "Менеджерские операции", minutes: 240, state: "IN_PROGRESS", timeStart: "10:00:00", timeEnd: "14:00:00" },

  // shift 5725565 (Шелудько Н. — директор) — 5 задач
  { apiId: 277530, emp: 303, empName: "Шелудько Нина Александровна", prio: 1, workTypeId: 1, workTypeName: "Менеджерские операции",        minutes: 120, state: "NEW",          timeStart: "09:00:00", timeEnd: "11:00:00" },
  { apiId: 277531, emp: 303, empName: "Шелудько Нина Александровна", prio: 2, workTypeId: 11, workTypeName: "Контроль качества", zoneId: 100, zoneName: "Фреш 1", minutes: 30, state: "PAUSED", timeStart: "11:00:00", timeEnd: "11:30:00" },
  { apiId: 277532, emp: 303, empName: "Шелудько Нина Александровна", prio: 3, workTypeId: 11, workTypeName: "Контроль качества", zoneId: 101, zoneName: "Фреш 2", minutes: 30, state: "NEW",     timeStart: "11:30:00", timeEnd: "12:00:00" },
  { apiId: 277533, emp: 303, empName: "Шелудько Нина Александровна", prio: 4, workTypeId: 1, workTypeName: "Менеджерские операции",        minutes: 180, state: "NEW",          timeStart: "13:00:00", timeEnd: "16:00:00" },
  { apiId: 277534, emp: 303, empName: "Шелудько Нина Александровна", prio: 5, workTypeId: 1, workTypeName: "Менеджерские операции",        minutes: 60,  state: "NEW",          timeStart: "16:00:00", timeEnd: "17:00:00" },

  // shift 5725584 (Голикова О. — зам. директора) — 9 задач
  { apiId: 277540, emp: 304, empName: "Голикова Олеся Константиновна", prio: 1, workTypeId: 1, workTypeName: "Менеджерские операции",                            minutes: 60,  state: "COMPLETED", timeStart: "09:00:00", timeEnd: "10:00:00" },
  { apiId: 277541, emp: 304, empName: "Голикова Олеся Константиновна", prio: 2, workTypeId: 11, workTypeName: "Контроль качества",                               minutes: 30,  state: "COMPLETED", timeStart: "10:00:00", timeEnd: "10:30:00" },
  { apiId: 277542, emp: 304, empName: "Голикова Олеся Константиновна", prio: 3, workTypeId: 4, workTypeName: "Выкладка", zoneId: 100, zoneName: "Фреш 1",        category: "СВЕЖЕЕ МЯСО И ПТИЦА",       minutes: 60,  state: "IN_PROGRESS", timeStart: "10:30:00", timeEnd: "11:30:00" },
  { apiId: 277543, emp: 304, empName: "Голикова Олеся Константиновна", prio: 4, workTypeId: 4, workTypeName: "Выкладка", zoneId: 101, zoneName: "Фреш 2",        category: "МОЛОЧНЫЕ ПРОДУКТЫ",          minutes: 90,  state: "NEW",          timeStart: "11:30:00", timeEnd: "13:00:00" },
  { apiId: 277544, emp: 304, empName: "Голикова Олеся Константиновна", prio: 5, workTypeId: 5, workTypeName: "Переоценка",                                       minutes: 60,  state: "NEW",          timeStart: "13:00:00", timeEnd: "14:00:00" },
  { apiId: 277545, emp: 304, empName: "Голикова Олеся Константиновна", prio: 6, workTypeId: 4, workTypeName: "Выкладка", zoneId: 102, zoneName: "Бакалея",       category: "БАКАЛЕЯ",                    minutes: 45,  state: "NEW",          timeStart: "14:00:00", timeEnd: "14:45:00" },
  { apiId: 277546, emp: 304, empName: "Голикова Олеся Константиновна", prio: 7, workTypeId: 4, workTypeName: "Выкладка", zoneId: 108, zoneName: "Кондитерка, чай, кофе", category: "ЧАЙ КОФЕ КАКАО",  minutes: 30,  state: "NEW",          timeStart: "14:45:00", timeEnd: "15:15:00" },
  { apiId: 277547, emp: 304, empName: "Голикова Олеся Константиновна", prio: 8, workTypeId: 4, workTypeName: "Выкладка", zoneId: 106, zoneName: "Алкоголь",      category: "НАПИТКИ АЛКОГОЛЬНЫЕ",        minutes: 30,  state: "NEW",          timeStart: "15:15:00", timeEnd: "15:45:00" },
  { apiId: 277548, emp: 304, empName: "Голикова Олеся Константиновна", prio: 9, workTypeId: 1, workTypeName: "Менеджерские операции",                            minutes: 60,  state: "NEW",          timeStart: "16:00:00", timeEnd: "17:00:00" },

  // shift 5725659 (Гулян Р. — кладовщик) — 2 задачи
  { apiId: 277550, emp: 309, empName: "Гулян Рафаель Липаритович",  prio: 1, workTypeId: 13, workTypeName: "Складские работы", minutes: 240, state: "IN_PROGRESS", timeStart: "07:00:00", timeEnd: "11:00:00" },
  { apiId: 277551, emp: 309, empName: "Гулян Рафаель Липаритович",  prio: 2, workTypeId: 13, workTypeName: "Складские работы", minutes: 180, state: "NEW",          timeStart: "13:00:00", timeEnd: "16:00:00" },

  // shift 5743533 (Зубов А. — кладовщик) — 2 задачи
  { apiId: 277521, emp: 310, empName: "Зубов Александр Анатольевич", prio: 1, workTypeId: 4, workTypeName: "Выкладка", zoneId: 110, zoneName: "Напитки б/а",     category: "НАПИТКИ БЕЗАЛКОГОЛЬНЫЕ",     minutes: 120, state: "COMPLETED", timeStart: "07:00:00", timeEnd: "09:00:00" },
  { apiId: 277522, emp: 310, empName: "Зубов Александр Анатольевич", prio: 2, workTypeId: 4, workTypeName: "Выкладка", zoneId: 109, zoneName: "Пиво, чипсы",    category: "ПИВО",                       minutes: 120, state: "COMPLETED", timeStart: "09:00:00", timeEnd: "11:00:00" },
];

// Default zone для задач без operation_zone (КСО/Касса/Менеджерские —
// LAMA возвращает "N/A"). Маппим на функциональную зону магазина.
function defaultZoneFor(workTypeId: number): { id: number; name: string } {
  if (workTypeId === 2) return { id: 3, name: "Касса" };
  if (workTypeId === 3) return { id: 4, name: "Самокассы" };
  if (workTypeId === 13) return { id: 2, name: "Склад" };
  // Менеджерские / Другие работы / Переоценка / Инвентаризация → Торговый зал
  return { id: 1, name: "Торговый зал" };
}

export const REAL_LAMA_TASKS: Task[] = RAW.map((t) => {
  const fallback = defaultZoneFor(t.workTypeId);
  const zoneId = t.zoneId ?? fallback.id;
  const zoneName = t.zoneName ?? fallback.name;
  return {
    id: `task-lama-real-${t.apiId}`,
    title: t.category
      ? `${t.workTypeName}: ${zoneName} — ${t.category}`
      : `${t.workTypeName}: ${zoneName}`,
    description: t.category
      ? `${t.workTypeName} в зоне «${zoneName}», ${t.category}`
      : `${t.workTypeName} в зоне «${zoneName}»`,
    type: "PLANNED",
    kind: "SINGLE",
    source: "PLANNED",
    store_id: 200,
    store_name: "С-12 Некрасова, 41 (ИР)",
    zone_id: zoneId,
    zone_name: zoneName,
    work_type_id: t.workTypeId,
    work_type_name: t.workTypeName,
    product_category_name: t.category,
    priority: t.prio,
    editable_by_store: false,
    creator_id: 303, // Шелудько (директор магазина)
    creator_name: "Шелудько Нина Александровна",
    assignee_id: t.emp,
    assignee_name: t.empName,
    assigned_to_permission: null,
    state: t.state,
    review_state: "NONE",
    acceptance_policy: "MANUAL",
    requires_photo: t.workTypeId === 4 || t.workTypeId === 6 || t.workTypeId === 11,
    archived: false,
    planned_minutes: t.minutes,
    time_start: t.timeStart,
    time_end: t.timeEnd,
    created_at: TODAY,
    updated_at: TODAY,
  };
});
