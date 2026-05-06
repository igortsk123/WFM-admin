/**
 * @endpoint GET /api/freelance/offers
 * Mock-данные для routing-engine: 4 примера в разных стадиях.
 *
 * Логика tier'ов:
 *   - TOP_3 (rank 1-3): 60 мин эксклюзив
 *   - TOP_5 (rank 4-5): 30 мин эксклюзив
 *   - REST (rank 6+):   15 мин эксклюзив
 *
 * Окно начинается у #1 при отправке. Когда оно истекает / приходит decline →
 * следующий по rank становится PENDING, его окно стартует.
 * LATE_FALLBACK — окно истекло, но фрилансер откликнулся позже; ждёт пока
 * текущий PENDING освободит задание (decline/expired) — тогда задание уйдёт ему.
 */

import type { TaskOffer, OfferAttempt } from "@/lib/types";
import { MOCK_TODAY } from "./_today";

const minutesAgo = (m: number) => new Date(MOCK_TODAY.getTime() - m * 60_000).toISOString();
const minutesFromNow = (m: number) => new Date(MOCK_TODAY.getTime() + m * 60_000).toISOString();

export const MOCK_TASK_OFFERS: TaskOffer[] = [
  // 1. ROUTING — отправлено #1 (топ по рейтингу), окно ещё активно
  {
    id: "offer-001",
    work_type_id: 4,
    work_type_name: "Выкладка",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    shift_date: "2026-05-03",
    start_time: "10:00",
    duration_hours: 8,
    price_rub: 2400,
    status: "ROUTING",
    candidate_count: 5,
    current_attempt_id: "att-001-1",
    created_at: minutesAgo(20),
    expires_all_at: minutesFromNow(60 + 30 + 30 + 15 + 15 - 20),
    created_by_user_id: 2,
  },
  // 2. FILLED — приняли быстро, #1 ответил
  {
    id: "offer-002",
    work_type_id: 12,
    work_type_name: "Уборка",
    store_id: 4,
    store_name: "Abricos Томск, пр. Кирова 51",
    shift_date: "2026-05-04",
    start_time: "14:00",
    duration_hours: 4,
    price_rub: 1200,
    status: "FILLED",
    candidate_count: 3,
    current_attempt_id: null,
    filled_by_freelancer_id: 100,
    filled_by_attempt_id: "att-002-1",
    created_at: minutesAgo(180),
    filled_at: minutesAgo(135),
    created_by_user_id: 2,
  },
  // 3. ROUTING — #1 истёк, #2 активен; #1 откликнулся поздно (LATE_FALLBACK)
  {
    id: "offer-003",
    work_type_id: 6,
    work_type_name: "Инвентаризация",
    store_id: 2,
    store_name: "СПАР Томск, ул. Учебная 8",
    shift_date: "2026-05-05",
    start_time: "08:00",
    duration_hours: 6,
    price_rub: 1800,
    note: "Подсчёт остатков молочного отдела",
    status: "ROUTING",
    candidate_count: 4,
    current_attempt_id: "att-003-2",
    created_at: minutesAgo(75),
    expires_all_at: minutesFromNow(30 + 15 + 15 - 75),
    created_by_user_id: 2,
  },
  // 4. EXPIRED_ALL — никто не принял
  {
    id: "offer-004",
    work_type_id: 13,
    work_type_name: "Складские работы",
    store_id: 7,
    store_name: "Food City Томск, ул. Гагарина 42",
    shift_date: "2026-05-02",
    start_time: "06:00",
    duration_hours: 8,
    price_rub: 2200,
    status: "EXPIRED_ALL",
    candidate_count: 3,
    current_attempt_id: null,
    created_at: minutesAgo(360),
    expires_all_at: minutesAgo(225),
    created_by_user_id: 2,
  },
];

export const MOCK_OFFER_ATTEMPTS: OfferAttempt[] = [
  // ── offer-001 (ROUTING, #1 активен 60-мин окно) ──
  {
    id: "att-001-1",
    offer_id: "offer-001",
    freelancer_id: 100, // Краснов Артём, 4.7
    freelancer_name: "Краснов Артём Дмитриевич",
    rating: 4.7,
    rank: 1,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: minutesAgo(20),
    exclusive_until: minutesFromNow(40),
    status: "PENDING",
  },
  {
    id: "att-001-2",
    offer_id: "offer-001",
    freelancer_id: 101, // Смирнова Виктория, 4.5
    freelancer_name: "Смирнова Виктория Олеговна",
    rating: 4.5,
    rank: 2,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: null,
    exclusive_until: null,
    status: "WAITING",
  },
  {
    id: "att-001-3",
    offer_id: "offer-001",
    freelancer_id: 102, // Поляков Денис, 4.3
    freelancer_name: "Поляков Денис Сергеевич",
    rating: 4.3,
    rank: 3,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: null,
    exclusive_until: null,
    status: "WAITING",
  },
  {
    id: "att-001-4",
    offer_id: "offer-001",
    freelancer_id: 103,
    freelancer_name: "Орехова Людмила Валентиновна",
    rating: 4.0,
    rank: 4,
    tier: "TOP_5",
    exclusive_minutes: 30,
    sent_at: null,
    exclusive_until: null,
    status: "WAITING",
  },
  {
    id: "att-001-5",
    offer_id: "offer-001",
    freelancer_id: 104,
    freelancer_name: "Козлов Михаил Андреевич",
    rating: 3.8,
    rank: 5,
    tier: "TOP_5",
    exclusive_minutes: 30,
    sent_at: null,
    exclusive_until: null,
    status: "WAITING",
  },

  // ── offer-002 (FILLED — Краснов принял в своё окно) ──
  {
    id: "att-002-1",
    offer_id: "offer-002",
    freelancer_id: 100,
    freelancer_name: "Краснов Артём Дмитриевич",
    rating: 4.7,
    rank: 1,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: minutesAgo(180),
    exclusive_until: minutesAgo(120),
    status: "ACCEPTED",
    responded_at: minutesAgo(135),
  },
  {
    id: "att-002-2",
    offer_id: "offer-002",
    freelancer_id: 105,
    freelancer_name: "Громова Елена Викторовна",
    rating: 4.4,
    rank: 2,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: null,
    exclusive_until: null,
    status: "WAITING", // отменено когда #1 принял — но остаётся в истории очереди
  },
  {
    id: "att-002-3",
    offer_id: "offer-002",
    freelancer_id: 106,
    freelancer_name: "Сидоров Павел Игоревич",
    rating: 4.2,
    rank: 3,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: null,
    exclusive_until: null,
    status: "WAITING",
  },

  // ── offer-003 (ROUTING — #1 истёк, #1 пришёл поздно (LATE_FALLBACK), #2 активен) ──
  {
    id: "att-003-1",
    offer_id: "offer-003",
    freelancer_id: 101, // Смирнова, 4.5
    freelancer_name: "Смирнова Виктория Олеговна",
    rating: 4.5,
    rank: 1,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: minutesAgo(75),
    exclusive_until: minutesAgo(15),
    status: "LATE_FALLBACK", // окно истекло, но потом откликнулась — ждёт fallback'а
    responded_at: minutesAgo(5),
  },
  {
    id: "att-003-2",
    offer_id: "offer-003",
    freelancer_id: 102,
    freelancer_name: "Поляков Денис Сергеевич",
    rating: 4.3,
    rank: 2,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: minutesAgo(15),
    exclusive_until: minutesFromNow(45),
    status: "PENDING",
  },
  {
    id: "att-003-3",
    offer_id: "offer-003",
    freelancer_id: 103,
    freelancer_name: "Орехова Людмила Валентиновна",
    rating: 4.0,
    rank: 3,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: null,
    exclusive_until: null,
    status: "WAITING",
  },
  {
    id: "att-003-4",
    offer_id: "offer-003",
    freelancer_id: 105,
    freelancer_name: "Громова Елена Викторовна",
    rating: 4.4, // намеренно ниже #1 хотя по рейтингу выше — пример сортировки только по rank
    rank: 4,
    tier: "TOP_5",
    exclusive_minutes: 30,
    sent_at: null,
    exclusive_until: null,
    status: "WAITING",
  },

  // ── offer-004 (EXPIRED_ALL — все 3 истекли) ──
  {
    id: "att-004-1",
    offer_id: "offer-004",
    freelancer_id: 107,
    freelancer_name: "Иванов Игорь Сергеевич",
    rating: 4.1,
    rank: 1,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: minutesAgo(360),
    exclusive_until: minutesAgo(300),
    status: "EXPIRED",
  },
  {
    id: "att-004-2",
    offer_id: "offer-004",
    freelancer_id: 108,
    freelancer_name: "Петрова Анна Михайловна",
    rating: 3.9,
    rank: 2,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: minutesAgo(300),
    exclusive_until: minutesAgo(240),
    status: "DECLINED",
    responded_at: minutesAgo(280),
  },
  {
    id: "att-004-3",
    offer_id: "offer-004",
    freelancer_id: 109,
    freelancer_name: "Васильев Дмитрий Олегович",
    rating: 3.7,
    rank: 3,
    tier: "TOP_3",
    exclusive_minutes: 60,
    sent_at: minutesAgo(240),
    exclusive_until: minutesAgo(180),
    status: "EXPIRED",
  },
];
