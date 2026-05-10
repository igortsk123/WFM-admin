/**
 * Employee speed score — computes a 0..10 metric comparing how quickly
 * an employee completes work_types vs. peers working in stores of the
 * same `object_format` (e.g. SUPERMARKET / HYPERMARKET / CONVENIENCE).
 *
 * Replaces the stale "Среднее выполнение" KPI: the absolute median has
 * no business meaning (varies wildly between work types, stores, zones),
 * but the **relative** median vs peers does — it tells you whether this
 * person is fast or slow for their context.
 *
 * Algorithm:
 *   1. Find user's active assignment store → its object_format (peer cohort key).
 *   2. Build peer set: all employees with active assignments in stores of
 *      same object_format (excluding the user themselves).
 *   3. For each work_type the user has affinity in:
 *        a. Compare user's median_duration vs peers' median_duration.
 *        b. The relative score on that work_type ∈ [0..10] depends on the
 *           ratio: user faster than peer median → score > 5; slower → < 5.
 *   4. Aggregate (weighted by user's `count` per work_type) → 0..10.
 *
 * Edge cases:
 *   - No user EMPLOYEE_STATS entry / no affinity → returns null (no data).
 *   - No peer data for any of user's work_types → returns null.
 *   - Single peer (or all peers identical to user) → score = 5 (neutral).
 *
 * Admin-only computation (no backend equivalent yet) — see MIGRATION-NOTES.md.
 */

import type { ObjectFormat } from "@/lib/types";
import { EMPLOYEE_STATS } from "@/lib/mock-data/_lama-distribution-stats";
import { MOCK_ASSIGNMENTS } from "@/lib/mock-data/assignments";
import { MOCK_STORES } from "@/lib/mock-data/stores";
import { MOCK_USERS } from "@/lib/mock-data";

export interface EmployeeSpeedScore {
  /** 0..10. 10 — быстрее всех в категории. 5 — медиана. 0 — медленнее всех. */
  score: number;
  /** Сколько секунд (медиана по всем work_types user'а) занимает у user. */
  median_duration_self: number;
  /** Медиана peer-cohort (для тех же work_types). */
  median_duration_peers: number;
  /** Какие work_types сравнивались. */
  work_types_compared: string[];
  /** Сколько уникальных коллег попало в peer-cohort. */
  peer_count: number;
  /** Object format peer-cohort'a (SUPERMARKET / HYPERMARKET / ...). */
  peer_format: ObjectFormat | null;
  /** Короткое объяснение на RU. */
  explanation: string;
  /** Короткое объяснение на EN. */
  explanation_en: string;
}

// ── helpers ──────────────────────────────────────────────────────────────

/** Median of a non-empty number array (sorted internally). */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Weighted arithmetic mean. Returns 0 if total weight = 0. */
function weightedMean(values: number[], weights: number[]): number {
  let sum = 0;
  let totalW = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
    totalW += weights[i];
  }
  return totalW > 0 ? sum / totalW : 0;
}

/**
 * Resolve admin User.id → LAMA external_id used as EMPLOYEE_STATS key.
 * If user has no external_id (synthetic admin user) — стат-ключом будет
 * сам id (часто отсутствует — функция вернёт null выше).
 */
function getStatsKey(userId: number): number {
  const u = MOCK_USERS.find((x) => x.id === userId);
  return u?.external_id ?? userId;
}

/** Resolve user → object_format of their active assignment's store. */
function getUserPeerFormat(userId: number): ObjectFormat | null {
  const a = MOCK_ASSIGNMENTS.find((x) => x.user_id === userId && x.active);
  if (!a) return null;
  const store = MOCK_STORES.find((s) => s.id === a.store_id);
  return store?.object_format ?? null;
}

/** Set of user IDs whose active assignment is in a store of given format. */
function getPeerUserIds(format: ObjectFormat, excludeUserId: number): number[] {
  const storeIds = new Set(
    MOCK_STORES.filter((s) => s.object_format === format).map((s) => s.id),
  );
  const ids = new Set<number>();
  for (const a of MOCK_ASSIGNMENTS) {
    if (!a.active) continue;
    if (a.user_id === excludeUserId) continue;
    if (storeIds.has(a.store_id)) ids.add(a.user_id);
  }
  return Array.from(ids);
}

/**
 * Convert ratio (user_median / peer_median) to a 0..10 score.
 * Lower duration = faster = higher score.
 * Symmetric around 1.0:
 *   ratio = 0.5  (in 2× faster) → 10
 *   ratio = 1.0  (на уровне)    → 5
 *   ratio = 2.0  (in 2× slower) → 0
 * Smooth via clamped linear in log space.
 */
function ratioToScore(userMedian: number, peerMedian: number): number {
  if (peerMedian <= 0 || userMedian <= 0) return 5;
  const ratio = userMedian / peerMedian;
  // log2(0.5) = -1 (fastest end), log2(2) = 1 (slowest end)
  const log = Math.log2(ratio);
  // Map [-1..1] → [10..0], clamp.
  const clamped = Math.max(-1, Math.min(1, log));
  return Math.round(((1 - clamped) * 5) * 10) / 10;
}

/** Build short explanation (RU + EN) based on the aggregated score. */
function buildExplanation(args: {
  score: number;
  selfMedian: number;
  peerMedian: number;
  workTypes: string[];
  peerCount: number;
}): { ru: string; en: string } {
  const { score, selfMedian, peerMedian, workTypes, peerCount } = args;
  if (peerCount === 0 || peerMedian <= 0) {
    return {
      ru: "Нет данных по коллегам для сравнения",
      en: "No peer data available for comparison",
    };
  }
  const diffPct = Math.round(((peerMedian - selfMedian) / peerMedian) * 100);
  const wtList = workTypes.slice(0, 2).join(", ");

  if (Math.abs(diffPct) < 5) {
    return {
      ru: `На уровне коллег по ${wtList}`,
      en: `On par with peers on ${wtList}`,
    };
  }
  if (diffPct > 0) {
    return {
      ru: `На ${diffPct}% быстрее коллег по ${wtList}`,
      en: `${diffPct}% faster than peers on ${wtList}`,
    };
  }
  const slowerPct = Math.abs(diffPct);
  return {
    ru: `На ${slowerPct}% медленнее коллег по ${wtList}`,
    en: `${slowerPct}% slower than peers on ${wtList}`,
  };
}

// ── public API ───────────────────────────────────────────────────────────

/**
 * Compute speed score for an employee. Returns null if no comparable data.
 *
 * @param userId — admin User.id (matches LAMA employee_id where applicable)
 */
export function computeEmployeeSpeed(
  userId: number,
): EmployeeSpeedScore | null {
  const selfStatsKey = getStatsKey(userId);
  const userStats = EMPLOYEE_STATS[selfStatsKey];
  if (!userStats) return null;

  const affinity = userStats.affinity;
  const userWorkTypes = Object.keys(affinity);
  if (userWorkTypes.length === 0) return null;

  const peerFormat = getUserPeerFormat(userId);
  if (!peerFormat) return null;

  const peerIds = getPeerUserIds(peerFormat, userId);
  if (peerIds.length === 0) return null;

  // For each work_type the user has done, collect peer durations.
  const perTypeScores: number[] = [];
  const perTypeWeights: number[] = [];
  const userMedians: number[] = [];
  const peerMedians: number[] = [];
  const compared: string[] = [];

  for (const wt of userWorkTypes) {
    const userAff = affinity[wt];
    if (!userAff || userAff.median_duration <= 0) continue;

    const peerDurations: number[] = [];
    for (const pid of peerIds) {
      const pStats = EMPLOYEE_STATS[getStatsKey(pid)];
      if (!pStats) continue;
      const pAff = pStats.affinity[wt];
      if (pAff && pAff.median_duration > 0) {
        peerDurations.push(pAff.median_duration);
      }
    }
    if (peerDurations.length === 0) continue;

    const peerMedian = median(peerDurations);
    const score = ratioToScore(userAff.median_duration, peerMedian);

    perTypeScores.push(score);
    // Weight by user's count for that work_type — больше задач = выше доверие.
    perTypeWeights.push(userAff.count);
    userMedians.push(userAff.median_duration);
    peerMedians.push(peerMedian);
    compared.push(wt);
  }

  if (compared.length === 0) return null;

  const aggScore = weightedMean(perTypeScores, perTypeWeights);
  const finalScore = Math.round(aggScore * 10) / 10;
  const aggSelfMedian = weightedMean(userMedians, perTypeWeights);
  const aggPeerMedian = weightedMean(peerMedians, perTypeWeights);

  // Count peers that contributed at least one data point.
  const contributingPeers = new Set<number>();
  for (const pid of peerIds) {
    const pStats = EMPLOYEE_STATS[getStatsKey(pid)];
    if (!pStats) continue;
    for (const wt of compared) {
      if (pStats.affinity[wt]?.median_duration && pStats.affinity[wt].median_duration > 0) {
        contributingPeers.add(pid);
        break;
      }
    }
  }

  const expl = buildExplanation({
    score: finalScore,
    selfMedian: aggSelfMedian,
    peerMedian: aggPeerMedian,
    workTypes: compared,
    peerCount: contributingPeers.size,
  });

  return {
    score: finalScore,
    median_duration_self: Math.round(aggSelfMedian),
    median_duration_peers: Math.round(aggPeerMedian),
    work_types_compared: compared,
    peer_count: contributingPeers.size,
    peer_format: peerFormat,
    explanation: expl.ru,
    explanation_en: expl.en,
  };
}

/** Convenience: get just the explanation string (RU). */
export function getSpeedExplanation(userId: number): string {
  const r = computeEmployeeSpeed(userId);
  return r?.explanation ?? "Нет данных для сравнения";
}
