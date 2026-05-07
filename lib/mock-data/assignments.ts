import type { Assignment } from "@/lib/types";
import { REAL_LAMA_ASSIGNMENTS } from "./_lama-real";

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
  { id: 28, user_id: 28, position_id: 2, position_name: "Кассир", store_id: 1, store_name: "СПАР То��ск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: false },
  { id: 29, user_id: 29, position_id: 1, position_name: "Универсал", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 30, user_id: 30, position_id: 4, position_name: "Продавец-консультант", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 31, user_id: 31, position_id: 1, position_name: "Универсал", store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },

  // ── id=101 Иванова М. П. — demo employee detail ──────────────────
  // Текущее назначение (активное)
  { id: 101, user_id: 101, position_id: 2, position_name: "Кассир", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 2, code: "RANK-2", name: "Старший" }, active: true, external_id: "EMP-042" },
  // Предыдущее назначение (архивное)
  { id: 102, user_id: 101, position_id: 4, position_name: "Продавец-консультант", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: false, external_id: "EMP-015" },

  // ── Extras (id 35-104) ───────────────────────────────────────
  { id: 35, user_id: 35, position_id: 2, position_name: "Кассир", store_id: 8, store_name: "Food City Томск, ул. Учебная 39", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 36, user_id: 36, position_id: 5, position_name: "Кладовщик", store_id: 18, store_name: "Первоцвет Томск, ул. Учебная 7А", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 37, user_id: 37, position_id: 3, position_name: "Старший кассир", store_id: 15, store_name: "Abricos Томск, ул. Сибирская 81", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 38, user_id: 38, position_id: 6, position_name: "Мерчендайзер", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 39, user_id: 39, position_id: 6, position_name: "Мерчендайзер", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 40, user_id: 40, position_id: 3, position_name: "Старший кассир", store_id: 14, store_name: "Abricos Томск, пр. Кирова 51", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 41, user_id: 41, position_id: 5, position_name: "Кладовщик", store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 42, user_id: 42, position_id: 1, position_name: "Универсал", store_id: 12, store_name: "СПАР Северск, ул. Курчатова 5", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 43, user_id: 43, position_id: 6, position_name: "Мерчендайзер", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 44, user_id: 44, position_id: 5, position_name: "Кладовщик", store_id: 15, store_name: "Abricos Томск, ул. Сибирская 81", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 45, user_id: 45, position_id: 6, position_name: "Мерчендайзер", store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 46, user_id: 46, position_id: 6, position_name: "Мерчендайзер", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 47, user_id: 47, position_id: 2, position_name: "Кассир", store_id: 18, store_name: "Первоцвет Томск, ул. Учебная 7А", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 48, user_id: 48, position_id: 5, position_name: "Кладовщик", store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 49, user_id: 49, position_id: 2, position_name: "Кассир", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 50, user_id: 50, position_id: 5, position_name: "Кладовщик", store_id: 17, store_name: "Первоцвет Томск, пр. Мира 76", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 51, user_id: 51, position_id: 6, position_name: "Мерчендайзер", store_id: 14, store_name: "Abricos Томск, пр. Кирова 51", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 52, user_id: 52, position_id: 1, position_name: "Универсал", store_id: 8, store_name: "Food City Томск, ул. Учебная 39", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 53, user_id: 53, position_id: 2, position_name: "Кассир", store_id: 18, store_name: "Первоцвет Томск, ул. Учебная 7А", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 54, user_id: 54, position_id: 4, position_name: "Продавец-консультант", store_id: 8, store_name: "Food City Томск, ул. Учебная 39", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 55, user_id: 55, position_id: 1, position_name: "Универсал", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 56, user_id: 56, position_id: 3, position_name: "Старший кассир", store_id: 6, store_name: "СПАР Кемерово, пр. Советский 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 57, user_id: 57, position_id: 1, position_name: "Универсал", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 58, user_id: 58, position_id: 1, position_name: "Универсал", store_id: 15, store_name: "Abricos Томск, ул. Сибирская 81", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 59, user_id: 59, position_id: 2, position_name: "Кассир", store_id: 5, store_name: "СПАР Новосибирск, Красный пр. 200", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 60, user_id: 60, position_id: 5, position_name: "Кладовщик", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 61, user_id: 61, position_id: 5, position_name: "Кладовщик", store_id: 2, store_name: "СПАР Томск, ул. Красноармейская 99", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 62, user_id: 62, position_id: 4, position_name: "Продавец-консультант", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 63, user_id: 63, position_id: 5, position_name: "Кладовщик", store_id: 11, store_name: "Швейный цех №1, Томск, ул. Карташова 25", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 64, user_id: 64, position_id: 3, position_name: "Старший кассир", store_id: 8, store_name: "Food City Томск, ул. Учебная 39", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 65, user_id: 65, position_id: 5, position_name: "Кладовщик", store_id: 15, store_name: "Abricos Томск, ул. Сибирская 81", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 66, user_id: 66, position_id: 3, position_name: "Старший кассир", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 67, user_id: 67, position_id: 1, position_name: "Универсал", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 68, user_id: 68, position_id: 4, position_name: "Продавец-консультант", store_id: 17, store_name: "Первоцвет Томск, пр. Мира 76", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 69, user_id: 69, position_id: 5, position_name: "Кладовщик", store_id: 10, store_name: "Магазин одежды Альфа, Томск, пр. Ленина 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 70, user_id: 70, position_id: 6, position_name: "Мерчендайзер", store_id: 5, store_name: "СПАР Новосибирск, Красный пр. 200", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 71, user_id: 71, position_id: 2, position_name: "Кассир", store_id: 5, store_name: "СПАР Новосибирск, Красный пр. 200", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 72, user_id: 72, position_id: 2, position_name: "Кассир", store_id: 7, store_name: "Food City Томск Global Market, пр. Ленина 217", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 73, user_id: 73, position_id: 2, position_name: "Кассир", store_id: 10, store_name: "Магазин одежды Альфа, Томск, пр. Ленина 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 74, user_id: 74, position_id: 5, position_name: "Кладовщик", store_id: 17, store_name: "Первоцвет Томск, пр. Мира 76", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 75, user_id: 75, position_id: 1, position_name: "Универсал", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 76, user_id: 76, position_id: 1, position_name: "Универсал", store_id: 10, store_name: "Магазин одежды Альфа, Томск, пр. Ленина 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 77, user_id: 77, position_id: 1, position_name: "Универсал", store_id: 17, store_name: "Первоцвет Томск, пр. Мира 76", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 78, user_id: 78, position_id: 4, position_name: "Продавец-консультант", store_id: 5, store_name: "СПАР Новосибирск, Красный пр. 200", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 79, user_id: 79, position_id: 2, position_name: "Кассир", store_id: 11, store_name: "Швейный цех №1, Томск, ул. Карташова 25", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 80, user_id: 80, position_id: 6, position_name: "Мерчендайзер", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 81, user_id: 81, position_id: 2, position_name: "Кассир", store_id: 10, store_name: "Магазин одежды Альфа, Томск, пр. Ленина 50", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 82, user_id: 82, position_id: 4, position_name: "Продавец-консультант", store_id: 14, store_name: "Abricos Томск, пр. Кирова 51", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 83, user_id: 83, position_id: 2, position_name: "Кассир", store_id: 11, store_name: "Швейный цех №1, Томск, ул. Карташова 25", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 84, user_id: 84, position_id: 5, position_name: "Кладовщик", store_id: 16, store_name: "Abricos Кемерово, пр. Ленина 80А", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 85, user_id: 85, position_id: 6, position_name: "Мерчендайзер", store_id: 11, store_name: "Швейный цех №1, Томск, ул. Карташова 25", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 86, user_id: 86, position_id: 3, position_name: "Старший кассир", store_id: 14, store_name: "Abricos Томск, пр. Кирова 51", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 87, user_id: 87, position_id: 4, position_name: "Продавец-консультант", store_id: 12, store_name: "СПАР Северск, ул. Курчатова 5", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 88, user_id: 88, position_id: 5, position_name: "Кладовщик", store_id: 18, store_name: "Первоцвет Томск, ул. Учебная 7А", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 89, user_id: 89, position_id: 2, position_name: "Кассир", store_id: 12, store_name: "СПАР Северск, ул. Курчатова 5", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 90, user_id: 90, position_id: 2, position_name: "Кассир", store_id: 12, store_name: "СПАР Северск, ул. Курчатова 5", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 91, user_id: 91, position_id: 3, position_name: "Старший кассир", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 92, user_id: 92, position_id: 1, position_name: "Универсал", store_id: 4, store_name: "СПАР Новосибирск, ул. Ленина 55", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 93, user_id: 93, position_id: 2, position_name: "Кассир", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 94, user_id: 94, position_id: 6, position_name: "Мерчендайзер", store_id: 16, store_name: "Abricos Кемерово, пр. Ленина 80А", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 95, user_id: 95, position_id: 5, position_name: "Кладовщик", store_id: 13, store_name: "СПАР Северск, пр. Коммунистический 41", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 96, user_id: 96, position_id: 6, position_name: "Мерчендайзер", store_id: 13, store_name: "СПАР Северск, пр. Коммунистический 41", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 97, user_id: 97, position_id: 4, position_name: "Продавец-консультант", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 98, user_id: 98, position_id: 6, position_name: "Мерчендайзер", store_id: 3, store_name: "СПАР Томск, пр. Фрунзе 92а", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 99, user_id: 99, position_id: 1, position_name: "Универсал", store_id: 3, store_name: "СПАР Томск, пр. Фрунзе 92а", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 100, user_id: 100, position_id: 2, position_name: "Кассир", store_id: 13, store_name: "СПАР Северск, пр. Коммунистический 41", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 101, user_id: 101, position_id: 1, position_name: "Универсал", store_id: 3, store_name: "СПАР Томск, пр. Фрунзе 92а", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 102, user_id: 102, position_id: 1, position_name: "Универсал", store_id: 1, store_name: "СПАР Томск, пр. Ленина 80", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 103, user_id: 103, position_id: 6, position_name: "Мерчендайзер", store_id: 13, store_name: "СПАР Северск, пр. Коммунистический 41", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 104, user_id: 104, position_id: 6, position_name: "Мерчендайзер", store_id: 3, store_name: "СПАР Томск, пр. Фрунзе 92а", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },

  // ─── ТехПродЗдрав assignments (user 200-208 → store 100, position 10-18)
  { id: 200, user_id: 200, position_id: 10, position_name: "Закройщик", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 2, code: "RANK-2", name: "Старший" }, active: true },
  { id: 201, user_id: 201, position_id: 11, position_name: "Вышивальщица", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 2, code: "RANK-2", name: "Старший" }, active: true },
  { id: 202, user_id: 202, position_id: 12, position_name: "Комплектовщица", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },
  { id: 203, user_id: 203, position_id: 13, position_name: "Швея", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 3, code: "RANK-3", name: "Бригадир" }, active: true },
  { id: 204, user_id: 204, position_id: 14, position_name: "Ручница", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 2, code: "RANK-2", name: "Старший" }, active: true },
  { id: 205, user_id: 205, position_id: 15, position_name: "Оператор клеевого станка", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 3, code: "RANK-3", name: "Бригадир" }, active: true },
  { id: 206, user_id: 206, position_id: 16, position_name: "Оператор дозатора", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 3, code: "RANK-3", name: "Бригадир" }, active: true },
  { id: 207, user_id: 207, position_id: 17, position_name: "Швея-окантовщица", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 3, code: "RANK-3", name: "Бригадир" }, active: true },
  { id: 208, user_id: 208, position_id: 18, position_name: "Упаковщик", store_id: 100, store_name: "ТехПродЗдрав, швейный цех", rank: { id: 1, code: "RANK-1", name: "Стандарт" }, active: true },

  // ─── ЛАМА реальные assignments (id 300-314) — 15 чел в магазине 200.
  ...REAL_LAMA_ASSIGNMENTS,
];
