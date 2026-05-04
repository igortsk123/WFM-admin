import type { Assignment } from "@/lib/types";

/**
 * @endpoint GET /api/assignments
 * Formal position assignments — one active assignment per user.
 * store_id references Store.id; position_id references Position.id.
 */
export const MOCK_ASSIGNMENTS: Assignment[] = [
  // Platform admin — staff tenant (нет store)
  { id: 1, user_id: 1, position_id: 8, position_name: "Супервайзер", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // Agent — no store assignment needed; using store 1 as anchor
  { id: 2, user_id: 2, position_id: 8, position_name: "Супервайзер", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // NETWORK_OPS Соколова
  { id: 3, user_id: 3, position_id: 7, position_name: "Директор магазина", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // SUPERVISOR Романов — anchor store SPAR-TOM-001
  { id: 4, user_id: 4, position_id: 8, position_name: "Супервайзер", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // STORE_DIRECTOR Иванов А. С.
  { id: 5, user_id: 5, position_id: 7, position_name: "Директор магазина", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // STORE_DIRECTOR Петрова
  { id: 6, user_id: 6, position_id: 7, position_name: "Директор магазина", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // STORE_DIRECTOR Сидоров
  { id: 7, user_id: 7, position_id: 7, position_name: "Директор магазина", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // STORE_DIRECTOR Васильев
  { id: 8, user_id: 8, position_id: 7, position_name: "Директор магазина", store_id: 5, store_name: "СПАР Новосибирск, Красный пр. 200", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // STORE_DIRECTOR Никитин Б. С.
  { id: 9, user_id: 9, position_id: 7, position_name: "Директор магазина", store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // STORE_DIRECTOR Смирнова
  { id: 10, user_id: 10, position_id: 7, position_name: "Директор магазина", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // NETWORK_OPS Никитина (fashion)
  { id: 11, user_id: 11, position_id: 7, position_name: "Директор магазина", store_id: 10, store_name: "Магазин одежды Альфа, Томск, пр. Ленина 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // SUPERVISOR Тарасова
  { id: 12, user_id: 12, position_id: 8, position_name: "Супервайзер", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // HR_MANAGER Морозова
  { id: 13, user_id: 13, position_id: 7, position_name: "Директор магазина", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // OPERATOR Кузнецов
  { id: 14, user_id: 14, position_id: 8, position_name: "Супервайзер", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  // Workers (id 15-31)
  { id: 15, user_id: 15, position_id: 2, position_name: "Кассир", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 16, user_id: 16, position_id: 1, position_name: "Универсал", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 17, user_id: 17, position_id: 3, position_name: "Старший кассир", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 2, code: "RANK-2", name: "Старший" }, active: true },
  { id: 18, user_id: 18, position_id: 4, position_name: "Продавец-консультант", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 19, user_id: 19, position_id: 5, position_name: "Кладовщик", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 20, user_id: 20, position_id: 6, position_name: "Мерчендайзер", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 21, user_id: 21, position_id: 2, position_name: "Кассир", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 22, user_id: 22, position_id: 1, position_name: "Универсал", store_id: 5, store_name: "СПАР Новосибирск, Красный пр. 200", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 23, user_id: 23, position_id: 4, position_name: "Продавец-консультант", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 24, user_id: 24, position_id: 5, position_name: "Кладовщик", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 25, user_id: 25, position_id: 2, position_name: "Кассир", store_id: 8, store_name: "Food City Томск, ул. Учебная 39", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 26, user_id: 26, position_id: 6, position_name: "Мерчендайзер", store_id: 8, store_name: "Food City Томск, ул. Учебная 39", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 27, user_id: 27, position_id: 4, position_name: "Продавец-консультант", store_id: 10, store_name: "Магазин одежды Альфа, Томск, пр. Ленина 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 28, user_id: 28, position_id: 2, position_name: "Кассир", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: false },
  { id: 29, user_id: 29, position_id: 1, position_name: "Универсал", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 30, user_id: 30, position_id: 4, position_name: "Продавец-консультант", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 31, user_id: 31, position_id: 1, position_name: "Универсал", store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },

  // ── Demo user 101 (employee-detail demo): текущее + старое archived ──
  { id: 101, user_id: 101, position_id: 2, position_name: "Кассир", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 2, code: "RANK-2", name: "Старший" }, active: true },
  { id: 102, user_id: 101, position_id: 1, position_name: "Универсал", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: false },
];
