/**
 * Multi-tenant org context (mock layer).
 *
 * Module-level singleton — каждое API в `lib/api/` читает getCurrentOrgId()
 * для фильтрации моков по организации текущего пользователя.
 *
 * Пишется через setCurrentOrgId() из auth-context на login/switch.
 * Persist в localStorage чтобы переживал reload.
 *
 * После реального backend → этот слой удалится, фильтрация будет
 * на сервере по JWT.
 */

const STORAGE_KEY = "wfm-current-org";
const DEFAULT_ORG_ID = "org-lama";

let _currentOrgId: string = DEFAULT_ORG_ID;

// Initialize from localStorage on module load (client-only)
if (typeof window !== "undefined") {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) _currentOrgId = saved;
  } catch {
    // localStorage недоступен — fallback default
  }
}

export function getCurrentOrgId(): string {
  return _currentOrgId;
}

export function setCurrentOrgId(orgId: string): void {
  _currentOrgId = orgId;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, orgId);
    } catch {
      // localStorage недоступен — не критично, в memory обновлено
    }
  }
}

/**
 * Filter helper: true если item принадлежит текущему org.
 * Items без org_id treated as "org-lama" (legacy default — все
 * существующие моки FMCG-скоупленные de facto).
 */
export function isInCurrentOrg<T extends { org_id?: string }>(item: T): boolean {
  return (item.org_id ?? DEFAULT_ORG_ID) === _currentOrgId;
}

/**
 * Полная смена org-контекста: persist + перезагрузка страницы.
 * Reload нужен потому что useEffect'ы в компонентах не реагируют на
 * изменение module-level state. После реального React Query /
 * server-state — заменить на queryClient.invalidateQueries().
 */
export function switchOrganization(orgId: string): void {
  if (orgId === _currentOrgId) return;
  setCurrentOrgId(orgId);
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}
