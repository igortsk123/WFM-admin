/**
 * Freelance Freelancers API — admin (network) view of all independent freelancers.
 * Видны вне зависимости от агента: сеть может выбрать свободного и предложить задание.
 * В CLIENT_DIRECT режиме модуль скрыт (см. freelance-agents.ts).
 */

import type {
  ApiResponse,
  ApiListResponse,
  ApiMutationResponse,
  ApiListParams,
  FreelancerStatus,
  User,
} from "@/lib/types";
import { MOCK_FREELANCERS } from "@/lib/mock-data/freelance-freelancers";
import { MOCK_FREELANCE_AGENTS } from "@/lib/mock-data/freelance-agents";
import { MOCK_FREELANCE_ASSIGNMENTS } from "@/lib/mock-data/freelance-assignments";
import { MOCK_ORGANIZATIONS } from "@/lib/mock-data/organizations";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function isClientDirect(): boolean {
  const org = MOCK_ORGANIZATIONS.find((o) => o.id === "org-spar");
  return org?.payment_mode === "CLIENT_DIRECT";
}

const MODULE_DISABLED_ERR = "Раздел внештата недоступен в режиме CLIENT_DIRECT.";

/**
 * Расширенная карточка фрилансера для админ-таблицы:
 * + имя агента, счётчик завершённых за 30 дней, текущая занятость.
 */
export interface FreelancerWithStats extends User {
  agent_name: string | null;
  completed_30d: number;
  active_assignments: number;
  /** Свободен сейчас (нет активных назначений). */
  is_available: boolean;
}

export interface GetFreelancersParams extends ApiListParams {
  status?: FreelancerStatus;
  agent_id?: string;
  /** Только сейчас свободные (нет активных назначений). */
  available_only?: boolean;
  /** Минимальный рейтинг. */
  min_rating?: number;
}

/**
 * Список всех фрилансеров (админ-вид сети) с stats.
 * @endpoint GET /freelance/freelancers
 * @roles NETWORK_OPS, REGIONAL, HR_MANAGER
 */
export async function getFreelancers(
  params: GetFreelancersParams = {},
): Promise<ApiListResponse<FreelancerWithStats>> {
  await delay(rand(200, 400));

  if (isClientDirect()) {
    throw new Error(MODULE_DISABLED_ERR);
  }

  const {
    status,
    agent_id,
    available_only,
    min_rating,
    search,
    page = 1,
    page_size = 20,
    sort_by = "rating",
    sort_dir = "desc",
  } = params;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let filtered: FreelancerWithStats[] = MOCK_FREELANCERS.map((f) => {
    const agent = MOCK_FREELANCE_AGENTS.find((a) => a.id === f.agent_id);
    const completed_30d = MOCK_FREELANCE_ASSIGNMENTS.filter(
      (a) =>
        a.freelancer_id === f.id &&
        a.status === "DONE" &&
        new Date(a.scheduled_start).getTime() >= thirtyDaysAgo,
    ).length;
    const active_assignments = MOCK_FREELANCE_ASSIGNMENTS.filter(
      (a) =>
        a.freelancer_id === f.id &&
        (a.status === "SCHEDULED" || a.status === "CHECKED_IN" || a.status === "WORKING"),
    ).length;
    return {
      ...f,
      agent_name: agent?.name ?? null,
      completed_30d,
      active_assignments,
      is_available: f.freelancer_status === "ACTIVE" && active_assignments === 0,
    };
  });

  if (status) filtered = filtered.filter((f) => f.freelancer_status === status);
  if (agent_id) filtered = filtered.filter((f) => f.agent_id === agent_id);
  if (available_only) filtered = filtered.filter((f) => f.is_available);
  if (min_rating !== undefined) {
    filtered = filtered.filter((f) => (f.rating ?? 0) >= min_rating);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.first_name.toLowerCase().includes(q) ||
        f.last_name.toLowerCase().includes(q) ||
        f.phone.includes(q),
    );
  }

  filtered.sort((a, b) => {
    const dir = sort_dir === "asc" ? 1 : -1;
    if (sort_by === "rating") return ((a.rating ?? 0) - (b.rating ?? 0)) * dir;
    if (sort_by === "completed_30d") return (a.completed_30d - b.completed_30d) * dir;
    if (sort_by === "name") {
      const an = `${a.last_name} ${a.first_name}`;
      const bn = `${b.last_name} ${b.first_name}`;
      return an.localeCompare(bn) * dir;
    }
    return 0;
  });

  const total = filtered.length;
  const start = (page - 1) * page_size;
  const data = filtered.slice(start, start + page_size);

  return { data, total, page, page_size };
}

/**
 * Детали одного фрилансера для админа.
 * @endpoint GET /freelance/freelancers/:id
 */
export async function getFreelancerById(
  id: number,
): Promise<ApiResponse<FreelancerWithStats>> {
  await delay(rand(150, 300));

  if (isClientDirect()) {
    throw new Error(MODULE_DISABLED_ERR);
  }

  const f = MOCK_FREELANCERS.find((x) => x.id === id);
  if (!f) throw new Error(`Freelancer ${id} not found`);

  const agent = MOCK_FREELANCE_AGENTS.find((a) => a.id === f.agent_id);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const completed_30d = MOCK_FREELANCE_ASSIGNMENTS.filter(
    (a) =>
      a.freelancer_id === id &&
      a.status === "DONE" &&
      new Date(a.scheduled_start).getTime() >= thirtyDaysAgo,
  ).length;
  const active_assignments = MOCK_FREELANCE_ASSIGNMENTS.filter(
    (a) =>
      a.freelancer_id === id &&
      (a.status === "SCHEDULED" || a.status === "CHECKED_IN" || a.status === "WORKING"),
  ).length;

  return {
    data: {
      ...f,
      agent_name: agent?.name ?? null,
      completed_30d,
      active_assignments,
      is_available: f.freelancer_status === "ACTIVE" && active_assignments === 0,
    },
  };
}

/**
 * Отправить предложение задания фрилансеру.
 * Бэкенд push-нёт в мобильное приложение фрилансера; в течение 60 минут он
 * принимает или отклоняет. На MVP — мок: console.log + success.
 * @endpoint POST /freelance/freelancers/:id/offer
 */
export async function sendTaskOffer(
  freelancer_id: number,
  data: {
    service_id: string;
    store_id: number;
    shift_date: string; // ISO YYYY-MM-DD
    start_time: string; // "HH:mm"
    duration_hours: number;
    price_rub: number;
    note?: string;
  },
): Promise<ApiMutationResponse> {
  await delay(rand(300, 500));

  if (isClientDirect()) {
    return { success: false, error: { code: "MODULE_DISABLED", message: MODULE_DISABLED_ERR } };
  }

  const f = MOCK_FREELANCERS.find((x) => x.id === freelancer_id);
  if (!f) {
    return { success: false, error: { code: "NOT_FOUND", message: "Фрилансер не найден" } };
  }
  if (f.freelancer_status !== "ACTIVE") {
    return {
      success: false,
      error: { code: "NOT_ACTIVE", message: "Фрилансер не в статусе ACTIVE" },
    };
  }
  if (data.duration_hours <= 0 || data.price_rub <= 0) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Длительность и цена должны быть положительными" } };
  }

  console.log("[v0] Task offer sent to freelancer", freelancer_id, data);
  return { success: true, id: `offer-${Date.now()}` };
}
