/**
 * Leaderboards API — рейтинги, команды, челленджи.
 * Foundation для chat 51 (stretch screen). Все API — статичные mock'и.
 */

import type { ApiResponse, ApiListResponse, ApiMutationResponse } from "@/lib/types";
import {
  MOCK_LEADERBOARD_USERS,
  MOCK_LEADERBOARD_STORES,
  type LeaderboardEntry,
} from "@/lib/mock-data/future-placeholders";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type LeaderboardPeriod = "week" | "month" | "quarter";

export type ChallengeStatus = "ACTIVE" | "COMPLETED" | "UPCOMING";

export type ChallengeGoalType = "TASKS_COUNT" | "HOURS" | "COMPLETION_RATE" | "NO_REJECTS";

export interface UserAvatar {
  user_id: number;
  user_name: string;
  avatar_url?: string;
}

export interface Team {
  id: string;
  name: string;
  store_id: number;
  store_name: string;
  members: UserAvatar[];
  members_total: number;
  points: number;
  activity_pct: number;
  status: "active" | "paused";
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  status: ChallengeStatus;
  period_start: string;
  period_end: string;
  goal_type: ChallengeGoalType;
  goal_value: number;
  current_value: number;
  participants: UserAvatar[];
  participants_total: number;
  reward_text: string;
  reward_amount_rub?: number;
  reward_badge?: string;
  store_ids: number[];
  work_type_ids: number[];
}

export interface CreateChallengeData {
  title: string;
  description: string;
  period_start: string;
  period_end: string;
  goal_type: ChallengeGoalType;
  goal_value: number;
  work_type_ids: number[];
  zone_ids: number[];
  participants_scope: "ALL_STORE_EMPLOYEES" | "BY_POSITION" | "SPECIFIC_USERS";
  participants_ids?: number[];
  reward_text: string;
}

export type { LeaderboardEntry };

// ═══════════════════════════════════════════════════════════════════
// LEADERBOARDS
// ═══════════════════════════════════════════════════════════════════

export interface LeaderboardParams {
  period?: LeaderboardPeriod;
  store_id?: number;
}

/** @endpoint GET /leaderboards/users */
export async function getLeaderboardUsers(params?: LeaderboardParams): Promise<ApiListResponse<LeaderboardEntry>> {
  await delay(280);
  const data = MOCK_LEADERBOARD_USERS;
  return { data, total: data.length, page: 1, page_size: data.length };
}

/** @endpoint GET /leaderboards/stores */
export async function getLeaderboardStores(params?: LeaderboardParams): Promise<ApiListResponse<LeaderboardEntry>> {
  await delay(280);
  const data = MOCK_LEADERBOARD_STORES;
  return { data, total: data.length, page: 1, page_size: data.length };
}

// ═══════════════════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════════════════

const MOCK_TEAMS: Team[] = [
  {
    id: "team-1",
    name: "Утренняя смена",
    store_id: 1,
    store_name: "СПАР Томск, пр. Ленина 80",
    members: [
      { user_id: 19, user_name: "Захарова Н. П." },
      { user_id: 17, user_name: "Медведева Т. И." },
      { user_id: 15, user_name: "Козлова Д. А." },
      { user_id: 18, user_name: "Федоров А. Н." },
    ],
    members_total: 8,
    points: 4820,
    activity_pct: 87,
    status: "active",
  },
  {
    id: "team-2",
    name: "Дневной поток",
    store_id: 7,
    store_name: "Food City Томск Global Market",
    members: [
      { user_id: 25, user_name: "Соловьева И. Д." },
      { user_id: 27, user_name: "Белова Ю. С." },
      { user_id: 23, user_name: "Волкова М. О." },
      { user_id: 24, user_name: "Лебедев Р. А." },
    ],
    members_total: 6,
    points: 5240,
    activity_pct: 92,
    status: "active",
  },
];

/** @endpoint GET /leaderboards/teams */
export async function getTeams(params?: LeaderboardParams): Promise<ApiListResponse<Team>> {
  await delay(260);
  const data = MOCK_TEAMS;
  return { data, total: data.length, page: 1, page_size: data.length };
}

// ═══════════════════════════════════════════════════════════════════
// CHALLENGES
// ═══════════════════════════════════════════════════════════════════

const MOCK_CHALLENGES: Challenge[] = [
  {
    id: "ch-1",
    title: "Чистая полка апреля",
    description: "Кто из магазинов сделает 100 задач выкладки и контроля чистоты — получит коллективный бонус и бейдж «Чистюля».",
    status: "ACTIVE",
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    goal_type: "TASKS_COUNT",
    goal_value: 100,
    current_value: 68,
    participants: [
      { user_id: 19, user_name: "Захарова Н. П." },
      { user_id: 25, user_name: "Соловьева И. Д." },
      { user_id: 23, user_name: "Волкова М. О." },
    ],
    participants_total: 15,
    reward_text: "Бонус 1 500 ₽ + Badge «Чистюля»",
    reward_amount_rub: 1500,
    reward_badge: "Чистюля",
    store_ids: [1, 7],
    work_type_ids: [4, 12],
  },
  {
    id: "ch-2",
    title: "Без возвратов",
    description: "Месяц без отклонённых задач — для всех сотрудников магазина.",
    status: "ACTIVE",
    period_start: "2026-04-15",
    period_end: "2026-05-15",
    goal_type: "NO_REJECTS",
    goal_value: 0,
    current_value: 2,
    participants: [
      { user_id: 19, user_name: "Захарова Н. П." },
      { user_id: 25, user_name: "Соловьева И. Д." },
    ],
    participants_total: 12,
    reward_text: "+10% к бонусам в мае",
    store_ids: [7],
    work_type_ids: [],
  },
  {
    id: "ch-3",
    title: "Скоростная выкладка",
    description: "Завершён в марте: команда СПАР Томск выполнила 320 задач выкладки за 3 недели.",
    status: "COMPLETED",
    period_start: "2026-03-01",
    period_end: "2026-03-22",
    goal_type: "TASKS_COUNT",
    goal_value: 300,
    current_value: 320,
    participants: [
      { user_id: 19, user_name: "Захарова Н. П." },
      { user_id: 17, user_name: "Медведева Т. И." },
      { user_id: 15, user_name: "Козлова Д. А." },
    ],
    participants_total: 8,
    reward_text: "Бонус 800 ₽ каждому",
    reward_amount_rub: 800,
    store_ids: [1],
    work_type_ids: [4],
  },
  {
    id: "ch-4",
    title: "Майский марафон",
    description: "Стартует 1 мая — кто соберёт больше очков за неделю в Food City.",
    status: "UPCOMING",
    period_start: "2026-05-01",
    period_end: "2026-05-08",
    goal_type: "TASKS_COUNT",
    goal_value: 50,
    current_value: 0,
    participants: [],
    participants_total: 14,
    reward_text: "Бонус 2 000 ₽ победителю",
    reward_amount_rub: 2000,
    store_ids: [7, 8],
    work_type_ids: [4, 5, 12],
  },
];

export interface ChallengeListParams {
  status?: ChallengeStatus;
  store_id?: number;
}

/** @endpoint GET /challenges */
export async function getChallenges(params?: ChallengeListParams): Promise<ApiListResponse<Challenge>> {
  await delay(280);
  let data = MOCK_CHALLENGES;
  if (params?.status) data = data.filter((c) => c.status === params.status);
  if (params?.store_id != null) data = data.filter((c) => c.store_ids.includes(params.store_id!));
  return { data, total: data.length, page: 1, page_size: data.length };
}

/** @endpoint GET /challenges/:id */
export async function getChallengeById(id: string): Promise<ApiResponse<Challenge>> {
  await delay(220);
  const challenge = MOCK_CHALLENGES.find((c) => c.id === id);
  if (!challenge) throw new Error(`Challenge ${id} not found`);
  return { data: challenge };
}

/** @endpoint POST /challenges */
export async function createChallenge(data: CreateChallengeData): Promise<ApiMutationResponse> {
  await delay(360);
  return { success: true, id: `ch-${Date.now()}` };
}

/** @endpoint PATCH /challenges/:id */
export async function updateChallenge(id: string, data: Partial<Challenge>): Promise<ApiMutationResponse> {
  await delay(280);
  return { success: true };
}

/** @endpoint POST /challenges/:id/cancel */
export async function cancelChallenge(id: string): Promise<ApiMutationResponse> {
  await delay(280);
  return { success: true };
}
