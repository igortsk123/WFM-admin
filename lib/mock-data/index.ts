/**
 * Mock data barrel — единственная точка входа для всех mock-данных.
 * Вызывать ТОЛЬКО из lib/api/ — никогда напрямую из компонентов или страниц.
 */

export * from "./organizations";
export * from "./legal-entities";
export * from "./positions";
export * from "./stores";
export * from "./users";
export * from "./functional-roles";
export * from "./assignments";
export * from "./permissions";
export * from "./work-types";
export * from "./zones";
export * from "./product-categories";
export * from "./tasks";
export * from "./shifts";
export * from "./subtasks";
export * from "./hints";

// ── Freelance module ─────────────────────────────────────────────────
export * from "./_today";
export * from "./freelance-agents";
export * from "./freelance-freelancers";
export * from "./freelance-applications";
export * from "./freelance-assignments";
export * from "./freelance-services";
export * from "./freelance-payouts";
export * from "./freelance-agent-earnings";
export * from "./freelance-budget-limits";
export * from "./freelance-budget-usage";
export * from "./freelance-service-norms";
export * from "./freelance-no-shows";
export * from "./freelance-external-sync-logs";
