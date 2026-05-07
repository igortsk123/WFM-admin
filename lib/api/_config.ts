/**
 * Конфигурация подключения к real backend (FastAPI микросервисы).
 *
 * URLs:
 *   PROD:  https://wfm.beyondviolet.com/{tasks,users,shifts,notifications}/
 *   DEV:   https://dev.wfm.beyondviolet.com/{tasks,users,shifts,notifications}/
 *   LOCAL: http://localhost:8000/{tasks,shifts}/, :8001/users/, :8003/notifications/
 *
 * При USE_REAL_API=false admin живёт на моках (lib/mock-data/*).
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export const USE_REAL_API =
  process.env.NEXT_PUBLIC_USE_REAL_API === "true" && API_BASE_URL.length > 0;

export type BackendService =
  | "tasks"
  | "users"
  | "shifts"
  | "notifications"
  | "monitoring";

/**
 * Строит URL endpoint для сервиса.
 * `apiUrl("users", "/me")` → `https://dev.wfm.beyondviolet.com/users/me`
 */
export function apiUrl(service: BackendService, path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}/${service}${cleanPath}`;
}
