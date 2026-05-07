/**
 * Freelance Task Offers API — routing-engine для предложений заданий.
 *
 * Бизнес-логика (per user 2026-05-06):
 *   - Задание уходит фрилансерам ПО ОЧЕРЕДИ от высшего рейтинга к низшему
 *   - Окно эксклюзива по tier'у: TOP_3 → 60 мин, TOP_5 → 30 мин, REST → 15 мин
 *   - Только ОДИН активный получатель за раз (никто другой не видит до его ответа/таймаута)
 *   - Если фрилансер откликнулся ПОЗЖЕ своего окна — попадает в LATE_FALLBACK,
 *     ждёт пока текущий PENDING освободит задание
 *   - При decline/expired текущего → сначала проверяется LATE_FALLBACK queue (по rank),
 *     потом — следующий WAITING по rank
 *
 * Mock-API не реализует таймер автоматически. State transitions делает
 * `simulateAttemptResponse` (для UI demo).
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  TaskOffer,
  OfferAttempt,
  OfferTier,
  TaskOfferStatus,
  OfferAttemptStatus,
} from "@/lib/types";
import {
  MOCK_TASK_OFFERS,
  MOCK_OFFER_ATTEMPTS,
} from "@/lib/mock-data/freelance-task-offers";
import { MOCK_FREELANCERS } from "@/lib/mock-data/freelance-freelancers";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_WORK_TYPES } from "@/lib/mock-data/work-types";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Mutable in-memory copies (для simulate)
let _offers = [...MOCK_TASK_OFFERS];
let _attempts = [...MOCK_OFFER_ATTEMPTS];

export function _resetOffersMock() {
  _offers = [...MOCK_TASK_OFFERS];
  _attempts = [...MOCK_OFFER_ATTEMPTS];
}

// ─────────────────────────────────────────────────────────────────
// Tier rules
// ─────────────────────────────────────────────────────────────────

export function getTierForRank(rank: number): { tier: OfferTier; minutes: number } {
  if (rank <= 3) return { tier: "TOP_3", minutes: 60 };
  if (rank <= 5) return { tier: "TOP_5", minutes: 30 };
  return { tier: "REST", minutes: 15 };
}

// ─────────────────────────────────────────────────────────────────
// LIST & GET
// ─────────────────────────────────────────────────────────────────

export interface GetTaskOffersParams extends ApiListParams {
  status?: TaskOfferStatus;
  store_id?: number;
  /** Фильтр: где этот фрилансер уже получил/получит attempt. */
  freelancer_id?: number;
}

/**
 * Список offer'ов (admin вид).
 * @endpoint GET /freelance/offers
 */
export async function getTaskOffers(
  params: GetTaskOffersParams = {},
): Promise<ApiListResponse<TaskOffer>> {
  await delay(rand(200, 350));
  const { status, store_id, freelancer_id, page = 1, page_size = 20 } = params;

  let filtered = [..._offers];
  if (status) filtered = filtered.filter((o) => o.status === status);
  if (store_id !== undefined) filtered = filtered.filter((o) => o.store_id === store_id);
  if (freelancer_id !== undefined) {
    const offerIds = new Set(
      _attempts.filter((a) => a.freelancer_id === freelancer_id).map((a) => a.offer_id),
    );
    filtered = filtered.filter((o) => offerIds.has(o.id));
  }

  // Свежие сверху
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const start = (page - 1) * page_size;
  return {
    data: filtered.slice(start, start + page_size),
    total: filtered.length,
    page,
    page_size,
  };
}

/**
 * Один offer + его attempts (отсортированы по rank ASC).
 * @endpoint GET /freelance/offers/:id
 */
export async function getTaskOfferById(
  id: string,
): Promise<ApiResponse<TaskOffer & { attempts: OfferAttempt[] }>> {
  await delay(rand(150, 300));
  const offer = _offers.find((o) => o.id === id);
  if (!offer) throw new Error(`Offer ${id} not found`);
  const attempts = _attempts
    .filter((a) => a.offer_id === id)
    .sort((a, b) => a.rank - b.rank);
  return { data: { ...offer, attempts } };
}

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────

export interface CreateTaskOfferData {
  work_type_id: number;
  store_id: number;
  shift_date: string;
  start_time: string;
  duration_hours: number;
  price_rub: number;
  note?: string;
  /** ID-шники фрилансеров; будут отсортированы по рейтингу DESC. */
  candidate_freelancer_ids: number[];
  created_by_user_id: number;
}

/**
 * Создать TaskOffer и заполнить очередь attempts по рейтингу.
 * Первая попытка сразу становится PENDING (отправлена), остальные WAITING.
 * @endpoint POST /freelance/offers
 */
export async function createTaskOffer(
  data: CreateTaskOfferData,
): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  if (data.candidate_freelancer_ids.length === 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Нужен минимум 1 кандидат" } };
  }

  const workType = MOCK_WORK_TYPES.find((w) => w.id === data.work_type_id);
  const store = MOCK_STORES.find((s) => s.id === data.store_id);
  if (!workType || !store) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Неверный work_type или store" } };
  }

  // Сортируем кандидатов по рейтингу DESC; невалидные/неактивные отбрасываем
  const candidates = data.candidate_freelancer_ids
    .map((id) => MOCK_FREELANCERS.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => !!f && f.freelancer_status === "ACTIVE")
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  if (candidates.length === 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Нет ни одного активного кандидата" } };
  }

  const offerId = `offer-${Date.now()}`;
  const now = new Date().toISOString();

  // Считаем total minutes для expires_all_at
  let totalMinutes = 0;
  candidates.forEach((_, idx) => {
    totalMinutes += getTierForRank(idx + 1).minutes;
  });
  const expiresAllAt = new Date(Date.now() + totalMinutes * 60_000).toISOString();

  // Создаём attempts
  const newAttempts: OfferAttempt[] = candidates.map((f, idx) => {
    const rank = idx + 1;
    const { tier, minutes } = getTierForRank(rank);
    if (rank === 1) {
      // Первый сразу PENDING с начатым окном
      return {
        id: `${offerId}-att-${rank}`,
        offer_id: offerId,
        freelancer_id: f.id,
        freelancer_name: `${f.last_name} ${f.first_name}${f.middle_name ? ` ${f.middle_name}` : ""}`,
        freelancer_avatar_url: f.avatar_url,
        rating: f.rating ?? null,
        rank,
        tier,
        exclusive_minutes: minutes,
        sent_at: now,
        exclusive_until: new Date(Date.now() + minutes * 60_000).toISOString(),
        status: "PENDING",
      };
    }
    return {
      id: `${offerId}-att-${rank}`,
      offer_id: offerId,
      freelancer_id: f.id,
      freelancer_name: `${f.last_name} ${f.first_name}${f.middle_name ? ` ${f.middle_name}` : ""}`,
      freelancer_avatar_url: f.avatar_url,
      rating: f.rating ?? null,
      rank,
      tier,
      exclusive_minutes: minutes,
      sent_at: null,
      exclusive_until: null,
      status: "WAITING",
    };
  });

  const newOffer: TaskOffer = {
    id: offerId,
    work_type_id: data.work_type_id,
    work_type_name: workType.name,
    store_id: data.store_id,
    store_name: store.name,
    shift_date: data.shift_date,
    start_time: data.start_time,
    duration_hours: data.duration_hours,
    price_rub: data.price_rub,
    note: data.note,
    status: "ROUTING",
    candidate_count: candidates.length,
    current_attempt_id: newAttempts[0].id,
    created_at: now,
    expires_all_at: expiresAllAt,
    created_by_user_id: data.created_by_user_id,
  };

  _offers = [newOffer, ..._offers];
  _attempts = [..._attempts, ...newAttempts];

  return { success: true, id: offerId };
}

// ─────────────────────────────────────────────────────────────────
// SIMULATE — для UI demo (state machine без таймера)
// ─────────────────────────────────────────────────────────────────

export type AttemptResponseAction = "ACCEPT" | "DECLINE" | "EXPIRE" | "LATE_RESPOND";

/**
 * Применить ответ к попытке (mock-state machine).
 *
 * - ACCEPT: attempt → ACCEPTED, offer → FILLED, остальные WAITING → отменяются (остаются WAITING для аудита)
 * - DECLINE / EXPIRE: attempt → DECLINED/EXPIRED, выбираем следующего:
 *     1. Если есть LATE_FALLBACK с min rank — он → ACCEPTED, offer → FILLED
 *     2. Иначе следующий WAITING с min rank → PENDING (sent_at + exclusive_until)
 *     3. Если ни того ни другого — offer → EXPIRED_ALL
 * - LATE_RESPOND: применяется к EXPIRED attempt → status = LATE_FALLBACK
 *     (используется когда фрилансер откликнулся после своего окна)
 *
 * @endpoint POST /freelance/offers/:offer_id/attempts/:attempt_id/simulate
 */
export async function simulateAttemptResponse(
  offer_id: string,
  attempt_id: string,
  action: AttemptResponseAction,
): Promise<ApiMutationResponse> {
  await delay(rand(200, 400));

  const offer = _offers.find((o) => o.id === offer_id);
  if (!offer) return { success: false, error: { code: "NOT_FOUND", message: "Offer не найден" } };
  if (offer.status !== "ROUTING")
    return { success: false, error: { code: "INVALID_STATE", message: "Offer уже не в ROUTING" } };

  const attempt = _attempts.find((a) => a.id === attempt_id);
  if (!attempt) return { success: false, error: { code: "NOT_FOUND", message: "Attempt не найден" } };

  const now = new Date().toISOString();

  if (action === "LATE_RESPOND") {
    if (attempt.status !== "EXPIRED") {
      return { success: false, error: { code: "INVALID_STATE", message: "LATE_RESPOND только для EXPIRED" } };
    }
    _attempts = _attempts.map((a) =>
      a.id === attempt_id ? { ...a, status: "LATE_FALLBACK" as OfferAttemptStatus, responded_at: now } : a,
    );
    return { success: true };
  }

  if (attempt.status !== "PENDING") {
    return { success: false, error: { code: "INVALID_STATE", message: "Attempt не в PENDING" } };
  }

  if (action === "ACCEPT") {
    _attempts = _attempts.map((a) =>
      a.id === attempt_id
        ? { ...a, status: "ACCEPTED" as OfferAttemptStatus, responded_at: now }
        : a,
    );
    _offers = _offers.map((o) =>
      o.id === offer_id
        ? {
            ...o,
            status: "FILLED" as TaskOfferStatus,
            current_attempt_id: null,
            filled_by_freelancer_id: attempt.freelancer_id,
            filled_by_attempt_id: attempt.id,
            filled_at: now,
          }
        : o,
    );
    return { success: true };
  }

  // DECLINE or EXPIRE: освобождаем текущий → ищем next
  const newStatus: OfferAttemptStatus = action === "DECLINE" ? "DECLINED" : "EXPIRED";
  _attempts = _attempts.map((a) =>
    a.id === attempt_id
      ? { ...a, status: newStatus, responded_at: action === "DECLINE" ? now : a.responded_at }
      : a,
  );

  // Сначала проверяем LATE_FALLBACK с минимальным rank
  const fallback = _attempts
    .filter((a) => a.offer_id === offer_id && a.status === "LATE_FALLBACK")
    .sort((a, b) => a.rank - b.rank)[0];

  if (fallback) {
    // Отдаём задание fallback'у (он давно ждёт)
    _attempts = _attempts.map((a) =>
      a.id === fallback.id
        ? { ...a, status: "ACCEPTED" as OfferAttemptStatus, responded_at: now }
        : a,
    );
    _offers = _offers.map((o) =>
      o.id === offer_id
        ? {
            ...o,
            status: "FILLED" as TaskOfferStatus,
            current_attempt_id: null,
            filled_by_freelancer_id: fallback.freelancer_id,
            filled_by_attempt_id: fallback.id,
            filled_at: now,
          }
        : o,
    );
    return { success: true };
  }

  // Иначе — следующий WAITING по rank
  const nextWaiting = _attempts
    .filter((a) => a.offer_id === offer_id && a.status === "WAITING")
    .sort((a, b) => a.rank - b.rank)[0];

  if (nextWaiting) {
    const nowDate = new Date();
    const exclusiveUntil = new Date(nowDate.getTime() + nextWaiting.exclusive_minutes * 60_000).toISOString();
    _attempts = _attempts.map((a) =>
      a.id === nextWaiting.id
        ? { ...a, status: "PENDING" as OfferAttemptStatus, sent_at: now, exclusive_until: exclusiveUntil }
        : a,
    );
    _offers = _offers.map((o) =>
      o.id === offer_id ? { ...o, current_attempt_id: nextWaiting.id } : o,
    );
    return { success: true };
  }

  // Очередь кончилась
  _offers = _offers.map((o) =>
    o.id === offer_id
      ? { ...o, status: "EXPIRED_ALL" as TaskOfferStatus, current_attempt_id: null }
      : o,
  );
  return { success: true };
}

/**
 * Отменить offer вручную (например — задание неактуально).
 * @endpoint POST /freelance/offers/:id/cancel
 */
export async function cancelTaskOffer(id: string): Promise<ApiMutationResponse> {
  await delay(rand(200, 350));
  const offer = _offers.find((o) => o.id === id);
  if (!offer) return { success: false, error: { code: "NOT_FOUND", message: "Offer не найден" } };
  if (offer.status !== "ROUTING") {
    return { success: false, error: { code: "INVALID_STATE", message: "Offer уже завершён" } };
  }
  _offers = _offers.map((o) =>
    o.id === id ? { ...o, status: "CANCELLED" as TaskOfferStatus, current_attempt_id: null } : o,
  );
  return { success: true };
}
