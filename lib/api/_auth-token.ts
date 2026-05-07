/**
 * JWT token store (localStorage).
 *
 * Backend ждёт `Authorization: Bearer <jwt>` в каждом запросе.
 * JWT выдаётся внешним SSO Beyond Violet (вне scope admin).
 *
 * MVP: токен ставится вручную (devtools или dev-helper) через setAuthToken().
 * Long-term: читать из cookie/URL hash после редиректа SSO.
 */

const STORAGE_KEY = "wfm-jwt-token";

let _token: string | null = null;

function readFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Ленивое чтение из localStorage при первом обращении (SSR-safe)
function ensureLoaded(): void {
  if (_token === null) {
    _token = readFromStorage();
  }
}

export function getAuthToken(): string | null {
  ensureLoaded();
  return _token;
}

export function setAuthToken(token: string): void {
  _token = token;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, token);
    } catch {
      /* ignore quota errors */
    }
  }
}

export function clearAuthToken(): void {
  _token = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
