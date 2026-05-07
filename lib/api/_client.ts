/**
 * Fetch wrapper для real backend.
 *
 * Backend response shape (shared/schemas/response.py):
 *   Success: { status: { code: "" }, data: T }
 *   Error:   { status: { code: "NOT_FOUND", message: "..." }, data: null }
 * HTTP status всегда 200; логика по status.code.
 *
 * Списки приходят как именованные массивы:
 *   { status: {...}, data: { stores: [...] } }
 *   { status: {...}, data: { tasks: [...] } }
 *
 * Этот модуль:
 *  - добавляет Authorization: Bearer <jwt>
 *  - распаковывает обёртку → возвращает чистый T (или throws)
 *  - маппит status.code → BackendApiError с code/message/httpStatus
 */

import { getAuthToken } from "./_auth-token";

export interface BackendStatus {
  code: string;
  message?: string | null;
}

export interface BackendEnvelope<T> {
  status: BackendStatus;
  data: T | null;
}

export class BackendApiError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "BackendApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface BackendFetchOptions extends RequestInit {
  /** Skip Authorization header (для public endpoints — health checks etc.) */
  skipAuth?: boolean;
}

/**
 * Базовый GET/POST/PATCH/DELETE к backend.
 *
 * Возвращает unwrapped data (T). Бросает BackendApiError при status.code != "".
 * Бросает обычный Error при сетевых сбоях / нечитаемом ответе.
 */
export async function backendFetch<T>(
  url: string,
  options: BackendFetchOptions = {},
): Promise<T> {
  const { skipAuth, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  // Body всегда JSON если не FormData (multipart)
  if (rest.body && !(rest.body instanceof FormData)) {
    if (!finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json");
    }
  }
  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, { ...rest, headers: finalHeaders });
  } catch (e) {
    throw new Error(
      `Network error fetching ${url}: ${(e as Error).message}`,
    );
  }

  // 401/403 backend МОЖЕТ отдать как HTTP-ошибку до wrapper'а
  if (response.status === 401) {
    throw new BackendApiError("UNAUTHORIZED", "Требуется авторизация", 401);
  }
  if (response.status === 403) {
    throw new BackendApiError("FORBIDDEN", "Доступ запрещён", 403);
  }

  let parsed: BackendEnvelope<T>;
  try {
    parsed = (await response.json()) as BackendEnvelope<T>;
  } catch {
    throw new Error(
      `Invalid JSON response from ${url} (HTTP ${response.status})`,
    );
  }

  // Backend wrapper: status.code = "" значит успех
  const code = parsed.status?.code ?? "";
  if (code !== "") {
    throw new BackendApiError(
      code,
      parsed.status?.message ?? "Unknown backend error",
      response.status,
    );
  }

  // data может быть null (например для DELETE) — возвращаем как T
  return (parsed.data as T);
}

export const backendGet = <T>(url: string, opts?: BackendFetchOptions) =>
  backendFetch<T>(url, { ...opts, method: "GET" });

export const backendPost = <T>(
  url: string,
  body?: unknown,
  opts?: BackendFetchOptions,
) =>
  backendFetch<T>(url, {
    ...opts,
    method: "POST",
    body: body === undefined
      ? undefined
      : body instanceof FormData
        ? body
        : JSON.stringify(body),
  });

export const backendPatch = <T>(
  url: string,
  body: unknown,
  opts?: BackendFetchOptions,
) =>
  backendFetch<T>(url, {
    ...opts,
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const backendDelete = <T = void>(
  url: string,
  opts?: BackendFetchOptions,
) =>
  backendFetch<T>(url, { ...opts, method: "DELETE" });
