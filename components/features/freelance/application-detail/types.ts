import type { FreelanceApplication, BudgetUsage } from "@/lib/types";

export type DecisionVariant =
  | "FULL"
  | "PARTIAL"
  | "REJECT"
  | "BONUS"
  | "MIXED"
  | null;

export interface SimulationResult {
  cost: number;
  currency: string;
  after_approval: BudgetUsage;
  blocked: boolean;
  blocked_reason?: string;
}

export interface ApplicationDetailData extends FreelanceApplication {
  budget_usage: BudgetUsage[];
  simulated_cost: number;
  history: Array<{
    occurred_at: string;
    actor_id: number;
    actor_name: string;
    action: string;
    comment?: string;
    comment_en?: string;
  }>;
}

export function shortId(id: string): string {
  return id.replace(/^app-/, "").toUpperCase();
}

export function budgetPct(actual: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((actual / limit) * 100));
}

export const HOURLY_RATE = 350;
